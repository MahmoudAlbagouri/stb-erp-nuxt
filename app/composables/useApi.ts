// composables/useApi.ts
import { useRuntimeConfig, useRouter, useCookie } from "nuxt/app";
import type { ApiResponse } from "../types";
import { useAuthStore } from "../stores/auth";

export const useApi = () => {
  const config = useRuntimeConfig();
  const router = useRouter();
  const BASE_URL = config.public.apiBase as string;

  const isSecure = process.env.NODE_ENV === "production";

  const accessTokenCookie = useCookie<string | null>("stb_access_token", {
    maxAge: 60 * 15,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
  });

  const refreshTokenCookie = useCookie<string | null>("stb_refresh_token", {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
  });

  const getAccessToken = () => accessTokenCookie.value;

  const getHeaders = (
    withAuth = true,
    isFormData = false,
  ): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (withAuth) {
      const token = getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleResponse = async <T>(
    response: Response,
  ): Promise<ApiResponse<T>> => {
    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        typeof data === "object"
          ? data.message
          : data || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    if (typeof data === "object" && "success" in data) {
      return data as ApiResponse<T>;
    }

    return {
      success: true,
      message: "Success",
      statusCode: response.status,
      data: data as unknown as T,
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

  // ✅ التنفيذ الداخلي (Internal Implementation)
  // ملاحظة: هذا النوع العام يستخدم فقط داخل الدالة ولا يظهر للخارج
  const executeRequest = async <T>(
    path: string,
    options: RequestInit,
    auth = true,
    retryCount = 0,
    responseType: "json" | "blob" = "json",
  ): Promise<ApiResponse<T> | Blob> => {
    const res = await fetch(`${BASE_URL}${path}`, options);

    if (res.status === 401 && auth && retryCount === 0) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        const isFormData = options.body instanceof FormData;
        const newOptions = {
          ...options,
          headers: getHeaders(auth, isFormData),
        };
        return executeRequest(
          path,
          newOptions,
          auth,
          retryCount + 1,
          responseType,
        );
      } else {
        accessTokenCookie.value = null;
        refreshTokenCookie.value = null;
        useAuthStore().logout();
        if (import.meta.client) router.push("/auth/login");
        throw new Error("Session expired. Please login again.");
      }
    }

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    if (responseType === "blob") {
      return await res.blob();
    }

    return handleResponse<T>(res);
  };

  // ============================================================
  // ✅ تعريفات الأنواع (Overloads) - الحل الجذري للمشكلة
  // ============================================================

  // 1. GET Overloads
  interface ApiGet {
    <T>(
      path: string,
      auth?: boolean,
      responseType?: "json",
    ): Promise<ApiResponse<T>>;
    <T>(path: string, auth: boolean, responseType: "blob"): Promise<Blob>;
  }

  // 2. POST Overloads
  interface ApiPost {
    <T>(path: string, body?: unknown, auth?: boolean): Promise<ApiResponse<T>>;
  }

  // 3. PATCH Overloads
  interface ApiPatch {
    <T>(path: string, body?: unknown, auth?: boolean): Promise<ApiResponse<T>>;
  }

  // 4. DELETE Overloads
  interface ApiDel {
    <T>(path: string, auth?: boolean): Promise<ApiResponse<T>>;
  }

  // ============================================================
  // 4️⃣ واجهة الاستخدام العامة (Public API)
  // ============================================================
  return {
    // تطبيق الـ Overload على دالة get
    get: ((path: string, auth = true, responseType: "json" | "blob" = "json") =>
      executeRequest(
        path,
        { method: "GET", headers: getHeaders(auth) },
        auth,
        0,
        responseType,
      )) as ApiGet,

    // تطبيق الـ Overload على دالة post
    post: (<T>(path: string, body?: unknown, auth = true) =>
      executeRequest<T>(
        path,
        {
          method: "POST",
          headers: getHeaders(auth, body instanceof FormData),
          body:
            body instanceof FormData
              ? body
              : body
                ? JSON.stringify(body)
                : undefined,
        },
        auth,
      )) as ApiPost,

    // تطبيق الـ Overload على دالة patch
    patch: (<T>(path: string, body?: unknown, auth = true) =>
      executeRequest<T>(
        path,
        {
          method: "PATCH",
          headers: getHeaders(auth),
          body: body ? JSON.stringify(body) : undefined,
        },
        auth,
      )) as ApiPatch,

    // تطبيق الـ Overload على دالة del
    del: (<T>(path: string, auth = true) =>
      executeRequest<T>(
        path,
        { method: "DELETE", headers: getHeaders(auth) },
        auth,
      )) as ApiDel,
  };
};
