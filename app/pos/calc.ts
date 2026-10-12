// pos/calc.ts — حسابات الفاتورة على الجهاز (تعمل بلا إنترنت)
//
// نفس قواعد السيرفر (document-totals.util و zatca.util). الإيصال يُطبع بما
// يحسبه الجهاز هنا، والسيرفر عند الرفع يتحقق منه ثم يعتمده كما هو.
import type { CartLine, PosProduct, SaleLine } from "./types";

export const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const round4 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;

export const sum2 = (values: number[]): number =>
  round2(values.reduce((total, value) => total + value, 0));

/** أسعار شاشة الكاشير شاملة الضريبة دائماً (ما يراه العميل على الرف) */
export const POS_PRICES_INCLUDE_TAX = true;

/** سعر معرّف على الصنف محوّلاً إلى "شامل الضريبة" */
export const toGrossPrice = (product: PosProduct, price: number): number =>
  product.priceIncludesTax
    ? price
    : round4(price * (1 + product.taxRate / 100));

/** سعر وحدة بيع الصنف (الأساس أو وحدة إضافية) شاملاً الضريبة */
export const unitPriceOf = (
  product: PosProduct,
  unitId: string | null,
): number => {
  const unit = unitId ? product.units.find((u) => u.unitId === unitId) : null;
  return toGrossPrice(product, unit ? unit.salePrice : product.salePrice);
};

/** مبالغ سطر: الإجمالي شامل الضريبة، ومنه يُستخرج ما قبلها */
export const lineAmounts = (line: {
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}): { subtotal: number; taxAmount: number; total: number } => {
  const total = round2(line.quantity * line.unitPrice - line.discount);
  const subtotal = round2(total / (1 + line.taxRate / 100));
  return { subtotal, taxAmount: round2(total - subtotal), total };
};

/**
 * يتحقق من قواعد التسعير المعرّفة على الصنف (كما يفعل السيرفر في فواتير
 * لوحة التحكم). يعيد رسالة الخطأ أو null.
 */
export const pricingError = (line: CartLine): string | null => {
  const { product } = line;
  const gross = line.quantity * line.unitPrice;

  if (line.discount > gross) return `خصم "${product.name}" أكبر من قيمته`;
  if (line.discount > 0 && !product.allowDiscount) {
    return `"${product.name}" لا يُسمح بالخصم عليه`;
  }
  if (product.minSalePrice !== null) {
    // سعر وحدة الأساس بعد الخصم، بنفس أساس أقل سعر للصنف
    const effective = (gross - line.discount) / line.quantity / line.factor;
    const minimum = toGrossPrice(product, product.minSalePrice);
    if (effective + 0.005 < minimum) {
      return `سعر "${product.name}" بعد الخصم أقل من أقل سعر مسموح (${minimum})`;
    }
  }
  return null;
};

export const toSaleLine = (line: CartLine): SaleLine => ({
  productId: line.product.id,
  productName: line.product.name,
  unitId: line.unitId ?? undefined,
  unitName: line.unitName,
  quantity: line.quantity,
  unitPrice: line.unitPrice,
  discount: line.discount,
  taxRate: line.product.taxRate,
  ...lineAmounts({ ...line, taxRate: line.product.taxRate }),
});

/**
 * نصيب كمية مُرجعة من مبالغ سطر الفاتورة — نفس حساب السيرفر
 * (computeReturnShare): ما قبل الضريبة والضريبة كلٌّ بنسبة الكمية.
 */
export const returnShare = (
  line: { quantity: number; subtotal: number; taxAmount: number },
  quantity: number,
): { subtotal: number; taxAmount: number; total: number } => {
  const share = quantity / line.quantity;
  const subtotal = round2(line.subtotal * share);
  const taxAmount = round2(line.taxAmount * share);
  return { subtotal, taxAmount, total: round2(subtotal + taxAmount) };
};

// ─── رمز QR لهيئة الزكاة والضريبة (المرحلة الأولى) ───────────────────────────
const tlv = (tag: number, value: string): number[] => {
  const bytes = Array.from(new TextEncoder().encode(value));
  return [tag, bytes.length, ...bytes];
};

/**
 * خمسة حقول بترميز TLV ثم Base64 — يُولَّد على الجهاز ليُطبع فوراً بلا
 * إنترنت، ومطابق لما يولّده السيرفر عند الرفع (نفس الحقول والوقت).
 */
export const buildZatcaQr = (input: {
  sellerName: string;
  taxNumber: string;
  issuedAt: string;
  total: number;
  taxTotal: number;
}): string => {
  const bytes = [
    ...tlv(1, input.sellerName),
    ...tlv(2, input.taxNumber),
    ...tlv(3, new Date(input.issuedAt).toISOString().replace(/\.\d{3}Z$/, "Z")),
    ...tlv(4, input.total.toFixed(2)),
    ...tlv(5, input.taxTotal.toFixed(2)),
  ];
  return btoa(String.fromCharCode(...bytes));
};

/** معرّف فريد يولّده الجهاز (للفاتورة والوردية) */
export const newUuid = (): string =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : // متصفحات أقدم أو سياق غير آمن (http): نفس الصيغة من أرقام عشوائية
      "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (
          Number(c) ^
          (crypto.getRandomValues(new Uint8Array(1))[0]! & (15 >> (Number(c) / 4)))
        ).toString(16),
      );
