// composables/useApi.ts
import { useRuntimeConfig, useRouter, useCookie } from "nuxt/app";
import type { ApiResponse } from "../types";
import { useAuthStore } from "../stores/auth";
import {
  ACCESS_TOKEN_COOKIE,
  LOGIN_PATH,
  REFRESH_TOKEN_COOKIE,
} from "../utils/auth";
import { saveBlob } from "../utils/download";

type ResponseType = "json" | "blob";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** رسالة الخطأ من جسم الاستجابة (الباك إند يعيد { message }) */
const extractMessage = (body: unknown, fallback: string): string => {
  if (isRecord(body) && typeof body.message === "string" && body.message) {
    return body.message;
  }
  if (typeof body === "string" && body) return body;
  return fallback;
};

export const useApi = () => {
  const config = useRuntimeConfig();
  const router = useRouter();
  const BASE_URL = config.public.apiBase;

  const isSecure = process.env.NODE_ENV === "production";

  const accessTokenCookie = useCookie<string | null>(ACCESS_TOKEN_COOKIE, {
    maxAge: 60 * 15,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
  });

  const refreshTokenCookie = useCookie<string | null>(REFRESH_TOKEN_COOKIE, {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
  });

  const getHeaders = (
    withAuth = true,
    isFormData = false,
  ): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (withAuth) {
      const token = accessTokenCookie.value;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
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

  const refreshTokens = async (): Promise<boolean> => {
    const currentRefreshToken = refreshTokenCookie.value;
    if (!currentRefreshToken) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentRefreshToken}`,
        },
      });

      if (!res.ok) throw new Error("Refresh failed");
      const apiResponse = await handleResponse<{
        accessToken: string;
        refreshToken: string;
      }>(res);
      const tokens = apiResponse.data;

      if (tokens?.accessToken && tokens?.refreshToken) {
        accessTokenCookie.value = tokens.accessToken;
        refreshTokenCookie.value = tokens.refreshToken;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  };

  // ✅ التنفيذ الداخلي: يعيد الـ Response الخام بعد معالجة 401 (تجديد التوكن مرة واحدة)
  const send = async (
    path: string,
    options: RequestInit,
    auth: boolean,
    isRetry = false,
  ): Promise<Response> => {
    const res = await fetch(`${BASE_URL}${path}`, options);

    if (res.status !== 401 || !auth || isRetry) return res;

    if (await refreshTokens()) {
      const isFormData = options.body instanceof FormData;
      return send(
        path,
        { ...options, headers: getHeaders(auth, isFormData) },
        auth,
        true,
      );
    }

    accessTokenCookie.value = null;
    refreshTokenCookie.value = null;
    useAuthStore().logout();
    if (import.meta.client) router.push(LOGIN_PATH);
    throw new Error("Session expired. Please login again.");
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

  return { get, post, patch, del, download };
};
