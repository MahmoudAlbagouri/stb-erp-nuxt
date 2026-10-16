// types/purchasing.ts — أنواع موديول المشتريات والموردين (مطابقة لكيانات الباك إند)
import type { Unit } from "./catalog";
import type { LineProduct, Warehouse } from "./inventory";

// ─── الموردون ────────────────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  commercialRegister?: string | null;
  address?: string | null;
  paymentTermsDays: number;
  openingBalance: number;
  notes?: string | null;
  isActive: boolean;
  /** المستحق للمورد الآن (سالب = المورد مدين لنا) */
  balance?: number;
}

export interface SupplierPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string;
  address?: string;
  paymentTermsDays?: number;
  openingBalance?: number;
  notes?: string;
  isActive?: boolean;
}

export interface SupplierFilters {
  search?: string;
  isActive?: string;
  withBalance?: string;
  page?: number;
  limit?: number;
}

export type StatementEntryType = "invoice" | "return" | "payment";

export interface StatementEntry {
  type: StatementEntryType;
  id: string;
  number: string;
  date: string;
  reference: string | null;
  /** يزيد المستحق للمورد */
  credit: number;
  /** ينقص المستحق للمورد */
  debit: number;
  balance: number;
}

export interface SupplierStatement {
  supplier: Supplier;
  from: string | null;
  to: string | null;
  openingBalance: number;
  entries: StatementEntry[];
  totalCredit: number;
  totalDebit: number;
  closingBalance: number;
}

export interface PurchasingSummary {
  payables: number;
  overdue: number;
  monthPurchases: number;
  draftInvoices: number;
}

// ─── فواتير الشراء ───────────────────────────────────────────────────────────
export type PurchaseInvoiceStatus = "draft" | "posted" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface PurchaseInvoiceLine {
  id: string;
  productId: string;
  product?: LineProduct | null;
  unitId: string;
  unit?: Unit | null;
  factor: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRateId?: string | null;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  baseQuantity: number;
  unitCost: number;
  returnedQuantity: number;
}

export interface PurchaseInvoice {
  id: string;
  number: string;
  supplierId: string;
  supplier?: Supplier | null;
  warehouseId: string;
  warehouse?: Warehouse | null;
  supplierReference?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  status: PurchaseInvoiceStatus;
  pricesIncludeTax: boolean;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  returnedAmount: number;
  remaining: number;
  paymentStatus: PaymentStatus;
  note?: string | null;
  lines?: PurchaseInvoiceLine[];
  linesCount?: number;
  /** آخر تعديل على السيرفر — مسودة النموذج على الجهاز تقارن به */
  updatedAt?: string;
}

export interface PurchaseLinePayload {
  productId: string;
  unitId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface PurchaseInvoicePayload {
  supplierId: string;
  warehouseId: string;
  supplierReference?: string;
  invoiceDate: string;
  dueDate?: string;
  pricesIncludeTax?: boolean;
  note?: string;
  lines: PurchaseLinePayload[];
}

export interface PurchaseInvoiceFilters {
  search?: string;
  status?: PurchaseInvoiceStatus | "";
  supplierId?: string;
  payment?: "due" | "overdue" | "";
  page?: number;
  limit?: number;
}

// ─── المرتجعات ───────────────────────────────────────────────────────────────
export type PurchaseReturnStatus = "draft" | "posted" | "cancelled";

export interface PurchaseReturnLine {
  id: string;
  invoiceLineId: string;
  productId: string;
  product?: LineProduct | null;
  unit?: Unit | null;
  quantity: number;
  baseQuantity: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface PurchaseReturn {
  id: string;
  number: string;
  invoiceId: string;
  invoice?: Pick<PurchaseInvoice, "id" | "number"> | null;
  supplierId: string;
  supplier?: Supplier | null;
  warehouse?: Warehouse | null;
  returnDate: string;
  status: PurchaseReturnStatus;
  subtotal: number;
  taxTotal: number;
  total: number;
  reason?: string | null;
  lines?: PurchaseReturnLine[];
  linesCount?: number;
}

export interface PurchaseReturnPayload {
  invoiceId: string;
  returnDate: string;
  reason?: string;
  lines: { invoiceLineId: string; quantity: number }[];
}

// ─── السداد ──────────────────────────────────────────────────────────────────
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "cheque";
export type SupplierPaymentStatus = "posted" | "cancelled";

export interface SupplierPayment {
  id: string;
  number: string;
  supplierId: string;
  supplier?: Supplier | null;
  invoiceId?: string | null;
  invoice?: Pick<PurchaseInvoice, "id" | "number"> | null;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
  status: SupplierPaymentStatus;
}

export interface SupplierPaymentPayload {
  supplierId: string;
  invoiceId?: string;
  paymentDate: string;
  amount: number;
  method?: PaymentMethod;
  reference?: string;
  note?: string;
}
