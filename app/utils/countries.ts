// utils/countries.ts — الدول المدعومة: من الدولة تُشتق عملة الشركة، مفتاح
// الهاتف والمنطقة الزمنية.
//
// ⚠️ نسخة مطابقة لسجل الباك إند (src/common/constants/countries.ts): أي تعديل
// هنا يُكرَّر هناك.

export interface Country {
  /** ISO 3166-1 alpha-2 */
  code: string;
  nameAr: string;
  /** مفتاح الاتصال الدولي بدون + */
  dialCode: string;
  /** ISO 4217 */
  currency: string;
  /** رمز العملة كما يُعرض بجانب المبالغ */
  currencySymbol: string;
  currencyNameAr: string;
  /** خانات العملة العشرية (ISO 4217): 3 للدينار والريال العُماني، 2 للبقية */
  currencyDecimals: number;
  /** IANA */
  timezone: string;
  /** أقل وأكثر عدد خانات للرقم المحلي (بدون مفتاح الدولة والصفر البادئ) */
  phoneLength: readonly [min: number, max: number];
}

const country = (
  code: string,
  nameAr: string,
  dialCode: string,
  currency: string,
  currencySymbol: string,
  currencyNameAr: string,
  currencyDecimals: number,
  timezone: string,
  phoneLength: readonly [number, number],
): Country => ({
  code,
  nameAr,
  dialCode,
  currency,
  currencySymbol,
  currencyNameAr,
  currencyDecimals,
  timezone,
  phoneLength,
});

// prettier-ignore
export const COUNTRIES: readonly Country[] = [
  country("SA", "السعودية", "966", "SAR", "ر.س", "ريال سعودي", 2, "Asia/Riyadh", [9, 9]),
  country("EG", "مصر", "20", "EGP", "ج.م", "جنيه مصري", 2, "Africa/Cairo", [8, 10]),
  country("AE", "الإمارات", "971", "AED", "د.إ", "درهم إماراتي", 2, "Asia/Dubai", [8, 9]),
  country("KW", "الكويت", "965", "KWD", "د.ك", "دينار كويتي", 3, "Asia/Kuwait", [8, 8]),
  country("QA", "قطر", "974", "QAR", "ر.ق", "ريال قطري", 2, "Asia/Qatar", [8, 8]),
  country("BH", "البحرين", "973", "BHD", "د.ب", "دينار بحريني", 3, "Asia/Bahrain", [8, 8]),
  country("OM", "عُمان", "968", "OMR", "ر.ع", "ريال عُماني", 3, "Asia/Muscat", [8, 8]),
  country("JO", "الأردن", "962", "JOD", "د.أ", "دينار أردني", 3, "Asia/Amman", [8, 9]),
  country("IQ", "العراق", "964", "IQD", "د.ع", "دينار عراقي", 3, "Asia/Baghdad", [8, 10]),
  country("LB", "لبنان", "961", "LBP", "ل.ل", "ليرة لبنانية", 2, "Asia/Beirut", [7, 8]),
  country("SY", "سوريا", "963", "SYP", "ل.س", "ليرة سورية", 2, "Asia/Damascus", [8, 9]),
  country("YE", "اليمن", "967", "YER", "ر.ي", "ريال يمني", 2, "Asia/Aden", [7, 9]),
  country("PS", "فلسطين", "970", "ILS", "₪", "شيكل", 2, "Asia/Hebron", [8, 9]),
  country("LY", "ليبيا", "218", "LYD", "د.ل", "دينار ليبي", 3, "Africa/Tripoli", [8, 9]),
  country("TN", "تونس", "216", "TND", "د.ت", "دينار تونسي", 3, "Africa/Tunis", [8, 8]),
  country("DZ", "الجزائر", "213", "DZD", "د.ج", "دينار جزائري", 2, "Africa/Algiers", [8, 9]),
  country("MA", "المغرب", "212", "MAD", "د.م", "درهم مغربي", 2, "Africa/Casablanca", [9, 9]),
  country("SD", "السودان", "249", "SDG", "ج.س", "جنيه سوداني", 2, "Africa/Khartoum", [9, 9]),
];

/** دولة الشركات المُنشأة قبل دعم تعدد الدول، وأي قيمة غير معروفة */
export const DEFAULT_COUNTRY_CODE = "SA";

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
const BY_CURRENCY = new Map(COUNTRIES.map((c) => [c.currency, c]));

export const findCountry = (code?: string | null): Country | undefined =>
  code ? BY_CODE.get(code.toUpperCase()) : undefined;

/** الدولة المطابقة للرمز، أو الافتراضية إذا غاب الرمز أو لم يُعرف */
export const getCountry = (code?: string | null): Country =>
  findCountry(code) ?? BY_CODE.get(DEFAULT_COUNTRY_CODE)!;

const byCurrency = (currency?: string | null): Country =>
  (currency ? BY_CURRENCY.get(currency.toUpperCase()) : undefined) ??
  getCountry();

/** رمز العرض لعملة (ISO 4217): "ر.س" لـ SAR */
export const getCurrencySymbol = (currency?: string | null): string =>
  byCurrency(currency).currencySymbol;

/** عدد الخانات العشرية لعملة (ISO 4217): 3 لـ KWD، 2 لـ SAR */
export const getCurrencyDecimals = (currency?: string | null): number =>
  byCurrency(currency).currencyDecimals;

// ─── الهاتف ───

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** أرقام لاتينية فقط (يحوّل الهندية/الفارسية ويزيل ما عداها) */
export const toPhoneDigits = (raw: string): string =>
  raw
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/\D/g, "");

/**
 * يفصل رقماً مخزّناً إلى دولة + رقم محلي. الأرقام الدولية (+966…) تُعرف من
 * مفتاحها؛ ما عداها (بيانات قديمة مثل 05XXXXXXXX) يُنسب للدولة الافتراضية.
 */
export const splitPhone = (
  value: string | null | undefined,
  fallbackCountry: string,
): { country: string; national: string } => {
  const text = (value ?? "").trim();
  if (text.startsWith("+") || text.startsWith("00")) {
    const digits = toPhoneDigits(text).slice(text.startsWith("00") ? 2 : 0);
    // أطول مفتاح مطابق أولاً
    const match = [...COUNTRIES]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((c) => digits.startsWith(c.dialCode));
    if (match) {
      return {
        country: match.code,
        national: digits.slice(match.dialCode.length),
      };
    }
  }
  return { country: fallbackCountry, national: toPhoneDigits(text) };
};

/** الصيغة الدولية E.164 لرقم محلي: (SA, 0501234567) ← ‎+966501234567 */
export const joinPhone = (countryCode: string, national: string): string => {
  const digits = toPhoneDigits(national).replace(/^0+/, "");
  return digits ? `+${getCountry(countryCode).dialCode}${digits}` : "";
};

/** هل طول الرقم المحلي صالح لهذه الدولة؟ (الصفر البادئ لا يُحسب) */
export const isValidNationalPhone = (
  countryCode: string,
  national: string,
): boolean => {
  const digits = toPhoneDigits(national).replace(/^0+/, "");
  const [min, max] = getCountry(countryCode).phoneLength;
  return digits.length >= min && digits.length <= max;
};

/** هل الرقم المخزّن (دولي، أو محلي يُنسب للدولة الافتراضية) صالح لدولته؟ */
export const isValidPhone = (
  value: string | null | undefined,
  fallbackCountry: string = DEFAULT_COUNTRY_CODE,
): boolean => {
  const { country: code, national } = splitPhone(value, fallbackCountry);
  return isValidNationalPhone(code, national);
};
