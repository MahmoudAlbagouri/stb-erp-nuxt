// utils/auth.ts — ثوابت وأدوات المصادقة المشتركة (المصدر الوحيد لها)

export const ACCESS_TOKEN_COOKIE = "stb_access_token";
export const REFRESH_TOKEN_COOKIE = "stb_refresh_token";

const isSecure = process.env.NODE_ENV === "production";

/**
 * إعدادات كوكي التوكنين — كل من يكتبهما يمرّرها، حتى لا يُكتب الكوكي نفسه
 * بعمرين مختلفين. العمر يطابق صلاحية التوكن في الباك إند (15 دقيقة / 7 أيام).
 */
export const accessCookieOptions = {
  maxAge: 60 * 15,
  sameSite: "lax",
  secure: isSecure,
  path: "/",
} as const;

export const refreshCookieOptions = {
  ...accessCookieOptions,
  maxAge: 60 * 60 * 24 * 7,
} as const;

/**
 * قيمة الكوكي كما هي في المتصفح الآن. نُسخ useCookie المتعددة تتزامن متأخرة
 * (BroadcastChannel)، فما يحسم "هل الجلسة قائمة" يُقرأ من هنا لا من نسخة قديمة.
 */
export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(name.length + 1)) || null;
  } catch {
    return null;
  }
}

/** يحذف الكوكي من المتصفح فوراً (useCookie يحذفه بعد دورة الرسم التالية) */
export function expireCookie(name: string): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${secure}`;
}

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
