// types/delivery.ts — التوصيل والشحن (طيارين وشركات شحن)
import type { PublicSalesPaymentMethod, SalesInvoiceStatus } from "./sales";

export type DeliveryAgentType = "driver" | "carrier";

export interface DeliveryAgent {
  id: string;
  type: DeliveryAgentType;
  name: string;
  phone: string | null;
  /** أجرة الطيار / رسوم الشركة لكل أوردر */
  defaultFee: number;
  /** رسوم التحصيل % من المبلغ المحصّل */
  codFeePercent: number;
  isActive: boolean;
  note: string | null;
  /** مال المحل معها الآن (مسلَّم بالتحصيل ولم يُسوَّ) */
  heldAmount: number;
  /** أوردرات معها في الطريق */
  outCount: number;
  /** أوردرات انتهت ولم تُسوَّ */
  unsettledCount: number;
  createdAt: string;
}

export interface DeliveryAgentPayload {
  type: DeliveryAgentType;
  name: string;
  phone?: string | null;
  defaultFee?: number;
  codFeePercent?: number;
  isActive?: boolean;
  note?: string | null;
}

export interface DeliveryZone {
  id: string;
  name: string;
  /** رسوم التوصيل على العميل */
  fee: number;
  estimatedMinutes: number | null;
  isActive: boolean;
}

export interface DeliveryZonePayload {
  name: string;
  fee: number;
  estimatedMinutes?: number | null;
  isActive?: boolean;
}

export type DeliveryOrderStatus =
  | "new"
  | "assigned"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "cancelled";

export type DeliveryPaymentMode = "cod" | "prepaid";

export interface DeliveryOrder {
  id: string;
  number: string;
  invoiceId: string;
  warehouseId: string;
  customerId: string | null;
  recipientName: string;
  phone: string;
  address: string;
  zoneId: string | null;
  zone: DeliveryZone | null;
  agentId: string | null;
  agent: DeliveryAgent | null;
  status: DeliveryOrderStatus;
  paymentMode: DeliveryPaymentMode;
  prepaidMethod: PublicSalesPaymentMethod | null;
  /** ما تحصّله الجهة من العميل عند التسليم */
  codAmount: number;
  deliveryFee: number;
  /** تكلفة التوصيل علينا */
  agentFee: number;
  trackingNumber: string | null;
  note: string | null;
  failReason: string | null;
  returnId: string | null;
  assignedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  settlementId: string | null;
  createdAt: string;
  invoice: {
    id: string;
    number: string | null;
    status: SalesInvoiceStatus;
    total: number;
    paidAmount: number;
    returnedAmount: number;
    lines?: {
      id: string;
      productName: string;
      unitName: string;
      quantity: number;
      total: number;
      isStocked: boolean;
    }[];
  };
}

export interface DeliveryOrderPayload {
  warehouseId: string;
  customerId?: string | null;
  recipientName: string;
  phone: string;
  address: string;
  zoneId?: string | null;
  deliveryFee?: number;
  paymentMode: DeliveryPaymentMode;
  prepaidMethod?: PublicSalesPaymentMethod;
  agentId?: string | null;
  agentFee?: number;
  trackingNumber?: string | null;
  note?: string | null;
  lines: {
    productId: string;
    unitId?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }[];
}

export interface DeliveryOrderFilters {
  status?: string;
  agentId?: string;
  unsettled?: "true" | "false";
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface DeliverySummary {
  counts: Record<DeliveryOrderStatus, number>;
  lateCount: number;
  heldTotal: number;
  outCodTotal: number;
}

export interface DeliverySettlement {
  id: string;
  number: string;
  agentId: string;
  agent?: DeliveryAgent;
  settledAt: string;
  ordersCount: number;
  collectedTotal: number;
  feesTotal: number;
  expectedAmount: number;
  receivedAmount: number;
  difference: number;
  method: PublicSalesPaymentMethod;
  note: string | null;
  orders?: DeliveryOrder[];
}

export interface DeliverySettlementPayload {
  agentId: string;
  orderIds: string[];
  feesTotal?: number;
  receivedAmount: number;
  method: PublicSalesPaymentMethod;
  note?: string | null;
}
