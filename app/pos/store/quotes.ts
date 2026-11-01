// pos/store/quotes.ts — عرض السعر: ورقة أسعار للعميل تُصدر بلا إنترنت
//
// السلة تدخل "وضع عرض السعر" قبل إضافة الأصناف، فلا يُفحص المخزون (صنف نفد
// يُعرض سعره). الحفظ كالبيع: على الجهاز أولاً مع عملية في طابور الرفع، لكنه لا
// يدخل `sales`، فلا يمس الرصيد ولا الدرج ولا الوردية ولا عدّاد الفواتير.
//
// حين يعود العميل تنزل أصناف العرض في السلة كبيع عادي: المخزون والدفع والترقيم
// كأي فاتورة، والسعر المعروض مثبّت ما دام العرض سارياً.
import { OfflineError } from "@/pos/api";
import { newUuid, posTaxMode, taxRateOf, unitPriceOf } from "@/pos/calc";
import { posDb } from "@/pos/db";
import { isRepriced, type PricedCart } from "@/pos/promotions";
import type {
  CartLine,
  LocalQuote,
  PosCustomer,
  SaleLine,
} from "@/pos/types";
import type { PosCart } from "./cart";
import type { PosConnection } from "./connection";
import type { PosShiftModule } from "./shift";
import {
  COUNTER_DIGITS,
  KEEP_QUOTES,
  newOrderContext,
  roundQuantity,
  type PosState,
} from "./state";

/** أسطر السلة المسعّرة كما تُحفظ على فاتورة أو عرض سعر */
export const saleLinesOf = (cart: PricedCart): SaleLine[] =>
  cart.lines.map((p) => ({
    productId: p.line.product.id,
    productName: p.line.product.name,
    unitId: p.line.unitId ?? undefined,
    unitName: p.line.unitName,
    quantity: Number(p.line.quantity),
    unitPrice: p.unitPrice,
    discount: p.discount,
    // صفر لمنشأة غير مسجّلة في الضريبة
    taxRate: taxRateOf(p.line.product),
    subtotal: p.subtotal,
    taxAmount: p.taxAmount,
    total: p.total,
    baseQuantity: roundQuantity(Number(p.line.quantity) * p.line.factor),
    promoName: p.promoName,
    // سعر غيّره الكاشير: السيرفر يحفظ الأصلي وسببه
    ...(isRepriced(p.line)
      ? {
          listPrice: p.line.listPrice!,
          priceReason: p.line.priceReason ?? undefined,
        }
      : {}),
  }));

/** ما يخص الشاشة وحدها (الاسم، الرصيد، العرض) لا يُرفع */
export const uploadLines = (lines: SaleLine[]) =>
  lines.map(
    ({
      productName: _name,
      unitName: _unit,
      baseQuantity: _base,
      promoName: _promo,
      ...line
    }) => line,
  );

/** يوم بصيغة YYYY-MM-DD بتوقيت الشركة */
const dayKey = (date: Date, timeZone?: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

/** ما يكتبه الكاشير عند حفظ العرض */
export interface QuoteDetails {
  customerName: string;
  customerPhone: string;
  validityDays: number;
  note: string;
}

export const createQuotes = (
  state: PosState,
  connection: PosConnection,
  shiftModule: PosShiftModule,
  cartModule: PosCart,
) => {
  const {
    device,
    shift,
    cart,
    customers,
    customerId,
    quoteMode,
    quoteRef,
    quotes,
    quoteCounter,
    products,
    now,
    online,
    selectedKey,
    reloadOutbox,
  } = state;
  const { sync, deviceApi, markContact } = connection;
  const { cashierRevoked, shiftCashier } = shiftModule;
  const { priced, cartIssues, discountLimit, resetCart } = cartModule;

  // ─── الوضع ──────────────────────────────────────────────────────────────────
  /** يدخل وضع عرض السعر: السلة الحالية (إن وُجدت) تصير عرضاً */
  const enterQuoteMode = () => {
    if (state.order.value.type === "dine_in") {
      throw new Error("عرض السعر للطلب السفري — طلب الطاولة يُدفع عليها");
    }
    if (state.order.value.rounds) {
      throw new Error("أُرسل هذا الطلب للمطبخ — لا يتحول لعرض سعر");
    }
    if (quoteRef.value) throw new Error("السلة من عرض سعر — أتمّ بيعها أو أفرغها");
    quoteMode.value = true;
  };

  /** يخرج من الوضع والسلة باقية: يعود فحص المخزون عند الدفع */
  const exitQuoteMode = () => {
    quoteMode.value = false;
  };

  // ─── الحفظ ──────────────────────────────────────────────────────────────────
  const today = () => dayKey(new Date(now.value), state.tenant.value?.timezone);

  /** آخر يوم صلاحية لعرض يصدر الآن */
  const validUntilFor = (days: number): string => {
    const [year, month, day] = today().split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  };

  /** انتهت صلاحيته؟ (بتوقيت الشركة) */
  const quoteExpired = (quote: Pick<LocalQuote, "validUntil" | "status">): boolean =>
    quote.status === "open" && quote.validUntil < today();

  /**
   * يحفظ العرض على الجهاز ويضعه في طابور الرفع، ثم يفرغ السلة. يعيد العرض
   * لطباعته فوراً — سواء وُجد إنترنت أم لا.
   *
   * `approvedBy`: المشرف الذي وافق على ما يتجاوز صلاحية الكاشير: الورقة تحمل
   * اسم الشركة، فحد الخصم وأقل سعر يسريان عليها كالبيع.
   */
  const saveQuote = async (
    details: QuoteDetails,
    approvedBy: string | null = null,
  ): Promise<LocalQuote> => {
    if (!device.value || !shift.value) throw new Error("افتح وردية أولاً");
    if (cashierRevoked.value) {
      throw new Error("تم إيقاف كاشير هذه الوردية — قفّل الوردية ليفتح غيره");
    }
    if (!cart.value.length) throw new Error("السلة فارغة");
    const issues = cartIssues.value;
    if (issues.blocked.length) throw new Error(issues.blocked[0]);
    if (!(details.validityDays >= 1)) throw new Error("حدّد مدة صلاحية العرض");

    // ما يتجاوز صلاحية الكاشير: بموافقة مشرف، أو يُمنع إن لم يوجد من يوافق
    const overrides = [
      ...issues.belowMin,
      ...issues.reducedNoDiscount,
      ...(issues.discountOverLimit
        ? [`الخصم يتجاوز حدّ الكاشير (${discountLimit.value}%)`]
        : []),
    ];
    if (overrides.length && !approvedBy && !shiftCashier.value?.isSupervisor) {
      throw new Error(overrides[0]);
    }
    const approver = overrides.length
      ? (approvedBy ?? shiftCashier.value?.name ?? null)
      : null;

    const current = priced.value;
    const customer: PosCustomer | undefined = customers.value.find(
      (c) => c.id === customerId.value,
    );
    const lines = saleLinesOf(current);
    const nextCounter = quoteCounter.value + 1;
    const issuedAt = new Date().toISOString();
    const validUntil = validUntilFor(details.validityDays);

    const quote: LocalQuote = {
      uuid: newUuid(),
      number: `QT-${device.value.code}-${String(nextCounter).padStart(COUNTER_DIGITS, "0")}`,
      status: "open",
      issuedAt,
      validUntil,
      customerId: customer?.id ?? null,
      customerName: details.customerName.trim() || customer?.name || null,
      customerPhone: details.customerPhone.trim() || customer?.phone || null,
      customerTaxNumber: customer?.taxNumber ?? null,
      pricesIncludeTax: posTaxMode().pricesIncludeTax,
      lines,
      subtotal: current.subtotal,
      taxTotal: current.taxTotal,
      total: current.total,
      note: details.note.trim() || null,
      approvedBy: approver,
    };

    const next = [quote, ...quotes.value].slice(0, KEEP_QUOTES);
    await posDb.enqueue(
      {
        id: `quote-${quote.uuid}`,
        type: "quote.create",
        createdAt: issuedAt,
        payload: {
          uuid: quote.uuid,
          number: quote.number,
          issuedAt,
          validUntil,
          shiftId: shift.value.id,
          customerId: quote.customerId ?? undefined,
          customerName: quote.customerName ?? undefined,
          customerPhone: quote.customerPhone ?? undefined,
          customerTaxNumber: quote.customerTaxNumber ?? undefined,
          pricesIncludeTax: quote.pricesIncludeTax,
          lines: uploadLines(lines),
          note: quote.note ?? undefined,
          cashierName: shift.value.cashierName || undefined,
          approvedBy: approver ?? undefined,
        },
      },
      { quotes: next, quoteCounter: nextCounter },
    );
    quotes.value = next;
    quoteCounter.value = nextCounter;
    resetCart();
    state.order.value = newOrderContext();
    await reloadOutbox();
    void sync();
    return quote;
  };

  /** عرض تحوّل لفاتورة على هذه الشاشة */
  const markConverted = async (uuid: string, invoiceNumber: string) => {
    if (!quotes.value.some((quote) => quote.uuid === uuid)) return;
    quotes.value = quotes.value.map((quote) =>
      quote.uuid === uuid
        ? { ...quote, status: "converted", convertedInvoiceNumber: invoiceNumber }
        : quote,
    );
    await posDb.setMeta({ quotes: quotes.value });
  };

  // ─── الاسترجاع ──────────────────────────────────────────────────────────────
  /**
   * يجلب عرضاً برقمه: من السيرفر (أي عرض للشركة، بحالته الحقيقية)، وبلا إنترنت
   * من نسخة الجهاز (عروض هذه الشاشة فقط).
   */
  const lookupQuote = async (rawNumber: string): Promise<LocalQuote> => {
    const number = rawNumber.trim().toUpperCase();
    if (!number) throw new Error("أدخل رقم عرض السعر");
    const local = quotes.value.find((quote) => quote.number === number);

    try {
      const remote = await deviceApi().get<LocalQuote>(
        `/quotes/${encodeURIComponent(number)}`,
      );
      online.value = true;
      markContact();
      // السيرفر أعرف بحالته: أُلغي من لوحة التحكم أو حُوّل من شاشة أخرى
      if (local && local.status !== remote.status) {
        quotes.value = quotes.value.map((quote) =>
          quote.uuid === local.uuid
            ? {
                ...quote,
                status: remote.status,
                convertedInvoiceNumber: remote.convertedInvoiceNumber,
              }
            : quote,
        );
        await posDb.setMeta({ quotes: quotes.value });
      }
      return remote;
    } catch (error) {
      if (error instanceof OfflineError) online.value = false;
      // عرض صدر هنا ولم يصل السيرفر بعد: نسخة الجهاز تكفي
      const waiting =
        local && state.outbox.value.some((entry) => entry.id === `quote-${local.uuid}`);
      if (!(error instanceof OfflineError) && !waiting) throw error;
      if (!local) {
        throw new Error("لا يوجد اتصال — بلا إنترنت تُسترجع عروض هذه الشاشة فقط");
      }
      return local;
    }
  };

  /** سطر سلة بسعر العرض وخصمه: مثبّتان كما طُبعا */
  const frozenLine = (
    line: CartLine,
    source: LocalQuote["lines"][number],
    quote: LocalQuote,
  ) => {
    const list = unitPriceOf(line.product, line.unitId);
    line.unitPrice = source.unitPrice;
    line.pricePending = false;
    line.quoted = {
      number: quote.number,
      quantity: source.quantity,
      discount: source.discount,
    };
    // سعر غير سعر الكتالوج يصل السيرفر تعديلاً مسجّلاً بسببه، لا مخالفة
    if (!line.product.openPrice && Math.abs(list - source.unitPrice) > 1e-9) {
      line.listPrice = list;
      line.priceReason = `عرض سعر ${quote.number}`;
      line.priceApprovedBy = quote.approvedBy ?? null;
    }
  };

  /**
   * ينزّل أصناف العرض في السلة لبيعها. المخزون يُفحص عند الدفع كأي بيع. يعيد
   * ما يجب أن يعرفه الكاشير: انتهت الصلاحية (الأسعار الحالية)، أو صنف سقط.
   */
  const convertQuote = (quote: LocalQuote): string[] => {
    if (quote.status === "converted") {
      throw new Error(
        `تحوّل العرض لفاتورة ${quote.convertedInvoiceNumber ?? ""}`.trim(),
      );
    }
    if (quote.status === "cancelled") throw new Error("هذا العرض ملغي");
    if (cart.value.length) {
      throw new Error("في السلة أصناف — أتمّها أو علّقها قبل تحويل العرض");
    }
    if (state.order.value.type === "dine_in") {
      throw new Error("اختر سفري أولاً: عرض السعر لا يتحول على طاولة");
    }

    const notices: string[] = [];
    const expired = quoteExpired(quote);
    // أساس التسعير تغيّر: سعر العرض يعني شيئاً آخر الآن
    const basisChanged = quote.pricesIncludeTax !== posTaxMode().pricesIncludeTax;
    const frozen = !expired && !basisChanged;
    if (expired) notices.push("انتهت صلاحية العرض — الأسعار الحالية هي السارية");
    else if (basisChanged) notices.push("تغيّر أساس التسعير — الأسعار الحالية هي السارية");

    const byId = new Map(products.value.map((p) => [p.id, p]));
    const dropped: string[] = [];
    for (const source of quote.lines) {
      const product = byId.get(source.productId);
      const unitId =
        source.unitId && source.unitId !== product?.baseUnitId ? source.unitId : null;
      if (!product || (unitId && !product.units.some((u) => u.unitId === unitId))) {
        dropped.push(source.productName);
        continue;
      }
      const line = cartModule.buildLine(product, unitId, source.quantity);
      if (frozen) frozenLine(line, source, quote);
      else if (product.openPrice) {
        // لا سعر حالياً للسعر المفتوح: يبقى ما كُتب
        line.unitPrice = source.unitPrice;
        line.pricePending = false;
      }
      cart.value.push(line);
    }
    if (!cart.value.length) {
      throw new Error("أصناف العرض لم تعد على هذا الجهاز");
    }
    if (dropped.length) {
      notices.push(`لم تعد متاحة وسقطت من الفاتورة: ${dropped.join("، ")}`);
    }

    customerId.value = customers.value.some((c) => c.id === quote.customerId)
      ? quote.customerId!
      : "";
    quoteRef.value = {
      uuid: quote.uuid,
      number: quote.number,
      validUntil: quote.validUntil,
      approvedBy: quote.approvedBy ?? null,
    };
    selectedKey.value = cart.value.at(-1)?.key ?? null;
    return notices;
  };

  return {
    enterQuoteMode,
    exitQuoteMode,
    saveQuote,
    markConverted,
    lookupQuote,
    quoteExpired,
    convertQuote,
  };
};

export type PosQuotes = ReturnType<typeof createQuotes>;
