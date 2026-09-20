// utils/payment.ts
import type { PaymentMethod } from "@/types";

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] =
  [
    { value: "CASH", label: "نقدي (CASH)" },
    { value: "BANK", label: "بنكي (BANK)" },
  ];

export const paymentMethodLabel = (m?: PaymentMethod | null): string =>
  m === "BANK" ? "بنكي" : "نقدي";

/** يزيل المسافات ويحوّل لأحرف كبيرة */
export const normalizeIban = (v?: string | null): string =>
  (v ?? "").replace(/\s+/g, "").toUpperCase();

/** عرض الآيبان في مجموعات من 4 خانات */
export const formatIban = (v?: string | null): string =>
  normalizeIban(v)
    .replace(/(.{4})/g, "$1 ")
    .trim();

/** تحقق من الصيغة + الـ checksum (mod 97) */
export const isValidIban = (v?: string | null): boolean => {
  const iban = normalizeIban(v);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
};
