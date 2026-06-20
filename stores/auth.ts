// stores/auth.ts
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  DecodedToken,
} from "../types";
import { useRouter, useCookie } from "nuxt/app";
import { computed, ref } from "vue";

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

  // تعريف الكوكيز هنا أيضاً للوصول إليها بسهولة داخل الـ Store
  const accessTokenCookie = useCookie<string | null>("stb_access_token");
  const refreshTokenCookie = useCookie<string | null>("stb_refresh_token");

  // --- State ---
  const user = ref<AuthTokens | null>(null);
  const decodedToken = ref<DecodedToken | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Computed ---
  const isAuthenticated = computed(() => !!accessTokenCookie.value);
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin ?? false);
  const isSystemAdmin = computed(() => user.value?.isSystemAdmin ?? false);
  const role = computed(() => decodedToken.value?.role ?? null);
  const permissions = computed(() => decodedToken.value?.permissions ?? []);
  const employeeId = computed(() => decodedToken.value?.employeeId);

  // --- Hydrate from Cookies (يعمل في SSR و Client) ---
  const hydrate = () => {
    if (accessTokenCookie.value) {
      try {
        // نحتاج لتخزين بعض بيانات المستخدم مؤقتاً في الـ State
        // يمكن جلبها من API أو فك تشفير التوكن كما فعلنا سابقاً
        decodedToken.value = decodeJwt<DecodedToken>(accessTokenCookie.value);

        // ملاحظة: بما أننا لا نخزن كامل كائن user في الكوكي للأمان،
        // قد تحتاج لاستدعاء API لجلب بيانات المستخدم الكاملة هنا إذا لزم الأمر
        // أو الاعتماد على decodedToken فقط للصلاحيات.
        user.value = {
          accessToken: accessTokenCookie.value!,
          refreshToken: refreshTokenCookie.value!,
          isSuperAdmin: decodedToken.value?.isSuperAdmin || false,
          isSystemAdmin: decodedToken.value?.isSystemAdmin || false,
        } as AuthTokens;
      } catch {
        clearAuth();
      }
    }
  };

  const persist = (data: AuthTokens) => {
    user.value = data;
    decodedToken.value = decodeJwt<DecodedToken>(data.accessToken);

    // الحفظ في الكوكيز
    accessTokenCookie.value = data.accessToken;
    refreshTokenCookie.value = data.refreshToken;
  };

  const clearAuth = () => {
    user.value = null;
    decodedToken.value = null;

    // مسح الكوكيز
    accessTokenCookie.value = null;
    refreshTokenCookie.value = null;
  };

  // --- Actions ---
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

  const logout = () => {
    clearAuth();
    router.push("/auth/login");
  };

  return {
    user,
    decodedToken,
    role,
    permissions,
    employeeId,
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    isSystemAdmin,
    hydrate,
    login,
    register,
    logout,
  };
});
