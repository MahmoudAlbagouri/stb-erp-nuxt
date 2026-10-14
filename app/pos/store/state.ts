// pos/store/state.ts — حالة شاشة الكاشير المشتركة بين أجزاء المتجر
//
// كل الحالة هنا: أجزاء المتجر (الاتصال، الوردية، السلة، البيع) تقرأ وتكتب
// نفس الـ refs، ومتجر stores/pos.ts يجمعها ويعرضها كمتجر واحد.
import { computed, ref } from "vue";
import { posDb } from "@/pos/db";
import { DEFAULT_DRAWER, type DrawerConfig } from "@/pos/drawer";
import type {
  CartLine,
  CashMove,
  HeldCart,
  InvoiceDiscount,
  LocalReturn,
  LocalSale,
  LocalShift,
  OutboxEntry,
  PosCashier,
  PosCategory,
  PosCustomer,
  PosDevice,
  PosOfflinePolicy,
  PosOptions,
  PosProduct,
  PosPromotion,
  PosTenantProfile,
} from "@/pos/types";
import type { SalesSettings } from "@/types/sales";

/** كل كم يفحص الجهاز الاتصال ويرفع ما في طابوره */
export const HEARTBEAT_MS = 20_000;
/** كل كم يسحب تغييرات الأصناف والأسعار */
export const PULL_EVERY_MS = 5 * 60_000;
/** أقصى عدد عمليات في طلب رفع واحد (حد السيرفر) */
export const PUSH_BATCH = 100;
export const COUNTER_DIGITS = 6;
export const HOUR_MS = 3_600_000;
/** حد العمل بلا اتصال قبل أن يصل من السيرفر (نفس قيمه الافتراضية) */
export const DEFAULT_OFFLINE_POLICY: PosOfflinePolicy = {
  warnAfterHours: 72,
  blockAfterHours: 168,
};
/** إعدادات الكاشير قبل أن تصل من السيرفر (نفس قيمه الافتراضية) */
export const DEFAULT_POS_OPTIONS: PosOptions = {
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
export const CART_SAVE_DELAY_MS = 300;
/** خانات كمية صنف موزون يُحسب وزنه من سعر باركود الميزان */
export const WEIGHT_DECIMALS = 3;
/** "آخر اتصال" وساعة الجهاز يُحفظان على القرص بهذه الوتيرة لا مع كل نبضة */
export const PERSIST_EVERY_MS = 60_000;

/** الكميات بأربع خانات كما في السيرفر: يزيل ضجيج الفاصلة العائمة */
export const roundQuantity = (value: number): number =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;

export const createPosState = () => {
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

  // ─── السلة ──────────────────────────────────────────────────────────────────
  const cart = ref<CartLine[]>([]);
  const customerId = ref("");
  /** خصم الكاشير على الفاتورة كلها */
  const invoiceDiscount = ref<InvoiceDiscount | null>(null);
  /** السطر المحدد: عليه تعمل اختصارات لوحة المفاتيح */
  const selectedKey = ref<number | null>(null);

  // ─── الطابور ────────────────────────────────────────────────────────────────
  const pendingCount = computed(
    () => outbox.value.filter((entry) => !entry.error).length,
  );
  const failedEntries = computed(() =>
    outbox.value.filter((entry) => !!entry.error),
  );

  const reloadOutbox = async () => {
    outbox.value = await posDb.all("outbox");
  };

  /** هل في الطابور عملية من هذا النوع لهذا المعرّف؟ */
  const hasQueued = (type: OutboxEntry["type"], id: string) =>
    outbox.value.some((entry) => entry.type === type && entry.payload.id === id);

  return {
    ready,
    device,
    settings,
    shift,
    counter,
    lastSync,
    cashierName,
    returns,
    drawer,
    products,
    customers,
    categories,
    sales,
    outbox,
    tenant,
    cashiers,
    returnsAllowed,
    offlinePolicy,
    stockLevels,
    stockKnown,
    serverBalances,
    promotions,
    posOptions,
    held,
    cashMoves,
    online,
    sessionExpired,
    syncing,
    lastError,
    suspended,
    lastContactAt,
    now,
    installationId,
    bound,
    bindError,
    deviceKey,
    cart,
    customerId,
    invoiceDiscount,
    selectedKey,
    pendingCount,
    failedEntries,
    reloadOutbox,
    hasQueued,
  };
};

export type PosState = ReturnType<typeof createPosState>;
