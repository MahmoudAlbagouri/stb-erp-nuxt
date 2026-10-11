// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo, useCookie } from "nuxt/app";
import {
  ACCESS_TOKEN_COOKIE,
  DASHBOARD_PATH,
  LOGIN_PATH,
  PUBLIC_ROUTES,
  REFRESH_TOKEN_COOKIE,
} from "@/utils/auth";

// ✅ يُسجَّل مرة واحدة فقط (كان يُضاف listener جديد مع كل تنقّل بين الصفحات)
let pageShowListenerRegistered = false;

export default defineNuxtRouteMiddleware((to) => {
  const accessToken = useCookie<string | null>(ACCESS_TOKEN_COOKIE);
  const refreshToken = useCookie<string | null>(REFRESH_TOKEN_COOKIE);

  if (import.meta.client && !pageShowListenerRegistered) {
    pageShowListenerRegistered = true;
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    });
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(to.path);

  // ✅ المنطق الجديد: نعتبر المستخدم "محتمل المصادقة" إذا كان لديه refresh token
  // حتى لو انتهى الـ access token، لأن الـ API سيقوم بتجديده تلقائياً
  const hasValidSession = !!accessToken.value || !!refreshToken.value;

  // الطرد فقط إذا لم يكن هناك أي توكن (حتى refresh) وكان المسار محمياً
  if (!hasValidSession && !isPublicRoute) {
    return navigateTo(LOGIN_PATH);
  }

  // إذا كان مسجلاً (أو لديه session صالحة) ويحاول دخول صفحة عامة -> حوّله للداشبورد
  if (hasValidSession && to.path.startsWith("/auth")) {
    return navigateTo(DASHBOARD_PATH);
  }
});
