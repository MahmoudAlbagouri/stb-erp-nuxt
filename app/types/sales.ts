// types/sales.ts — أنواع موديول المبيعات والعملاء (مطابقة لكيانات الباك إند)
import type { Warehouse } from "./inventory";
import type { PosOptions } from "@/pos/types";

// ─── إعدادات الفوترة ─────────────────────────────────────────────────────────
export interface SalesSettings {
  sellerName?: string | null;
  taxNumber?: string | null;
  commercialRegister?: string | null;
  address?: string | null;
  phone?: string | null;
  invoiceFooter?: string | null;
  /**
   * مسجّلة في ضريبة القيمة المضافة. false = بلا ضريبة على أي صنف، والفاتورة
   * "فاتورة مبيعات" بلا رقم ضريبي ولا QR (غائب في بيانات قديمة = مسجّلة)
   */
  vatRegistered?: boolean;
  /** أسعار البيع شاملة الضريبة (false = تُضاف فوق السعر). غائب = شاملة */
  pricesIncludeTax?: boolean;
  /** إعدادات شاشة الكاشير: باركود الميزان وما يحتاج موافقة مشرف */
  posOptions?: Partial<PosOptions>;
}

// ─── العملاء ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  commercialRegister?: string | null;
  address?: string | null;
  paymentTermsDays: number;
  /** null = بلا حد ائتماني */
  creditLimit?: number | null;
  openingBalance: number;
  notes?: string | null;
  isActive: boolean;
  /** ما على العميل الآن (سالب = له رصيد عندنا) */
  balance?: number;
}

export interface CustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string;
  address?: string;
  paymentTermsDays?: number;
  creditLimit?: number | null;
  openingBalance?: number;
  notes?: string;
  isActive?: boolean;
}

export interface CustomerFilters {
  search?: string;
  isActive?: string;
  withBalance?: string;
  page?: number;
  limit?: number;
}

export type CustomerStatementEntryType =
  | "invoice"
  | "return"
  | "payment"
  | "refund";

export interface CustomerStatementEntry {
  type: CustomerStatementEntryType;
  id: string;
  number: string;
  date: string;
  reference: string | null;
  /** يزيد ما على العميل */
  debit: number;
  /** ينقص ما على العميل */
  credit: number;
  balance: number;
}

export interface CustomerStatement {
  customer: Customer;
  from: string | null;
  to: string | null;
  openingBalance: number;
  entries: CustomerStatementEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface SalesSummary {
  todaySales: number;
  monthSales: number;
  /** null لمن لا يملك صلاحية عرض الأرباح */
  monthProfit: number | null;
  receivables: number;
  overdue: number;
  draftInvoices: number;
}

// ─── فواتير البيع ────────────────────────────────────────────────────────────
export type SalesInvoiceStatus = "draft" | "issued" | "cancelled";
export type SalesInvoiceType = "simplified" | "standard";
export type SalesPaymentStatus = "unpaid" | "partial" | "paid";
/** courier = تحصيل عند التسليم عبر طيار أو شركة شحن (يسجّله موديول التوصيل وحده) */
export type SalesPaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "cheque"
  | "courier";

/** طرق الدفع التي يختارها المستخدم يدوياً */
export type PublicSalesPaymentMethod = Exclude<SalesPaymentMethod, "courier">;

export interface SalesInvoiceLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  isStocked: boolean;
  unitId: string;
  unitName: string;
  factor: number;
  quantity: number;
  unitPrice: number;
  /** السعر الأصلي حين غيّر الكاشير سعر الصنف في هذه الفاتورة وحدها */
  listPrice?: number | null;
  priceReason?: string | null;
  discount: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  baseQuantity: number;
  /** 0 لمن لا يملك صلاحية عرض الأرباح */
  unitCost: number;
  returnedQuantity: number;
}

export interface SalesInvoice {
  id: string;
  uuid: string;
  /** null للمسودة — الرقم يُعطى عند الإصدار */
  number: string | null;
  /** فاتورة أوردر توصيل: تُدار (تصدر/تُلغى) من شاشة التوصيل وحدها */
  isDelivery?: boolean;
  invoiceType: SalesInvoiceType;
  customerId?: string | null;
  customer?: Customer | null;
  warehouseId: string;
  warehouse?: Warehouse | null;
  invoiceDate: string;
  dueDate?: string | null;
  status: SalesInvoiceStatus;
  pricesIncludeTax: boolean;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  returnedAmount: number;
  costTotal: number;
  remaining: number;
  overpaid: number;
  paymentStatus: SalesPaymentStatus;
  note?: string | null;
  issuedAt?: string | null;
  /** رمز QR لهيئة الزكاة والضريبة (Base64 TLV) */
  qrCode?: string | null;
  lines?: SalesInvoiceLine[];
  linesCount?: number;
}

/**
 * ما تحتاجه نسخة الطباعة من الفاتورة — تحققه فاتورة السيرفر (SalesInvoice)
 * وفاتورة الكاشير المحلية قبل رفعها.
 */
/** الفرع كما يُطبع على الفاتورة والإيصال */
export interface PrintBranch {
  name: string;
  address?: string | null;
  phone?: string | null;
  isMain?: boolean;
}

export interface PrintableInvoice {
  /** إيصال تجريبي لاختبار الطابعة (لا فاتورة حقيقية): يُطبع عليه ذلك صراحة */
  test?: boolean;
  /** مخزن الفاتورة وفرعه (فاتورة لوحة التحكم)؛ الكاشير يمرّر فرعه مباشرة */
  warehouse?: { branch?: PrintBranch | null } | null;
  number: string | null;
  invoiceType: SalesInvoiceType;
  customer?: {
    name: string;
    taxNumber?: string | null;
    phone?: string | null;
    /** ما على العميل (إجمالي الآجل) — يُطبع إن كان موجباً */
    balance?: number | null;
  } | null;
  invoiceDate: string;
  issuedAt?: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  remaining: number;
  qrCode?: string | null;
  lines?: {
    id: string;
    productName: string;
    unitName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }[];
}

export interface SalesLinePayload {
  productId: string;
  unitId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface SalesInvoicePayload {
  uuid?: string;
  customerId?: string | null;
  warehouseId: string;
  invoiceDate: string;
  dueDate?: string;
  pricesIncludeTax?: boolean;
  note?: string;
  lines: SalesLinePayload[];
}

export interface Tender {
  method: SalesPaymentMethod;
  amount: number;
  reference?: string;
}

export interface SalesInvoiceFilters {
  search?: string;
  status?: SalesInvoiceStatus | "";
  customerId?: string;
  payment?: "due" | "overdue" | "";
  page?: number;
  limit?: number;
}

// ─── المرتجعات ───────────────────────────────────────────────────────────────
export type SalesReturnStatus = "draft" | "issued" | "cancelled";

export interface SalesReturnLine {
  id: string;
  invoiceLineId: string;
  productId: string;
  productName: string;
  unitName: string;
  quantity: number;
  baseQuantity: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface SalesReturn {
  id: string;
  number: string | null;
  invoiceId: string;
  invoice?: Pick<SalesInvoice, "id" | "number"> | null;
  customerId?: string | null;
  customer?: Customer | null;
  warehouse?: Warehouse | null;
  returnDate: string;
  status: SalesReturnStatus;
  subtotal: number;
  taxTotal: number;
  total: number;
  refundedAmount: number;
  reason?: string | null;
  lines?: SalesReturnLine[];
  linesCount?: number;
}

export interface SalesReturnPayload {
  invoiceId: string;
  returnDate: string;
  reason?: string;
  lines: { invoiceLineId: string; quantity: number }[];
}

// ─── المقبوضات ───────────────────────────────────────────────────────────────
export type PaymentDirection = "in" | "out";
export type CustomerPaymentStatus = "posted" | "cancelled";

export interface CustomerPayment {
  id: string;
  number: string;
  customerId?: string | null;
  customer?: Customer | null;
  invoiceId?: string | null;
  invoice?: Pick<SalesInvoice, "id" | "number"> | null;
  direction: PaymentDirection;
  paymentDate: string;
  amount: number;
  method: SalesPaymentMethod;
  reference?: string | null;
  note?: string | null;
  status: CustomerPaymentStatus;
}

export interface CustomerPaymentPayload {
  customerId?: string;
  invoiceId?: string;
  paymentDate: string;
  amount: number;
  method?: SalesPaymentMethod;
  reference?: string;
  note?: string;
}
