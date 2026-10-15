// pos/types.ts — أنواع شاشة الكاشير (النسخة المحلية على الجهاز + طابور الرفع)
import type { SalesPaymentMethod, SalesSettings } from "@/types/sales";

// ─── ما ينزّله الجهاز من السيرفر ─────────────────────────────────────────────
export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  isStocked: boolean;
  categoryId: string | null;
  baseUnitId: string;
  baseUnitName: string;
  allowsFractions: boolean;
  taxRate: number;
  salePrice: number;
  priceIncludesTax: boolean;
  minSalePrice: number | null;
  allowDiscount: boolean;
  isWeighted: boolean;
  /**
   * سعر مفتوح: الشاشة تطلب السعر عند إضافته (salePrice اقتراح فقط). غائب في
   * بيانات نزلت قبل هذه النسخة = false
   */
  openPrice?: boolean;
  /** false = يُزال من الجهاز (حُذف أو أُوقف) */
  available: boolean;
  barcodes: { barcode: string; unitId: string | null }[];
  units: { unitId: string; name: string; factor: number; salePrice: number }[];
}

export interface PosCustomer {
  id: string;
  name: string;
  phone: string | null;
  taxNumber: string | null;
  /** أقصى مديونية للبيع الآجل (null أو غائب = بلا حد) */
  creditLimit?: number | null;
  paymentTermsDays?: number;
  available: boolean;
  /** أُضيف على هذه الشاشة ولم يؤكد السيرفر استلامه بعد */
  local?: boolean;
}

export interface PosCategory {
  id: string;
  name: string;
  parentId?: string | null;
  color?: string | null;
}

export interface PosDevice {
  id: string;
  /** الشركة صاحبة الجهاز: شاشة تحمل جهاز شركة غير شركة المستخدم تُحجب */
  tenantId?: string;
  name: string;
  code: string;
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
    /** false = البيع بأكثر من الرصيد يرفضه السيرفر، فتمنعه الشاشة */
    allowNegativeStock?: boolean;
    branch?: { id: string; name: string } | null;
  } | null;
  lastCounter: number;
  lastSeenAt?: string | null;
  isActive: boolean;
  hasOpenShift?: boolean;
  /** الشاشة (المتصفح) المربوطة بالجهاز — واحدة فقط */
  installationId?: string | null;
  boundAt?: string | null;
}

/** رد ربط الشاشة: الجهاز + مفتاحه (يصل هذه المرة فقط، ويُحفظ على الشاشة) */
export type BoundPosDevice = PosDevice & { deviceKey: string };

export interface PosDevicePayload {
  name: string;
  code?: string;
  warehouseId: string;
  isActive?: boolean;
}

export interface PosShiftRecord {
  id: string;
  deviceId: string;
  device?: Pick<PosDevice, "id" | "name" | "code"> | null;
  cashierName?: string | null;
  cashierId?: string | null;
  status: "open" | "closed";
  openedAt: string;
  openingCash: number;
  closedAt?: string | null;
  invoicesCount: number;
  salesTotal: number;
  cashTotal: number;
  cardTotal: number;
  returnsCount: number;
  returnsTotal: number;
  /** ما رُدّ نقداً من الدرج */
  cashRefunds: number;
  /** ما بيع على الحساب (آجل) */
  creditTotal: number;
  /** نقد أُودع في الدرج / سُحب منه بلا بيع */
  cashIn: number;
  cashOut: number;
  /** مرات فتح الدرج يدوياً بلا بيع */
  drawerOpens: number;
  expectedCash: number;
  closingCash?: number | null;
  cashDifference: number;
  note?: string | null;
  /** عمليات وصلت بعد التقفيل فأُعيد حساب الوردية (0 = الأرقام كما قُفّلت) */
  lateOperations?: number;
  recalculatedAt?: string | null;
}

export interface PosBootstrap {
  serverTime: string;
  /** true = يستبدل نسخة الجهاز كلها، false = تغييرات فقط */
  full: boolean;
  device: PosDevice;
  settings: SalesSettings;
  categories: PosCategory[];
  products: PosProduct[];
  customers: PosCustomer[];
  openShift: PosShiftRecord | null;
  tenant: PosTenantProfile;
  /** الكاشيرات الفعّالون (كاملة دائماً). فارغة = الورديات بلا رقم سري */
  cashiers: PosCashier[];
  /** صلاحية المرتجع لوردية بلا كاشير محدد */
  returnsAllowed: boolean;
  offlinePolicy: PosOfflinePolicy;
  /** أرصدة مخزن الجهاز: كلها (full) أو ما تغيّر. غائبة من سيرفر أقدم */
  stock?: { productId: string; quantity: number }[];
  /** ما على كل عميل الآن (القائمة كاملة دائماً) */
  customerBalances?: { id: string; balance: number }[];
  promotions?: PosPromotion[];
  posOptions?: PosOptions;
  /** البيع "توصيل": null = الباقة بلا توصيل. غائب من سيرفر أقدم */
  delivery?: PosDeliveryOptions | null;
}

/** ما ينزل للشاشة لتبيع توصيل بلا إنترنت */
export interface PosDeliveryOptions {
  /** صنف "رسوم التوصيل": سطر في الفاتورة */
  feeProductId: string;
  agents: {
    id: string;
    type: "driver" | "carrier";
    name: string;
    defaultFee: number;
    codFeePercent: number;
  }[];
  zones: { id: string; name: string; fee: number; estimatedMinutes: number | null }[];
}

/** بيانات التوصيل على فاتورة الكاشير (الأسماء للإيصال فقط، لا تُرفع) */
export interface SaleDelivery {
  recipientName: string;
  phone: string;
  address: string;
  zoneId: string | null;
  zoneName?: string | null;
  deliveryFee: number;
  agentId: string | null;
  agentName?: string | null;
  /** خرج مع الطيار فور البيع */
  dispatchNow: boolean;
  note?: string | null;
}

/** عرض أو سعر خاص يطبّقه الجهاز (انظر pos/promotions.ts) */
export interface PosPromotion {
  id: string;
  name: string;
  type: "special_price" | "percent_off" | "buy_x_get_y";
  productId: string | null;
  categoryId: string | null;
  customerId: string | null;
  /** السعر الخاص لوحدة الأساس، بنفس أساس سعر الصنف */
  price: number | null;
  percent: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  startsAt: string | null;
  endsAt: string | null;
}

/** عرض كما تديره لوحة التحكم */
export interface PosPromotionRecord extends PosPromotion {
  isActive: boolean;
  createdAt: string;
}

export type PosPromotionPayload = Partial<Omit<PosPromotion, "id">> & {
  name: string;
  type: PosPromotion["type"];
  isActive?: boolean;
};

/** باركود الميزان (انظر pos/scale.ts) */
export interface ScaleBarcodeOptions {
  enabled: boolean;
  prefixes: string[];
  itemDigits: number;
  valueType: "weight" | "price";
  valueDecimals: number;
}

/** إعدادات الكاشير على مستوى الشركة */
export interface PosOptions {
  scale: ScaleBarcodeOptions;
  /** ما يحتاج رقم مشرف السري */
  approvals: {
    void: boolean;
    cashOut: boolean;
    manualDrawer: boolean;
    /** تغيير سعر صنف في الفاتورة (غائب في بيانات قديمة = false) */
    priceChange?: boolean;
  };
}

/** الشركة كما تحفظها الشاشة: بها تعرض العملة والوقت بلا إنترنت ولا جلسة */
export interface PosTenantProfile {
  companyName: string;
  country: string;
  currency: string;
  currencyDecimals: number;
  /**
   * شعار الشركة (Data URL) يُطبع على الإيصال. null = بلا شعار. في السحب: غائب
   * = لم يتغيّر (تبقى النسخة المحفوظة على الشاشة)
   */
  logo?: string | null;
  timezone: string;
  /** فرع الجهاز: يُطبع على الإيصال (غائب في بيانات محفوظة قبل هذه النسخة) */
  branch?: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    isMain: boolean;
  } | null;
}

/** كاشير على الجهاز: رقمه السري مشتق لا نص (انظر pos/cashiers.ts) */
export interface PosCashier {
  id: string;
  name: string;
  canReturn: boolean;
  /** يوافق برقمه السري على ما يتجاوز صلاحية الكاشير */
  isSupervisor?: boolean;
  /** يغيّر سعر صنف في الفاتورة بلا مشرف (غائب = نعم، كالسيرفر) */
  canChangePrice?: boolean;
  /** أقصى خصم يدوي % على الفاتورة (null أو غائب = بلا حد) */
  maxDiscountPercent?: number | null;
  pinSalt: string;
  pinHash: string;
  pinIterations: number;
}

/** كاشير كما تعرضه لوحة التحكم (بلا أي أثر للرقم السري) */
export interface PosCashierRecord {
  id: string;
  name: string;
  canReturn: boolean;
  isSupervisor: boolean;
  canChangePrice: boolean;
  maxDiscountPercent: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface PosCashierPayload {
  name: string;
  /** يُرسل عند الإنشاء، وعند التعديل فقط لتغيير الرقم */
  pin?: string;
  canReturn?: boolean;
  isSupervisor?: boolean;
  canChangePrice?: boolean;
  maxDiscountPercent?: number | null;
  isActive?: boolean;
}

/** حد العمل بلا اتصال (ساعات) — يحدده السيرفر */
export interface PosOfflinePolicy {
  warnAfterHours: number;
  blockAfterHours: number;
}

// ─── ما يُنشئه الجهاز محلياً ─────────────────────────────────────────────────
/** وردية الكاشير الحالية كما هي على الجهاز */
export interface LocalShift {
  id: string;
  openedAt: string;
  openingCash: number;
  cashierName: string;
  /** الكاشير الذي فتحها برقمه السري (غائب = وردية بلا كاشير محدد) */
  cashierId?: string | null;
  /** مرات فتح الدرج يدوياً بلا بيع (تُرفع مع التقفيل) */
  drawerOpens?: number;
}

export interface CartLine {
  key: number;
  product: PosProduct;
  /** null = وحدة الأساس */
  unitId: string | null;
  unitName: string;
  factor: number;
  quantity: number;
  /**
   * سعر الوحدة: سعر القائمة، أو ما كتبه الكاشير (السعر الخاص يُحسب عند
   * التسعير، ولا يُطبَّق على سطر غُيّر سعره)
   */
  unitPrice: number;
  /** خصم الكاشير على السطر */
  discount: number;
  /** سعر القائمة الأصلي حين غيّر الكاشير السعر (null = لم يُغيَّر) */
  listPrice?: number | null;
  /** سبب تغيير السعر */
  priceReason?: string | null;
  /** المشرف الذي وافق على تغيير السعر */
  priceApprovedBy?: string | null;
  /** صنف بسعر مفتوح لم يُكتب سعره بعد: لا يُدفع قبل كتابته */
  pricePending?: boolean;
}

/** أسباب تغيير السعر الجاهزة (التخفيض يحتاج سبباً) */
export const PRICE_REASONS = ["تالف", "تفاوض", "سعر غير محدّث"] as const;

/** خصم على الفاتورة كلها: نسبة أو مبلغ */
export interface InvoiceDiscount {
  type: "percent" | "amount";
  value: number;
}

/** سطر سلة كما يُحفظ على الجهاز (الصنف بمعرّفه: بياناته تتجدد عند الاسترجاع) */
export interface StoredCartLine {
  productId: string;
  unitId: string | null;
  quantity: number;
  discount: number;
  /** ما كتبه الكاشير للسعر المفتوح أو المعدّل (غائب = سعر القائمة) */
  unitPrice?: number;
  listPrice?: number | null;
  priceReason?: string | null;
  priceApprovedBy?: string | null;
  pricePending?: boolean;
}

/** سلة محفوظة: الجارية (تبقى بعد إغلاق المتصفح) أو معلّقة */
export interface StoredCart {
  lines: StoredCartLine[];
  customerId: string;
  invoiceDiscount: InvoiceDiscount | null;
}

/** فاتورة معلّقة: عميل ذهب ليحضر شيئاً، والكاشير يكمل مع غيره */
export interface HeldCart extends StoredCart {
  id: string;
  heldAt: string;
  label: string;
  total: number;
  items: number;
}

/** إيداع أو سحب نقدي من الدرج خلال الوردية */
export interface CashMove {
  id: string;
  shiftId: string;
  type: "in" | "out";
  amount: number;
  reason: string;
  occurredAt: string;
  approvedBy: string | null;
}

export type AuditAction =
  | "line_removed"
  | "cart_cleared"
  | "sale_held"
  | "held_deleted"
  | "drawer_opened"
  | "cash_in"
  | "cash_out"
  | "discount"
  | "price_below_min"
  | "price_changed"
  | "credit_over_limit"
  | "approval_denied";

/**
 * ما يسجّله السيرفر بنفسه عند رفع عمليات الجهاز (لا ترسله الشاشة):
 *   stock_overdrawn   بيع نزل بالرصيد تحت الصفر في مخزن لا يسمح بذلك
 *   sale_anomaly      ضريبة تخالف نسبة الصنف، أو سعر تحت الحد بلا موافقة
 *   late_after_close  عملية وصلت بعد تقفيل ورديتها فأُعيد حسابها
 */
export type ServerAuditAction =
  | "stock_overdrawn"
  | "sale_anomaly"
  | "late_after_close";

/** حدث تدقيق كما تعرضه لوحة التحكم */
export interface PosAuditRecord {
  id: string;
  deviceId: string;
  deviceName: string | null;
  shiftId: string | null;
  action: AuditAction | ServerAuditAction;
  cashierName: string | null;
  approvedBy: string | null;
  amount: number | null;
  details: string | null;
  occurredAt: string;
}

/** حركة درج كما تعرضها لوحة التحكم */
export interface PosCashMovementRecord {
  id: string;
  shiftId: string;
  type: "in" | "out";
  amount: number;
  reason: string;
  cashierName: string | null;
  approvedBy: string | null;
  occurredAt: string;
}

export interface SaleLine {
  productId: string;
  productName: string;
  unitId?: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  /** الكمية بوحدة الأساس: لتحديث رصيد الشاشة (لا تُرفع) */
  baseQuantity?: number;
  /** العرض المطبَّق (للإيصال، لا يُرفع) */
  promoName?: string | null;
  /** السعر الأصلي حين غيّر الكاشير السعر في هذه الفاتورة */
  listPrice?: number;
  priceReason?: string;
}

export interface SalePayment {
  method: SalesPaymentMethod;
  amount: number;
  reference?: string;
}

/** فاتورة بيعت على الجهاز — تُحفظ محلياً (لإعادة الطباعة) وتُرفع للسيرفر */
export interface LocalSale {
  uuid: string;
  number: string;
  issuedAt: string;
  shiftId: string;
  customerId: string | null;
  customerName: string | null;
  customerTaxNumber: string | null;
  /** جوال العميل وما عليه بعد هذه الفاتورة — يُطبعان على الإيصال (غائبان في فواتير أقدم) */
  customerPhone?: string | null;
  customerBalance?: number | null;
  pricesIncludeTax: boolean;
  lines: SaleLine[];
  payments: SalePayment[];
  subtotal: number;
  taxTotal: number;
  total: number;
  /** ما دفعه العميل نقداً والباقي له (للإيصال فقط، لا يُرفع) */
  cashReceived: number;
  change: number;
  /** ما بقي على حساب العميل (بيع آجل) */
  creditAmount?: number;
  /** مجموع الخصوم: عروض + خصم الكاشير (للتقرير) */
  discountTotal?: number;
  qrCode: string | null;
  /** فاتورة "توصيل": يُنشأ لها أوردر عند رفعها */
  delivery?: SaleDelivery | null;
}

// ─── المرتجع ─────────────────────────────────────────────────────────────────
export interface ReturnableLine {
  /** ترتيب السطر في الفاتورة: به يشير المرتجع إليه */
  lineIndex: number;
  productName: string;
  unitName: string;
  quantity: number;
  returnedQuantity: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

/** فاتورة معروضة لاختيار ما يُرجَع منها (من السيرفر، أو من نسخة الجهاز) */
export interface ReturnableInvoice {
  number: string;
  issuedAt: string | null;
  customerName: string | null;
  total: number;
  paidAmount: number;
  returnedAmount: number;
  lines: ReturnableLine[];
  /** true = من نسخة الجهاز لأن السيرفر غير متاح */
  local: boolean;
}

/** مرتجع سُجّل على الجهاز — يُحفظ محلياً (لحساب الدرج) ويُرفع للسيرفر */
export interface LocalReturn {
  uuid: string;
  invoiceNumber: string;
  issuedAt: string;
  shiftId: string;
  lines: {
    lineIndex: number;
    productName: string;
    unitName: string;
    quantity: number;
    total: number;
  }[];
  total: number;
  refundMethod: SalesPaymentMethod;
  refundAmount: number;
  reason: string | null;
}

export type OutboxType =
  | "shift.open"
  | "customer.create"
  | "sale"
  | "return"
  | "cash.move"
  | "audit"
  | "shift.close";

/** عملية في طابور الرفع: تبقى حتى يؤكد السيرفر استلامها */
export interface OutboxEntry {
  /** ترتيب الإدخال = ترتيب الرفع */
  seq?: number;
  id: string;
  type: OutboxType;
  payload: Record<string, unknown>;
  createdAt: string;
  /** سبب رفض السيرفر لها (تبقى في الطابور للمراجعة) */
  error?: string;
}

export interface SyncResult {
  id: string;
  status: "ok" | "duplicate" | "error";
  message?: string;
}
