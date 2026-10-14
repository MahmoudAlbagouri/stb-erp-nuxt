// pos/store/checkout.ts — إتمام البيع والمرتجع
//
// البيع والمرتجع يُكتبان أولاً على الجهاز مع عمليتهما في طابور الرفع: الإيصال
// يُطبع فوراً سواء وُجد إنترنت أم لا.
import { OfflineError } from "@/pos/api";
import {
  buildZatcaQr,
  newUuid,
  POS_PRICES_INCLUDE_TAX,
  returnShare,
  roundAmount,
  sumAmounts,
} from "@/pos/calc";
import { posDb } from "@/pos/db";
import { isRepriced } from "@/pos/promotions";
import type {
  LocalReturn,
  LocalSale,
  ReturnableInvoice,
  SaleLine,
  SalePayment,
} from "@/pos/types";
import type { SalesPaymentMethod } from "@/types/sales";
import type { PosCart } from "./cart";
import type { PosConnection } from "./connection";
import type { PosShiftModule } from "./shift";
import { COUNTER_DIGITS, roundQuantity, type PosState } from "./state";

export const createCheckout = (
  state: PosState,
  connection: PosConnection,
  shiftModule: PosShiftModule,
  cartModule: PosCart,
) => {
  const {
    device,
    settings,
    shift,
    counter,
    customers,
    sales,
    returns,
    outbox,
    online,
    cart,
    customerId,
    reloadOutbox,
  } = state;
  const { sync, deviceApi, markContact } = connection;
  const { logAudit, shiftCashier, cashierRevoked, canReturn } = shiftModule;
  const { priced, cartIssues, customerBalance, discountLimit, resetCart } =
    cartModule;

  // ─── إتمام البيع ────────────────────────────────────────────────────────────
  /**
   * يحفظ الفاتورة على الجهاز ويضعها في طابور الرفع، ثم يحاول رفعها. يعيد
   * الفاتورة لطباعة إيصالها فوراً — سواء وُجد إنترنت أم لا.
   *
   * ما قُبض أقل من الإجمالي = الباقي على حساب العميل (بيع آجل، لعميل مسجّل).
   * `approvedBy`: المشرف الذي وافق على ما يتجاوز صلاحية الكاشير (انظر
   * cartIssues) — الشاشة تطلبه قبل الاستدعاء.
   */
  const checkout = async (
    payments: SalePayment[],
    cashReceived: number,
    approvedBy: string | null = null,
  ): Promise<LocalSale> => {
    if (!device.value || !shift.value) throw new Error("افتح وردية أولاً");
    if (cashierRevoked.value) {
      throw new Error("تم إيقاف كاشير هذه الوردية — قفّل الوردية ليفتح غيره");
    }
    if (cart.value.length === 0) throw new Error("السلة فارغة");

    const current = priced.value;
    const issues = cartIssues.value;
    if (issues.blocked.length) throw new Error(issues.blocked[0]);

    const total = current.total;
    const paid = sumAmounts(payments.map((p) => p.amount));
    const creditAmount = sumAmounts([total, -paid]);
    if (creditAmount < 0) throw new Error("المقبوض أكبر من إجمالي الفاتورة");

    const customer = customers.value.find((c) => c.id === customerId.value);
    let creditOverLimit = false;
    if (creditAmount > 0) {
      if (!customer) throw new Error("البيع الآجل لعميل مسجّل — اختر العميل");
      const limit = customer.creditLimit ?? null;
      creditOverLimit =
        limit !== null && customerBalance(customer.id) + creditAmount > limit + 1e-9;
    }

    // ما يتجاوز صلاحية الكاشير: بموافقة مشرف، أو يُمنع إن لم يوجد من يوافق
    const overrides = [
      ...issues.belowMin,
      ...issues.reducedNoDiscount,
      ...(issues.discountOverLimit
        ? [`الخصم يتجاوز حدّ الكاشير (${discountLimit.value}%)`]
        : []),
      ...(creditOverLimit ? [`تجاوز حد ائتمان العميل "${customer!.name}"`] : []),
    ];
    const selfApproved = !!shiftCashier.value?.isSupervisor;
    if (overrides.length && !approvedBy && !selfApproved) {
      throw new Error(overrides[0]);
    }
    const approver = overrides.length
      ? (approvedBy ?? shiftCashier.value?.name ?? null)
      : null;

    const lines: SaleLine[] = current.lines.map((p) => ({
      productId: p.line.product.id,
      productName: p.line.product.name,
      unitId: p.line.unitId ?? undefined,
      unitName: p.line.unitName,
      quantity: Number(p.line.quantity),
      unitPrice: p.unitPrice,
      discount: p.discount,
      taxRate: p.line.product.taxRate,
      subtotal: p.subtotal,
      taxAmount: p.taxAmount,
      total: p.total,
      baseQuantity: roundQuantity(Number(p.line.quantity) * p.line.factor),
      promoName: p.promoName,
      // سعر غيّره الكاشير لهذه الفاتورة: السيرفر يحفظ الأصلي وسببه
      ...(isRepriced(p.line)
        ? {
            listPrice: p.line.listPrice!,
            priceReason: p.line.priceReason ?? undefined,
          }
        : {}),
    }));
    const taxTotal = current.taxTotal;

    const nextCounter = counter.value + 1;
    const issuedAt = new Date().toISOString();
    const cashPaid = sumAmounts(
      payments.filter((p) => p.method === "cash").map((p) => p.amount),
    );

    const sale: LocalSale = {
      uuid: newUuid(),
      number: `${device.value.code}-${String(nextCounter).padStart(COUNTER_DIGITS, "0")}`,
      issuedAt,
      shiftId: shift.value.id,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      customerTaxNumber: customer?.taxNumber ?? null,
      pricesIncludeTax: POS_PRICES_INCLUDE_TAX,
      lines,
      payments,
      subtotal: current.subtotal,
      taxTotal,
      total,
      cashReceived,
      change: Math.max(sumAmounts([cashReceived, -cashPaid]), 0),
      creditAmount,
      discountTotal: sumAmounts([current.promoDiscount, current.manualDiscount]),
      qrCode: settings.value?.taxNumber
        ? buildZatcaQr({
            sellerName: settings.value.sellerName ?? "",
            taxNumber: settings.value.taxNumber,
            issuedAt,
            total,
            taxTotal,
          })
        : null,
    };

    await posDb.saveSale(
      sale,
      {
        id: `sale-${sale.uuid}`,
        type: "sale",
        createdAt: issuedAt,
        payload: {
          uuid: sale.uuid,
          number: sale.number,
          issuedAt,
          shiftId: sale.shiftId,
          customerId: sale.customerId ?? undefined,
          pricesIncludeTax: sale.pricesIncludeTax,
          // ما يخص الشاشة وحدها (الاسم، الرصيد، العرض) لا يُرفع
          lines: lines.map(
            ({
              productName: _name,
              unitName: _unit,
              baseQuantity: _base,
              promoName: _promo,
              ...line
            }) => line,
          ),
          payments,
          // السيرفر يُبلّغ عن سعر تحت الحد ما لم يصله اسم من وافق عليه
          approvedBy: approver ?? undefined,
        },
      },
      nextCounter,
    );

    counter.value = nextCounter;
    sales.value.push(sale);
    resetCart();
    await reloadOutbox();

    if (current.manualDiscount > 0) {
      await logAudit("discount", {
        amount: current.manualDiscount,
        details: `${sale.number} — ${current.manualPercent.toFixed(1)}%`,
        approvedBy: issues.discountOverLimit ? approver : null,
      });
    }
    // كل تغيير سعر بفاتورته: من غيّر، وكم كان وكم صار، ولماذا، ومن وافق
    for (const p of current.lines.filter((priced) => isRepriced(priced.line))) {
      const { line } = p;
      await logAudit("price_changed", {
        amount: roundAmount((line.unitPrice - line.listPrice!) * (Number(line.quantity) || 0)),
        details: `${sale.number} — ${line.product.name} (${line.unitName}): ${line.listPrice} ← ${line.unitPrice}${line.priceReason ? ` · ${line.priceReason}` : ""}`,
        approvedBy: line.priceApprovedBy ?? null,
      });
    }
    if (issues.belowMin.length) {
      await logAudit("price_below_min", {
        details: `${sale.number} — ${issues.belowMin.join("، ")}`,
        approvedBy: approver,
      });
    }
    if (creditOverLimit) {
      await logAudit("credit_over_limit", {
        amount: creditAmount,
        details: `${sale.number} — ${customer!.name}`,
        approvedBy: approver,
      });
    }

    void sync();
    return sale;
  };

  // ─── المرتجع ────────────────────────────────────────────────────────────────
  /** مرتجعات هذه الشاشة التي لم يؤكد السيرفر استلامها بعد */
  const pendingReturnsOf = (invoiceNumber: string) =>
    returns.value.filter(
      (r) =>
        r.invoiceNumber === invoiceNumber &&
        outbox.value.some((entry) => entry.id === `return-${r.uuid}`),
    );

  /** يطرح من الفاتورة ما أُرجع منها على هذه الشاشة */
  const withReturns = (
    invoice: ReturnableInvoice,
    done: LocalReturn[],
  ): ReturnableInvoice => {
    const returned = new Map<number, number>();
    for (const line of done.flatMap((r) => r.lines)) {
      returned.set(line.lineIndex, (returned.get(line.lineIndex) ?? 0) + line.quantity);
    }
    return {
      ...invoice,
      returnedAmount: sumAmounts([invoice.returnedAmount, ...done.map((r) => r.total)]),
      paidAmount: sumAmounts([invoice.paidAmount, ...done.map((r) => -r.refundAmount)]),
      lines: invoice.lines.map((line) => ({
        ...line,
        returnedQuantity: line.returnedQuantity + (returned.get(line.lineIndex) ?? 0),
      })),
    };
  };

  /**
   * يجلب فاتورة برقمها لاختيار ما يُرجَع منها: من السيرفر (أي فاتورة للشركة)،
   * وبلا إنترنت من نسخة الجهاز (فواتير هذه الشاشة فقط).
   */
  const lookupInvoice = async (rawNumber: string): Promise<ReturnableInvoice> => {
    const number = rawNumber.trim();
    if (!number) throw new Error("أدخل رقم الفاتورة");

    try {
      const remote = await deviceApi().get<Omit<ReturnableInvoice, "local">>(
        `/invoices/${encodeURIComponent(number)}`,
      );
      online.value = true;
      markContact();
      // السيرفر لم يرَ بعد ما ينتظر الرفع من هذه الشاشة
      return withReturns({ ...remote, local: false }, pendingReturnsOf(remote.number));
    } catch (error) {
      const waiting = sales.value.find(
        (sale) => sale.number.toLowerCase() === number.toLowerCase(),
      );
      // فاتورة بيعت هنا ولم تُرفع بعد: السيرفر لا يعرفها، ونسخة الجهاز تكفي
      const notUploaded =
        waiting && outbox.value.some((entry) => entry.id === `sale-${waiting.uuid}`);
      if (!(error instanceof OfflineError) && !notUploaded) throw error;
      if (error instanceof OfflineError) online.value = false;
      if (!waiting) {
        throw new Error(
          "لا يوجد اتصال — بلا إنترنت يمكن إرجاع فواتير هذه الشاشة فقط",
        );
      }
      return withReturns(
        {
          number: waiting.number,
          issuedAt: waiting.issuedAt,
          customerName: waiting.customerName,
          total: waiting.total,
          // ما بيع آجلاً لم يُدفع: لا يُردّ منه نقد
          paidAmount: sumAmounts([waiting.total, -(waiting.creditAmount ?? 0)]),
          returnedAmount: 0,
          lines: waiting.lines.map((line, lineIndex) => ({
            lineIndex,
            productName: line.productName,
            unitName: line.unitName,
            quantity: line.quantity,
            returnedQuantity: 0,
            subtotal: line.subtotal,
            taxAmount: line.taxAmount,
            total: line.total,
          })),
          local: true,
        },
        returns.value.filter((r) => r.invoiceNumber === waiting.number),
      );
    }
  };

  /** قيمة مرتجع وما يُردّ للعميل منه (نفس قاعدة السيرفر: المدفوع الزائد) */
  const refundPreview = (
    invoice: ReturnableInvoice,
    quantities: Record<number, number>,
  ) => {
    const lines = invoice.lines
      .map((line) => ({ line, quantity: Number(quantities[line.lineIndex]) || 0 }))
      .filter((item) => item.quantity > 0);
    const total = sumAmounts(
      lines.map((item) => returnShare(item.line, item.quantity).total),
    );
    const net = sumAmounts([invoice.total, -invoice.returnedAmount, -total]);
    return {
      lines,
      total,
      refund: Math.max(sumAmounts([invoice.paidAmount, -net]), 0),
    };
  };

  /**
   * يسجّل المرتجع على الجهاز ويضعه في طابور الرفع. المبلغ يخرج من درج الوردية
   * الحالية، حتى لو كانت الفاتورة من وردية سابقة.
   */
  const refund = async (
    invoice: ReturnableInvoice,
    quantities: Record<number, number>,
    method: SalesPaymentMethod,
    reason: string,
  ): Promise<LocalReturn> => {
    if (!shift.value) throw new Error("افتح وردية أولاً");
    if (!canReturn.value) throw new Error("لا تملك صلاحية عمل مرتجع");
    const preview = refundPreview(invoice, quantities);
    if (preview.lines.length === 0) throw new Error("حدّد كمية صنف واحد على الأقل");
    for (const { line, quantity } of preview.lines) {
      if (quantity > line.quantity - line.returnedQuantity + 1e-9) {
        throw new Error(`كمية "${line.productName}" أكبر من المتاح للإرجاع`);
      }
    }

    const issuedAt = new Date().toISOString();
    const salesReturn: LocalReturn = {
      uuid: newUuid(),
      invoiceNumber: invoice.number,
      issuedAt,
      shiftId: shift.value.id,
      lines: preview.lines.map(({ line, quantity }) => ({
        lineIndex: line.lineIndex,
        productName: line.productName,
        unitName: line.unitName,
        quantity,
        total: returnShare(line, quantity).total,
      })),
      total: preview.total,
      refundMethod: method,
      refundAmount: preview.refund,
      reason: reason || null,
    };

    await posDb.saveReturn(salesReturn, {
      id: `return-${salesReturn.uuid}`,
      type: "return",
      createdAt: issuedAt,
      payload: {
        uuid: salesReturn.uuid,
        invoiceNumber: salesReturn.invoiceNumber,
        issuedAt,
        shiftId: salesReturn.shiftId,
        lines: salesReturn.lines.map(({ lineIndex, quantity }) => ({ lineIndex, quantity })),
        refundMethod: method,
        refundAmount: salesReturn.refundAmount,
        reason: reason || undefined,
      },
    });
    returns.value.push(salesReturn);
    await reloadOutbox();
    void sync();
    return salesReturn;
  };

  return { checkout, lookupInvoice, refundPreview, refund };
};
