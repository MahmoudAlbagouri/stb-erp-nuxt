// utils/attendance.ts
// تسميات الحضور المشتركة بين صفحات الحضور والورديات والموظفين.
import type {
  AttendanceStatus,
  DeviceProtocol,
  PunchRole,
  PunchType,
} from "@/types";

/** أيام الأسبوع بترتيب الأسبوع العربي (0 = الأحد كما يحفظها السيرفر) */
export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 6, label: "السبت" },
  { value: 0, label: "الأحد" },
  { value: 1, label: "الاثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
];

/** "الجمعة، السبت" — بترتيب الأسبوع */
export const weekdaysText = (days: number[] | null | undefined): string => {
  if (!days?.length) return "لا يوجد";
  return WEEKDAYS.filter((d) => days.includes(d.value))
    .map((d) => d.label)
    .join("، ");
};

export const ATTENDANCE_STATUS: Record<
  AttendanceStatus,
  { label: string; badge: string }
> = {
  present: { label: "حاضر", badge: "badge--active" },
  late: { label: "متأخر", badge: "badge--pending" },
  early_leave: { label: "انصراف مبكر", badge: "badge--pending" },
  late_and_early_leave: { label: "متأخر ومنصرف مبكراً", badge: "badge--pending" },
  incomplete: { label: "بصمة واحدة", badge: "badge--system" },
  absent: { label: "غائب", badge: "badge--terminated" },
  on_leave: { label: "إجازة", badge: "badge--trial" },
  off_day: { label: "راحة", badge: "badge--inactive" },
  holiday: { label: "عطلة رسمية", badge: "badge--inactive" },
  unclassified: { label: "حاضر (بلا وردية)", badge: "badge--active" },
  not_employed: { label: "قبل التحاقه", badge: "badge--inactive" },
};

export const PUNCH_TYPE_LABELS: Record<PunchType, string> = {
  check_in: "حضور",
  check_out: "انصراف",
  break_out: "خروج استراحة",
  break_in: "عودة استراحة",
  overtime_in: "بداية إضافي",
  overtime_out: "نهاية إضافي",
  leave: "إجازة",
};

/**
 * البصمة تُعرض بدورها في يومها لا بنوعها من الجهاز (أغلب الأجهزة ترسل كل
 * بصماتها "حضوراً") — وهو نفسه ما يُحسب به اليوم.
 */
export const PUNCH_ROLES: Record<PunchRole, { label: string; badge: string }> =
  {
    check_in: { label: "حضور", badge: "badge--active" },
    check_out: { label: "انصراف", badge: "badge--terminated" },
    during_day: { label: "خلال اليوم", badge: "badge--system" },
  };

export const DEVICE_PROTOCOLS: Record<
  DeviceProtocol,
  { label: string; hint: string }
> = {
  zk_adms: {
    label: "ZKTeco",
    hint: "ZKTeco وأي جهاز فيه إعداد Cloud Server / ADMS — يتصل بالسيرفر بنفسه",
  },
  hikvision: {
    label: "Hikvision",
    hint: "أجهزة Hikvision للحضور والتعرف على الوجه — ترسل أحداثها لرابط خاص بالجهاز",
  },
  api: {
    label: "جهاز آخر (API)",
    hint: "أي جهاز أو برنامج وسيط يرسل البصمات للسيرفر بمفتاح الجهاز",
  },
};

/** 95 ← "1:35 س" */
export const minutesText = (minutes: number | null | undefined): string => {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}:${String(m).padStart(2, "0")} س` : `${m} د`;
};
