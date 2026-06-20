// composables/useApi.ts
import { useRuntimeConfig, useRouter, useCookie } from "nuxt/app";
import type { ApiResponse } from "../types";
import { useAuthStore } from "../stores/auth";

export const useApi = () => {
  const config = useRuntimeConfig();
  const router = useRouter();
  const BASE_URL = config.public.apiBase as string;

  // ✅ إعدادات الكوكيز للـ localhost والإنتاج
  const isSecure = false;

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

  // 1️⃣ تعريف دوال المعالجة أولاً لضمان توفرها عند الاستدعاء
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

    // التعامل مع الرد الموحد من الباك إند
    if (typeof data === "object" && "success" in data) {
      return data as ApiResponse<T>;
    }

    // إذا كان الرد ليس بالهيكل الموحد، نلفّه فيه
    return {
      success: true,
      message: "Success",
      statusCode: response.status,
      data: data as unknown as T,
    };
  };

  // 2️⃣ دالة التحديث الآن يمكنها استدعاء handleResponse بأمان
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

      // استخدام handleResponse لفك تغليف الرد الموحّد
      const apiResponse = await handleResponse<{
        accessToken: string;
        refreshToken: string;
      }>(res);

      // ✅ استخراج التوكنات من داخل response.data
      const tokens = apiResponse.data;

      if (tokens?.accessToken && tokens?.refreshToken) {
        accessTokenCookie.value = tokens.accessToken;
        refreshTokenCookie.value = tokens.refreshToken;
        return true;
      }

      console.warn(
        "Refresh succeeded but tokens structure is invalid:",
        tokens,
      );
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  };

  // 3️⃣ دالة التنفيذ الرئيسية
  const executeRequest = async <T>(
    path: string,
    options: RequestInit,
    auth = true,
    retryCount = 0,
  ): Promise<ApiResponse<T>> => {
    const res = await fetch(`${BASE_URL}${path}`, options);

    if (res.status === 401 && auth && retryCount === 0) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        const isFormData = options.body instanceof FormData;
        const newOptions = {
          ...options,
          headers: getHeaders(auth, isFormData),
        };
        // ✅ إعادة المحاولة مباشرة بدون المرور بمعالجة الخطأ
        return executeRequest(path, newOptions, auth, retryCount + 1);
      } else {
        accessTokenCookie.value = null;
        refreshTokenCookie.value = null;
        const authStore = useAuthStore();
        authStore.logout();
        if (import.meta.client) router.push("/auth/login");
        throw new Error("Session expired. Please login again.");
      }
    }

    // ✅ هنا فقط نتعامل مع الأخطاء الحقيقية (غير 401 الأولي)
    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      const errorMessage =
        typeof data === "object" ? data.message : data || `HTTP ${res.status}`;
      throw new Error(errorMessage);
    }

    return handleResponse<T>(res);
  };

  // 4️⃣ واجهة الاستخدام العامة
  return {
    get: async <T>(path: string, auth = true) =>
      executeRequest<T>(
        path,
        { method: "GET", headers: getHeaders(auth) },
        auth,
      ),

    post: async <T>(path: string, body?: unknown, auth = true) => {
      const isFormData = body instanceof FormData;
      return executeRequest<T>(
        path,
        {
          method: "POST",
          headers: getHeaders(auth, isFormData),
          body: isFormData
            ? (body as FormData)
            : body
              ? JSON.stringify(body)
              : undefined,
        },
        auth,
      );
    },

    patch: async <T>(path: string, body?: unknown, auth = true) =>
      executeRequest<T>(
        path,
        {
          method: "PATCH",
          headers: getHeaders(auth),
          body: body ? JSON.stringify(body) : undefined,
        },
        auth,
      ),

    del: async <T>(path: string, auth = true) =>
      executeRequest<T>(
        path,
        { method: "DELETE", headers: getHeaders(auth) },
        auth,
      ),
  };
};
