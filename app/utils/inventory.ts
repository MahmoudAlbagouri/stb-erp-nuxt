// utils/inventory.ts — تسميات وحالات موديول المخزون للعرض
import { formatNumber } from "./format";
import type {
  StockMovementType,
  StocktakeStatus,
  TransferStatus,
} from "@/types/inventory";

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  opening: "رصيد افتتاحي",
  purchase: "شراء",
  purchase_return: "مرتجع شراء",
  sale: "بيع",
  sale_return: "مرتجع بيع",
  transfer_out: "تحويل (خروج)",
  transfer_in: "تحويل (دخول)",
  adjustment: "تسوية",
  stocktake: "جرد",
};

interface StatusMeta {
  label: string;
  /** صنف CSS من ‎.doc-status--* */
  tone: "draft" | "progress" | "done" | "cancelled";
}

export const TRANSFER_STATUS: Record<TransferStatus, StatusMeta> = {
  draft: { label: "مسودة", tone: "draft" },
  in_transit: { label: "في الطريق", tone: "progress" },
  received: { label: "مستلَم", tone: "done" },
  cancelled: { label: "ملغي", tone: "cancelled" },
};

export const STOCKTAKE_STATUS: Record<StocktakeStatus, StatusMeta> = {
  draft: { label: "مسودة", tone: "draft" },
  posted: { label: "معتمد", tone: "done" },
  cancelled: { label: "ملغي", tone: "cancelled" },
};

/** كمية بإشارة صريحة: ‎+5 / ‎-3 */
export const formatSigned = (value: number): string =>
  `${value > 0 ? "+" : ""}${formatNumber(value)}`;
