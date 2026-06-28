// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo, useCookie } from "nuxt/app";

export default defineNuxtRouteMiddleware((to) => {
  const accessToken = useCookie<string | null>("stb_access_token");
  const refreshToken = useCookie<string | null>("stb_refresh_token");

  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];
  if (typeof window !== "undefined") {
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    });
  }

  const isPublicRoute = publicRoutes.includes(to.path);

  // ✅ المنطق الجديد: نعتبر المستخدم "محتمل المصادقة" إذا كان لديه refresh token
  // حتى لو انتهى الـ access token، لأن الـ API سيقوم بتجديده تلقائياً
  const hasValidSession = !!accessToken.value || !!refreshToken.value;

  // الطرد فقط إذا لم يكن هناك أي توكن (حتى refresh) وكان المسار محمياً
  if (!hasValidSession && !isPublicRoute) {
    return navigateTo("/auth/login");
  }

  // إذا كان مسجلاً (أو لديه session صالحة) ويحاول دخول صفحة عامة -> حوّله للداشبورد
  if (hasValidSession && to.path.startsWith("/auth")) {
    return navigateTo("/dashboard");
  }
});
