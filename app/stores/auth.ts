// stores/auth.ts
import { defineStore, getActivePinia } from "pinia";
import { useRouter, useCookie } from "nuxt/app";
import { computed, ref } from "vue";
import { useApi } from "../composables/useApi";
import {
  ACCESS_TOKEN_COOKIE,
  DASHBOARD_PATH,
  DISCLAIMER_PATH,
  LOGIN_PATH,
  REFRESH_TOKEN_COOKIE,
  decodeJwt,
} from "../utils/auth";
import { getErrorMessage } from "../utils/errors";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  DecodedToken,
} from "@/types";

export const useAuthStore = defineStore("auth", () => {
  const api = useApi();
  const router = useRouter();

  const accessTokenCookie = useCookie<string | null>(ACCESS_TOKEN_COOKIE);
  const refreshTokenCookie = useCookie<string | null>(REFRESH_TOKEN_COOKIE);

  // --- State ---
  const decodedToken = ref<DecodedToken | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Computed ---
  const isAuthenticated = computed(() => !!accessTokenCookie.value);

  // ✅ التوكن المفكوك هو المصدر الوحيد للحقيقة لبيانات المستخدم والصلاحيات
  const userId = computed(() => decodedToken.value?.sub ?? null);
  const tenantId = computed(() => decodedToken.value?.tenantId ?? null);
  const isSuperAdmin = computed(
    () => decodedToken.value?.isSuperAdmin ?? false,
  );
  const isSystemAdmin = computed(
    () => decodedToken.value?.isSystemAdmin ?? false,
  );

  // ✅ حالة الإقرار (أي توكن بدون الحقل يُعتبر لم يوافق)
  const isDisclaimerAccepted = computed(
    () => decodedToken.value?.isDisclaimerAccepted === true,
  );

  const role = computed(() => decodedToken.value?.role ?? null);
  // الصلاحيات داخل التوكن تأتي ضمن role.permissions
  const permissions = computed(() => role.value?.permissions ?? []);
  const employeeId = computed(() => decodedToken.value?.employeeId);

  // --- Hydrate & Persist ---
  const hydrate = () => {
    if (!accessTokenCookie.value) return;
    decodedToken.value = decodeJwt<DecodedToken>(accessTokenCookie.value);
    if (!decodedToken.value) clearAuth();
  };

  const persist = (data: AuthTokens) => {
    decodedToken.value = decodeJwt<DecodedToken>(data.accessToken);
    accessTokenCookie.value = data.accessToken;
    refreshTokenCookie.value = data.refreshToken;
  };

  const clearAuth = () => {
    decodedToken.value = null;
    accessTokenCookie.value = null;
    refreshTokenCookie.value = null;
  };

  // ✅ التوجيه بعد الدخول/التسجيل حسب حالة الإقرار
  const goAfterAuth = () => {
    router.push(isDisclaimerAccepted.value ? DASHBOARD_PATH : DISCLAIMER_PATH);
  };

  /** ينفّذ طلب مصادقة مع إدارة موحّدة لحالتي loading / error */
  const runAuthAction = async <T>(
    action: () => Promise<T>,
    fallbackMessage: string,
  ): Promise<T> => {
    loading.value = true;
    error.value = null;
    try {
      return await action();
    } catch (e) {
      error.value = getErrorMessage(e, fallbackMessage);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  // --- Actions ---
  const login = (payload: LoginPayload) =>
    runAuthAction(async () => {
      const res = await api.post<AuthTokens>("/auth/login", payload, false);
      persist(res.data);
      goAfterAuth();
    }, "خطأ في تسجيل الدخول");

  // ✅ التسجيل يعيد Tokens: نحفظها ونوجّه المستخدم لمرحلة الإقرار
  const register = (payload: RegisterPayload) =>
    runAuthAction(async () => {
      const res = await api.post<AuthTokens>("/auth/register", payload, false);
      persist(res.data);
      goAfterAuth();
    }, "خطأ في إنشاء الحساب");

  // ✅ قبول الإقرار: نستبدل التوكنز بالجديدة (isDisclaimerAccepted = true) ثم الداشبورد
  const acceptDisclaimer = () =>
    runAuthAction(async () => {
      const res = await api.post<AuthTokens>("/auth/accept-disclaimer", {});
      persist(res.data);
      await router.push(DASHBOARD_PATH);
    }, "تعذر تسجيل الإقرار، حاول مرة أخرى");

  const forgotPassword = (email: string) =>
    runAuthAction(async () => {
      await api.post("/auth/forgot-password", { email }, false);
    }, "حدث خطأ أثناء إرسال الرمز");

  const resetPassword = (email: string, code: string, newPassword: string) =>
    runAuthAction(async () => {
      await api.post(
        "/auth/reset-password",
        { email, code, newPassword },
        false,
      );
      router.push(`${LOGIN_PATH}?reset=success`);
    }, "فشل تغيير كلمة المرور");

  /**
   * ✅ تفريغ كل المتاجر المُفعّلة تلقائياً (أي store يعرّف reset) بدل قائمة
   * يدوية كانت تنسى المتاجر الجديدة — حتى لا تبقى بيانات شركة سابقة في
   * الذاكرة بعد تسجيل الخروج.
   */
  const resetAllStores = () => {
    const pinia = getActivePinia() as
      | { _s?: Map<string, { $id: string; reset?: () => void }> }
      | undefined;
    pinia?._s?.forEach((store) => {
      if (store.$id !== "auth" && typeof store.reset === "function") {
        store.reset();
      }
    });
  };

  const logout = () => {
    resetAllStores();
    clearAuth();
    router.push(LOGIN_PATH);
  };

  return {
    decodedToken,
    userId,
    tenantId,
    role,
    permissions,
    employeeId,
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    isSystemAdmin,
    isDisclaimerAccepted,
    hydrate,
    login,
    register,
    acceptDisclaimer,
    logout,
    forgotPassword,
    resetPassword,
  };
});
