// middleware/auth.global.ts
import { defineNuxtRouteMiddleware, navigateTo, useCookie } from "nuxt/app";
import type { DecodedToken } from "@/types";
import {
  ACCESS_TOKEN_COOKIE,
  DASHBOARD_PATH,
  DISCLAIMER_PATH,
  LOGIN_PATH,
  REFRESH_TOKEN_COOKIE,
  decodeJwt,
} from "@/utils/auth";

/**
 * يقرأ حقل isDisclaimerAccepted من الـ JWT.
 * - true/false → قيمة الحقل (غيابه = false)
 * - null       → تعذر فك التوكن (لا نحجب، والـ API هو خط الدفاع)
 */
function readDisclaimerClaim(token: string): boolean | null {
  const payload = decodeJwt<DecodedToken>(token);
  return payload ? payload.isDisclaimerAccepted === true : null;
}

export default defineNuxtRouteMiddleware((to) => {
  const accessToken = useCookie<string | null>(ACCESS_TOKEN_COOKIE);
  const refreshToken = useCookie<string | null>(REFRESH_TOKEN_COOKIE);

  const hasSession = !!accessToken.value || !!refreshToken.value;

  // بدون جلسة: صفحة الإقرار تحتاج تسجيل دخول، وباقي الصفحات يتولاها middleware/auth.ts
  if (!hasSession) {
    if (to.path === DISCLAIMER_PATH) return navigateTo(LOGIN_PATH);
    return;
  }

  // جلسة refresh فقط: سيُجدَّد التوكن من طبقة الـ API، وحماية الباك إند تبقى فعّالة
  if (!accessToken.value) return;

  const accepted = readDisclaimerClaim(accessToken.value);
  if (accepted === null) return;

  // لم يوافق → لا يدخل أي صفحة غير /disclaimer
  if (!accepted && to.path !== DISCLAIMER_PATH) {
    return navigateTo(DISCLAIMER_PATH);
  }

  // وافق مسبقاً → لا حاجة لصفحة الإقرار
  if (accepted && to.path === DISCLAIMER_PATH) {
    return navigateTo(DASHBOARD_PATH);
  }
});
