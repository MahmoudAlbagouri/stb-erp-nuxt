// utils/sales.ts — تسميات موديول المبيعات للعرض
import type {
  CustomerStatementEntryType,
  PrintableInvoice,
  QuoteDocument,
  SalesInvoiceStatus,
  PublicSalesPaymentMethod,
  SalesInvoiceType,
  SalesPaymentMethod,
  SalesQuoteFilter,
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

export const SALES_QUOTE_STATUS: Record<SalesQuoteFilter, StatusMeta> = {
  open: { label: "ساري", tone: "progress" },
  expired: { label: "منتهي", tone: "draft" },
  converted: { label: "حُوّل لفاتورة", tone: "done" },
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

/** عرض السعر بالشكل الذي تطبعه نسخة الطباعة (لا QR ولا مدفوع: ليس فاتورة) */
export const quoteToPrintable = (quote: QuoteDocument): PrintableInvoice => ({
  quote: { validUntil: quote.validUntil, note: quote.note ?? null },
  warehouse: quote.warehouse,
  number: quote.number,
  invoiceType: quote.customerTaxNumber ? "standard" : "simplified",
  customer: quote.customerName
    ? {
        name: quote.customerName,
        phone: quote.customerPhone ?? null,
        taxNumber: quote.customerTaxNumber ?? null,
      }
    : null,
  invoiceDate: quote.issuedAt,
  issuedAt: quote.issuedAt,
  subtotal: quote.subtotal,
  taxTotal: quote.taxTotal,
  total: quote.total,
  paidAmount: 0,
  remaining: 0,
  qrCode: null,
  lines: quote.lines.map((line, index) => ({
    id: String(index),
    productName: line.productName,
    unitName: line.unitName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discount: line.discount,
    total: line.total,
  })),
});

/** اسم العميل للعرض — الفاتورة بلا عميل بيع نقدي عابر */
export const customerLabel = (customer?: { name: string } | null): string =>
  customer?.name ?? "عميل نقدي";
