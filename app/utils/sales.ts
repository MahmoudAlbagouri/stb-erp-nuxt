// utils/sales.ts — تسميات موديول المبيعات للعرض
import type {
  CustomerStatementEntryType,
  SalesInvoiceStatus,
  PublicSalesPaymentMethod,
  SalesInvoiceType,
  SalesPaymentMethod,
  SalesReturnStatus,
} from "@/types/sales";

interface StatusMeta {
  label: string;
  /** صنف CSS من ‎.doc-status--* */
  tone: "draft" | "progress" | "done" | "cancelled" | "info";
}

export const SALES_INVOICE_STATUS: Record<SalesInvoiceStatus, StatusMeta> = {
  draft: { label: "مسودة", tone: "draft" },
  issued: { label: "صادرة", tone: "done" },
  cancelled: { label: "ملغاة", tone: "cancelled" },
};

export const SALES_RETURN_STATUS: Record<SalesReturnStatus, StatusMeta> = {
  draft: { label: "مسودة", tone: "draft" },
  issued: { label: "صادر", tone: "done" },
  cancelled: { label: "ملغي", tone: "cancelled" },
};

export const SALES_INVOICE_TYPE_LABELS: Record<SalesInvoiceType, string> = {
  simplified: "فاتورة ضريبية مبسطة",
  standard: "فاتورة ضريبية",
};

export const SALES_PAYMENT_METHOD_LABELS: Record<SalesPaymentMethod, string> = {
  cash: "نقدي",
  card: "شبكة / بطاقة",
  bank_transfer: "تحويل بنكي",
  cheque: "شيك",
  courier: "تحصيل عبر التوصيل",
};

/** طرق الدفع في نماذج القبض والردّ (التحصيل عبر التوصيل من أوردرات التوصيل وحدها) */
export const PUBLIC_SALES_PAYMENT_METHOD_LABELS: Record<
  PublicSalesPaymentMethod,
  string
> = {
  cash: "نقدي",
  card: "شبكة / بطاقة",
  bank_transfer: "تحويل بنكي",
  cheque: "شيك",
};

export const CUSTOMER_STATEMENT_LABELS: Record<
  CustomerStatementEntryType,
  string
> = {
  invoice: "فاتورة بيع",
  return: "مرتجع بيع",
  payment: "قبض",
  refund: "ردّ مبلغ",
};

/** اسم العميل للعرض — الفاتورة بلا عميل بيع نقدي عابر */
export const customerLabel = (customer?: { name: string } | null): string =>
  customer?.name ?? "عميل نقدي";
