// composables/useApi.ts
import { useRuntimeConfig, useRouter, useCookie } from "nuxt/app";
import type { ApiResponse } from "../types";
import { useAuthStore } from "../stores/auth";
import {
  ACCESS_TOKEN_COOKIE,
  LOGIN_PATH,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  readCookie,
  refreshCookieOptions,
} from "../utils/auth";
import { saveBlob } from "../utils/download";
import {
  requestSupportToken,
  SUPPORT_COOKIE,
  supportCookieOptions,
  type SupportTarget,
} from "../utils/support";
import {
  NetworkError,
  OFFLINE_MESSAGE,
  SERVER_BUSY_MESSAGE,
  useConnection,
} from "./useConnection";

type ResponseType = "json" | "blob";

/**
 * نتيجة تجديد الجلسة. rejected وحدها تُخرج المستخدم: السيرفر قال صراحة إن
 * الجلسة انتهت. unavailable (النت انقطع، أو السيرفر يُعاد تشغيله) تُبقيه حيث
 * هو بما كتبه، ويُعاد التجديد مع أول طلب بعد عودة الاتصال.
 */
type RefreshOutcome =
  | { status: "refreshed"; accessToken: string }
  | { status: "rejected" }
  | { status: "unavailable" };

/**
 * تجديد واحد في اللحظة الواحدة: عشرة طلبات انتهى توكنها معاً تنتظر نفس
 * التجديد بدل عشرة تجديدات (في المتصفح فقط — على السيرفر الطلبات لمستخدمين
 * مختلفين).
 */
let refreshing: Promise<RefreshOutcome> | null = null;

/** ردود البروكسي حين يكون السيرفر خلفه متوقفاً (أثناء رفع نسخة جديدة مثلاً) */
const GATEWAY_STATUSES = [502, 503, 504];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** رسالة الخطأ من جسم الاستجابة (الباك إند يعيد { message }) */
const extractMessage = (body: unknown, fallback: string): string => {
  if (isRecord(body)) {
    // أخطاء التحقق تأتي قائمة (errors أو message كمصفوفة): نعرض أولها بدل
    // رسالة عامة لا تقول ما الخطأ
    for (const list of [body.errors, body.message]) {
      if (Array.isArray(list) && typeof list[0] === "string" && list[0]) {
        return list[0];
      }
    }
    if (typeof body.message === "string" && body.message) return body.message;
  }
  if (typeof body === "string" && body) return body;
  return fallback;
};

export const useApi = () => {
  const config = useRuntimeConfig();
  const router = useRouter();
  const BASE_URL = config.public.apiBase;

  const accessTokenCookie = useCookie<string | null>(
    ACCESS_TOKEN_COOKIE,
    accessCookieOptions,
  );

  const refreshTokenCookie = useCookie<string | null>(
    REFRESH_TOKEN_COOKIE,
    refreshCookieOptions,
  );

  // وضع الدعم: الشركة التي يعمل مالك النظام داخلها (انظر utils/support)
  const supportCookie = useCookie<SupportTarget | null>(
    SUPPORT_COOKIE,
    supportCookieOptions,
  );

  const connection = useConnection();

  /** `token`: توكن جُدّد للتو (قد لا يكون كوكي هذه النسخة قرأه بعد) */
  const getHeaders = (
    withAuth = true,
    isFormData = false,
    token: string | null = accessTokenCookie.value ?? null,
  ): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (withAuth && token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  /**
   * fetch يميّز "لم نصل للسيرفر" عن "السيرفر رفض": الأول NetworkError برسالة
   * واضحة بدل "Failed to fetch"، ويُعلم شريط الاتصال. أي رد يعني أننا متصلون.
   */
  const reach = async (url: string, options: RequestInit): Promise<Response> => {
    let res: Response;
    try {
      res = await fetch(url, options);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      connection.markOffline();
      throw new NetworkError(OFFLINE_MESSAGE);
    }
    connection.markOnline();
    return res;
  };

  const readBody = async (response: Response): Promise<unknown> => {
    const contentType = response.headers.get("content-type");
    return contentType?.includes("application/json")
      ? response.json()
      : response.text();
  };

  const handleResponse = async <T>(
    response: Response,
  ): Promise<ApiResponse<T>> => {
    const data = await readBody(response);

    if (!response.ok) {
      // صفحة خطأ البروكسي (HTML) لا تُعرض للمستخدم كرسالة
      if (GATEWAY_STATUSES.includes(response.status)) {
        throw new NetworkError(SERVER_BUSY_MESSAGE);
      }
      throw new Error(extractMessage(data, `HTTP ${response.status}`));
    }

    if (isRecord(data) && "success" in data) {
      return data as unknown as ApiResponse<T>;
    }

    return {
      success: true,
      message: "Success",
      statusCode: response.status,
      data: data as T,
    };
  };

  const requestRefresh = async (): Promise<RefreshOutcome> => {
    // في المتصفح من الكوكي نفسه: نسخة هذا الـ composable قد تكون قديمة (خرج
    // المستخدم للتو) فتعيد جلسة انتهت
    const currentRefreshToken = import.meta.client
      ? readCookie(REFRESH_TOKEN_COOKIE)
      : refreshTokenCookie.value;
    if (!currentRefreshToken) return { status: "rejected" };

    let res: Response;
    try {
      res = await reach(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentRefreshToken}`,
        },
      });
    } catch {
      return { status: "unavailable" };
    }
    // 401 توكن التجديد منتهٍ أو غير صالح، 403 الحساب أُوقف: انتهت فعلاً
    if (res.status === 401 || res.status === 403) return { status: "rejected" };
    if (!res.ok) return { status: "unavailable" };

    let tokens: { accessToken?: string; refreshToken?: string } | undefined;
    try {
      tokens = (
        await handleResponse<{ accessToken: string; refreshToken: string }>(
          res,
        )
      ).data;
    } catch {
      return { status: "unavailable" };
    }
    if (!tokens?.accessToken || !tokens.refreshToken) {
      return { status: "unavailable" };
    }

    let accessToken = tokens.accessToken;
    // وضع الدعم: التوكن المجدَّد توكن المالك؛ نستبدله بتوكن دعم جديد لنفس
    // الشركة. إذا رفضه السيرفر نخرج من وضع الدعم ونعود لحساب المالك.
    if (supportCookie.value) {
      let supportToken: string | null;
      try {
        supportToken = await requestSupportToken(
          BASE_URL,
          accessToken,
          supportCookie.value.tenantId,
        );
      } catch {
        // انقطع النت بين الطلبين: لا نغيّر شيئاً، ويُعاد التجديد لاحقاً
        connection.markOffline();
        return { status: "unavailable" };
      }
      if (supportToken) accessToken = supportToken;
      else supportCookie.value = null;
    }

    const fresh = { accessToken, refreshToken: tokens.refreshToken };
    accessTokenCookie.value = fresh.accessToken;
    refreshTokenCookie.value = fresh.refreshToken;
    // ✅ تحديث التوكن المفكوك أيضاً: الصلاحيات الجديدة تظهر فوراً في الواجهة
    useAuthStore().applyTokens(fresh);
    return { status: "refreshed", accessToken };
  };

  const refreshTokens = (): Promise<RefreshOutcome> => {
    if (!import.meta.client) return requestRefresh();
    refreshing ??= requestRefresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  };

  // ✅ التنفيذ الداخلي: يعيد الـ Response الخام بعد معالجة 401 (تجديد التوكن مرة واحدة)
  const send = async (
    path: string,
    options: RequestInit,
    auth: boolean,
    isRetry = false,
  ): Promise<Response> => {
    const res = await reach(`${BASE_URL}${path}`, options);

    if (res.status !== 401 || !auth || isRetry) return res;

    const outcome = await refreshTokens();
    if (outcome.status === "refreshed") {
      const isFormData = options.body instanceof FormData;
      return send(
        path,
        {
          ...options,
          headers: getHeaders(auth, isFormData, outcome.accessToken),
        },
        auth,
        true,
      );
    }

    if (outcome.status === "unavailable") {
      // الجلسة لم تنتهِ: تعذّر تجديدها الآن. المستخدم يبقى حيث هو بما كتبه
      throw new NetworkError(
        connection.state.value.offline ? OFFLINE_MESSAGE : SERVER_BUSY_MESSAGE,
      );
    }

    accessTokenCookie.value = null;
    refreshTokenCookie.value = null;
    // مسودات النماذج تبقى: يجدها بعد تسجيل الدخول من جديد
    useAuthStore().logout({ expired: true });
    if (import.meta.client) router.push(LOGIN_PATH);
    throw new Error("انتهت الجلسة — سجّل الدخول من جديد");
  };

  const requestJson = async <T>(
    path: string,
    options: RequestInit,
    auth: boolean,
  ): Promise<ApiResponse<T>> => handleResponse<T>(await send(path, options, auth));

  const requestBlob = async (path: string, auth = true): Promise<Blob> => {
    const res = await send(
      path,
      { method: "GET", headers: getHeaders(auth) },
      auth,
    );
    if (!res.ok) {
      if (GATEWAY_STATUSES.includes(res.status)) {
        throw new NetworkError(SERVER_BUSY_MESSAGE);
      }
      const body = await readBody(res).catch(() => null);
      throw new Error(extractMessage(body, `HTTP ${res.status}`));
    }
    return res.blob();
  };

  const jsonBody = (body: unknown): string | undefined =>
    body ? JSON.stringify(body) : undefined;

  // ============================================================
  // واجهة الاستخدام العامة (Public API)
  // ============================================================

  function get<T>(
    path: string,
    auth?: boolean,
    responseType?: "json",
  ): Promise<ApiResponse<T>>;
  function get(path: string, auth: boolean, responseType: "blob"): Promise<Blob>;
  function get<T>(
    path: string,
    auth = true,
    responseType: ResponseType = "json",
  ): Promise<ApiResponse<T> | Blob> {
    return responseType === "blob"
      ? requestBlob(path, auth)
      : requestJson<T>(path, { method: "GET", headers: getHeaders(auth) }, auth);
  }

  const post = <T>(path: string, body?: unknown, auth = true) => {
    const isFormData = body instanceof FormData;
    return requestJson<T>(
      path,
      {
        method: "POST",
        headers: getHeaders(auth, isFormData),
        body: isFormData ? body : jsonBody(body),
      },
      auth,
    );
  };

  const patch = <T>(path: string, body?: unknown, auth = true) =>
    requestJson<T>(
      path,
      { method: "PATCH", headers: getHeaders(auth), body: jsonBody(body) },
      auth,
    );

  const del = <T>(path: string, auth = true) =>
    requestJson<T>(path, { method: "DELETE", headers: getHeaders(auth) }, auth);

  /**
   * ✅ المسار الموحّد لتنزيل الملفات (تقارير Excel/PDF): جلب + تحقق + حفظ.
   * `fileName` بالامتداد.
   */
  const download = async (path: string, fileName: string): Promise<void> => {
    const blob = await requestBlob(path);
    if (blob.size === 0) throw new Error("الملف المستلم فارغ أو تالف");
    saveBlob(blob, fileName);
  };

  /**
   * اتصال بث (Server-Sent Events) بجلسة المستخدم: fetch بدل EventSource لأنه
   * يحمل ترويسة Authorization ويجدّد التوكن عند 401 كباقي الطلبات. يعيد
   * الاستجابة مفتوحة؛ قراءتها وإغلاقها (signal) على المستدعي.
   */
  const openStream = async (
    path: string,
    signal: AbortSignal,
  ): Promise<Response> => {
    const res = await send(
      path,
      {
        method: "GET",
        headers: { ...getHeaders(true), Accept: "text/event-stream" },
        signal,
      },
      true,
    );
    if (!res.ok || !res.body) {
      if (GATEWAY_STATUSES.includes(res.status)) {
        throw new NetworkError(SERVER_BUSY_MESSAGE);
      }
      throw new Error(`HTTP ${res.status}`);
    }
    return res;
  };

  // refreshSession: تجديد الجلسة قبل أن يُرفض طلب (plugins/session-refresh)
  return {
    get,
    post,
    patch,
    del,
    download,
    openStream,
    refreshSession: refreshTokens,
  };
};
