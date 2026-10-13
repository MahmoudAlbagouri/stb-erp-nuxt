// utils/timezone.ts — التحويل بين اللحظة (ISO/UTC) والوقت المحلي لمنطقة زمنية.
//
// الأوقات تُخزَّن وتُرسل لحظات حقيقية (ISO)، وتُعرض وتُدخَل بتوقيت الشركة —
// لا بتوقيت متصفح المستخدم: مدير يتابع من دولة أخرى يرى ويُدخل نفس الساعة
// التي يراها موظفوه على جهاز البصمة.

const pad = (value: number): string => String(value).padStart(2, "0");

/** مكوّنات اللحظة كما تظهر على ساعة حائط في المنطقة */
const wallParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
};

/** فرق المنطقة عن UTC بالميلي ثانية عند لحظة معينة (يتغير مع التوقيت الصيفي) */
const offsetMs = (date: Date, timeZone: string): number => {
  const p = wallParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
};

/**
 * لحظة ← قيمة حقل datetime-local ("2026-10-13T08:05") بتوقيت المنطقة.
 * يعيد "" لقيمة غير صالحة.
 */
export const toZonedInput = (
  value: string | number | Date | null | undefined,
  timeZone: string,
): string => {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const p = wallParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};

/**
 * قيمة حقل datetime-local مكتوبة بتوقيت المنطقة ← لحظتها بصيغة ISO.
 * يعيد "" لقيمة غير صالحة.
 */
export const fromZonedInput = (wall: string, timeZone: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(wall);
  if (!match) return "";
  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => Number(part ?? 0)) as [number, number, number, number, number, number];

  // نفترض الأرقام UTC ثم نطرح فرق المنطقة؛ الإعادة مرة ثانية تصحّح اللحظات
  // القريبة من تغيّر التوقيت الصيفي (الفرق عند التخمين قد يختلف عن الفعلي)
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = guess - offsetMs(new Date(guess), timeZone);
  instant = guess - offsetMs(new Date(instant), timeZone);

  return new Date(instant).toISOString();
};

/** الآن بصيغة datetime-local بتوقيت المنطقة (لحدّ max في حقول الإدخال) */
export const nowZonedInput = (timeZone: string): string =>
  toZonedInput(new Date(), timeZone);
