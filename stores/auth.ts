// stores/auth.ts
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  DecodedToken,
} from "../types";
import { useRouter } from "nuxt/app";
import { computed, ref } from "vue";

// ✅ جديد: فك تشفير التوكن بدون مكتبة خارجية - الـ role والصلاحيات متخزنين جواه
function decodeJwt<T>(token: string): T | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
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

export const useAuthStore = defineStore("auth", () => {
  const api = useApi();
  const router = useRouter();

  // --- State ---
  const user = ref<AuthTokens | null>(null);
  const decodedToken = ref<DecodedToken | null>(null); // ✅ جديد
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Computed ---
  const isAuthenticated = computed(() => !!user.value?.accessToken);
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin ?? false);
  const isSystemAdmin = computed(() => user.value?.isSystemAdmin ?? false);
  const role = computed(() => decodedToken.value?.role ?? null); // ✅ جديد
  const permissions = computed(() => decodedToken.value?.permissions ?? []); // ✅ جديد
  const employeeId = computed(() => decodedToken.value?.employeeId); // ✅ جديد

  // --- Hydrate from localStorage ---
  const hydrate = () => {
    if (!import.meta.client) return;
    const stored = localStorage.getItem("stb_auth");
    if (stored) {
      try {
        user.value = JSON.parse(stored);
        if (user.value?.accessToken) {
          decodedToken.value = decodeJwt<DecodedToken>(user.value.accessToken); // ✅ جديد
        }
      } catch {
        clearAuth();
      }
    }
  };

  const persist = (data: AuthTokens) => {
    user.value = data;
    decodedToken.value = decodeJwt<DecodedToken>(data.accessToken); // ✅ جديد
    if (import.meta.client) {
      localStorage.setItem("stb_auth", JSON.stringify(data));
      localStorage.setItem("stb_access_token", data.accessToken);
      localStorage.setItem("stb_refresh_token", data.refreshToken);
    }
  };

  const clearAuth = () => {
    user.value = null;
    decodedToken.value = null; // ✅ جديد
    if (import.meta.client) {
      localStorage.removeItem("stb_auth");
      localStorage.removeItem("stb_access_token");
      localStorage.removeItem("stb_refresh_token");
    }
  };

  // --- Actions (متماسة بدون أي تغيير) ---
  const login = async (payload: LoginPayload) => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.post<AuthTokens>("/auth/login", payload, false);
      persist(res.data);
      router.push("/dashboard");
    } catch (e: any) {
      error.value = e.message || "خطأ في تسجيل الدخول";
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const register = async (payload: RegisterPayload) => {
    loading.value = true;
    error.value = null;
    try {
      await api.post("/auth/register", payload, false);
      router.push("/auth/login");
    } catch (e: any) {
      error.value = e.message || "خطأ في إنشاء الحساب";
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const refreshTokens = async () => {
    if (!import.meta.client) return;
    const refreshToken = localStorage.getItem("stb_refresh_token");
    if (!refreshToken) {
      logout();
      return;
    }
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string }>(
        "/auth/refresh",
        null,
        true,
      );
      if (user.value) {
        persist({
          ...user.value,
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        });
      }
    } catch {
      logout();
    }
  };

  const forgotPassword = async (email: string) => {
    loading.value = true;
    error.value = null;
    try {
      await api.post("/auth/forgot-password", { email }, false);
    } catch (e: any) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    loading.value = true;
    error.value = null;
    try {
      await api.post("/auth/reset-password", { token, newPassword }, false);
      router.push("/auth/login");
    } catch (e: any) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    clearAuth();
    router.push("/auth/login");
  };

  return {
    user,
    decodedToken, // ✅ جديد
    role, // ✅ جديد
    permissions, // ✅ جديد
    employeeId, // ✅ جديد
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    isSystemAdmin,
    hydrate,
    login,
    register,
    refreshTokens,
    forgotPassword,
    resetPassword,
    logout,
  };
});
