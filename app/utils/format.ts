// utils/format.ts — المصدر الوحيد لتنسيق الأرقام والمبالغ والتواريخ في الواجهة.
// كل الأرقام تُعرض بصيغة en-US (أرقام لاتينية، فاصلة للآلاف).
import { useAuthStore } from "../stores/auth";
import { getCurrencyDecimals, getCurrencySymbol } from "./countries";

export const DISPLAY_LOCALE = "en-US";

/**
 * عملة أسعار باقات الاشتراك (ما تدفعه الشركة للمنصة) — مستقلة عن عملة الشركة
 * التي تُعرض بها مبالغها هي.
 */
export const PLATFORM_CURRENCY = "SAR";

const EMPTY = "—";

type Numeric = number | string | null | undefined;
type DateInput = string | number | Date | null | undefined;

const toNumber = (value: Numeric): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * رمز عملة الشركة الحالية (ر.س، ج.م، د.إ…) — تُحدَّد من دولة الشركة عند
 * إنشاء الحساب وتصل داخل التوكن. تُستدعى داخل القوالب لتبقى تفاعلية.
 */
export const currencyLabel = (): string => {
  try {
    return getCurrencySymbol(useAuthStore().currency);
  } catch {
    // خارج سياق التطبيق (لا Pinia نشطة): العملة الافتراضية
    return getCurrencySymbol();
  }
};

/** خانات عملة الشركة العشرية: 3 للدينار والريال العُماني، 2 للبقية */
export const currencyDecimals = (): number => {
  try {
    return getCurrencyDecimals(useAuthStore().currency);
  } catch {
    return getCurrencyDecimals();
  }
};

/** خطوة حقول إدخال المبالغ: "0.01" أو "0.001" حسب العملة */
export const moneyStep = (): string => (1 / 10 ** currencyDecimals()).toFixed(currencyDecimals());

/** مبلغ مقرَّب لخانات عملة الشركة — نفس قاعدة السيرفر (money.util) */
export const roundMoney = (value: number): number => {
  const factor = 10 ** currencyDecimals();
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/** رقم بفواصل الآلاف. بدون `fractionDigits` تُعرض الكسور كما هي (حتى 3 خانات) */
export const formatNumber = (value: Numeric, fractionDigits?: number): string =>
  toNumber(value).toLocaleString(
    DISPLAY_LOCALE,
    fractionDigits === undefined
      ? undefined
      : {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        },
  );

/** مبلغ بخانات عملة الشركة بلا رمزها: 1,500.00 أو 1,500.000 */
export const formatMoney = (value: Numeric): string =>
  formatNumber(value, currencyDecimals());

/** مبلغ بعملة الشركة: 1,500.00 ر.س / 1,500.000 د.ك */
export const formatCurrency = (
  value: Numeric,
  fractionDigits = currencyDecimals(),
): string =>
  `${formatNumber(value, fractionDigits)} ${currencyLabel()}`;

/** سعر خطة/اشتراك بعملة المنصة: "مجاناً" عند غياب السعر */
export const formatPrice = (value: Numeric): string =>
  value === null || value === undefined || value === ""
    ? "مجاناً"
    : `${formatNumber(value)} ${getCurrencySymbol(PLATFORM_CURRENCY)}`;

/** تاريخ: 10/11/2026 — "—" إذا كانت القيمة فارغة أو غير صالحة */
export const formatDate = (value: DateInput): string =>
  toDate(value)?.toLocaleDateString(DISPLAY_LOCALE) ?? EMPTY;

/** منطقة الشركة الزمنية (IANA)؛ undefined خارج سياق التطبيق ← منطقة المتصفح */
const tenantTimeZone = (): string | undefined => {
  try {
    return useAuthStore().timezone;
  } catch {
    return undefined;
  }
};

/**
 * تاريخ ووقت لحظة: 10/11/2026, 3:45:00 PM — بتوقيت الشركة لا بتوقيت متصفح
 * المستخدم، فيرى الجميع نفس الساعة أينما كانوا.
 */
export const formatDateTime = (value: DateInput): string =>
  toDate(value)?.toLocaleString(DISPLAY_LOCALE, {
    timeZone: tenantTimeZone(),
  }) ?? EMPTY;

/** الساعة فقط: 3:45 PM — بتوقيت الشركة */
export const formatTime = (value: DateInput): string =>
  toDate(value)?.toLocaleTimeString(DISPLAY_LOCALE, {
    timeZone: tenantTimeZone(),
    hour: "numeric",
    minute: "2-digit",
  }) ?? EMPTY;
