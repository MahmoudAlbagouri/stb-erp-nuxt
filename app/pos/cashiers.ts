// pos/cashiers.ts — التحقق من الرقم السري للكاشير على الجهاز (بلا إنترنت)
//
// السيرفر لا يرسل الأرقام، بل مشتقّها (PBKDF2-SHA256 مع ملح لكل كاشير). هنا
// نشتق الرقم المُدخل بنفس الطريقة ونقارن — نفس ما في pos-crypto.util بالسيرفر.
import type { PosCashier } from "./types";

const KEY_BITS = 256;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const toBase64 = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

/** مقارنة لا يتوقف زمنها على موضع أول اختلاف */
const sameText = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const derive = async (pin: string, cashier: PosCashier): Promise<string> => {
  // WebCrypto يعمل على https (و localhost) فقط — وكذلك وضع العمل بلا إنترنت
  if (!globalThis.crypto?.subtle) {
    throw new Error("التحقق من الرقم السري يحتاج فتح الشاشة عبر https");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromBase64(cashier.pinSalt),
      iterations: cashier.pinIterations,
    },
    key,
    KEY_BITS,
  );
  return toBase64(bits);
};

// محاولات خاطئة متتالية لكل كاشير: تُصفَّر عند النجاح أو إعادة فتح الشاشة
const failures = new Map<string, { count: number; lockedUntil: number }>();

/**
 * هل الرقم صحيح لهذا الكاشير؟ بعد محاولات خاطئة متتالية يُقفل الكاشير دقيقة
 * (يرمي خطأ برسالة) — يبطّئ التخمين اليدوي على الشاشة.
 */
export const verifyCashierPin = async (
  cashier: PosCashier,
  pin: string,
): Promise<boolean> => {
  const state = failures.get(cashier.id) ?? { count: 0, lockedUntil: 0 };
  const wait = state.lockedUntil - Date.now();
  if (wait > 0) {
    throw new Error(
      `محاولات خاطئة كثيرة — انتظر ${Math.ceil(wait / 1000)} ثانية`,
    );
  }

  const ok = sameText(await derive(pin, cashier), cashier.pinHash);
  if (ok) {
    failures.delete(cashier.id);
    return true;
  }

  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.count = 0;
    state.lockedUntil = Date.now() + LOCK_MS;
  }
  failures.set(cashier.id, state);
  return false;
};
