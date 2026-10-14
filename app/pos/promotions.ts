// pos/promotions.ts — تسعير السلة على الجهاز: العروض، خصم الفاتورة، وحدود الخصم
//
// كل ما هنا يُحسب بلا إنترنت. أثر العرض يصل السيرفر كسعر أو خصم على سطر
// الفاتورة (السيرفر لا يعرف العروض: يتحقق من اتساق المبالغ ويعتمدها).
import { lineAmounts, roundAmount, sumAmounts, toGrossPrice } from "./calc";
import type { CartLine, InvoiceDiscount, PosPromotion } from "./types";
import { currencyDecimals } from "../utils/format";

export interface PricedLine {
  line: CartLine;
  /** سعر الوحدة المعتمد: سعر القائمة، أو السعر الخاص إن سرى عرضه */
  unitPrice: number;
  /** الكمية × السعر المعتمد، قبل أي خصم */
  gross: number;
  /** خصم عرض (نسبة، أو اشترِ واحصل) */
  promoDiscount: number;
  /** العرض المطبَّق على السطر (سعر خاص أو خصم) */
  promoName: string | null;
  /** خصم الكاشير على السطر */
  manualDiscount: number;
  /** نصيب السطر من خصم الفاتورة */
  invoiceDiscount: number;
  /**
   * ما نقص بتخفيض الكاشير لسعر الوحدة عن سعر القائمة (الكمية × الفرق). ليس
   * خصماً على السطر — السعر نفسه أقل — لكنه يُحسب من حدّ خصم الكاشير
   */
  priceReduction: number;
  /** مجموع الخصوم: ما يُرفع للسيرفر على السطر */
  discount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  taxTotal: number;
  total: number;
  /** قبل أي خصم (بالأسعار المعتمدة) */
  gross: number;
  promoDiscount: number;
  /** خصم الكاشير: على الأسطر + على الفاتورة */
  manualDiscount: number;
  /** ما خفّضه الكاشير من أسعار الأسطر عن سعر القائمة */
  priceReduction: number;
  /**
   * خصم الكاشير وتخفيضه للأسعار كنسبة مما يقبل الخصم (بسعر القائمة) — يُقارن
   * بحدّ الكاشير، فتغيير السعر لا يتجاوز الحد
   */
  manualPercent: number;
  items: number;
}

interface PricingContext {
  promotions: PosPromotion[];
  customerId: string | null;
  /** الوقت الآن بساعة الشاشة (ms) */
  now: number;
  invoiceDiscount: InvoiceDiscount | null;
}

/** سطر غيّر الكاشير سعره عن سعر القائمة */
export const isRepriced = (line: CartLine): boolean =>
  line.listPrice !== null && line.listPrice !== undefined;

const isLive = (promo: PosPromotion, now: number) =>
  (!promo.startsAt || Date.parse(promo.startsAt) <= now) &&
  (!promo.endsAt || Date.parse(promo.endsAt) > now);

const applies = (promo: PosPromotion, line: CartLine, customerId: string | null) => {
  if (promo.customerId && promo.customerId !== customerId) return false;
  if (promo.productId) return promo.productId === line.product.id;
  if (promo.categoryId) return promo.categoryId === line.product.categoryId;
  return promo.type === "percent_off"; // بلا صنف ولا تصنيف: كل الأصناف
};

/** ما يوفّره العرض على السطر، والسعر المعتمد إن كان سعراً خاصاً */
const benefitOf = (
  promo: PosPromotion,
  line: CartLine,
): { saving: number; unitPrice: number; discount: number } | null => {
  const quantity = Number(line.quantity) || 0;
  const list = line.unitPrice;
  // السعر الخاص و"اشترِ واحصل" معرّفان بوحدة الأساس
  const baseUnit = line.unitId === null;

  if (promo.type === "special_price") {
    if (!baseUnit || promo.price === null) return null;
    const special = toGrossPrice(line.product, promo.price);
    if (special >= list) return null;
    return { saving: (list - special) * quantity, unitPrice: special, discount: 0 };
  }
  if (promo.type === "percent_off") {
    if (!promo.percent) return null;
    const discount = roundAmount((quantity * list * promo.percent) / 100);
    return { saving: discount, unitPrice: list, discount };
  }
  if (!baseUnit || !promo.buyQuantity || !promo.getQuantity) return null;
  const free =
    Math.floor(quantity / (promo.buyQuantity + promo.getQuantity)) * promo.getQuantity;
  if (free <= 0) return null;
  const discount = roundAmount(free * list);
  return { saving: discount, unitPrice: list, discount };
};

/** أفضل عرض للسطر (لا تُجمع العروض): الأكثر توفيراً، وعرض العميل عند التساوي */
const bestPromotion = (line: CartLine, context: PricingContext) => {
  let best: { promo: PosPromotion; saving: number; unitPrice: number; discount: number } | null =
    null;
  for (const promo of context.promotions) {
    if (!isLive(promo, context.now) || !applies(promo, line, context.customerId)) continue;
    const benefit = benefitOf(promo, line);
    if (!benefit || benefit.saving <= 0) continue;
    const better =
      !best ||
      benefit.saving > best.saving ||
      (benefit.saving === best.saving && !!promo.customerId && !best.promo.customerId);
    if (better) best = { promo, ...benefit };
  }
  return best;
};

/**
 * يسعّر السلة كاملة: العرض لكل سطر، ثم خصم الكاشير، ثم توزيع خصم الفاتورة على
 * الأسطر بنسبة قيمتها (الضريبة تُحسب بعد الخصم، فلا بد أن ينزل على الأسطر).
 */
export const priceCart = (cart: CartLine[], context: PricingContext): PricedCart => {
  const drafts = cart.map((line) => {
    const quantity = Number(line.quantity) || 0;
    // سعر كتبه الكاشير (معدّل أو مفتوح) هو السعر: لا عرض فوقه، فلا تخفيض مرتين
    const typed = isRepriced(line) || !!line.product.openPrice;
    const promo = typed ? null : bestPromotion(line, context);
    const unitPrice = promo ? promo.unitPrice : line.unitPrice;
    const priceReduction = isRepriced(line)
      ? roundAmount(Math.max(line.listPrice! - line.unitPrice, 0) * quantity)
      : 0;
    const gross = roundAmount(quantity * unitPrice);
    const promoDiscount = promo ? Math.min(promo.discount, gross) : 0;
    const manualDiscount = Math.min(
      Math.max(Number(line.discount) || 0, 0),
      Math.max(gross - promoDiscount, 0),
    );
    return {
      line,
      unitPrice,
      gross,
      promoDiscount,
      promoName: promo?.promo.name ?? null,
      manualDiscount,
      priceReduction,
      /** ما يبقى من قيمة السطر ليُخصم منه */
      open: roundAmount(gross - promoDiscount - manualDiscount),
    };
  });

  // ─── خصم الفاتورة: على ما يقبل الخصم فقط ───
  const eligible = drafts.filter((d) => d.line.product.allowDiscount && d.open > 0);
  const base = sumAmounts(eligible.map((d) => d.open));
  const wanted = context.invoiceDiscount
    ? context.invoiceDiscount.type === "percent"
      ? roundAmount((base * context.invoiceDiscount.value) / 100)
      : context.invoiceDiscount.value
    : 0;
  const invoiceTotal = Math.min(Math.max(wanted, 0), base);

  const shares = new Map<CartLine, number>();
  if (invoiceTotal > 0 && base > 0) {
    let given = 0;
    for (const draft of eligible) {
      const share = roundAmount((invoiceTotal * draft.open) / base);
      shares.set(draft.line, share);
      given = roundAmount(given + share);
    }
    // فرق التقريب يذهب لأكبر سطر، فمجموع الأنصبة = خصم الفاتورة بالضبط
    const largest = eligible.reduce((a, b) => (b.open > a.open ? b : a));
    shares.set(
      largest.line,
      roundAmount((shares.get(largest.line) ?? 0) + invoiceTotal - given),
    );
  }

  const lines: PricedLine[] = drafts.map((draft) => {
    const invoiceDiscount = shares.get(draft.line) ?? 0;
    const discount = roundAmount(draft.promoDiscount + draft.manualDiscount + invoiceDiscount);
    return {
      line: draft.line,
      unitPrice: draft.unitPrice,
      gross: draft.gross,
      promoDiscount: draft.promoDiscount,
      promoName: draft.promoName,
      manualDiscount: draft.manualDiscount,
      invoiceDiscount,
      priceReduction: draft.priceReduction,
      discount,
      ...lineAmounts({
        quantity: Number(draft.line.quantity) || 0,
        unitPrice: draft.unitPrice,
        discount,
        taxRate: draft.line.product.taxRate,
      }),
    };
  });

  const manualDiscount = sumAmounts(lines.map((l) => l.manualDiscount + l.invoiceDiscount));
  const promoDiscount = sumAmounts(lines.map((l) => l.promoDiscount));
  const priceReduction = sumAmounts(lines.map((l) => l.priceReduction));
  // أساس النسبة: ما كان يمكن الخصم منه (بعد العروض، وبسعر القائمة لما خُفّض)
  const discountable = sumAmounts(
    lines
      .filter((l) => l.line.product.allowDiscount)
      .map((l) => l.gross - l.promoDiscount + l.priceReduction),
  );
  // تخفيض صنف لا يقبل الخصم لا يدخل النسبة: يحتاج مشرفاً على أي حال (pricingIssue)
  const reducedDiscountable = sumAmounts(
    lines.filter((l) => l.line.product.allowDiscount).map((l) => l.priceReduction),
  );

  return {
    lines,
    subtotal: sumAmounts(lines.map((l) => l.subtotal)),
    taxTotal: sumAmounts(lines.map((l) => l.taxAmount)),
    total: sumAmounts(lines.map((l) => l.total)),
    gross: sumAmounts(lines.map((l) => l.gross)),
    promoDiscount,
    manualDiscount,
    priceReduction,
    manualPercent:
      discountable > 0
        ? ((manualDiscount + reducedDiscountable) / discountable) * 100
        : 0,
    items: cart.reduce((count, line) => count + (Number(line.quantity) || 0), 0),
  };
};

/**
 * مخالفة لقواعد تسعير الصنف. `blocking` لا تُتجاوز (كمية أو خصم غير منطقي)،
 * وغيرها (تحت أقل سعر) تُتجاوز بموافقة مشرف.
 */
export interface PricingIssue {
  message: string;
  blocking: boolean;
  /** نوع ما يحتاج مشرفاً: بيع تحت أقل سعر، أو تخفيض سعر صنف لا يقبل الخصم */
  kind?: "belowMin" | "reducedNoDiscount";
}

export const pricingIssue = (priced: PricedLine): PricingIssue | null => {
  const { line } = priced;
  const { product } = line;
  const quantity = Number(line.quantity) || 0;

  if (!(quantity > 0)) {
    return { message: `كمية "${product.name}" غير صحيحة`, blocking: true };
  }
  if (line.pricePending) {
    return { message: `اكتب سعر "${product.name}"`, blocking: true };
  }
  if (priced.priceReduction > 0 && !product.allowDiscount) {
    return {
      message: `تخفيض سعر "${product.name}" وهو لا يُسمح بالخصم عليه`,
      blocking: false,
      kind: "reducedNoDiscount",
    };
  }
  if ((Number(line.discount) || 0) > priced.gross - priced.promoDiscount + 1e-9) {
    return { message: `خصم "${product.name}" أكبر من قيمته`, blocking: true };
  }
  const cashierDiscount = priced.manualDiscount + priced.invoiceDiscount;
  if (priced.manualDiscount > 0 && !product.allowDiscount) {
    return { message: `"${product.name}" لا يُسمح بالخصم عليه`, blocking: true };
  }
  // عرض الإدارة قد ينزل تحت أقل سعر بقرارها؛ الحد يقيّد ما يفعله الكاشير فقط:
  // خصمه، وتخفيضه للسعر، والسعر المفتوح الذي يكتبه
  const cashierPriced =
    cashierDiscount > 0 || priced.priceReduction > 0 || !!product.openPrice;
  if (product.minSalePrice !== null && cashierPriced) {
    const effective =
      (priced.gross - priced.promoDiscount - cashierDiscount) / quantity / line.factor;
    const minimum = toGrossPrice(product, product.minSalePrice);
    // نصف أصغر جزء من العملة: فرق التقريب لا يُعدّ بيعاً تحت الحد
    if (effective + 0.5 / 10 ** currencyDecimals() < minimum) {
      return {
        message: `سعر "${product.name}" بعد الخصم أقل من أقل سعر مسموح (${minimum})`,
        blocking: false,
        kind: "belowMin",
      };
    }
  }
  return null;
};
