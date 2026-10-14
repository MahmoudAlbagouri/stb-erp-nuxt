// pos/store/shift.ts — الوردية والدرج: فتحها وتقفيلها، كاشيرها، حركات الدرج،
// موافقة المشرف، وسجل التدقيق
import { computed } from "vue";
import { newUuid, roundAmount, sumAmounts } from "@/pos/calc";
import { posDb } from "@/pos/db";
import { kickDrawer, type DrawerConfig } from "@/pos/drawer";
import type {
  AuditAction,
  CashMove,
  LocalShift,
  PosCashier,
  PosOptions,
} from "@/pos/types";
import type { PosConnection } from "./connection";
import type { PosState } from "./state";

export const createShift = (state: PosState, connection: PosConnection) => {
  const {
    device,
    shift,
    cashiers,
    cashierName,
    cashMoves,
    sales,
    returns,
    held,
    drawer,
    posOptions,
    returnsAllowed,
    reloadOutbox,
  } = state;
  const { sync, tick, shiftBlockReason } = connection;

  // ─── فتح الوردية ────────────────────────────────────────────────────────────
  /**
   * يفتح وردية. `cashier` من تحقق من رقمه السري على هذه الشاشة (انظر
   * pos/cashiers)؛ بدونه وردية باسم حر — فقط لشركة لم تعرّف كاشيرات.
   */
  const openShift = async (
    openingCash: number,
    name: string,
    cashier: PosCashier | null = null,
  ) => {
    if (shift.value) throw new Error("توجد وردية مفتوحة بالفعل");
    tick();
    if (shiftBlockReason.value) throw new Error(shiftBlockReason.value);
    if (cashiers.value.length > 0 && !cashier) {
      throw new Error("اختر الكاشير وأدخل رقمه السري");
    }
    const next: LocalShift = {
      id: newUuid(),
      openedAt: new Date().toISOString(),
      openingCash,
      cashierName: name,
      cashierId: cashier?.id ?? null,
    };
    await posDb.enqueue(
      {
        id: `open-${next.id}`,
        type: "shift.open",
        payload: {
          id: next.id,
          openedAt: next.openedAt,
          openingCash,
          cashierName: name || undefined,
          cashierId: cashier?.id,
        },
        createdAt: next.openedAt,
      },
      { shift: next, cashierName: name, cashMoves: [] },
    );
    cashMoves.value = [];
    shift.value = next;
    cashierName.value = name;
    await reloadOutbox();
    // بداية الوردية أنسب وقت لتحديث الأسعار كاملة
    void sync({ pull: true });
  };

  // ─── كاشير الوردية وصلاحياته ────────────────────────────────────────────────
  /** كاشير الوردية الحالية كما هو في آخر قائمة نزلت (null = لم يعد فيها) */
  const shiftCashier = computed(() =>
    shift.value?.cashierId
      ? (cashiers.value.find((c) => c.id === shift.value!.cashierId) ?? null)
      : null,
  );

  /** كاشير الوردية أُوقف أو حُذف (عرفت الشاشة عند آخر اتصال): يقفّل ورديته فقط */
  const cashierRevoked = computed(
    () => !!shift.value?.cashierId && !shiftCashier.value,
  );

  /**
   * المرتجع يتبع صاحب الوردية — نفس قاعدة السيرفر: كاشيرها إن فُتحت برقم
   * سري، وإلا آخر ما عُرف عن مستخدم هذه الشاشة.
   */
  const canReturn = computed(() =>
    shift.value?.cashierId
      ? !!shiftCashier.value?.canReturn
      : returnsAllowed.value,
  );

  // ─── أرقام الوردية ──────────────────────────────────────────────────────────
  /** مبيعات الوردية الحالية من نسخة الجهاز (تعمل بلا إنترنت) */
  const shiftSummary = computed(() => {
    const own = shift.value
      ? sales.value.filter((sale) => sale.shiftId === shift.value!.id)
      : [];
    const byMethod = (method: string) =>
      sumAmounts(
        own.flatMap((sale) =>
          sale.payments.filter((p) => p.method === method).map((p) => p.amount),
        ),
      );
    const cash = byMethod("cash");
    const ownReturns = shift.value
      ? returns.value.filter((r) => r.shiftId === shift.value!.id)
      : [];
    const cashRefunds = sumAmounts(
      ownReturns.filter((r) => r.refundMethod === "cash").map((r) => r.refundAmount),
    );
    const moves = shift.value
      ? cashMoves.value.filter((move) => move.shiftId === shift.value!.id)
      : [];
    const moved = (type: CashMove["type"]) =>
      sumAmounts(moves.filter((move) => move.type === type).map((move) => move.amount));
    const cashIn = moved("in");
    const cashOut = moved("out");
    return {
      invoicesCount: own.length,
      salesTotal: sumAmounts(own.map((sale) => sale.total)),
      cash,
      card: byMethod("card"),
      /** ما بيع على الحساب (آجل): لم يدخل الدرج */
      credit: sumAmounts(own.map((sale) => sale.creditAmount ?? 0)),
      discounts: sumAmounts(own.map((sale) => sale.discountTotal ?? 0)),
      returnsCount: ownReturns.length,
      returnsTotal: sumAmounts(ownReturns.map((r) => r.total)),
      cashRefunds,
      cashIn,
      cashOut,
      drawerOpens: shift.value?.drawerOpens ?? 0,
      // الدرج = العهدة + المبيعات النقدية − ما رُدّ نقداً + الإيداعات − المسحوبات
      expectedCash: sumAmounts([
        shift.value?.openingCash ?? 0,
        cash,
        -cashRefunds,
        cashIn,
        -cashOut,
      ]),
    };
  });

  // ─── تقفيل الوردية ──────────────────────────────────────────────────────────
  const closeShift = async (closingCash: number, note: string) => {
    if (!shift.value) throw new Error("لا توجد وردية مفتوحة");
    if (held.value.length) {
      throw new Error("توجد فواتير معلّقة — أتمّها أو احذفها قبل التقفيل");
    }
    const closedAt = new Date().toISOString();
    await posDb.enqueue(
      {
        id: `close-${shift.value.id}`,
        type: "shift.close",
        payload: {
          id: shift.value.id,
          closedAt,
          closingCash,
          note: note || undefined,
          drawerOpens: shift.value.drawerOpens ?? 0,
        },
        createdAt: closedAt,
      },
      { shift: null, cart: null },
    );
    shift.value = null;
    state.cart.value = [];
    state.customerId.value = "";
    state.invoiceDiscount.value = null;
    await reloadOutbox();
    void sync();
  };

  // ─── سجل التدقيق ────────────────────────────────────────────────────────────
  /**
   * يسجّل ما لا يترك أثراً في الفواتير (حذف سطر، إفراغ سلة، فتح الدرج، خصم…).
   * يُرفع مع الطابور في النبضة التالية — لا يستعجل اتصالاً لكل حدث.
   */
  const logAudit = async (
    action: AuditAction,
    info: { amount?: number; details?: string; approvedBy?: string | null } = {},
  ) => {
    if (!device.value) return;
    const id = newUuid();
    const occurredAt = new Date().toISOString();
    await posDb.enqueue({
      id: `audit-${id}`,
      type: "audit",
      createdAt: occurredAt,
      payload: {
        id,
        action,
        occurredAt,
        shiftId: shift.value?.id,
        cashierName: shift.value?.cashierName || undefined,
        approvedBy: info.approvedBy || undefined,
        amount: info.amount,
        details: info.details?.slice(0, 500),
      },
    });
    await reloadOutbox();
  };

  // ─── موافقة المشرف ──────────────────────────────────────────────────────────
  const supervisors = computed(() => cashiers.value.filter((c) => c.isSupervisor));

  /**
   * هل تحتاج العملية رقم مشرف السري؟ شركة لم تعرّف كاشيرات لا تستخدم الأرقام
   * السرية أصلاً، ووردية يفتحها مشرف لا تحتاج موافقة غيره.
   * `always`: ما يتجاوز صلاحية الكاشير دائماً (خصم فوق حدّه، بيع تحت أقل سعر).
   */
  const needsSupervisor = (
    kind: keyof PosOptions["approvals"] | "always",
  ): boolean => {
    if (!cashiers.value.length) return false;
    if (shiftCashier.value?.isSupervisor) return false;
    return kind === "always" ? true : !!posOptions.value.approvals[kind];
  };

  /**
   * هل يحتاج تغيير سعر صنف في الفاتورة رقم مشرف الآن؟ نعم إن لم يملك كاشير
   * الوردية صلاحيته، أو اشترطت إعدادات الشركة الموافقة. غير ذلك يغيّره بنفسه —
   * وحد خصمه وأقل سعر للصنف يُفحصان عند الدفع.
   */
  const needsPriceApproval = (): boolean =>
    needsSupervisor("priceChange") ||
    (!!shiftCashier.value &&
      shiftCashier.value.canChangePrice === false &&
      needsSupervisor("always"));

  // ─── حركات الدرج النقدية ────────────────────────────────────────────────────
  /** إيداع نقد في الدرج أو سحبه بلا بيع (فكّة، مصروف نثري، توريد للخزنة) */
  const addCashMove = async (
    type: CashMove["type"],
    amount: number,
    reason: string,
    approvedBy: string | null = null,
  ): Promise<CashMove> => {
    if (!shift.value) throw new Error("افتح وردية أولاً");
    if (!(amount > 0)) throw new Error("أدخل المبلغ");
    if (!reason.trim()) throw new Error("اكتب سبب الحركة");
    if (type === "out" && amount > shiftSummary.value.expectedCash + 1e-9) {
      throw new Error(
        `المبلغ أكبر من المفترض في الدرج (${shiftSummary.value.expectedCash})`,
      );
    }

    const move: CashMove = {
      id: newUuid(),
      shiftId: shift.value.id,
      type,
      amount: roundAmount(amount),
      reason: reason.trim(),
      occurredAt: new Date().toISOString(),
      approvedBy,
    };
    const next = [...cashMoves.value, move];
    await posDb.enqueue(
      {
        id: `cash-${move.id}`,
        type: "cash.move",
        createdAt: move.occurredAt,
        payload: {
          id: move.id,
          shiftId: move.shiftId,
          type,
          amount: move.amount,
          reason: move.reason,
          occurredAt: move.occurredAt,
          cashierName: shift.value.cashierName || undefined,
          approvedBy: approvedBy || undefined,
        },
      },
      { cashMoves: next },
    );
    cashMoves.value = next;
    await logAudit(type === "in" ? "cash_in" : "cash_out", {
      amount: move.amount,
      details: move.reason,
      approvedBy,
    });
    void sync();
    return move;
  };

  // ─── درج النقود ─────────────────────────────────────────────────────────────
  const setDrawer = async (config: DrawerConfig) => {
    drawer.value = { ...config };
    await posDb.setMeta({ drawer: drawer.value });
  };

  /**
   * يفتح الدرج. `manual` = بلا بيع ولا مرتجع: يُعدّ على الوردية ويظهر
   * للمدير عند التقفيل.
   */
  const openDrawer = async (manual = false, approvedBy: string | null = null) => {
    if (drawer.value.mode === "off") return;
    await kickDrawer(drawer.value);
    if (manual && shift.value) {
      shift.value = {
        ...shift.value,
        drawerOpens: (shift.value.drawerOpens ?? 0) + 1,
      };
      await posDb.setMeta({ shift: shift.value });
      await logAudit("drawer_opened", { approvedBy });
    }
  };

  return {
    openShift,
    closeShift,
    shiftCashier,
    cashierRevoked,
    canReturn,
    shiftSummary,
    logAudit,
    supervisors,
    needsSupervisor,
    needsPriceApproval,
    addCashMove,
    setDrawer,
    openDrawer,
  };
};

export type PosShiftModule = ReturnType<typeof createShift>;
