// pos/api.ts — اتصال شاشة الكاشير بالسيرفر
//
// طبقة مستقلة عن useApi عمداً: useApi يسجّل خروج المستخدم إذا فشل تجديد
// التوكن، وهذا خطأ هنا — الكاشير يجب أن يواصل البيع محلياً مهما حدث للشبكة
// أو للجلسة. لذلك نفرّق بين ثلاث حالات ولا نطرد أحداً:
//   OfflineError        لا اتصال (أو السيرفر لا يرد) ← نعيد المحاولة لاحقاً
//   SessionExpiredError الجلسة انتهت ← البيع مستمر، والرفع ينتظر تسجيل الدخول
//   Error               السيرفر رفض الطلب برسالة
import { useCookie, useRuntimeConfig } from "nuxt/app";
import { useAuthStore } from "@/stores/auth";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/utils/auth";
import {
  requestSupportToken,
  SUPPORT_COOKIE,
  supportCookieOptions,
  type SupportTarget,
} from "@/utils/support";

export class OfflineError extends Error {
  constructor() {
    super("لا يوجد اتصال بالسيرفر");
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super("انتهت الجلسة — سجّل الدخول لرفع المبيعات");
  }
}

/** مهلة الطلب: شبكة معلّقة تُعامل كانقطاع بدل أن تجمّد المزامنة */
const TIMEOUT_MS = 15_000;

const isSecure = process.env.NODE_ENV === "production";
const cookieOptions = (maxAge: number) =>
  ({ maxAge, sameSite: "lax", secure: isSecure, path: "/" }) as const;

export const usePosApi = () => {
  const baseUrl = useRuntimeConfig().public.apiBase;
  const accessToken = useCookie<string | null>(
    ACCESS_TOKEN_COOKIE,
    cookieOptions(60 * 15),
  );
  const refreshToken = useCookie<string | null>(
    REFRESH_TOKEN_COOKIE,
    cookieOptions(60 * 60 * 24 * 7),
  );

  const supportCookie = useCookie<SupportTarget | null>(
    SUPPORT_COOKIE,
    supportCookieOptions,
  );

  const send = async (
    path: string,
    init: RequestInit,
    token: string | null,
  ): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // فشل الشبكة أو انتهاء المهلة: لا نعرف شيئاً عن الجلسة، فقط لا اتصال
      throw new OfflineError();
    } finally {
      clearTimeout(timer);
    }
  };

  /** يجدّد التوكن. انقطاع الشبكة هنا ليس انتهاء جلسة */
  const refresh = async (): Promise<void> => {
    if (!refreshToken.value) throw new SessionExpiredError();

    const res = await send("/auth/refresh", { method: "POST" }, refreshToken.value);
    if (!res.ok) throw new SessionExpiredError();

    const body = (await res.json()) as {
      data?: { accessToken?: string; refreshToken?: string };
    };
    const tokens = body.data;
    if (!tokens?.accessToken || !tokens.refreshToken) {
      throw new SessionExpiredError();
    }
    // وضع الدعم: نستبدل توكن المالك المجدَّد بتوكن دعم لنفس الشركة
    let access = tokens.accessToken;
    if (supportCookie.value) {
      let supportToken: string | null;
      try {
        supportToken = await requestSupportToken(
          baseUrl,
          access,
          supportCookie.value.tenantId,
        );
      } catch {
        throw new OfflineError();
      }
      if (supportToken) access = supportToken;
      else supportCookie.value = null;
    }

    accessToken.value = access;
    refreshToken.value = tokens.refreshToken;
    useAuthStore().applyTokens({
      accessToken: access,
      refreshToken: tokens.refreshToken,
    });
  };

  const request = async <T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> => {
    const init: RequestInit = {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    // التوكن القصير ينتهي كل 15 دقيقة: نجدّده قبل الطلب إن غاب
    if (!accessToken.value) await refresh();

    let res = await send(path, init, accessToken.value);
    if (res.status === 401) {
      await refresh();
      res = await send(path, init, accessToken.value);
      if (res.status === 401) throw new SessionExpiredError();
    }

    const payload = (await res.json().catch(() => null)) as {
      data?: T;
      message?: string | string[];
    } | null;
    if (!res.ok) {
      const message = Array.isArray(payload?.message)
        ? payload.message[0]
        : payload?.message;
      throw new Error(message || `تعذر تنفيذ الطلب (${res.status})`);
    }
    return payload?.data as T;
  };

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
    /** هل توجد جلسة يمكن الرفع بها؟ (توكن أو توكن تجديد) */
    hasSession: () => !!accessToken.value || !!refreshToken.value,
  };
};
