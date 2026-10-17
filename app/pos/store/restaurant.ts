// pos/store/restaurant.ts — المطاعم: الطاولات وطلباتها المفتوحة، والإرسال
// للمطبخ (البون والإضافات والإلغاءات)، وحالة الطلبات في المطبخ.
//
// طلب الطاولة يعيش على هذا الجهاز (يعمل بلا إنترنت كالمعلّقة)؛ بون المطبخ
// عملية في طابور الرفع تصل شاشة المطبخ حين يتوفر الاتصال، ويُطبع ورقاً
// (دائماً بلا إنترنت) فلا يتوقف المطبخ.
import { computed, ref, watch } from "vue";
import { OfflineError } from "@/pos/api";
import { newUuid } from "@/pos/calc";
import { posDb } from "@/pos/db";
import type {
  CartLine,
  DeviceKitchenOrder,
  DiningTableInfo,
  KitchenLine,
  LocalKitchenTicket,
  LocalSale,
  OrderContext,
  TableOrder,
} from "@/pos/types";
import type { PosCart } from "./cart";
import type { PosConnection } from "./connection";
import {
  CART_SAVE_DELAY_MS,
  KEEP_KITCHEN_TICKETS,
  newOrderContext,
  roundQuantity,
  type PosState,
} from "./state";

/** كل كم تسأل الشاشة عن حالة طلباتها في المطبخ */
export const KITCHEN_POLL_MS = 15_000;

const lineKey = (line: Pick<KitchenLine, "productId" | "unitId" | "note">) =>
  `${line.productId}|${line.unitId ?? ""}|${line.note}`;

export const createRestaurant = (
  state: PosState,
  connection: PosConnection,
  cartModule: PosCart,
) => {
  const {
    ready,
    restaurant,
    order,
    tableOrders,
    kitchenTickets,
    kitchenOrders,
    shift,
    cart,
    online,
    reloadOutbox,
  } = state;
  const { sync, deviceApi, markContact } = connection;
  const { priced, serializeCart, restoreCart, resetCart, holdCart } = cartModule;

  const enabled = computed(() => !!restaurant.value);
  const tables = computed<DiningTableInfo[]>(() => restaurant.value?.tables ?? []);

  // ─── حفظ الطلب الجاري ───────────────────────────────────────────────────────
  // مع السلة: طاولة مفتوحة على الشاشة تعود بعد إغلاق المتصفح
  let orderSaveTimer: ReturnType<typeof setTimeout> | null = null;
  watch(
    order,
    () => {
      if (!ready.value) return;
      if (orderSaveTimer) clearTimeout(orderSaveTimer);
      orderSaveTimer = setTimeout(
        () => void posDb.setMeta({ order: order.value }),
        CART_SAVE_DELAY_MS,
      );
    },
    { deep: true },
  );
  const saveTables = () => posDb.setMeta({ tableOrders: tableOrders.value });

  // ─── ما يُحضَّر في المطبخ ──────────────────────────────────────────────────
  /** الصنف يُحضَّر في المطبخ؟ (بلا تصنيفات محددة: كل الأصناف) */
  const goesToKitchen = (line: CartLine): boolean => {
    // سطر رسوم التوصيل ليس طعاماً
    if (line.product.id === state.deliveryOptions.value?.feeProductId) return false;
    const categories = restaurant.value?.kitchenCategoryIds ?? [];
    if (!categories.length) return true;
    return !!line.product.categoryId && categories.includes(line.product.categoryId);
  };

  /** أصناف السلة للمطبخ مجمّعة (نفس الصنف والوحدة والملاحظة سطر واحد) */
  const kitchenLinesOf = (lines: CartLine[]): KitchenLine[] => {
    const merged = new Map<string, KitchenLine>();
    for (const line of lines.filter(goesToKitchen)) {
      const quantity = Number(line.quantity) || 0;
      if (!(quantity > 0)) continue;
      const item: KitchenLine = {
        productId: line.product.id,
        unitId: line.unitId,
        name: line.product.name,
        unitName: line.unitName,
        quantity,
        note: line.note?.trim() ?? "",
      };
      const key = lineKey(item);
      const existing = merged.get(key);
      if (existing) existing.quantity = roundQuantity(existing.quantity + quantity);
      else merged.set(key, item);
    }
    return [...merged.values()];
  };

  /** الفرق بين السلة وما وصل المطبخ: الإضافات موجبة والإلغاءات سالبة */
  const diffLines = (current: KitchenLine[], sent: KitchenLine[]): KitchenLine[] => {
    const before = new Map(sent.map((line) => [lineKey(line), line]));
    const result: KitchenLine[] = [];
    for (const line of current) {
      const delta = roundQuantity(line.quantity - (before.get(lineKey(line))?.quantity ?? 0));
      if (Math.abs(delta) > 1e-9) result.push({ ...line, quantity: delta });
      before.delete(lineKey(line));
    }
    // ما أُرسل ثم حُذف من السلة كله: إلغاء
    for (const line of before.values()) {
      result.push({ ...line, quantity: -line.quantity });
    }
    return result;
  };

  /** ما لم يصل المطبخ بعد من الطلب الجاري */
  const pendingKitchen = computed<KitchenLine[]>(() =>
    enabled.value ? diffLines(kitchenLinesOf(cart.value), order.value.sent) : [],
  );

  // ─── بون المطبخ ─────────────────────────────────────────────────────────────
  /** رقم الطلب التالي في الوردية (يُنادى به في المطبخ والاستلام) */
  const nextTicketNo = async (): Promise<number> => {
    const saved = await posDb.getMeta<{ shiftId: string; seq: number }>("kitchenSeq");
    const shiftId = shift.value?.id ?? "";
    return saved && saved.shiftId === shiftId ? saved.seq + 1 : 1;
  };

  /** بون يُطبع: ينتظر الشاشة لتطبعه بعد الإيصال (null = لا شيء) */
  const ticketToPrint = ref<LocalKitchenTicket | null>(null);

  /** هل يُطبع البون؟ إعداد الشركة، وبلا إنترنت دائماً (شاشة المطبخ لن تراه) */
  const shouldPrint = () => !!restaurant.value?.printKitchenTicket || !online.value;

  /**
   * يرسل للمطبخ ما لم يصله من طلب: بون في طابور الرفع، ويُحدَّث ما أُرسل.
   * يعيد البون، أو null إن لم يكن جديد.
   */
  const sendTicket = async (
    context: OrderContext,
    lines: KitchenLine[],
    info: { label?: string | null; orderType?: LocalKitchenTicket["orderType"] } = {},
  ): Promise<LocalKitchenTicket | null> => {
    if (!lines.length) return null;
    if (!shift.value) throw new Error("افتح وردية أولاً");
    const ticketNo = await nextTicketNo();
    const ticket: LocalKitchenTicket = {
      id: newUuid(),
      ticketNo,
      orderRef: context.ref,
      round: context.rounds + 1,
      orderType: info.orderType ?? context.type,
      tableName: context.type === "dine_in" ? context.tableName : null,
      label: info.label?.trim() || null,
      cashierName: shift.value.cashierName || null,
      sentAt: new Date().toISOString(),
      lines,
    };
    const tickets = [...kitchenTickets.value, ticket].slice(-KEEP_KITCHEN_TICKETS);
    await posDb.enqueue(
      {
        id: `kitchen-${ticket.id}`,
        type: "kitchen.send",
        createdAt: ticket.sentAt,
        payload: {
          id: ticket.id,
          ticketNo,
          shiftId: shift.value.id,
          orderType: ticket.orderType,
          tableId: context.type === "dine_in" ? (context.tableId ?? undefined) : undefined,
          tableName: ticket.tableName ?? undefined,
          label: ticket.label ?? undefined,
          orderRef: context.ref,
          round: ticket.round,
          cashierName: ticket.cashierName ?? undefined,
          sentAt: ticket.sentAt,
          lines: lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            unitName: line.unitName,
            quantity: line.quantity,
            note: line.note || undefined,
          })),
        },
      },
      { kitchenSeq: { shiftId: shift.value.id, seq: ticketNo }, kitchenTickets: tickets },
    );
    kitchenTickets.value = tickets;
    await reloadOutbox();
    void sync();
    return ticket;
  };

  /**
   * زر "المطبخ": يرسل الجديد من الطلب الجاري (والإلغاءات). يعيد البون ليُطبع
   * إن لزم، أو null إن لم يكن جديد.
   */
  const sendToKitchen = async (): Promise<LocalKitchenTicket | null> => {
    const lines = pendingKitchen.value;
    if (!lines.length) return null;
    const customer = state.customers.value.find((c) => c.id === state.customerId.value);
    const ticket = await sendTicket(order.value, lines, { label: customer?.name ?? null });
    order.value = {
      ...order.value,
      sent: kitchenLinesOf(cart.value),
      rounds: order.value.rounds + 1,
    };
    return shouldPrint() ? ticket : null;
  };

  /** بون أُرسل تلقائياً بعد البيع: تأخذه الشاشة لتطبعه بعد الإيصال */
  const takeTicketToPrint = (): LocalKitchenTicket | null => {
    const ticket = ticketToPrint.value;
    ticketToPrint.value = null;
    return ticket;
  };

  // ─── الطاولات ───────────────────────────────────────────────────────────────
  /** الطلب الجاري كطلب طاولة محفوظ */
  const snapshot = (): TableOrder => ({
    ...serializeCart(),
    order: order.value,
    total: priced.value.total,
    items: priced.value.items,
    updatedAt: new Date().toISOString(),
  });

  /**
   * يحفظ الطلب الجاري ليخدم الكاشير غيره: طلب الطاولة يبقى عليها، والسفري
   * يُعلَّق. طاولة فُرّغت سلتها تُخلى (وما وصل المطبخ منها يُلغى ببون).
   */
  const parkCurrent = async (): Promise<LocalKitchenTicket | null> => {
    let ticket: LocalKitchenTicket | null = null;
    if (order.value.type === "dine_in") {
      const others = tableOrders.value.filter((t) => t.order.tableId !== order.value.tableId);
      if (cart.value.length) {
        tableOrders.value = [...others, snapshot()];
      } else {
        // الطاولة أُلغيت: ما وصل المطبخ منها يُلغى
        if (enabled.value && order.value.sent.length) {
          ticket = await sendTicket(
            order.value,
            diffLines([], order.value.sent),
            { label: "إلغاء الطلب" },
          );
        }
        tableOrders.value = others;
      }
      await saveTables();
      resetCart();
    } else if (cart.value.length) {
      await holdCart();
    }
    order.value = newOrderContext();
    return ticket && shouldPrint() ? ticket : null;
  };

  /** يفتح طاولة: طلبها المفتوح، أو طلباً جديداً عليها */
  const openTable = async (table: DiningTableInfo): Promise<LocalKitchenTicket | null> => {
    if (order.value.type === "dine_in" && order.value.tableId === table.id) return null;
    const ticket = await parkCurrent();
    const saved = tableOrders.value.find((t) => t.order.tableId === table.id);
    if (saved) {
      tableOrders.value = tableOrders.value.filter((t) => t !== saved);
      await saveTables();
      restoreCart(saved);
      // اسم الطاولة قد تغيّر من لوحة التحكم
      order.value = { ...saved.order, tableName: table.name };
    } else {
      order.value = newOrderContext("dine_in", table);
    }
    return ticket;
  };

  /** يرجع للبيع السفري (الطاولة الجارية تبقى محفوظة عليها) */
  const switchToTakeaway = async (): Promise<LocalKitchenTicket | null> => {
    if (order.value.type !== "dine_in") return null;
    return parkCurrent();
  };

  /** ينقل طلب الطاولة الجارية لطاولة فارغة */
  const moveTable = (table: DiningTableInfo) => {
    if (order.value.type !== "dine_in") throw new Error("لا طاولة مفتوحة لنقلها");
    if (tableOrders.value.some((t) => t.order.tableId === table.id)) {
      throw new Error(`الطاولة "${table.name}" مشغولة`);
    }
    order.value = { ...order.value, tableId: table.id, tableName: table.name };
  };

  /** قبل تقفيل الوردية: طاولة مفتوحة على الشاشة تُحفظ عليها (تُحاسب بعدها) */
  const parkActiveTable = async () => {
    if (order.value.type === "dine_in" && cart.value.length) await parkCurrent();
  };

  /** يسترجع معلّقة: الطاولة الجارية تُحفظ عليها أولاً */
  const resumeHeld = async (id: string): Promise<LocalKitchenTicket | null> => {
    const ticket = order.value.type === "dine_in" ? await parkCurrent() : null;
    await cartModule.resumeHeld(id);
    return ticket;
  };

  /** حالة كل طاولة: مشغولة بطلب كم، ومنذ متى، وهل في المطبخ جاهز لها */
  const tableStatus = computed(() => {
    const status = new Map<
      string,
      { total: number; items: number; openedAt: string; ready: number; current: boolean }
    >();
    const readyByRef = new Map<string, number>();
    for (const ticket of kitchenOrders.value) {
      if (ticket.status === "ready") {
        readyByRef.set(ticket.orderRef, (readyByRef.get(ticket.orderRef) ?? 0) + 1);
      }
    }
    for (const saved of tableOrders.value) {
      if (!saved.order.tableId) continue;
      status.set(saved.order.tableId, {
        total: saved.total,
        items: saved.items,
        openedAt: saved.order.openedAt,
        ready: readyByRef.get(saved.order.ref) ?? 0,
        current: false,
      });
    }
    if (order.value.type === "dine_in" && order.value.tableId) {
      status.set(order.value.tableId, {
        total: priced.value.total,
        items: priced.value.items,
        openedAt: order.value.openedAt,
        ready: readyByRef.get(order.value.ref) ?? 0,
        current: true,
      });
    }
    return status;
  });

  // ─── بعد البيع ──────────────────────────────────────────────────────────────
  /** يُلتقط قبل البيع (السلة تُفرَّغ معه) */
  const captureOrder = () => ({
    context: order.value,
    pending: pendingKitchen.value,
    customerName:
      state.customers.value.find((c) => c.id === state.customerId.value)?.name ?? null,
  });

  /**
   * بعد البيع: ما لم يصل المطبخ يُرسل (إن فُعّل الإرسال عند الدفع)، والطاولة
   * تُخلى (وجاهزها يُعلَّم مُسلَّماً)، ويبدأ طلب سفري جديد.
   */
  const completeOrder = async (
    sale: LocalSale,
    captured: ReturnType<typeof captureOrder>,
  ) => {
    const { context, pending, customerName } = captured;
    order.value = newOrderContext();
    if (!enabled.value) return;
    if (pending.length && restaurant.value?.sendOnPayment) {
      const ticket = await sendTicket(context, pending, {
        label: [sale.number, customerName].filter(Boolean).join(" — "),
        orderType: sale.delivery ? "delivery" : context.type,
      });
      if (ticket && shouldPrint()) ticketToPrint.value = ticket;
    }
    if (context.type === "dine_in") {
      const closedAt = new Date().toISOString();
      await posDb.enqueue({
        id: `kitchen-close-${context.ref}`,
        type: "kitchen.close",
        createdAt: closedAt,
        payload: { orderRef: context.ref, closedAt },
      });
      tableOrders.value = tableOrders.value.filter((t) => t.order.ref !== context.ref);
      await saveTables();
      await reloadOutbox();
      void sync();
    }
  };

  // ─── حالة الطلبات في المطبخ ────────────────────────────────────────────────
  const readyOrders = computed(() =>
    kitchenOrders.value.filter((ticket) => ticket.status === "ready"),
  );

  /** يسأل السيرفر عن حالة بونات هذه الشاشة (بلا إنترنت: تبقى آخر حالة معروفة) */
  const refreshKitchen = async () => {
    if (!enabled.value || !state.device.value || !state.deviceKey.value) return;
    try {
      kitchenOrders.value = await deviceApi().get<DeviceKitchenOrder[]>("/kitchen");
      online.value = true;
      markContact();
    } catch (error) {
      if (error instanceof OfflineError) online.value = false;
    }
  };

  /** الكاشير استلم طلباً جاهزاً (يحتاج إنترنت) */
  const markServed = async (id: string) => {
    await deviceApi().post(`/kitchen/${id}/served`, {});
    kitchenOrders.value = kitchenOrders.value.filter((ticket) => ticket.id !== id);
  };

  let kitchenTimer: ReturnType<typeof setInterval> | null = null;
  const startKitchen = () => {
    if (kitchenTimer) return;
    void refreshKitchen();
    kitchenTimer = setInterval(() => void refreshKitchen(), KITCHEN_POLL_MS);
  };
  const stopKitchen = () => {
    if (kitchenTimer) clearInterval(kitchenTimer);
    kitchenTimer = null;
  };

  return {
    enabled,
    tables,
    tableStatus,
    pendingKitchen,
    sendToKitchen,
    takeTicketToPrint,
    openTable,
    switchToTakeaway,
    moveTable,
    parkActiveTable,
    resumeHeld,
    captureOrder,
    completeOrder,
    readyOrders,
    refreshKitchen,
    markServed,
    startKitchen,
    stopKitchen,
  };
};

export type PosRestaurant = ReturnType<typeof createRestaurant>;
