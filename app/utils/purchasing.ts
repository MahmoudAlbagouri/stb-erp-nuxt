// utils/purchasing.ts — تسميات وحسابات موديول المشتريات للعرض
import type {
  PaymentMethod,
  PaymentStatus,
  PurchaseInvoiceStatus,
  PurchaseReturnStatus,
  StatementEntryType,
} from "@/types/purchasing";

type Tone = "draft" | "progress" | "done" | "cancelled" | "info";

interface StatusMeta {
  label: string;
  /** صنف CSS من ‎.doc-status--* */
  tone: Tone;
}

export const PURCHASE_INVOICE_STATUS: Record<PurchaseInvoiceStatus, StatusMeta> =
  {
    draft: { label: "مسودة", tone: "draft" },
    posted: { label: "معتمدة", tone: "done" },
    cancelled: { label: "ملغاة", tone: "cancelled" },
  };

export const PURCHASE_RETURN_STATUS: Record<PurchaseReturnStatus, StatusMeta> = {
  draft: { label: "مسودة", tone: "draft" },
  posted: { label: "معتمد", tone: "done" },
  cancelled: { label: "ملغي", tone: "cancelled" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  unpaid: { label: "غير مدفوعة", tone: "cancelled" },
  partial: { label: "مدفوعة جزئياً", tone: "progress" },
  paid: { label: "مدفوعة", tone: "done" },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدي",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة",
  cheque: "شيك",
};

export const STATEMENT_ENTRY_LABELS: Record<StatementEntryType, string> = {
  invoice: "فاتورة شراء",
  return: "مرتجع شراء",
  payment: "سداد",
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * معاينة مبالغ سطر شراء أثناء الإدخال — نفس قاعدة السيرفر
 * (purchase-totals.util). المبالغ المحفوظة يحسبها السيرفر دائماً.
 */
export const previewPurchaseLine = (line: {
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  pricesIncludeTax: boolean;
}) => {
  const entered = line.quantity * line.unitPrice - line.discount;
  const rate = line.taxRate / 100;

  const subtotal = line.pricesIncludeTax
    ? round2(round2(entered) / (1 + rate))
    : round2(entered);
  const total = line.pricesIncludeTax
    ? round2(entered)
    : round2(subtotal + round2(subtotal * rate));

  return { subtotal, taxAmount: round2(total - subtotal), total };
};

export const sumMoney = (values: number[]) =>
  round2(values.reduce((sum, value) => sum + value, 0));
