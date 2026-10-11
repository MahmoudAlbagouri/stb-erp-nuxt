// utils/auth.ts — ثوابت وأدوات المصادقة المشتركة (المصدر الوحيد لها)

export const ACCESS_TOKEN_COOKIE = "stb_access_token";
export const REFRESH_TOKEN_COOKIE = "stb_refresh_token";

export const LOGIN_PATH = "/auth/login";
export const DISCLAIMER_PATH = "/disclaimer";
export const DASHBOARD_PATH = "/dashboard";

export const PUBLIC_ROUTES: readonly string[] = [
  LOGIN_PATH,
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

/** يفك الـ payload من JWT بدون تحقق (التحقق مسؤولية الـ API). null عند الفشل */
export function decodeJwt<T>(token: string): T | null {
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
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
