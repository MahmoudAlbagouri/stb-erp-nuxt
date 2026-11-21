// utils/inventory.ts — تسميات وحالات موديول المخزون للعرض
import { formatNumber } from "./format";
import type {
  StockAdjustmentReason,
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
  production_issue: "صرف لأمر إنتاج",
  production_return: "ردّ من أمر إنتاج",
  production_output: "استلام إنتاج",
  consumption: "استهلاك وصفة",
  lot_assignment: "تعيين دفعة",
};

/**
 * أسباب التسوية بترتيب العرض. السبب يُحفظ على الحركة لتحليل الهالك والفاقد
 * (docs/operations-research.md في الباك إند) — `found` للزيادة وحدها.
 */
export const ADJUSTMENT_REASONS: {
  value: StockAdjustmentReason;
  label: string;
  direction: "out" | "in" | "both";
}[] = [
  { value: "damage", label: "تالف", direction: "out" },
  { value: "expiry", label: "منتهي الصلاحية", direction: "out" },
  { value: "waste", label: "هالك تشغيل (تحضير، تصنيع، قص)", direction: "out" },
  { value: "theft", label: "فاقد / سرقة", direction: "out" },
  { value: "internal_use", label: "استهلاك داخلي", direction: "out" },
  { value: "sample", label: "عينات أو ضيافة", direction: "out" },
  { value: "found", label: "زيادة وُجدت", direction: "in" },
  { value: "correction", label: "تصحيح خطأ إدخال", direction: "both" },
  { value: "other", label: "سبب آخر", direction: "both" },
];

export const ADJUSTMENT_REASON_LABELS = Object.fromEntries(
  ADJUSTMENT_REASONS.map((r) => [r.value, r.label]),
) as Record<StockAdjustmentReason, string>;

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
