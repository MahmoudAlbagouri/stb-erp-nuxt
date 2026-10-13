// pos/scale.ts — باركود الميزان (EAN-13 يحمل الوزن أو السعر داخله)
//
// الشكل: بادئة (خانتان) + كود الصنف + القيمة + خانة تحقق = 13 خانة.
// مثال بالإعداد الافتراضي (5 خانات للصنف، وزن بالجرام):
//   21 00042 01250 7  ←  الصنف 42، الوزن 1.250 كجم
import type { ScaleBarcodeOptions } from "./types";

const EAN_LENGTH = 13;
const PREFIX_LENGTH = 2;

export interface ScaleReading {
  /** كود الصنف كما في الباركود (بأصفاره) وبدونها */
  itemCodes: string[];
  /** الوزن (بوحدة الصنف) أو السعر الإجمالي، حسب الإعداد */
  value: number;
  type: "weight" | "price";
}

/** هل خانة التحقق صحيحة؟ (EAN-13) */
const hasValidCheckDigit = (code: string): boolean => {
  const digits = code.split("").map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
};

/** يفكّ باركود ميزان، أو null إن لم يكن واحداً */
export const parseScaleBarcode = (
  raw: string,
  options: ScaleBarcodeOptions | null | undefined,
): ScaleReading | null => {
  const code = raw.trim();
  if (!options?.enabled || code.length !== EAN_LENGTH || !/^\d+$/.test(code)) return null;
  if (!options.prefixes.includes(code.slice(0, PREFIX_LENGTH))) return null;
  if (!hasValidCheckDigit(code)) return null;

  const itemEnd = PREFIX_LENGTH + options.itemDigits;
  const item = code.slice(PREFIX_LENGTH, itemEnd);
  const value = Number(code.slice(itemEnd, EAN_LENGTH - 1)) / 10 ** options.valueDecimals;
  if (!(value > 0)) return null;

  return {
    // الصنف يُعرَّف بباركوده أو كوده: بالأصفار، بدونها، أو مع البادئة
    itemCodes: [...new Set([item, String(Number(item)), code.slice(0, itemEnd)])],
    value,
    type: options.valueType,
  };
};
