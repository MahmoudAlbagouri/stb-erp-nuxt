// stores/auth.ts
import { defineStore } from "pinia";
import { useRouter, useCookie } from "nuxt/app";
import { computed, ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  DecodedToken,
} from "@/types";

// ✅ استيراد جميع الـ Stores التي تحتاج إلى تفريغ عند الخروج
import { useUsersStore } from "./users";
import { useEmployeesStore } from "./employees";
import { usePayrollStore } from "./payroll";
import { useAdvancesStore } from "./advances";
import { useLoansStore } from "./loans";
import { useLeavesStore } from "./leaves";
import { useContractsStore } from "./contracts";
import { useSalariesStore } from "./salaries";
import { useQuotationsStore } from "./quotations";
import { usePermissionsStore } from "./permissions";
import { useRolesStore } from "./roles";
import { useProfileStore } from "./profile";
import { useAttendanceStore } from "./attendance";
import { useUiStore } from "./ui";

function decodeJwt<T>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
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

  const accessTokenCookie = useCookie<string | null>("stb_access_token");
  const refreshTokenCookie = useCookie<string | null>("stb_refresh_token");

  // --- State ---
  const user = ref<AuthTokens | null>(null);
  const decodedToken = ref<DecodedToken | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Computed ---
  const isAuthenticated = computed(() => !!accessTokenCookie.value);

  // ✅ التعديل الجذري: الاعتماد المباشر على التوكن المفكوك كمصدر وحيد للحقيقة
  // هذا يضمن تحديث اللقب والصلاحيات فوراً عند تسجيل الدخول دون الحاجة لـ Refresh
  const isSuperAdmin = computed(
    () => decodedToken.value?.isSuperAdmin ?? false,
  );
  const isSystemAdmin = computed(
    () => decodedToken.value?.isSystemAdmin ?? false,
  );

  const role = computed(() => decodedToken.value?.role ?? null);
  const permissions = computed(() => decodedToken.value?.permissions ?? []);
  const employeeId = computed(() => decodedToken.value?.employeeId);

  // --- Hydrate & Persist ---
  const hydrate = () => {
    if (accessTokenCookie.value) {
      try {
        decodedToken.value = decodeJwt<DecodedToken>(accessTokenCookie.value);
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
    // ✅ تحديث التوكن المفكوك أولاً لضمان تزامن المتغيرات المحسوبة
    decodedToken.value = decodeJwt<DecodedToken>(data.accessToken);

    user.value = data;
    accessTokenCookie.value = data.accessToken;
    refreshTokenCookie.value = data.refreshToken;
  };

  const clearAuth = () => {
    user.value = null;
    decodedToken.value = null;
    accessTokenCookie.value = null;
    refreshTokenCookie.value = null;
  };

  // ✅ قائمة مركزية بجميع المتاجر التي يجب تفريغها
  const storesToReset = [
    useUsersStore,
    useEmployeesStore,
    usePayrollStore,
    useAdvancesStore,
    useLoansStore,
    useLeavesStore,
    useContractsStore,
    useSalariesStore,
    useQuotationsStore,
    usePermissionsStore,
    useRolesStore,
    useProfileStore,
    useAttendanceStore,
    useUiStore,
  ];

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

  const forgotPassword = async (email: string) => {
    loading.value = true;
    error.value = null;
    try {
      await api.post("/auth/forgot-password", { email }, false);
    } catch (e: any) {
      error.value = e.message || "حدث خطأ أثناء إرسال الرمز";
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const resetPassword = async (
    email: string,
    code: string,
    newPassword: string,
  ) => {
    loading.value = true;
    error.value = null;
    try {
      await api.post(
        "/auth/reset-password",
        { email, code, newPassword },
        false,
      );
      router.push("/auth/login?reset=success");
    } catch (e: any) {
      error.value = e.message || "فشل تغيير كلمة المرور";
      throw e;
    } finally {
      loading.value = false;
    }
  };

  // ✅ دالة تسجيل الخروج المطورة
  const logout = () => {
    // 1. تفريغ جميع المتاجر تلقائياً
    storesToReset.forEach((storeFn) => {
      const store = storeFn();
      if (typeof store.reset === "function") {
        store.reset();
      }
    });

    // 2. مسح التوكنز والبيانات الشخصية
    clearAuth();

    // 3. التوجيه لصفحة الدخول
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
    forgotPassword,
    resetPassword,
  };
});
