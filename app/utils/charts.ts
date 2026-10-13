// utils/charts.ts — ألوان الرسوم البيانية وأدواتها المشتركة.
//
// الألوان ليست اختياراً بالنظر: كل لوحة هنا مرّت على فاحص تباين وعمى ألوان
// (تباعد الألوان المتجاورة، ووضوحها فوق خلفية الكرت في الوضعين). لا تُضف لوناً
// أو تبدّل الترتيب دون إعادة الفحص — الترتيب نفسه جزء من الأمان لعمى الألوان.
import type { Theme } from "../composables/useTheme";

export interface ChartPalette {
  /** خلفية الكرت: بها تُفصل شرائح الدائرة والأعمدة المتلاصقة */
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  /** خطوط الشبكة: درجة واحدة عن الخلفية، رفيعة ومتصلة */
  grid: string;
  axis: string;
  /** ألوان السلاسل بترتيب ثابت — اللون يتبع الكيان لا ترتيبه */
  series: readonly string[];
  /** فئة "أخرى" وما لا يحمل هوية */
  neutral: string;
  /** ألوان الحالة: للجيد/السيئ فقط، ودائماً مع نص يسمّيها */
  status: { good: string; warning: string; critical: string };
}

const PALETTES: Record<Theme, ChartPalette> = {
  dark: {
    surface: "#1a2332",
    text: "#e8f1ff",
    textSecondary: "#7a9cc4",
    textMuted: "#5d7c9e",
    grid: "#243040",
    axis: "#2a4a72",
    series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"],
    neutral: "#4a6a8a",
    status: { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" },
  },
  light: {
    surface: "#ffffff",
    text: "#0f1f33",
    textSecondary: "#48607c",
    textMuted: "#66788f",
    grid: "#e6edf6",
    axis: "#b6c5d8",
    series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"],
    neutral: "#9aa9bc",
    status: { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" },
  },
};

export const chartPalette = (theme: Theme): ChartPalette => PALETTES[theme];

/** أقصى شرائح في دائرة: ما زاد يُجمع في "أخرى" (أكثر من ذلك لا يُقرأ) */
export const MAX_DONUT_SLICES = 5;

/**
 * يُبقي أكبر الشرائح ويجمع الباقي في "أخرى". القائمة تدخل مرتبة تنازلياً.
 */
export const foldSlices = <T extends { value: number }>(
  slices: (T & { name: string })[],
  max = MAX_DONUT_SLICES,
): { name: string; value: number; isOther?: boolean }[] => {
  if (slices.length <= max) return slices;
  const kept = slices.slice(0, max - 1);
  const rest = slices.slice(max - 1);
  return [
    ...kept,
    {
      name: `أخرى (${rest.length})`,
      value: rest.reduce((sum, slice) => sum + slice.value, 0),
      isOther: true,
    },
  ];
};

/** أرقام المحاور مختصرة: 0 / 1.5K / 2M */
export const compactNumber = (value: number): string => {
  const abs = Math.abs(value);
  const trim = (n: number) => String(Number(n.toFixed(1)));
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(value / 1_000)}K`;
  return trim(value);
};

/**
 * نسبة التغير عن الفترة السابقة. null حين لا أساس للمقارنة (السابقة صفر):
 * "زيادة ∞%" ليست معلومة.
 */
export const changeRatio = (current: number, previous: number): number | null =>
  previous > 0 ? (current - previous) / previous : null;

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export const monthName = (month: number): string =>
  ARABIC_MONTHS[month - 1] ?? String(month);

/** "2026-10-13" ← "13 أكتوبر" (تاريخ يوم محلي، بلا تحويل منطقة زمنية) */
export const dayLabel = (date: string): string => {
  const [, month, day] = date.split("-").map(Number);
  return `${day} ${monthName(month ?? 0)}`;
};

/** "2026-10-13" ← "13/10" لمحور ضيّق */
export const shortDayLabel = (date: string): string => {
  const [, month, day] = date.split("-").map(Number);
  return `${day}/${month}`;
};
