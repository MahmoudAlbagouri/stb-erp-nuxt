// pos/api.ts — اتصال شاشة الكاشير بالسيرفر
//
// طبقة مستقلة عن useApi عمداً: useApi يسجّل خروج المستخدم إذا فشل تجديد
// التوكن، وهذا خطأ هنا — الكاشير يجب أن يواصل البيع محلياً مهما حدث للشبكة
// أو للجلسة.
//
// للشاشة هويتان:
//   جلسة المستخدم  لربط الشاشة بجهاز كاشير أول مرة فقط (يحتاج صلاحية).
//   مفتاح الجهاز   لكل ما بعد ذلك: سحب الأصناف ورفع المبيعات. يصدر عند الربط
//                  ويبقى، فلا يتوقف الرفع على تسجيل دخول أحد.
//
// الأخطاء أنواع، ولا واحد منها يطرد الكاشير:
//   OfflineError              لا اتصال (أو السيرفر لا يرد) ← نعيد المحاولة لاحقاً
//   SessionExpiredError       لا جلسة مستخدم ← الربط ينتظر تسجيل الدخول
//   DeviceKeyError            المفتاح أُبطل (فُكّ الربط أو أُوقف الجهاز)
//   SubscriptionInactiveError اشتراك الشركة غير سارٍ
//   PosRequestError           السيرفر رفض الطلب برسالة
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
    super("انتهت الجلسة — سجّل الدخول لربط الشاشة");
  }
}

/** مفتاح الجهاز لم يعد صالحاً: الشاشة تحتاج ربطاً جديداً بجلسة مستخدم */
export class DeviceKeyError extends Error {}

/** اشتراك الشركة غير سارٍ أو لا يشمل نقاط البيع */
export class SubscriptionInactiveError extends Error {}

/** السيرفر رفض الطلب. 409 = هذه الشاشة ليست المربوطة بالجهاز */
export class PosRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** ما يعرّف الشاشة للسيرفر بعد ربطها */
export interface DeviceCredentials {
  deviceId: string;
  installationId: string;
  key: string;
}

/** مهلة الطلب: شبكة معلّقة تُعامل كانقطاع بدل أن تجمّد المزامنة */
const TIMEOUT_MS = 15_000;
const HTTP_SUBSCRIPTION_INACTIVE = 402;

const isSecure = process.env.NODE_ENV === "production";
const cookieOptions = (maxAge: number) =>
  ({ maxAge, sameSite: "lax", secure: isSecure, path: "/" }) as const;

type Method = "GET" | "POST";
type Headers = Record<string, string>;

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
    headers: Headers,
  ): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...headers },
      });
    } catch {
      // فشل الشبكة أو انتهاء المهلة: لا نعرف شيئاً عن الجلسة، فقط لا اتصال
      throw new OfflineError();
    } finally {
      clearTimeout(timer);
    }
  };

  const bearer = (token: string | null): Headers =>
    token ? { Authorization: `Bearer ${token}` } : {};

  const toInit = (method: Method, body?: unknown): RequestInit => ({
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const messageOf = async (res: Response): Promise<string> => {
    const payload = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message[0]
      : payload?.message;
    return message || `تعذر تنفيذ الطلب (${res.status})`;
  };

  const dataOf = async <T>(res: Response): Promise<T> =>
    ((await res.json().catch(() => null)) as { data?: T } | null)?.data as T;

  // ─── جلسة المستخدم ──────────────────────────────────────────────────────────
  /** يجدّد التوكن. انقطاع الشبكة هنا ليس انتهاء جلسة */
  const refresh = async (): Promise<void> => {
    if (!refreshToken.value) throw new SessionExpiredError();

    const res = await send(
      "/auth/refresh",
      { method: "POST" },
      bearer(refreshToken.value),
    );
    if (!res.ok) throw new SessionExpiredError();

    const tokens = await dataOf<{ accessToken?: string; refreshToken?: string }>(
      res,
    );
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

  /** طلب بجلسة المستخدم (ربط الشاشة، قائمة الأجهزة) */
  const request = async <T>(
    method: Method,
    path: string,
    body?: unknown,
  ): Promise<T> => {
    const init = toInit(method, body);

    // التوكن القصير ينتهي كل 15 دقيقة: نجدّده قبل الطلب إن غاب
    if (!accessToken.value) await refresh();

    let res = await send(path, init, bearer(accessToken.value));
    if (res.status === 401) {
      await refresh();
      res = await send(path, init, bearer(accessToken.value));
      if (res.status === 401) throw new SessionExpiredError();
    }

    if (!res.ok) throw new PosRequestError(await messageOf(res), res.status);
    return dataOf<T>(res);
  };

  // ─── هوية الجهاز ────────────────────────────────────────────────────────────
  /** توكن تجديد رفضه السيرفر: لا نعيد تجربته مع كل نبضة */
  let deadRefreshToken: string | null = null;

  /**
   * جلسة المستخدم ترافق طلب الجهاز إن وُجدت (ليُعرف من يعمل على الشاشة)،
   * وغيابها أو تعذر تجديدها لا يوقف الطلب.
   */
  const sessionHeaders = async (): Promise<Headers> => {
    const stale = refreshToken.value === deadRefreshToken;
    if (!accessToken.value && refreshToken.value && !stale) {
      try {
        await refresh();
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          deadRefreshToken = refreshToken.value;
        }
      }
    }
    return bearer(accessToken.value);
  };

  /** طلب بمفتاح الجهاز: السحب والرفع وفحص الاتصال */
  const deviceRequest = async <T>(
    credentials: DeviceCredentials,
    method: Method,
    path: string,
    body?: unknown,
  ): Promise<T> => {
    const res = await send(`/pos/device${path}`, toInit(method, body), {
      ...(await sessionHeaders()),
      "X-Pos-Device": credentials.deviceId,
      "X-Pos-Installation": credentials.installationId,
      "X-Pos-Key": credentials.key,
    });

    if (res.ok) return dataOf<T>(res);

    const message = await messageOf(res);
    if (res.status === 401) throw new DeviceKeyError(message);
    if (res.status === HTTP_SUBSCRIPTION_INACTIVE) {
      throw new SubscriptionInactiveError(message);
    }
    throw new PosRequestError(message, res.status);
  };

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
    /** طلبات الشاشة بمفتاح جهازها (المسارات نسبة إلى ‎/pos/device) */
    device: (credentials: DeviceCredentials) => ({
      get: <T>(path: string) => deviceRequest<T>(credentials, "GET", path),
      post: <T>(path: string, body: unknown) =>
        deviceRequest<T>(credentials, "POST", path, body),
    }),
    /** هل توجد جلسة مستخدم؟ (توكن أو توكن تجديد) */
    hasSession: () => !!accessToken.value || !!refreshToken.value,
  };
};
