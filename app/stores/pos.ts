// stores/pos.ts — حالة شاشة الكاشير ومنطقها
//
// المبدأ: مسار واحد دائماً — كل بيع يُكتب أولاً في قاعدة بيانات الجهاز
// (IndexedDB) مع عملية في طابور الرفع، ثم يُرفع للسيرفر حين يتوفر الاتصال.
// لا فرق بين "أونلاين" و"أوفلاين" في طريقة البيع؛ الفرق فقط متى يُفرَّغ
// الطابور.
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import {
  DeviceKeyError,
  OfflineError,
  PosRequestError,
  SessionExpiredError,
  SubscriptionInactiveError,
  usePosApi,
  type DeviceCredentials,
} from "@/pos/api";
import {
  buildZatcaQr,
  lineAmounts,
  newUuid,
  POS_PRICES_INCLUDE_TAX,
  returnShare,
  roundAmount,
  sumAmounts,
  unitPriceOf,
} from "@/pos/calc";
import { posDb } from "@/pos/db";
import { DEFAULT_DRAWER, kickDrawer, type DrawerConfig } from "@/pos/drawer";
import { priceCart, pricingIssue } from "@/pos/promotions";
import { parseScaleBarcode } from "@/pos/scale";
import type {
  AuditAction,
  BoundPosDevice,
  CartLine,
  CashMove,
  HeldCart,
  InvoiceDiscount,
  LocalReturn,
  LocalSale,
  LocalShift,
  OutboxEntry,
  PosBootstrap,
  PosCashier,
  PosCategory,
  PosCustomer,
  PosDevice,
  PosOfflinePolicy,
  PosOptions,
  PosProduct,
  PosPromotion,
  PosTenantProfile,
  ReturnableInvoice,
  SaleLine,
  SalePayment,
  StoredCart,
  SyncResult,
} from "@/pos/types";
import type { AccessResponse } from "@/stores/access";
import { useAuthStore } from "@/stores/auth";
import type { SalesPaymentMethod, SalesSettings } from "@/types/sales";

/** كل كم يفحص الجهاز الاتصال ويرفع ما في طابوره */
const HEARTBEAT_MS = 20_000;
/** كل كم يسحب تغييرات الأصناف والأسعار */
const PULL_EVERY_MS = 5 * 60_000;
/** أقصى عدد عمليات في طلب رفع واحد (حد السيرفر) */
const PUSH_BATCH = 100;
const COUNTER_DIGITS = 6;
const HOUR_MS = 3_600_000;
/** حد العمل بلا اتصال قبل أن يصل من السيرفر (نفس قيمه الافتراضية) */
const DEFAULT_OFFLINE_POLICY: PosOfflinePolicy = {
  warnAfterHours: 72,
  blockAfterHours: 168,
};
/** إعدادات الكاشير قبل أن تصل من السيرفر (نفس قيمه الافتراضية) */
const DEFAULT_POS_OPTIONS: PosOptions = {
  scale: {
    enabled: false,
    prefixes: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29"],
    itemDigits: 5,
    valueType: "weight",
    valueDecimals: 3,
  },
  approvals: { void: false, cashOut: false, manualDrawer: false },
};
/** تأخير حفظ السلة على الجهاز بعد آخر تعديل */
const CART_SAVE_DELAY_MS = 300;
/** خانات كمية صنف موزون يُحسب وزنه من سعر باركود الميزان */
const WEIGHT_DECIMALS = 3;

/** "آخر اتصال" وساعة الجهاز يُحفظان على القرص بهذه الوتيرة لا مع كل نبضة */
const PERSIST_EVERY_MS = 60_000;

/** الكميات بأربع خانات كما في السيرفر: يزيل ضجيج الفاصلة العائمة */
const roundQuantity = (value: number): number =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;

export const usePosStore = defineStore("pos", () => {
  const api = usePosApi();

  // ─── حالة الجهاز (تُحمَّل من IndexedDB) ─────────────────────────────────────
  const ready = ref(false);
  const device = ref<PosDevice | null>(null);
  const settings = ref<SalesSettings | null>(null);
  const shift = ref<LocalShift | null>(null);
  const counter = ref(0);
  const lastSync = ref<string | null>(null);
  const cashierName = ref("");
  /** مرتجعات سُجّلت على هذه الشاشة */
  const returns = ref<LocalReturn[]>([]);
  /** إعداد درج النقود لهذه الشاشة (عتاد موصول بها، لا بجهاز الكاشير) */
  const drawer = ref<DrawerConfig>({ ...DEFAULT_DRAWER });

  const products = ref<PosProduct[]>([]);
  const customers = ref<PosCustomer[]>([]);
  const categories = ref<PosCategory[]>([]);
  const sales = ref<LocalSale[]>([]);
  const outbox = ref<OutboxEntry[]>([]);

  // ─── آخر حالة معروفة عن الشركة (تُحفظ على الجهاز: الشاشة تعمل بها بلا إنترنت) ──
  const tenant = ref<PosTenantProfile | null>(null);
  const cashiers = ref<PosCashier[]>([]);
  /** صلاحية المرتجع لوردية بلا كاشير محدد، كما يعرفها السيرفر عن هذه الشاشة */
  const returnsAllowed = ref(false);
  const offlinePolicy = ref<PosOfflinePolicy>({ ...DEFAULT_OFFLINE_POLICY });
  /** أرصدة مخزن الجهاز كما في آخر سحب (productId ← الكمية بوحدة الأساس) */
  const stockLevels = ref<Record<string, number>>({});
  /** false = السيرفر لم يرسل أرصدة بعد: لا تُعرض ولا يُمنع بها بيع */
  const stockKnown = ref(false);
  /** ما على كل عميل كما في آخر سحب */
  const serverBalances = ref<Record<string, number>>({});
  const promotions = ref<PosPromotion[]>([]);
  const posOptions = ref<PosOptions>(DEFAULT_POS_OPTIONS);
  /** فواتير معلّقة على هذه الشاشة */
  const held = ref<HeldCart[]>([]);
  /** إيداعات وسحوبات الدرج في الوردية الحالية */
  const cashMoves = ref<CashMove[]>([]);

  // ─── الاتصال ────────────────────────────────────────────────────────────────
  const online = ref(false);
  const sessionExpired = ref(false);
  const syncing = ref(false);
  const lastError = ref("");
  /** اشتراك الشركة غير سارٍ (رسالة السيرفر). فارغة = سارٍ على حد علمنا */
  const suspended = ref("");
  /** آخر مرة ردّ فيها السيرفر على هذه الشاشة (بساعة الجهاز) */
  const lastContactAt = ref<number | null>(null);
  /**
   * الوقت الآن كما تعتمده الشاشة: ساعة الجهاز، لكنها لا ترجع للخلف — إرجاع
   * ساعة الجهاز لا يمدّ مهلة العمل بلا اتصال.
   */
  const now = ref(Date.now());

  const pendingCount = computed(
    () => outbox.value.filter((entry) => !entry.error).length,
  );
  const failedEntries = computed(() =>
    outbox.value.filter((entry) => !!entry.error),
  );

  /** باركود ← الصنف ووحدته، للبحث الفوري عند المسح */
  const barcodeIndex = computed(() => {
    const index = new Map<string, { product: PosProduct; unitId: string | null }>();
    for (const product of products.value) {
      for (const item of product.barcodes) {
        index.set(item.barcode, { product, unitId: item.unitId });
      }
    }
    return index;
  });

  // ─── هوية الشاشة ────────────────────────────────────────────────────────────
  // كل متصفح له نسخته المحلية (عدّاد الفواتير، الوردية، المبيعات)، فجهاز
  // الكاشير يُربط بشاشة واحدة. معرّف الشاشة يُولَّد مرة ويبقى.
  const installationId = ref("");
  /** هل أكد السيرفر أن هذه الشاشة هي المربوطة بالجهاز؟ */
  const bound = ref(false);
  /** سبب رفض السيرفر لهذه الشاشة (الجهاز مربوط بشاشة أخرى) */
  const bindError = ref("");

  /**
   * مفتاح الجهاز: يصل مرة عند الربط ويُحفظ هنا. به تسحب الشاشة وترفع دون
   * جلسة مستخدم (التوكن ينتهي خلال دقائق بلا إنترنت؛ المفتاح يبقى حتى يُفكّ
   * الربط).
   */
  const deviceKey = ref<string | null>(null);

  const setBound = async (value: boolean, key: string | null = null) => {
    bound.value = value;
    deviceKey.value = value ? key : null;
    await posDb.setMeta({ bound: value, deviceKey: deviceKey.value });
  };

  const credentials = (): DeviceCredentials | null =>
    device.value && deviceKey.value
      ? {
          deviceId: device.value.id,
          installationId: installationId.value,
          key: deviceKey.value,
        }
      : null;

  /** طلبات الشاشة بمفتاح جهازها */
  const deviceApi = () => {
    const current = credentials();
    if (!current) throw new DeviceKeyError("الشاشة غير مربوطة بجهاز كاشير");
    return api.device(current);
  };

  // ─── ساعة الشاشة وحد العمل بلا اتصال ────────────────────────────────────────
  let clockSavedAt = 0;
  let contactSavedAt = 0;

  /** يحدّث "الآن" (بلا رجوع للخلف) ويحفظه دورياً ليبقى بعد إعادة التشغيل */
  const tick = () => {
    now.value = Math.max(Date.now(), now.value);
    if (now.value - clockSavedAt > PERSIST_EVERY_MS) {
      clockSavedAt = now.value;
      void posDb.setMeta({ clock: now.value });
    }
  };

  const markContact = () => {
    tick();
    lastContactAt.value = now.value;
    if (now.value - contactSavedAt > PERSIST_EVERY_MS) {
      contactSavedAt = now.value;
      void posDb.setMeta({ lastContactAt: now.value });
    }
  };

  const setSuspended = (message: string) => {
    if (suspended.value === message) return;
    suspended.value = message;
    void posDb.setMeta({ suspended: message });
  };

  const offlineHours = computed(() =>
    lastContactAt.value === null
      ? 0
      : Math.max(0, (now.value - lastContactAt.value) / HOUR_MS),
  );

  /** ok ← warn (تنبيه) ← blocked (لا وردية جديدة حتى تتصل الشاشة) */
  const offlineState = computed<"ok" | "warn" | "blocked">(() => {
    if (offlineHours.value >= offlinePolicy.value.blockAfterHours) return "blocked";
    if (offlineHours.value >= offlinePolicy.value.warnAfterHours) return "warn";
    return "ok";
  });

  /**
   * سبب منع فتح وردية جديدة، أو "" إن كان مسموحاً. الوردية المفتوحة لا تتأثر:
   * تكمل وتُقفَّل وتُرفع مبيعاتها حين يعود الاتصال.
   */
  const shiftBlockReason = computed(() => {
    if (suspended.value) return suspended.value;
    if (offlineState.value === "blocked") {
      const days = Math.floor(offlineHours.value / 24);
      return `مرّ ${days} يوم بلا اتصال بالسيرفر — صِل الجهاز بالإنترنت لفتح وردية جديدة`;
    }
    return "";
  });

  /**
   * يتأكد أن الشاشة مربوطة بجهازها قبل أي رفع أو سحب. شاشة رفضها السيرفر
   * لا تعيد المحاولة وحدها (قد يكون المدير نقل الجهاز لشاشة أخرى): تنتظر
   * ضغطة "إعادة المحاولة".
   */
  const ensureBound = async (manual = false): Promise<boolean> => {
    if (!device.value) return false;
    if (bound.value && deviceKey.value) return true;
    if (bindError.value && !manual) return false;
    // الربط (وإصدار المفتاح) هو الطلب الوحيد الذي يحتاج جلسة مستخدم. شاشة
    // مربوطة من قبل هذا التحديث بلا مفتاح تحصل عليه هنا عند أول جلسة
    const result = await guarded(() =>
      api.post<BoundPosDevice>(`/pos/devices/${device.value!.id}/bind`, {
        installationId: installationId.value,
      }),
    );
    if (!result) return false;
    bindError.value = "";
    await setBound(true, result.deviceKey);
    return true;
  };

  /** محاولة ربط يطلبها الكاشير بعد أن رُفضت الشاشة */
  const rebind = async () => {
    if (await ensureBound(true)) await sync({ pull: true });
  };

  const reloadOutbox = async () => {
    outbox.value = await posDb.all("outbox");
  };

  /** يحمّل حالة الجهاز المحفوظة. لا يحتاج إنترنت */
  const init = async () => {
    if (ready.value) return;
    const [d, s, sh, c, ls, name, inst, isBound] = await Promise.all([
      posDb.getMeta<PosDevice>("device"),
      posDb.getMeta<SalesSettings>("settings"),
      posDb.getMeta<LocalShift>("shift"),
      posDb.getMeta<number>("counter"),
      posDb.getMeta<string>("lastSync"),
      posDb.getMeta<string>("cashierName"),
      posDb.getMeta<string>("installationId"),
      posDb.getMeta<boolean>("bound"),
    ]);
    drawer.value = {
      ...DEFAULT_DRAWER,
      ...((await posDb.getMeta<DrawerConfig>("drawer")) ?? {}),
    };

    const [key, profile, staff, mayReturn, policy, hold, contact, clock] =
      await Promise.all([
        posDb.getMeta<string>("deviceKey"),
        posDb.getMeta<PosTenantProfile>("tenant"),
        posDb.getMeta<PosCashier[]>("cashiers"),
        posDb.getMeta<boolean>("returnsAllowed"),
        posDb.getMeta<PosOfflinePolicy>("offlinePolicy"),
        posDb.getMeta<string>("suspended"),
        posDb.getMeta<number>("lastContactAt"),
        posDb.getMeta<number>("clock"),
      ]);
    deviceKey.value = key;
    tenant.value = profile;
    cashiers.value = staff ?? [];
    returnsAllowed.value = mayReturn === true;
    offlinePolicy.value = policy ?? { ...DEFAULT_OFFLINE_POLICY };
    suspended.value = hold ?? "";
    now.value = Math.max(Date.now(), clock ?? 0);
    // شاشة تعمل من قبل هذا التحديث: مهلتها تبدأ من الآن لا من الماضي
    lastContactAt.value = contact ?? (d ? now.value : null);
    if (contact === null && d) void posDb.setMeta({ lastContactAt: now.value });
    // العملة والتوقيت من الجهاز: الشاشة تفتح صحيحة بلا إنترنت ولا جلسة
    useAuthStore().setDeviceLocale(profile);
    returns.value = await posDb.all("returns");
    installationId.value = inst ?? newUuid();
    if (!inst) await posDb.setMeta({ installationId: installationId.value });
    bound.value = isBound === true;
    // false محفوظة = السيرفر رفض هذه الشاشة قبل إغلاقها؛ null = لم تُربط بعد
    if (isBound === false && d) {
      bindError.value = "هذه الشاشة ليست المربوطة بجهاز الكاشير";
    }
    device.value = d;
    settings.value = s;
    shift.value = sh;
    counter.value = c ?? 0;
    lastSync.value = ls;
    cashierName.value = name ?? "";

    [products.value, customers.value, categories.value, sales.value] =
      await Promise.all([
        posDb.all("products"),
        posDb.all("customers"),
        posDb.all("categories"),
        posDb.all("sales"),
      ]);
    await reloadOutbox();

    const [levels, balances, promos, options, parked, moves, savedCart] =
      await Promise.all([
        posDb.getMeta<Record<string, number>>("stock"),
        posDb.getMeta<Record<string, number>>("customerBalances"),
        posDb.getMeta<PosPromotion[]>("promotions"),
        posDb.getMeta<PosOptions>("posOptions"),
        posDb.getMeta<HeldCart[]>("held"),
        posDb.getMeta<CashMove[]>("cashMoves"),
        posDb.getMeta<StoredCart>("cart"),
      ]);
    const stockComplete = await posDb.getMeta<boolean>("stockComplete");
    stockLevels.value = levels ?? {};
    // نسخة كاملة من الأرصدة استُلمت من قبل؟ بدونها لا تُعرض ولا يُمنع بها بيع
    stockKnown.value = stockComplete === true;
    serverBalances.value = balances ?? {};
    promotions.value = promos ?? [];
    posOptions.value = options ?? DEFAULT_POS_OPTIONS;
    held.value = parked ?? [];
    cashMoves.value = moves ?? [];
    // سلة لم تكتمل قبل إغلاق المتصفح أو انقطاع الكهرباء
    if (savedCart && sh) restoreCart(savedCart);
    ready.value = true;
  };

  // ─── المزامنة ───────────────────────────────────────────────────────────────
  /** ينفّذ طلباً للسيرفر ويحدّث حالة الاتصال حسب نتيجته */
  const guarded = async <T>(work: () => Promise<T>): Promise<T | null> => {
    try {
      const result = await work();
      online.value = true;
      sessionExpired.value = false;
      lastError.value = "";
      markContact();
      setSuspended("");
      return result;
    } catch (error) {
      if (error instanceof OfflineError) {
        online.value = false;
      } else if (error instanceof SessionExpiredError) {
        // السيرفر ردّ، فالشبكة تعمل؛ لكن ربط الشاشة ينتظر تسجيل الدخول
        online.value = true;
        sessionExpired.value = true;
      } else if (error instanceof SubscriptionInactiveError) {
        // السيرفر ردّ: الشاشة متصلة، لكن الاشتراك موقوف — ما بيع يبقى على
        // الجهاز ويُرفع بعد التجديد، ولا تُفتح وردية جديدة حتى ذلك
        online.value = true;
        markContact();
        setSuspended(error.message);
      } else if (error instanceof DeviceKeyError) {
        // المفتاح أُبطل (فُكّ الربط أو أُوقف الجهاز): الشاشة تحتاج ربطاً
        // جديداً، والمبيعات تبقى محفوظة هنا حتى يُحسم الأمر
        online.value = true;
        bindError.value = error.message;
        await setBound(false);
      } else {
        online.value = true;
        lastError.value = error instanceof Error ? error.message : "خطأ غير متوقع";
        if (error instanceof PosRequestError && error.status === 409) {
          // الجهاز مربوط بشاشة أخرى (أو فُكّ ربطه): نعيد محاولة الربط في
          // الدورة التالية، والمبيعات تبقى محفوظة هنا حتى يُحسم الأمر
          bindError.value = error.message;
          await setBound(false);
        }
      }
      return null;
    }
  };

  const applyBootstrap = async (data: PosBootstrap) => {
    await posDb.applyCatalog(data);
    // التنزيل الكامل يستبدل نسخة العملاء: من أُضيف هنا ولم يُرفع بعد يعود
    const waiting = customers.value.filter(
      (c) => c.local && outbox.value.some((e) => e.id === `customer-${c.id}`),
    );
    if (waiting.length) await posDb.putCustomers(waiting);

    // الأرصدة: كلها في التنزيل الكامل، وما تغيّر في غيره
    // التغييرات تُدمج فقط فوق نسخة كاملة سبق استلامها
    let nextStock = stockLevels.value;
    const stockReceived = !!data.stock && (data.full || stockKnown.value);
    if (data.stock && stockReceived) {
      nextStock = data.full ? {} : { ...stockLevels.value };
      for (const row of data.stock) nextStock[row.productId] = row.quantity;
    }
    const nextBalances = data.customerBalances
      ? Object.fromEntries(data.customerBalances.map((row) => [row.id, row.balance]))
      : serverBalances.value;
    // العدّاد لا ينقص أبداً: الأعلى بين الجهاز والسيرفر (جهاز أُعيدت تهيئته)
    const nextCounter = Math.max(counter.value, data.device.lastCounter);

    // وردية مفتوحة في السيرفر وليست على الجهاز (مُسحت بياناته): نستعيدها
    let nextShift = shift.value;
    if (!nextShift && data.openShift && !hasQueued("shift.close", data.openShift.id)) {
      nextShift = {
        id: data.openShift.id,
        openedAt: data.openShift.openedAt,
        openingCash: data.openShift.openingCash,
        cashierName: data.openShift.cashierName ?? "",
        cashierId: data.openShift.cashierId ?? null,
      };
    }

    await posDb.setMeta({
      device: data.device,
      settings: data.settings,
      lastSync: data.serverTime,
      counter: nextCounter,
      shift: nextShift,
      tenant: data.tenant,
      cashiers: data.cashiers,
      returnsAllowed: data.returnsAllowed,
      offlinePolicy: data.offlinePolicy,
      customerBalances: nextBalances,
      promotions: data.promotions ?? promotions.value,
      posOptions: data.posOptions ?? posOptions.value,
      ...(stockReceived ? { stock: nextStock, stockComplete: true } : {}),
    });
    stockLevels.value = nextStock;
    if (stockReceived) stockKnown.value = true;
    serverBalances.value = nextBalances;
    promotions.value = data.promotions ?? promotions.value;
    posOptions.value = data.posOptions ?? posOptions.value;
    tenant.value = data.tenant;
    cashiers.value = data.cashiers;
    returnsAllowed.value = data.returnsAllowed;
    offlinePolicy.value = data.offlinePolicy;
    useAuthStore().setDeviceLocale(data.tenant);
    device.value = data.device;
    settings.value = data.settings;
    lastSync.value = data.serverTime;
    counter.value = nextCounter;
    shift.value = nextShift;

    [products.value, customers.value, categories.value] = await Promise.all([
      posDb.all("products"),
      posDb.all("customers"),
      posDb.all("categories"),
    ]);
  };

  const hasQueued = (type: OutboxEntry["type"], id: string) =>
    outbox.value.some((entry) => entry.type === type && entry.payload.id === id);

  /** يسحب الأصناف والأسعار والعملاء: كلها، أو ما تغيّر منذ آخر سحب */
  const pull = async (full = false): Promise<boolean> => {
    if (!device.value) return false;
    // شاشة لم تستلم أرصدة مخزنها كاملة بعد (رُبطت قبل أن يرسلها السيرفر): سحب
    // "ما تغيّر" وحده كان سيعرض كل الأصناف برصيد صفر
    const complete = full || !stockKnown.value;
    const since =
      !complete && lastSync.value
        ? `?since=${encodeURIComponent(lastSync.value)}`
        : "";
    const data = await guarded(() =>
      deviceApi().get<PosBootstrap>(`/bootstrap${since}`),
    );
    if (!data) return false;
    await applyBootstrap(data);
    lastPullAt = Date.now();
    return true;
  };

  /** يرفع طابور الجهاز بالترتيب. ما يؤكده السيرفر يُحذف، وما يرفضه يُعلَّم */
  const push = async (): Promise<boolean> => {
    if (!device.value) return false;

    for (;;) {
      const batch = outbox.value.filter((e) => !e.error).slice(0, PUSH_BATCH);
      if (batch.length === 0) return true;

      const response = await guarded(() =>
        deviceApi().post<{ results: SyncResult[]; lastCounter: number }>("/sync", {
          operations: batch.map((e) => ({
            id: e.id,
            type: e.type,
            payload: e.payload,
          })),
        }),
      );
      if (!response) return false;

      try {
        await posDb.settleOutbox(
          batch,
          new Map(
            response.results.map((r) => [
              r.id,
              { ok: r.status !== "error", message: r.message },
            ]),
          ),
        );
      } finally {
        // مهما حدث: الواجهة تعرض ما في الطابور فعلاً
        await reloadOutbox();
      }
    }
  };

  let lastPullAt = 0;

  /** دورة مزامنة: رفع ما في الطابور ثم سحب التغييرات إن حان وقتها */
  const sync = async (options: { pull?: boolean } = {}) => {
    tick();
    if (!device.value || syncing.value) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      online.value = false;
      return;
    }
    syncing.value = true;
    try {
      if (!(await ensureBound())) {
        // الشاشة مرفوضة: لا رفع ولا سحب، لكن حالة الاتصال تبقى صحيحة
        if (bindError.value) {
          try {
            await api.get("/pos/ping");
            online.value = true;
          } catch (error) {
            if (error instanceof OfflineError) online.value = false;
          }
        }
        return;
      }
      const pushed = pendingCount.value > 0 ? await push() : true;
      const duePull = options.pull || Date.now() - lastPullAt > PULL_EVERY_MS;
      if (pushed && duePull) {
        await pull();
      } else if (pushed && pendingCount.value === 0) {
        // لا شيء للرفع ولا للسحب: فحص اتصال خفيف (وبه يُعرف أن الاشتراك سارٍ)
        await guarded(() => deviceApi().get("/ping"));
      }
    } finally {
      syncing.value = false;
    }
  };

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const onOnline = () => void sync();
  const onOffline = () => {
    online.value = false;
  };

  /** يبدأ نبض الاتصال: يفحص دورياً ويرفع فور عودة الشبكة */
  const start = () => {
    if (heartbeat) return;
    heartbeat = setInterval(() => void sync(), HEARTBEAT_MS);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void sync({ pull: true });
  };

  const stop = () => {
    // خارج شاشة الكاشير تعود العملة والتوقيت لما في جلسة المستخدم
    useAuthStore().setDeviceLocale(null);
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };

  // ─── ربط الجهاز ─────────────────────────────────────────────────────────────
  const fetchDevices = () => api.get<PosDevice[]>("/pos/devices");

  /** يربط هذا المتصفح بجهاز كاشير وينزّل بياناته (يحتاج إنترنت) */
  const bindDevice = async (target: PosDevice) => {
    if (outbox.value.length > 0) {
      throw new Error("في الجهاز مبيعات لم تُرفع بعد — ارفعها قبل تغيير الجهاز");
    }
    // الربط أولاً: جهاز مربوط بشاشة أخرى يُرفض هنا قبل مسح أي شيء
    const { deviceKey: key } = await api.post<BoundPosDevice>(
      `/pos/devices/${target.id}/bind`,
      { installationId: installationId.value },
    );
    const data = await api
      .device({
        deviceId: target.id,
        installationId: installationId.value,
        key,
      })
      .get<PosBootstrap>("/bootstrap");
    const keepName = cashierName.value;
    tick();
    await posDb.reset({
      installationId: installationId.value,
      bound: true,
      deviceKey: key,
      drawer: drawer.value,
      clock: now.value,
      lastContactAt: now.value,
    });
    returns.value = [];
    bound.value = true;
    deviceKey.value = key;
    lastContactAt.value = now.value;
    suspended.value = "";
    bindError.value = "";
    counter.value = 0;
    shift.value = null;
    sales.value = [];
    cart.value = [];
    held.value = [];
    cashMoves.value = [];
    stockLevels.value = {};
    stockKnown.value = false;
    serverBalances.value = {};
    await posDb.setMeta({ cashierName: keepName });
    await applyBootstrap(data);
    online.value = true;
    lastPullAt = Date.now();
  };

  // ─── الوردية ────────────────────────────────────────────────────────────────
  /**
   * يفتح وردية. `cashier` من تحقق من رقمه السري على هذه الشاشة (انظر
   * pos/cashiers)؛ بدونه وردية باسم حر — فقط لشركة لم تعرّف كاشيرات.
   */
  const openShift = async (
    openingCash: number,
    name: string,
    cashier: PosCashier | null = null,
  ) => {
    if (shift.value) throw new Error("توجد وردية مفتوحة بالفعل");
    tick();
    if (shiftBlockReason.value) throw new Error(shiftBlockReason.value);
    if (cashiers.value.length > 0 && !cashier) {
      throw new Error("اختر الكاشير وأدخل رقمه السري");
    }
    const next: LocalShift = {
      id: newUuid(),
      openedAt: new Date().toISOString(),
      openingCash,
      cashierName: name,
      cashierId: cashier?.id ?? null,
    };
    await posDb.enqueue(
      {
        id: `open-${next.id}`,
        type: "shift.open",
        payload: {
          id: next.id,
          openedAt: next.openedAt,
          openingCash,
          cashierName: name || undefined,
          cashierId: cashier?.id,
        },
        createdAt: next.openedAt,
      },
      { shift: next, cashierName: name, cashMoves: [] },
    );
    cashMoves.value = [];
    shift.value = next;
    cashierName.value = name;
    await reloadOutbox();
    // بداية الوردية أنسب وقت لتحديث الأسعار كاملة
    void sync({ pull: true });
  };

  /** كاشير الوردية الحالية كما هو في آخر قائمة نزلت (null = لم يعد فيها) */
  const shiftCashier = computed(() =>
    shift.value?.cashierId
      ? (cashiers.value.find((c) => c.id === shift.value!.cashierId) ?? null)
      : null,
  );

  /** كاشير الوردية أُوقف أو حُذف (عرفت الشاشة عند آخر اتصال): يقفّل ورديته فقط */
  const cashierRevoked = computed(
    () => !!shift.value?.cashierId && !shiftCashier.value,
  );

  /**
   * المرتجع يتبع صاحب الوردية — نفس قاعدة السيرفر: كاشيرها إن فُتحت برقم
   * سري، وإلا آخر ما عُرف عن مستخدم هذه الشاشة.
   */
  const canReturn = computed(() =>
    shift.value?.cashierId
      ? !!shiftCashier.value?.canReturn
      : returnsAllowed.value,
  );

  /** مبيعات الوردية الحالية من نسخة الجهاز (تعمل بلا إنترنت) */
  const shiftSummary = computed(() => {
    const own = shift.value
      ? sales.value.filter((sale) => sale.shiftId === shift.value!.id)
      : [];
    const byMethod = (method: string) =>
      sumAmounts(
        own.flatMap((sale) =>
          sale.payments.filter((p) => p.method === method).map((p) => p.amount),
        ),
      );
    const cash = byMethod("cash");
    const ownReturns = shift.value
      ? returns.value.filter((r) => r.shiftId === shift.value!.id)
      : [];
    const cashRefunds = sumAmounts(
      ownReturns.filter((r) => r.refundMethod === "cash").map((r) => r.refundAmount),
    );
    const moves = shift.value
      ? cashMoves.value.filter((move) => move.shiftId === shift.value!.id)
      : [];
    const moved = (type: CashMove["type"]) =>
      sumAmounts(moves.filter((move) => move.type === type).map((move) => move.amount));
    const cashIn = moved("in");
    const cashOut = moved("out");
    return {
      invoicesCount: own.length,
      salesTotal: sumAmounts(own.map((sale) => sale.total)),
      cash,
      card: byMethod("card"),
      /** ما بيع على الحساب (آجل): لم يدخل الدرج */
      credit: sumAmounts(own.map((sale) => sale.creditAmount ?? 0)),
      discounts: sumAmounts(own.map((sale) => sale.discountTotal ?? 0)),
      returnsCount: ownReturns.length,
      returnsTotal: sumAmounts(ownReturns.map((r) => r.total)),
      cashRefunds,
      cashIn,
      cashOut,
      drawerOpens: shift.value?.drawerOpens ?? 0,
      // الدرج = العهدة + المبيعات النقدية − ما رُدّ نقداً + الإيداعات − المسحوبات
      expectedCash: sumAmounts([
        shift.value?.openingCash ?? 0,
        cash,
        -cashRefunds,
        cashIn,
        -cashOut,
      ]),
    };
  });

  const closeShift = async (closingCash: number, note: string) => {
    if (!shift.value) throw new Error("لا توجد وردية مفتوحة");
    if (held.value.length) {
      throw new Error("توجد فواتير معلّقة — أتمّها أو احذفها قبل التقفيل");
    }
    const closedAt = new Date().toISOString();
    await posDb.enqueue(
      {
        id: `close-${shift.value.id}`,
        type: "shift.close",
        payload: {
          id: shift.value.id,
          closedAt,
          closingCash,
          note: note || undefined,
          drawerOpens: shift.value.drawerOpens ?? 0,
        },
        createdAt: closedAt,
      },
      { shift: null, cart: null },
    );
    shift.value = null;
    cart.value = [];
    customerId.value = "";
    invoiceDiscount.value = null;
    await reloadOutbox();
    void sync();
  };

  // ─── سجل التدقيق ────────────────────────────────────────────────────────────
  /**
   * يسجّل ما لا يترك أثراً في الفواتير (حذف سطر، إفراغ سلة، فتح الدرج، خصم…).
   * يُرفع مع الطابور في النبضة التالية — لا يستعجل اتصالاً لكل حدث.
   */
  const logAudit = async (
    action: AuditAction,
    info: { amount?: number; details?: string; approvedBy?: string | null } = {},
  ) => {
    if (!device.value) return;
    const id = newUuid();
    const occurredAt = new Date().toISOString();
    await posDb.enqueue({
      id: `audit-${id}`,
      type: "audit",
      createdAt: occurredAt,
      payload: {
        id,
        action,
        occurredAt,
        shiftId: shift.value?.id,
        cashierName: shift.value?.cashierName || undefined,
        approvedBy: info.approvedBy || undefined,
        amount: info.amount,
        details: info.details?.slice(0, 500),
      },
    });
    await reloadOutbox();
  };

  // ─── موافقة المشرف ──────────────────────────────────────────────────────────
  const supervisors = computed(() => cashiers.value.filter((c) => c.isSupervisor));

  /**
   * هل تحتاج العملية رقم مشرف السري؟ شركة لم تعرّف كاشيرات لا تستخدم الأرقام
   * السرية أصلاً، ووردية يفتحها مشرف لا تحتاج موافقة غيره.
   * `always`: ما يتجاوز صلاحية الكاشير دائماً (خصم فوق حدّه، بيع تحت أقل سعر).
   */
  const needsSupervisor = (
    kind: keyof PosOptions["approvals"] | "always",
  ): boolean => {
    if (!cashiers.value.length) return false;
    if (shiftCashier.value?.isSupervisor) return false;
    return kind === "always" ? true : posOptions.value.approvals[kind];
  };

  // ─── الرصيد وأرصدة العملاء ──────────────────────────────────────────────────
  /** مبيعات هذه الشاشة التي لم يؤكد السيرفر استلامها بعد */
  const pendingSales = computed(() => {
    const queued = new Set(
      outbox.value.filter((e) => e.type === "sale").map((e) => e.id),
    );
    return sales.value.filter((sale) => queued.has(`sale-${sale.uuid}`));
  });

  /** ما بيع هنا ولم يصل السيرفر بعد، بوحدة الأساس لكل صنف */
  const pendingSold = computed(() => {
    const sold = new Map<string, number>();
    for (const line of pendingSales.value.flatMap((sale) => sale.lines)) {
      sold.set(
        line.productId,
        (sold.get(line.productId) ?? 0) + (line.baseQuantity ?? line.quantity),
      );
    }
    return sold;
  });

  /**
   * المتاح من الصنف في مخزن الجهاز (بوحدة الأساس) = آخر رصيد من السيرفر − ما
   * بيع هنا ولم يُرفع. null = خدمة بلا مخزون، أو الأرصدة لم تصل بعد.
   */
  const stockOf = (product: PosProduct): number | null => {
    if (!product.isStocked || !stockKnown.value) return null;
    return roundQuantity(
      (stockLevels.value[product.id] ?? 0) - (pendingSold.value.get(product.id) ?? 0),
    );
  };

  /** مخزن الجهاز لا يسمح بالرصيد السالب: السيرفر سيرفض البيع بأكثر من المتاح */
  const stockEnforced = computed(
    () => device.value?.warehouse?.allowNegativeStock === false,
  );

  /** ما في السلة من الصنف بوحدة الأساس */
  const inCart = (productId: string) =>
    cart.value
      .filter((line) => line.product.id === productId)
      .reduce((sum, line) => sum + (Number(line.quantity) || 0) * line.factor, 0);

  /** ما على العميل = آخر ما عرفه السيرفر + ما بيع له آجلاً هنا ولم يُرفع */
  const customerBalance = (id: string): number =>
    sumAmounts([
      serverBalances.value[id] ?? 0,
      ...pendingSales.value
        .filter((sale) => sale.customerId === id)
        .map((sale) => sale.creditAmount ?? 0),
    ]);

  // ─── السلة ──────────────────────────────────────────────────────────────────
  const cart = ref<CartLine[]>([]);
  const customerId = ref("");
  /** خصم الكاشير على الفاتورة كلها */
  const invoiceDiscount = ref<InvoiceDiscount | null>(null);
  /** السطر المحدد: عليه تعمل اختصارات لوحة المفاتيح */
  const selectedKey = ref<number | null>(null);
  let lineKey = 0;

  /** السلة مسعّرة: العروض، خصم الكاشير، وخصم الفاتورة موزّعاً على الأسطر */
  const priced = computed(() =>
    priceCart(cart.value, {
      promotions: promotions.value,
      customerId: customerId.value || null,
      now: now.value,
      invoiceDiscount: invoiceDiscount.value,
    }),
  );

  const cartTotals = computed(() => ({
    subtotal: priced.value.subtotal,
    taxTotal: priced.value.taxTotal,
    total: priced.value.total,
    items: priced.value.items,
  }));

  /** حد خصم كاشير الوردية % (null = بلا حد) */
  const discountLimit = computed(
    () => shiftCashier.value?.maxDiscountPercent ?? null,
  );

  /**
   * ما يتجاوز صلاحية الكاشير في السلة الحالية ويحتاج موافقة مشرف قبل الدفع.
   * `blocked`: ما لا يُتجاوز أصلاً (كمية أو خصم غير منطقي، أو رصيد غير كافٍ).
   */
  const cartIssues = computed(() => {
    const issues = priced.value.lines
      .map((line) => pricingIssue(line))
      .filter((issue): issue is NonNullable<typeof issue> => !!issue);
    const blocked = issues.filter((issue) => issue.blocking).map((i) => i.message);

    if (stockEnforced.value) {
      for (const product of new Set(cart.value.map((line) => line.product))) {
        const available = stockOf(product);
        if (available !== null && inCart(product.id) > available + 1e-9) {
          blocked.push(
            `الرصيد المتاح من "${product.name}" ${available} فقط`,
          );
        }
      }
    }
    return {
      blocked,
      belowMin: issues.filter((issue) => !issue.blocking).map((i) => i.message),
      discountOverLimit:
        discountLimit.value !== null &&
        priced.value.manualPercent > discountLimit.value + 0.005,
    };
  });

  const serializeCart = (): StoredCart => ({
    lines: cart.value.map((line) => ({
      productId: line.product.id,
      unitId: line.unitId,
      quantity: Number(line.quantity) || 0,
      discount: Number(line.discount) || 0,
    })),
    customerId: customerId.value,
    invoiceDiscount: invoiceDiscount.value,
  });

  const buildLine = (
    product: PosProduct,
    unitId: string | null,
    quantity: number,
    discount = 0,
  ): CartLine => {
    const unit = unitId ? product.units.find((u) => u.unitId === unitId) : null;
    return {
      key: ++lineKey,
      product,
      unitId: unit ? unit.unitId : null,
      unitName: unit ? unit.name : product.baseUnitName,
      factor: unit ? unit.factor : 1,
      quantity,
      unitPrice: unitPriceOf(product, unit ? unit.unitId : null),
      discount,
    };
  };

  /** يعيد بناء سلة محفوظة بأحدث بيانات الأصناف (صنف حُذف من الجهاز يسقط) */
  const restoreCart = (stored: StoredCart) => {
    const byId = new Map(products.value.map((p) => [p.id, p]));
    cart.value = stored.lines.flatMap((line) => {
      const product = byId.get(line.productId);
      return product
        ? [buildLine(product, line.unitId, line.quantity, line.discount)]
        : [];
    });
    customerId.value = customers.value.some((c) => c.id === stored.customerId)
      ? stored.customerId
      : "";
    invoiceDiscount.value = stored.invoiceDiscount ?? null;
    selectedKey.value = cart.value.at(-1)?.key ?? null;
  };

  // السلة تُحفظ على الجهاز مع كل تعديل: تبقى بعد إغلاق المتصفح أو انقطاع الكهرباء
  let cartSaveTimer: ReturnType<typeof setTimeout> | null = null;
  watch(
    [cart, customerId, invoiceDiscount],
    () => {
      if (!ready.value) return;
      if (cartSaveTimer) clearTimeout(cartSaveTimer);
      cartSaveTimer = setTimeout(() => {
        void posDb.setMeta({ cart: cart.value.length ? serializeCart() : null });
      }, CART_SAVE_DELAY_MS);
    },
    { deep: true },
  );

  /**
   * يضيف صنفاً للسلة، أو يزيد كميته إن كان موجوداً بنفس الوحدة. يرمي خطأ إن
   * كان مخزن الجهاز لا يسمح بالسالب والمتاح لا يكفي.
   */
  const addProduct = (
    product: PosProduct,
    unitId: string | null = null,
    quantity = 1,
  ): CartLine => {
    // باركود وحدة الأساس قد يحمل معرّفها صراحةً
    const effectiveUnit = unitId === product.baseUnitId ? null : unitId;
    const unit = effectiveUnit
      ? product.units.find((u) => u.unitId === effectiveUnit)
      : null;

    const available = stockOf(product);
    if (stockEnforced.value && available !== null) {
      const wanted = inCart(product.id) + quantity * (unit ? unit.factor : 1);
      if (wanted > available + 1e-9) {
        throw new Error(
          available > 0
            ? `الرصيد المتاح من "${product.name}" ${available} فقط`
            : `"${product.name}" غير متوفر في المخزن`,
        );
      }
    }

    const existing = cart.value.find(
      (line) => line.product.id === product.id && line.unitId === (unit?.unitId ?? null),
    );
    if (existing) {
      existing.quantity = roundQuantity((Number(existing.quantity) || 0) + quantity);
      selectedKey.value = existing.key;
      return existing;
    }
    const line = buildLine(product, unit?.unitId ?? null, quantity);
    cart.value.push(line);
    selectedKey.value = line.key;
    // من مصفوفة السلة: الكائن التفاعلي الذي يراه القالب
    return cart.value.at(-1)!;
  };

  /**
   * مسح باركود: باركود صنف، أو باركود ميزان يحمل الوزن أو السعر. يعيد false
   * إذا لم يُعرف.
   */
  const scan = (barcode: string): boolean => {
    const code = barcode.trim();
    const match = barcodeIndex.value.get(code);
    if (match) {
      addProduct(match.product, match.unitId);
      return true;
    }

    const reading = parseScaleBarcode(code, posOptions.value.scale);
    if (!reading) return false;
    const product =
      reading.itemCodes
        .map((item) => barcodeIndex.value.get(item)?.product)
        .find((found) => !!found) ??
      products.value.find((p) => reading.itemCodes.includes(p.sku));
    if (!product) return false;

    const unitPrice = unitPriceOf(product, null);
    const quantity =
      reading.type === "weight"
        ? reading.value
        : unitPrice > 0
          ? // الميزان طبع السعر: الوزن = السعر ÷ سعر الكيلو
            Math.round((reading.value / unitPrice) * 10 ** WEIGHT_DECIMALS) /
            10 ** WEIGHT_DECIMALS
          : 0;
    if (!(quantity > 0)) return false;
    addProduct(product, null, quantity);
    return true;
  };

  const lineLabel = (line: CartLine) =>
    `${line.product.name} × ${Number(line.quantity) || 0} ${line.unitName}`;

  /** يحذف سطراً ويسجّله في سجل التدقيق */
  const removeLine = async (key: number, approvedBy: string | null = null) => {
    const target = priced.value.lines.find((p) => p.line.key === key);
    cart.value = cart.value.filter((line) => line.key !== key);
    if (selectedKey.value === key) selectedKey.value = cart.value.at(-1)?.key ?? null;
    if (target) {
      await logAudit("line_removed", {
        amount: target.total,
        details: lineLabel(target.line),
        approvedBy,
      });
    }
  };

  /** يفرغ السلة بلا تسجيل (بعد بيع أو تعليق) */
  const resetCart = () => {
    cart.value = [];
    customerId.value = "";
    invoiceDiscount.value = null;
    selectedKey.value = null;
  };

  /** الكاشير يفرغ السلة: يُسجَّل في سجل التدقيق */
  const clearCart = async (approvedBy: string | null = null) => {
    if (!cart.value.length) return;
    const total = priced.value.total;
    const details = cart.value.map(lineLabel).join("، ");
    resetCart();
    await logAudit("cart_cleared", { amount: total, details, approvedBy });
  };

  // ─── تعليق الفاتورة ─────────────────────────────────────────────────────────
  const saveHeld = () => posDb.setMeta({ held: held.value });

  /** يعلّق السلة الحالية ليخدم الكاشير عميلاً آخر */
  const holdCart = async (label = "") => {
    if (!cart.value.length) throw new Error("السلة فارغة");
    const entry: HeldCart = {
      ...serializeCart(),
      id: newUuid(),
      heldAt: new Date().toISOString(),
      label: label.trim(),
      total: priced.value.total,
      items: priced.value.items,
    };
    held.value = [...held.value, entry];
    await saveHeld();
    resetCart();
    await logAudit("sale_held", {
      amount: entry.total,
      details: entry.label || undefined,
    });
  };

  /** يسترجع فاتورة معلّقة (والسلة الحالية، إن وُجدت، تُعلَّق مكانها) */
  const resumeHeld = async (id: string) => {
    const entry = held.value.find((h) => h.id === id);
    if (!entry) return;
    if (cart.value.length) await holdCart();
    held.value = held.value.filter((h) => h.id !== id);
    await saveHeld();
    restoreCart(entry);
  };

  const deleteHeld = async (id: string, approvedBy: string | null = null) => {
    const entry = held.value.find((h) => h.id === id);
    if (!entry) return;
    held.value = held.value.filter((h) => h.id !== id);
    await saveHeld();
    await logAudit("held_deleted", {
      amount: entry.total,
      details: entry.label || undefined,
      approvedBy,
    });
  };

  // ─── حركات الدرج النقدية ────────────────────────────────────────────────────
  /** إيداع نقد في الدرج أو سحبه بلا بيع (فكّة، مصروف نثري، توريد للخزنة) */
  const addCashMove = async (
    type: CashMove["type"],
    amount: number,
    reason: string,
    approvedBy: string | null = null,
  ): Promise<CashMove> => {
    if (!shift.value) throw new Error("افتح وردية أولاً");
    if (!(amount > 0)) throw new Error("أدخل المبلغ");
    if (!reason.trim()) throw new Error("اكتب سبب الحركة");
    if (type === "out" && amount > shiftSummary.value.expectedCash + 1e-9) {
      throw new Error(
        `المبلغ أكبر من المفترض في الدرج (${shiftSummary.value.expectedCash})`,
      );
    }

    const move: CashMove = {
      id: newUuid(),
      shiftId: shift.value.id,
      type,
      amount: roundAmount(amount),
      reason: reason.trim(),
      occurredAt: new Date().toISOString(),
      approvedBy,
    };
    const next = [...cashMoves.value, move];
    await posDb.enqueue(
      {
        id: `cash-${move.id}`,
        type: "cash.move",
        createdAt: move.occurredAt,
        payload: {
          id: move.id,
          shiftId: move.shiftId,
          type,
          amount: move.amount,
          reason: move.reason,
          occurredAt: move.occurredAt,
          cashierName: shift.value.cashierName || undefined,
          approvedBy: approvedBy || undefined,
        },
      },
      { cashMoves: next },
    );
    cashMoves.value = next;
    await logAudit(type === "in" ? "cash_in" : "cash_out", {
      amount: move.amount,
      details: move.reason,
      approvedBy,
    });
    void sync();
    return move;
  };

  // ─── عميل من الشاشة ─────────────────────────────────────────────────────────
  /** يضيف عميلاً على الجهاز ويختاره؛ يُرفع قبل فواتيره (الطابور بالترتيب) */
  const addCustomer = async (input: {
    name: string;
    phone?: string;
    taxNumber?: string;
  }): Promise<PosCustomer> => {
    const name = input.name.trim();
    if (!name) throw new Error("اسم العميل مطلوب");
    const taxNumber = input.taxNumber?.trim() || null;
    if (taxNumber && !/^\d{15}$/.test(taxNumber)) {
      throw new Error("الرقم الضريبي يتكون من 15 رقماً");
    }

    const customer: PosCustomer = {
      id: newUuid(),
      name,
      phone: input.phone?.trim() || null,
      taxNumber,
      creditLimit: null,
      paymentTermsDays: 0,
      available: true,
      local: true,
    };
    await posDb.saveCustomer(customer, {
      id: `customer-${customer.id}`,
      type: "customer.create",
      createdAt: new Date().toISOString(),
      payload: {
        id: customer.id,
        name,
        phone: customer.phone ?? undefined,
        taxNumber: taxNumber ?? undefined,
      },
    });
    customers.value = [...customers.value, customer];
    customerId.value = customer.id;
    await reloadOutbox();
    void sync();
    return customer;
  };

  // ─── إتمام البيع ────────────────────────────────────────────────────────────
  /**
   * يحفظ الفاتورة على الجهاز ويضعها في طابور الرفع، ثم يحاول رفعها. يعيد
   * الفاتورة لطباعة إيصالها فوراً — سواء وُجد إنترنت أم لا.
   *
   * ما قُبض أقل من الإجمالي = الباقي على حساب العميل (بيع آجل، لعميل مسجّل).
   * `approvedBy`: المشرف الذي وافق على ما يتجاوز صلاحية الكاشير (انظر
   * cartIssues) — الشاشة تطلبه قبل الاستدعاء.
   */
  const checkout = async (
    payments: SalePayment[],
    cashReceived: number,
    approvedBy: string | null = null,
  ): Promise<LocalSale> => {
    if (!device.value || !shift.value) throw new Error("افتح وردية أولاً");
    if (cashierRevoked.value) {
      throw new Error("تم إيقاف كاشير هذه الوردية — قفّل الوردية ليفتح غيره");
    }
    if (cart.value.length === 0) throw new Error("السلة فارغة");

    const current = priced.value;
    const issues = cartIssues.value;
    if (issues.blocked.length) throw new Error(issues.blocked[0]);

    const total = current.total;
    const paid = sumAmounts(payments.map((p) => p.amount));
    const creditAmount = sumAmounts([total, -paid]);
    if (creditAmount < 0) throw new Error("المقبوض أكبر من إجمالي الفاتورة");

    const customer = customers.value.find((c) => c.id === customerId.value);
    let creditOverLimit = false;
    if (creditAmount > 0) {
      if (!customer) throw new Error("البيع الآجل لعميل مسجّل — اختر العميل");
      const limit = customer.creditLimit ?? null;
      creditOverLimit =
        limit !== null && customerBalance(customer.id) + creditAmount > limit + 1e-9;
    }

    // ما يتجاوز صلاحية الكاشير: بموافقة مشرف، أو يُمنع إن لم يوجد من يوافق
    const overrides = [
      ...issues.belowMin,
      ...(issues.discountOverLimit
        ? [`الخصم يتجاوز حدّ الكاشير (${discountLimit.value}%)`]
        : []),
      ...(creditOverLimit ? [`تجاوز حد ائتمان العميل "${customer!.name}"`] : []),
    ];
    const selfApproved = !!shiftCashier.value?.isSupervisor;
    if (overrides.length && !approvedBy && !selfApproved) {
      throw new Error(overrides[0]);
    }
    const approver = overrides.length
      ? (approvedBy ?? shiftCashier.value?.name ?? null)
      : null;

    const lines: SaleLine[] = current.lines.map((p) => ({
      productId: p.line.product.id,
      productName: p.line.product.name,
      unitId: p.line.unitId ?? undefined,
      unitName: p.line.unitName,
      quantity: Number(p.line.quantity),
      unitPrice: p.unitPrice,
      discount: p.discount,
      taxRate: p.line.product.taxRate,
      subtotal: p.subtotal,
      taxAmount: p.taxAmount,
      total: p.total,
      baseQuantity: roundQuantity(Number(p.line.quantity) * p.line.factor),
      promoName: p.promoName,
    }));
    const taxTotal = current.taxTotal;

    const nextCounter = counter.value + 1;
    const issuedAt = new Date().toISOString();
    const cashPaid = sumAmounts(
      payments.filter((p) => p.method === "cash").map((p) => p.amount),
    );

    const sale: LocalSale = {
      uuid: newUuid(),
      number: `${device.value.code}-${String(nextCounter).padStart(COUNTER_DIGITS, "0")}`,
      issuedAt,
      shiftId: shift.value.id,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      customerTaxNumber: customer?.taxNumber ?? null,
      pricesIncludeTax: POS_PRICES_INCLUDE_TAX,
      lines,
      payments,
      subtotal: current.subtotal,
      taxTotal,
      total,
      cashReceived,
      change: Math.max(sumAmounts([cashReceived, -cashPaid]), 0),
      creditAmount,
      discountTotal: sumAmounts([current.promoDiscount, current.manualDiscount]),
      qrCode: settings.value?.taxNumber
        ? buildZatcaQr({
            sellerName: settings.value.sellerName ?? "",
            taxNumber: settings.value.taxNumber,
            issuedAt,
            total,
            taxTotal,
          })
        : null,
    };

    await posDb.saveSale(
      sale,
      {
        id: `sale-${sale.uuid}`,
        type: "sale",
        createdAt: issuedAt,
        payload: {
          uuid: sale.uuid,
          number: sale.number,
          issuedAt,
          shiftId: sale.shiftId,
          customerId: sale.customerId ?? undefined,
          pricesIncludeTax: sale.pricesIncludeTax,
          // ما يخص الشاشة وحدها (الاسم، الرصيد، العرض) لا يُرفع
          lines: lines.map(
            ({
              productName: _name,
              unitName: _unit,
              baseQuantity: _base,
              promoName: _promo,
              ...line
            }) => line,
          ),
          payments,
        },
      },
      nextCounter,
    );

    counter.value = nextCounter;
    sales.value.push(sale);
    resetCart();
    await reloadOutbox();

    if (current.manualDiscount > 0) {
      await logAudit("discount", {
        amount: current.manualDiscount,
        details: `${sale.number} — ${current.manualPercent.toFixed(1)}%`,
        approvedBy: issues.discountOverLimit ? approver : null,
      });
    }
    if (issues.belowMin.length) {
      await logAudit("price_below_min", {
        details: `${sale.number} — ${issues.belowMin.join("، ")}`,
        approvedBy: approver,
      });
    }
    if (creditOverLimit) {
      await logAudit("credit_over_limit", {
        amount: creditAmount,
        details: `${sale.number} — ${customer!.name}`,
        approvedBy: approver,
      });
    }

    void sync();
    return sale;
  };

  // ─── المرتجع ────────────────────────────────────────────────────────────────
  /** مرتجعات هذه الشاشة التي لم يؤكد السيرفر استلامها بعد */
  const pendingReturnsOf = (invoiceNumber: string) =>
    returns.value.filter(
      (r) =>
        r.invoiceNumber === invoiceNumber &&
        outbox.value.some((entry) => entry.id === `return-${r.uuid}`),
    );

  /** يطرح من الفاتورة ما أُرجع منها على هذه الشاشة */
  const withReturns = (
    invoice: ReturnableInvoice,
    done: LocalReturn[],
  ): ReturnableInvoice => {
    const returned = new Map<number, number>();
    for (const line of done.flatMap((r) => r.lines)) {
      returned.set(line.lineIndex, (returned.get(line.lineIndex) ?? 0) + line.quantity);
    }
    return {
      ...invoice,
      returnedAmount: sumAmounts([invoice.returnedAmount, ...done.map((r) => r.total)]),
      paidAmount: sumAmounts([invoice.paidAmount, ...done.map((r) => -r.refundAmount)]),
      lines: invoice.lines.map((line) => ({
        ...line,
        returnedQuantity: line.returnedQuantity + (returned.get(line.lineIndex) ?? 0),
      })),
    };
  };

  /**
   * يجلب فاتورة برقمها لاختيار ما يُرجَع منها: من السيرفر (أي فاتورة للشركة)،
   * وبلا إنترنت من نسخة الجهاز (فواتير هذه الشاشة فقط).
   */
  const lookupInvoice = async (rawNumber: string): Promise<ReturnableInvoice> => {
    const number = rawNumber.trim();
    if (!number) throw new Error("أدخل رقم الفاتورة");

    try {
      const remote = await deviceApi().get<Omit<ReturnableInvoice, "local">>(
        `/invoices/${encodeURIComponent(number)}`,
      );
      online.value = true;
      markContact();
      // السيرفر لم يرَ بعد ما ينتظر الرفع من هذه الشاشة
      return withReturns({ ...remote, local: false }, pendingReturnsOf(remote.number));
    } catch (error) {
      const waiting = sales.value.find(
        (sale) => sale.number.toLowerCase() === number.toLowerCase(),
      );
      // فاتورة بيعت هنا ولم تُرفع بعد: السيرفر لا يعرفها، ونسخة الجهاز تكفي
      const notUploaded =
        waiting && outbox.value.some((entry) => entry.id === `sale-${waiting.uuid}`);
      if (!(error instanceof OfflineError) && !notUploaded) throw error;
      if (error instanceof OfflineError) online.value = false;
      if (!waiting) {
        throw new Error(
          "لا يوجد اتصال — بلا إنترنت يمكن إرجاع فواتير هذه الشاشة فقط",
        );
      }
      return withReturns(
        {
          number: waiting.number,
          issuedAt: waiting.issuedAt,
          customerName: waiting.customerName,
          total: waiting.total,
          // ما بيع آجلاً لم يُدفع: لا يُردّ منه نقد
          paidAmount: sumAmounts([waiting.total, -(waiting.creditAmount ?? 0)]),
          returnedAmount: 0,
          lines: waiting.lines.map((line, lineIndex) => ({
            lineIndex,
            productName: line.productName,
            unitName: line.unitName,
            quantity: line.quantity,
            returnedQuantity: 0,
            subtotal: line.subtotal,
            taxAmount: line.taxAmount,
            total: line.total,
          })),
          local: true,
        },
        returns.value.filter((r) => r.invoiceNumber === waiting.number),
      );
    }
  };

  /** قيمة مرتجع وما يُردّ للعميل منه (نفس قاعدة السيرفر: المدفوع الزائد) */
  const refundPreview = (
    invoice: ReturnableInvoice,
    quantities: Record<number, number>,
  ) => {
    const lines = invoice.lines
      .map((line) => ({ line, quantity: Number(quantities[line.lineIndex]) || 0 }))
      .filter((item) => item.quantity > 0);
    const total = sumAmounts(
      lines.map((item) => returnShare(item.line, item.quantity).total),
    );
    const net = sumAmounts([invoice.total, -invoice.returnedAmount, -total]);
    return {
      lines,
      total,
      refund: Math.max(sumAmounts([invoice.paidAmount, -net]), 0),
    };
  };

  /**
   * يسجّل المرتجع على الجهاز ويضعه في طابور الرفع. المبلغ يخرج من درج الوردية
   * الحالية، حتى لو كانت الفاتورة من وردية سابقة.
   */
  const refund = async (
    invoice: ReturnableInvoice,
    quantities: Record<number, number>,
    method: SalesPaymentMethod,
    reason: string,
  ): Promise<LocalReturn> => {
    if (!shift.value) throw new Error("افتح وردية أولاً");
    if (!canReturn.value) throw new Error("لا تملك صلاحية عمل مرتجع");
    const preview = refundPreview(invoice, quantities);
    if (preview.lines.length === 0) throw new Error("حدّد كمية صنف واحد على الأقل");
    for (const { line, quantity } of preview.lines) {
      if (quantity > line.quantity - line.returnedQuantity + 1e-9) {
        throw new Error(`كمية "${line.productName}" أكبر من المتاح للإرجاع`);
      }
    }

    const issuedAt = new Date().toISOString();
    const salesReturn: LocalReturn = {
      uuid: newUuid(),
      invoiceNumber: invoice.number,
      issuedAt,
      shiftId: shift.value.id,
      lines: preview.lines.map(({ line, quantity }) => ({
        lineIndex: line.lineIndex,
        productName: line.productName,
        unitName: line.unitName,
        quantity,
        total: returnShare(line, quantity).total,
      })),
      total: preview.total,
      refundMethod: method,
      refundAmount: preview.refund,
      reason: reason || null,
    };

    await posDb.saveReturn(salesReturn, {
      id: `return-${salesReturn.uuid}`,
      type: "return",
      createdAt: issuedAt,
      payload: {
        uuid: salesReturn.uuid,
        invoiceNumber: salesReturn.invoiceNumber,
        issuedAt,
        shiftId: salesReturn.shiftId,
        lines: salesReturn.lines.map(({ lineIndex, quantity }) => ({ lineIndex, quantity })),
        refundMethod: method,
        refundAmount: salesReturn.refundAmount,
        reason: reason || undefined,
      },
    });
    returns.value.push(salesReturn);
    await reloadOutbox();
    void sync();
    return salesReturn;
  };

  // ─── درج النقود ─────────────────────────────────────────────────────────────
  const setDrawer = async (config: DrawerConfig) => {
    drawer.value = { ...config };
    await posDb.setMeta({ drawer: drawer.value });
  };

  /**
   * يفتح الدرج. `manual` = بلا بيع ولا مرتجع: يُعدّ على الوردية ويظهر
   * للمدير عند التقفيل.
   */
  const openDrawer = async (manual = false, approvedBy: string | null = null) => {
    if (drawer.value.mode === "off") return;
    await kickDrawer(drawer.value);
    if (manual && shift.value) {
      shift.value = {
        ...shift.value,
        drawerOpens: (shift.value.drawerOpens ?? 0) + 1,
      };
      await posDb.setMeta({ shift: shift.value });
      await logAudit("drawer_opened", { approvedBy });
    }
  };

  /** يعيد محاولة ما رفضه السيرفر (في مكانه من الطابور: الترتيب مهم) */
  const retryFailed = async () => {
    await posDb.clearOutboxErrors(failedEntries.value);
    await reloadOutbox();
    await sync();
  };

  /**
   * خطة الشركة وصلاحيات المستخدم المسجّل دخوله الآن — إن وُجد واتصلنا. يعيد
   * null إن تعذر (بلا إنترنت أو بلا جلسة)، وهذا لا يمنع البيع: الشاشة تعمل
   * بهوية جهازها.
   */
  const fetchUserAccess = async (): Promise<AccessResponse | null> => {
    if (!api.hasSession()) return null;
    try {
      return await api.get<AccessResponse>("/subscriptions/me/access");
    } catch {
      return null;
    }
  };

  const reset = () => {
    stop();
    // السلة تبقى محفوظة على الجهاز: تعود عند فتح الشاشة من جديد
    ready.value = false;
    cart.value = [];
    customerId.value = "";
    invoiceDiscount.value = null;
  };

  return {
    ready,
    device,
    settings,
    shift,
    counter,
    lastSync,
    cashierName,
    products,
    customers,
    categories,
    sales,
    outbox,
    online,
    sessionExpired,
    syncing,
    lastError,
    installationId,
    bindError,
    rebind,
    tenant,
    cashiers,
    shiftCashier,
    cashierRevoked,
    canReturn,
    suspended,
    lastContactAt,
    offlineHours,
    offlineState,
    offlinePolicy,
    shiftBlockReason,
    fetchUserAccess,
    pendingCount,
    failedEntries,
    init,
    start,
    stop,
    sync,
    pull,
    fetchDevices,
    bindDevice,
    openShift,
    closeShift,
    shiftSummary,
    cart,
    customerId,
    invoiceDiscount,
    selectedKey,
    priced,
    cartTotals,
    cartIssues,
    discountLimit,
    addProduct,
    scan,
    removeLine,
    clearCart,
    checkout,
    held,
    holdCart,
    resumeHeld,
    deleteHeld,
    cashMoves,
    addCashMove,
    addCustomer,
    customerBalance,
    stockOf,
    stockEnforced,
    promotions,
    posOptions,
    supervisors,
    needsSupervisor,
    logAudit,
    returns,
    lookupInvoice,
    refundPreview,
    refund,
    drawer,
    setDrawer,
    openDrawer,
    retryFailed,
    reset,
  };
});
