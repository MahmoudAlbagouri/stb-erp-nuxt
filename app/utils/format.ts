// utils/format.ts — المصدر الوحيد لتنسيق الأرقام والمبالغ والتواريخ في الواجهة.
// كل الأرقام تُعرض بصيغة en-US (أرقام لاتينية، فاصلة للآلاف).

export const DISPLAY_LOCALE = "en-US";
export const CURRENCY_LABEL = "ر.س";
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

/** مبلغ بالريال: 1,500.00 ر.س */
export const formatCurrency = (value: Numeric, fractionDigits = 2): string =>
  `${formatNumber(value, fractionDigits)} ${CURRENCY_LABEL}`;

/** سعر خطة/اشتراك: "مجاناً" عند غياب السعر */
export const formatPrice = (value: Numeric): string =>
  value === null || value === undefined || value === ""
    ? "مجاناً"
    : `${formatNumber(value)} ${CURRENCY_LABEL}`;

/** تاريخ: 10/11/2026 — "—" إذا كانت القيمة فارغة أو غير صالحة */
export const formatDate = (value: DateInput): string =>
  toDate(value)?.toLocaleDateString(DISPLAY_LOCALE) ?? EMPTY;

/** تاريخ ووقت: 10/11/2026, 3:45:00 PM */
export const formatDateTime = (value: DateInput): string =>
  toDate(value)?.toLocaleString(DISPLAY_LOCALE) ?? EMPTY;
