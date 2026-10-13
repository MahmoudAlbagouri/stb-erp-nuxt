// stores/pos.ts — حالة شاشة الكاشير ومنطقها
//
// المبدأ: مسار واحد دائماً — كل بيع يُكتب أولاً في قاعدة بيانات الجهاز
// (IndexedDB) مع عملية في طابور الرفع، ثم يُرفع للسيرفر حين يتوفر الاتصال.
// لا فرق بين "أونلاين" و"أوفلاين" في طريقة البيع؛ الفرق فقط متى يُفرَّغ
// الطابور.
import { defineStore } from "pinia";
import { computed, ref } from "vue";
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
  pricingError,
  returnShare,
  sumAmounts,
  toSaleLine,
  unitPriceOf,
} from "@/pos/calc";
import { posDb } from "@/pos/db";
import { DEFAULT_DRAWER, kickDrawer, type DrawerConfig } from "@/pos/drawer";
import type {
  BoundPosDevice,
  CartLine,
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
  PosProduct,
  PosTenantProfile,
  ReturnableInvoice,
  SalePayment,
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
/** "آخر اتصال" وساعة الجهاز يُحفظان على القرص بهذه الوتيرة لا مع كل نبضة */
const PERSIST_EVERY_MS = 60_000;

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
    });
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
    const since = !full && lastSync.value ? `?since=${encodeURIComponent(lastSync.value)}` : "";
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
      { shift: next, cashierName: name },
    );
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
    return {
      invoicesCount: own.length,
      salesTotal: sumAmounts(own.map((sale) => sale.total)),
      cash,
      card: byMethod("card"),
      returnsCount: ownReturns.length,
      returnsTotal: sumAmounts(ownReturns.map((r) => r.total)),
      cashRefunds,
      drawerOpens: shift.value?.drawerOpens ?? 0,
      // الدرج = العهدة + المبيعات النقدية − ما رُدّ نقداً
      expectedCash: sumAmounts([shift.value?.openingCash ?? 0, cash, -cashRefunds]),
    };
  });

  const closeShift = async (closingCash: number, note: string) => {
    if (!shift.value) throw new Error("لا توجد وردية مفتوحة");
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
      { shift: null },
    );
    shift.value = null;
    cart.value = [];
    await reloadOutbox();
    void sync();
  };

  // ─── السلة ──────────────────────────────────────────────────────────────────
  const cart = ref<CartLine[]>([]);
  const customerId = ref("");
  let lineKey = 0;

  const cartTotals = computed(() => {
    const amounts = cart.value.map((line) =>
      lineAmounts({ ...line, taxRate: line.product.taxRate }),
    );
    return {
      subtotal: sumAmounts(amounts.map((a) => a.subtotal)),
      taxTotal: sumAmounts(amounts.map((a) => a.taxAmount)),
      total: sumAmounts(amounts.map((a) => a.total)),
      items: cart.value.reduce((count, line) => count + line.quantity, 0),
    };
  });

  /** يضيف صنفاً للسلة، أو يزيد كميته إن كان موجوداً بنفس الوحدة */
  const addProduct = (product: PosProduct, unitId: string | null = null) => {
    // باركود وحدة الأساس قد يحمل معرّفها صراحةً
    const effectiveUnit = unitId === product.baseUnitId ? null : unitId;
    const existing = cart.value.find(
      (line) => line.product.id === product.id && line.unitId === effectiveUnit,
    );
    if (existing) {
      existing.quantity += 1;
      return;
    }
    const unit = effectiveUnit
      ? product.units.find((u) => u.unitId === effectiveUnit)
      : null;
    cart.value.push({
      key: ++lineKey,
      product,
      unitId: unit ? unit.unitId : null,
      unitName: unit ? unit.name : product.baseUnitName,
      factor: unit ? unit.factor : 1,
      quantity: 1,
      unitPrice: unitPriceOf(product, unit ? unit.unitId : null),
      discount: 0,
    });
  };

  /** مسح باركود: يعيد false إذا لم يُعرف */
  const scan = (barcode: string): boolean => {
    const match = barcodeIndex.value.get(barcode.trim());
    if (!match) return false;
    addProduct(match.product, match.unitId);
    return true;
  };

  const removeLine = (key: number) => {
    cart.value = cart.value.filter((line) => line.key !== key);
  };

  const clearCart = () => {
    cart.value = [];
    customerId.value = "";
  };

  // ─── إتمام البيع ────────────────────────────────────────────────────────────
  /**
   * يحفظ الفاتورة على الجهاز ويضعها في طابور الرفع، ثم يحاول رفعها. يعيد
   * الفاتورة لطباعة إيصالها فوراً — سواء وُجد إنترنت أم لا.
   */
  const checkout = async (
    payments: SalePayment[],
    cashReceived: number,
  ): Promise<LocalSale> => {
    if (!device.value || !shift.value) throw new Error("افتح وردية أولاً");
    if (cashierRevoked.value) {
      throw new Error("تم إيقاف كاشير هذه الوردية — قفّل الوردية ليفتح غيره");
    }
    if (cart.value.length === 0) throw new Error("السلة فارغة");

    for (const line of cart.value) {
      if (!(line.quantity > 0)) throw new Error(`كمية "${line.product.name}" غير صحيحة`);
      const problem = pricingError(line);
      if (problem) throw new Error(problem);
    }

    const lines = cart.value.map(toSaleLine);
    const total = sumAmounts(lines.map((l) => l.total));
    const taxTotal = sumAmounts(lines.map((l) => l.taxAmount));
    if (sumAmounts(payments.map((p) => p.amount)) !== total) {
      throw new Error("المقبوض لا يساوي إجمالي الفاتورة");
    }

    const customer = customers.value.find((c) => c.id === customerId.value);
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
      subtotal: sumAmounts(lines.map((l) => l.subtotal)),
      taxTotal,
      total,
      cashReceived,
      change: Math.max(sumAmounts([cashReceived, -cashPaid]), 0),
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
          lines: lines.map(({ productName: _name, unitName: _unit, ...line }) => line),
          payments,
        },
      },
      nextCounter,
    );

    counter.value = nextCounter;
    sales.value.push(sale);
    clearCart();
    await reloadOutbox();
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
          paidAmount: waiting.total,
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
  const openDrawer = async (manual = false) => {
    if (drawer.value.mode === "off") return;
    await kickDrawer(drawer.value);
    if (manual && shift.value) {
      shift.value = {
        ...shift.value,
        drawerOpens: (shift.value.drawerOpens ?? 0) + 1,
      };
      await posDb.setMeta({ shift: shift.value });
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
    cart.value = [];
    customerId.value = "";
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
    cartTotals,
    addProduct,
    scan,
    removeLine,
    clearCart,
    checkout,
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
