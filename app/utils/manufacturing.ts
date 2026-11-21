// utils/manufacturing.ts — تسميات المصنع والدفعات للعرض
import type {
  DowntimeReason,
  LotStatus,
  ProductionStatus,
  ScrapReason,
  TimeLogKind,
} from "@/types/manufacturing";

interface StatusMeta {
  label: string;
  /** صنف CSS من ‎.doc-status--* */
  tone: "draft" | "progress" | "done" | "cancelled" | "info";
}

export const PRODUCTION_STATUS: Record<ProductionStatus, StatusMeta> = {
  draft: { label: "مسودة", tone: "draft" },
  released: { label: "مُطلق", tone: "info" },
  in_progress: { label: "قيد التنفيذ", tone: "progress" },
  completed: { label: "مكتمل", tone: "done" },
  cancelled: { label: "ملغي", tone: "cancelled" },
};

export const OPERATION_STATUS: Record<
  "pending" | "in_progress" | "paused" | "done",
  StatusMeta
> = {
  pending: { label: "لم تبدأ", tone: "draft" },
  in_progress: { label: "تعمل الآن", tone: "progress" },
  paused: { label: "متوقفة مؤقتاً", tone: "info" },
  done: { label: "منتهية", tone: "done" },
};

export const TIME_KIND_LABELS: Record<TimeLogKind, string> = {
  setup: "تجهيز",
  run: "تشغيل",
  downtime: "توقف",
};

export const DOWNTIME_REASONS: Record<DowntimeReason, string> = {
  breakdown: "عطل",
  no_material: "نقص خامات",
  changeover: "تغيير منتج / ضبط",
  quality: "مشكلة جودة",
  no_operator: "لا عامل",
  power: "انقطاع كهرباء",
  maintenance: "صيانة مخططة",
  other: "سبب آخر",
};

export const SCRAP_REASONS: Record<ScrapReason, string> = {
  defect: "عيب في المنتج",
  process_loss: "فاقد تشغيل",
  machine: "خطأ ماكينة",
  material: "خامة معيبة",
  operator: "خطأ عامل",
  sample: "عينة / فحص",
  other: "سبب آخر",
};

export const LOT_STATUS: Record<LotStatus, StatusMeta> = {
  active: { label: "سارية", tone: "done" },
  expiring: { label: "قاربت على الانتهاء", tone: "progress" },
  expired: { label: "منتهية", tone: "cancelled" },
  no_expiry: { label: "بلا تاريخ", tone: "draft" },
};

/** دقائق بصيغة مقروءة: 95 ← "1:35 س" */
export const formatMinutes = (minutes: number): string => {
  const total = Math.round(Number(minutes) || 0);
  if (total < 60) return `${total} د`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")} س`;
};
