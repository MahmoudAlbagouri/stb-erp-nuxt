// driver/offline.ts — شاشة الطيار بلا إنترنت
//
// الطيار في الشارع والشبكة تقطع: ما يفعله (استلام، تسليم، لم يُسلَّم) يُسجَّل
// على جواله فوراً في طابور ويُرفع بترتيبه متى عاد الاتصال
// (POST /delivery/driver/sync). آخر أوردرات عرفها من السيرفر محفوظة معه،
// فتفتح الشاشة بلا إنترنت بآخر حالة.
//
// ما يراه = آخر ما عرفه السيرفر + ما فعله ولم يُرفع بعد (overlay). السيرفر
// يحسم: عملية رفضها (أُلغي الأوردر، أُسند لغيره) تبقى ظاهرة بسببها حتى يراها.
import type { DeviceLocale } from "@/stores/auth";
import type { DeliveryOrder } from "@/types/delivery";
import { sumMoney } from "../utils/purchasing";

export interface DriverBoard {
  agent: { id: string; name: string; heldAmount: number; unsettledCount: number };
  company: string;
  /**
   * دولة الشركة وعملتها وتوقيتها (الطيار بلا توكن يحملها). غائبة في نسخة
   * حُفظت على الجوال قبل إضافتها — تصل مع أول تحديث
   */
  tenant?: DeviceLocale;
  orders: DeliveryOrder[];
}

export type DriverOpType = "pickup" | "deliver" | "fail";

/** عملية سجّلها الطيار على الجوال */
export interface DriverOp {
  id: string;
  type: DriverOpType;
  orderId: string;
  /** للعرض فقط (لا يُرفع) */
  orderNumber: string;
  /** متى وقعت فعلاً: السيرفر يسجّلها بهذا الوقت لا بوقت الرفع */
  occurredAt: string;
  reason?: string;
  /** سبب رفض السيرفر: العملية باقية حتى يعيد المحاولة أو يخفيها */
  error?: string;
}

/** ما يُحفظ على الجوال لكل طيار */
export interface DriverSnapshot {
  board: DriverBoard | null;
  /** متى نزلت هذه الأوردرات من السيرفر (ms) */
  fetchedAt: number | null;
  outbox: DriverOp[];
}

export const OP_LABEL: Record<DriverOpType, string> = {
  pickup: "استلام وخروج",
  deliver: "تسليم",
  fail: "لم يُسلَّم",
};

/** كل طيار له مفتاحه: رابط طيار آخر على نفس الجوال لا يرفع طابوره */
const keyOf = (agentId: string) => `stb-driver:${agentId}`;

const EMPTY: DriverSnapshot = { board: null, fetchedAt: null, outbox: [] };

export const loadSnapshot = (agentId: string): DriverSnapshot => {
  try {
    const raw = localStorage.getItem(keyOf(agentId));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as DriverSnapshot) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
};

/** يُكتب كاملاً في خطوة واحدة: لا أوردرات بلا طابورها ولو انطفأ الجوال */
export const saveSnapshot = (agentId: string, snapshot: DriverSnapshot): void => {
  try {
    localStorage.setItem(keyOf(agentId), JSON.stringify(snapshot));
  } catch {
    // التخزين ممتلئ أو ممنوع: الشاشة تعمل ما دامت مفتوحة
  }
};

/** المبلغ الذي يحصّله الطيار من العميل */
export const codOf = (order: DeliveryOrder): number =>
  order.codAmount || order.invoice.total;

/**
 * الأوردرات كما يراها الطيار: نسخة السيرفر وفوقها ما فعله ولم يُرفع بعد،
 * بنفس قواعد السيرفر (الاستلام لأوردر عنده، والتسليم أو عدمه لأوردر خرج).
 */
export const overlay = (
  board: DriverBoard | null,
  pending: DriverOp[],
): DriverBoard | null => {
  if (!board) return null;
  const orders = board.orders.map((order) => ({ ...order }));
  const held = [board.agent.heldAmount];

  for (const op of pending) {
    const order = orders.find((o) => o.id === op.orderId);
    if (!order) continue;
    if (op.type === "pickup" && order.status === "assigned") {
      order.status = "out_for_delivery";
      order.dispatchedAt = op.occurredAt;
    } else if (op.type === "deliver" && order.status === "out_for_delivery") {
      order.status = "delivered";
      order.deliveredAt = op.occurredAt;
      if (order.paymentMode === "cod") held.push(codOf(order));
    } else if (op.type === "fail" && order.status === "out_for_delivery") {
      order.status = "failed";
      order.failedAt = op.occurredAt;
      order.failReason = op.reason ?? null;
    }
  }

  return {
    ...board,
    agent: { ...board.agent, heldAmount: sumMoney(held) },
    orders,
  };
};
