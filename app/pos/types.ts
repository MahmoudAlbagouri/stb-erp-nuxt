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
  available: boolean;
}

export interface PosCategory {
  id: string;
  name: string;
  parentId?: string | null;
  color?: string | null;
}

export interface PosDevice {
  id: string;
  name: string;
  code: string;
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
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
  /** مرات فتح الدرج يدوياً بلا بيع */
  drawerOpens: number;
  expectedCash: number;
  closingCash?: number | null;
  cashDifference: number;
  note?: string | null;
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
}

/** الشركة كما تحفظها الشاشة: بها تعرض العملة والوقت بلا إنترنت ولا جلسة */
export interface PosTenantProfile {
  companyName: string;
  country: string;
  currency: string;
  currencyDecimals: number;
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
  pinSalt: string;
  pinHash: string;
  pinIterations: number;
}

/** كاشير كما تعرضه لوحة التحكم (بلا أي أثر للرقم السري) */
export interface PosCashierRecord {
  id: string;
  name: string;
  canReturn: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface PosCashierPayload {
  name: string;
  /** يُرسل عند الإنشاء، وعند التعديل فقط لتغيير الرقم */
  pin?: string;
  canReturn?: boolean;
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
  unitPrice: number;
  discount: number;
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
  pricesIncludeTax: boolean;
  lines: SaleLine[];
  payments: SalePayment[];
  subtotal: number;
  taxTotal: number;
  total: number;
  /** ما دفعه العميل نقداً والباقي له (للإيصال فقط، لا يُرفع) */
  cashReceived: number;
  change: number;
  qrCode: string | null;
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

export type OutboxType = "shift.open" | "sale" | "return" | "shift.close";

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
