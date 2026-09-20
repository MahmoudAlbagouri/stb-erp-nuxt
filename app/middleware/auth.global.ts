// middleware/auth.global.ts
import { defineNuxtRouteMiddleware, navigateTo, useCookie } from "nuxt/app";

const LOGIN_PATH = "/auth/login";
const DISCLAIMER_PATH = "/disclaimer";
const DASHBOARD_PATH = "/dashboard";

/**
 * يقرأ حقل isDisclaimerAccepted من الـ JWT.
 * - true/false → قيمة الحقل (غيابه = false)
 * - null       → تعذر فك التوكن (لا نحجب، والـ API هو خط الدفاع)
 */
function readDisclaimerClaim(token: string): boolean | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json)?.isDisclaimerAccepted === true;
  } catch {
    return null;
  }
}

export default defineNuxtRouteMiddleware((to) => {
  const accessToken = useCookie<string | null>("stb_access_token");
  const refreshToken = useCookie<string | null>("stb_refresh_token");

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
