// pos/store/state.ts — حالة شاشة الكاشير المشتركة بين أجزاء المتجر
//
// كل الحالة هنا: أجزاء المتجر (الاتصال، الوردية، السلة، البيع) تقرأ وتكتب
// نفس الـ refs، ومتجر stores/pos.ts يجمعها ويعرضها كمتجر واحد.
import { computed, ref } from "vue";
import { newUuid } from "@/pos/calc";
import { posDb } from "@/pos/db";
import { DEFAULT_DRAWER, type DrawerConfig } from "@/pos/drawer";
import type {
  CartLine,
  CashMove,
  DeviceKitchenOrder,
  HeldCart,
  InvoiceDiscount,
  LocalReturn,
  LocalSale,
  LocalKitchenTicket,
  LocalShift,
  OrderContext,
  OrderType,
  OutboxEntry,
  PosCashier,
  PosCategory,
  PosCustomer,
  PosDeliveryOptions,
  PosDevice,
  PosOfflinePolicy,
  PosOptions,
  PosProduct,
  PosFeatures,
  PosPromotion,
  PosRestaurantOptions,
  PosTenantProfile,
  TableOrder,
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
/** كل المميزات مفعّلة إلا الدفع السريع: الشاشة كما كانت قبل إعدادها */
export const DEFAULT_POS_FEATURES: PosFeatures = {
  customers: true,
  addCustomer: true,
  creditSales: true,
  lineDiscount: true,
  invoiceDiscount: true,
  priceChange: true,
  units: true,
  holdSales: true,
  cardPayments: true,
  quickPay: false,
  autoPrint: true,
  cashMoves: true,
  manualDrawer: true,
  returns: true,
  scaleBarcode: true,
  showStock: true,
  numpad: true,
  customerDisplay: true,
  delivery: true,
  tables: true,
  kitchen: true,
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
  approvals: {
    void: false,
    cashOut: false,
    manualDrawer: false,
    priceChange: false,
  },
};
/** تأخير حفظ السلة على الجهاز بعد آخر تعديل */
export const CART_SAVE_DELAY_MS = 300;
/** خانات كمية صنف موزون يُحسب وزنه من سعر باركود الميزان */
export const WEIGHT_DECIMALS = 3;
/** "آخر اتصال" وساعة الجهاز يُحفظان على القرص بهذه الوتيرة لا مع كل نبضة */
export const PERSIST_EVERY_MS = 60_000;

/** طلب جديد على الشاشة: سفري، أو طاولة */
export const newOrderContext = (
  type: OrderType = "takeaway",
  table: { id: string; name: string } | null = null,
): OrderContext => ({
  ref: newUuid(),
  type,
  tableId: table?.id ?? null,
  tableName: table?.name ?? null,
  openedAt: new Date().toISOString(),
  sent: [],
  rounds: 0,
});

/** كم بون مطبخ يُحفظ على الشاشة لإعادة طباعته */
export const KEEP_KITCHEN_TICKETS = 40;

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
  /** البيع "توصيل" (null = الباقة بلا توصيل) */
  const deliveryOptions = ref<PosDeliveryOptions | null>(null);
  /** المطاعم: الطاولات وإعدادات المطبخ (null = الباقة بلا مطاعم) */
  const restaurant = ref<PosRestaurantOptions | null>(null);
  /** الطلب الجاري (سفري أو طاولة) وما أُرسل منه للمطبخ */
  const order = ref<OrderContext>(newOrderContext());
  /** طلبات الطاولات المفتوحة على هذا الجهاز (غير الجاري) */
  const tableOrders = ref<TableOrder[]>([]);
  /** آخر بونات المطبخ من هذه الشاشة (لإعادة الطباعة) */
  const kitchenTickets = ref<LocalKitchenTicket[]>([]);
  /** حالة بونات هذه الشاشة في المطبخ (من السيرفر) */
  const kitchenOrders = ref<DeviceKitchenOrder[]>([]);
  /**
   * المميزات الظاهرة فعلاً: إعداد الشركة، وما تسمح به الباقة (التوصيل
   * والمطاعم ينزلان لمن في باقته)، وما تحتاجه كل ميزة
   */
  const features = computed<PosFeatures>(() => {
    const saved = { ...DEFAULT_POS_FEATURES, ...(posOptions.value.features ?? {}) };
    return {
      ...saved,
      addCustomer: saved.addCustomer && saved.customers,
      creditSales: saved.creditSales && saved.customers,
      scaleBarcode: posOptions.value.scale.enabled,
      delivery: saved.delivery && !!deliveryOptions.value,
      tables: saved.tables && !!restaurant.value,
      kitchen: saved.kitchen && !!restaurant.value,
    };
  });

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
    deliveryOptions,
    restaurant,
    features,
    order,
    tableOrders,
    kitchenTickets,
    kitchenOrders,
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
