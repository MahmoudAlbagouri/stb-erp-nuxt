// pos/calc.ts — حسابات الفاتورة على الجهاز (تعمل بلا إنترنت)
//
// نفس قواعد السيرفر (document-totals.util و zatca.util). الإيصال يُطبع بما
// يحسبه الجهاز هنا، والسيرفر عند الرفع يتحقق منه ثم يعتمده كما هو.
import type { PosProduct } from "./types";
import { currencyDecimals, roundMoney } from "../utils/format";

/** مبلغ مقرَّب لخانات عملة الشركة (2 أو 3) — كما يقرّب السيرفر */
export const roundAmount = roundMoney;

const round4 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;

export const sumAmounts = (values: number[]): number =>
  roundAmount(values.reduce((total, value) => total + value, 0));

// ─── وضع الضريبة للشركة ───────────────────────────────────────────────────────
// من إعدادات الفوترة التي تنزل للجهاز (stores/pos يضبطه مع كل تنزيل):
//   vatRegistered     false = منشأة غير مسجّلة: لا ضريبة على أي صنف
//   pricesIncludeTax  أسعار الشاشة شاملة الضريبة (الرف)، أو قبلها (الجملة)
// قبل أول تنزيل: مسجّلة وأسعارها شاملة — ما كانت تعمل به الشاشات دائماً.
export interface PosTaxMode {
  vatRegistered: boolean;
  pricesIncludeTax: boolean;
}

let taxMode: PosTaxMode = { vatRegistered: true, pricesIncludeTax: true };

export const setTaxMode = (
  settings?: Partial<PosTaxMode> | null,
): void => {
  taxMode = {
    vatRegistered: settings?.vatRegistered ?? true,
    pricesIncludeTax: settings?.pricesIncludeTax ?? true,
  };
};

export const posTaxMode = (): PosTaxMode => taxMode;

/** نسبة الضريبة المطبّقة على الصنف الآن: صفر لمنشأة غير مسجّلة */
export const taxRateOf = (product: PosProduct): number =>
  taxMode.vatRegistered ? product.taxRate : 0;

/**
 * سعر معرّف على الصنف (بأساسه: شامل الضريبة أو قبلها) محوّلاً إلى أساس تسعير
 * الشاشة — نفس تحويل السيرفر (posLines). بلا ضريبة (غير مسجّلة) السعر كما هو.
 */
export const toSalePrice = (product: PosProduct, price: number): number => {
  const rate = taxRateOf(product);
  if (product.priceIncludesTax === taxMode.pricesIncludeTax || rate === 0) {
    return price;
  }
  return taxMode.pricesIncludeTax
    ? round4(price * (1 + rate / 100))
    : round4(price / (1 + rate / 100));
};

/** سعر وحدة بيع الصنف (الأساس أو وحدة إضافية) بأساس تسعير الشاشة */
export const unitPriceOf = (
  product: PosProduct,
  unitId: string | null,
): number => {
  const unit = unitId ? product.units.find((u) => u.unitId === unitId) : null;
  return toSalePrice(product, unit ? unit.salePrice : product.salePrice);
};

/**
 * مبالغ سطر — نفس حساب السيرفر (computeLine) بالحرف، فلا يُرفض الإيصال:
 *   شامل الضريبة  الإجمالي = الكمية × السعر − الخصم، ومنه يُستخرج ما قبلها
 *   قبل الضريبة   ما قبلها = الكمية × السعر − الخصم، والضريبة تُضاف فوقه
 */
export const lineAmounts = (line: {
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}): { subtotal: number; taxAmount: number; total: number } => {
  const entered = line.quantity * line.unitPrice - line.discount;
  const rate = line.taxRate / 100;
  if (taxMode.pricesIncludeTax) {
    const total = roundHalfUp(entered);
    const subtotal = roundHalfUp(total / (1 + rate));
    return { subtotal, taxAmount: roundHalfUp(total - subtotal), total };
  }
  const subtotal = roundHalfUp(entered);
  const taxAmount = roundHalfUp(subtotal * rate);
  return { subtotal, taxAmount, total: roundHalfUp(subtotal + taxAmount) };
};

/**
 * تقريب لخانات العملة كما يقرّب السيرفر (decimal.js، نصف لأعلى بعيداً عن
 * الصفر) — لا كما تقرّب الأرقام العشرية في المتصفح: ‎1.5 × 4.89 = 7.335‎ تُحسب
 * ‎7.33499999…‎ فتنزل إلى 7.33 بدل 7.34. نزيل ضجيج الفاصلة العائمة (12 رقماً
 * معنوياً) ثم نقرّب الرقم العشري نفسه (إزاحة بالنص "e")، لا ضربه في 100.
 */
const roundHalfUp = (value: number): number => {
  const decimals = currencyDecimals();
  const clean = Math.abs(Number(value.toPrecision(12)));
  const text = String(clean);
  // أرقام صغيرة/كبيرة جداً تُكتب بصيغة أُسّية: التقريب العادي يكفيها
  if (/e/i.test(text)) return roundAmount(value);
  const rounded = Number(`${Math.round(Number(`${text}e${decimals}`))}e-${decimals}`);
  return value < 0 ? -rounded : rounded;
};

/**
 * نصيب كمية مُرجعة من مبالغ سطر الفاتورة — نفس حساب السيرفر
 * (computeReturnShare): ما قبل الضريبة والضريبة كلٌّ بنسبة الكمية.
 */
export const returnShare = (
  line: { quantity: number; subtotal: number; taxAmount: number },
  quantity: number,
): { subtotal: number; taxAmount: number; total: number } => {
  const share = quantity / line.quantity;
  const subtotal = roundAmount(line.subtotal * share);
  const taxAmount = roundAmount(line.taxAmount * share);
  return { subtotal, taxAmount, total: roundAmount(subtotal + taxAmount) };
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
