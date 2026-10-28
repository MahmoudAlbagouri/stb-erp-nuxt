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
  accessCookieOptions,
  decodeJwt,
  refreshCookieOptions,
} from "../utils/auth";
import { getErrorMessage } from "../utils/errors";
import { getCountry } from "../utils/countries";
import { clearFormDrafts } from "../utils/form-drafts";
import {
  SUPPORT_COOKIE,
  supportCookieOptions,
  type SupportTarget,
} from "../utils/support";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  DecodedToken,
} from "@/types";

/** دولة الشركة وعملتها وتوقيتها كما تحفظها شاشة الكاشير على الجهاز */
export interface DeviceLocale {
  country: string;
  currency: string;
  timezone: string;
}

export const useAuthStore = defineStore("auth", () => {
  const api = useApi();
  const router = useRouter();

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

  // --- State ---
  // يُفك التوكن فور إنشاء المتجر (على السيرفر والمتصفح) حتى تكون الصلاحيات
  // متاحة من أول رسم للصفحة — بدون وميض "غير مصرح"
  const decodedToken = ref<DecodedToken | null>(
    accessTokenCookie.value
      ? decodeJwt<DecodedToken>(accessTokenCookie.value)
      : null,
  );
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Computed ---
  // الجلسة قائمة ما بقي توكن التجديد: كوكي الوصول يختفي بعد ربع ساعة، وكان
  // اختفاؤه يُقرأ "لا صلاحية" فتُحجب الصفحة المفتوحة. أول طلب يجدّده، وحتى
  // ذلك الحين تبقى الصلاحيات من التوكن المفكوك
  const isAuthenticated = computed(
    () => !!accessTokenCookie.value || !!refreshTokenCookie.value,
  );

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

  /** الشركة المفتوحة في وضع الدعم، أو null خارج وضع الدعم */
  const supportTenant = computed(() => supportCookie.value ?? null);

  const role = computed(() => decodedToken.value?.role ?? null);
  // الصلاحيات داخل التوكن تأتي ضمن role.permissions
  const permissions = computed(() => role.value?.permissions ?? []);
  const employeeId = computed(() => decodedToken.value?.employeeId);

  // ✅ دولة الشركة وعملتها ومنطقتها الزمنية. التوكنات الصادرة قبل دعم تعدد
  // الدول لا تحملها: تُعامل بالدولة الافتراضية
  //
  // شاشة الكاشير تعمل بلا جلسة (التوكن ينتهي بعد 15 دقيقة بلا إنترنت): تضع
  // هنا دولة الشركة المحفوظة على الجهاز، ولها الأولوية ما دامت الشاشة مفتوحة
  const deviceLocale = ref<DeviceLocale | null>(null);
  const setDeviceLocale = (locale: DeviceLocale | null) => {
    deviceLocale.value = locale;
  };

  const country = computed(
    () =>
      getCountry(deviceLocale.value?.country ?? decodedToken.value?.country)
        .code,
  );
  const currency = computed(
    () =>
      deviceLocale.value?.currency ??
      decodedToken.value?.currency ??
      getCountry(country.value).currency,
  );
  const timezone = computed(
    () =>
      deviceLocale.value?.timezone ??
      decodedToken.value?.timezone ??
      getCountry(country.value).timezone,
  );

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
    supportCookie.value = null;
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

  /** رُفض رفع الشعار عند التسجيل (الحساب أُنشئ): الملف الشخصي يعرض تنبيهاً */
  const logoFailed = ref(false);

  // ✅ التسجيل يعيد Tokens: نحفظها ونوجّه المستخدم لمرحلة الإقرار. الشعار
  // (اختياري) يُرفع بعدها بتوكن المدير الجديد — فشله لا يُلغي التسجيل: يُرفع
  // لاحقاً من الملف الشخصي
  const register = (payload: RegisterPayload, logo: string | null = null) =>
    runAuthAction(async () => {
      const res = await api.post<AuthTokens>("/auth/register", payload, false);
      persist(res.data);
      if (logo) {
        await api.patch("/tenants/me/logo", { logo }).catch(() => {
          logoFailed.value = true;
        });
      }
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

  /**
   * وضع الدعم: يدخل مالك النظام شركة ويعمل داخلها بصلاحيات مديرها. توكن
   * التجديد يبقى توكن المالك؛ يتغيّر توكن الوصول فقط.
   */
  const enterSupport = async (tenantId: string) => {
    const res = await api.post<{
      accessToken: string;
      tenant: { id: string; companyName: string };
    }>(`/auth/support/${tenantId}`, {});

    supportCookie.value = {
      tenantId: res.data.tenant.id,
      companyName: res.data.tenant.companyName,
    };
    accessTokenCookie.value = res.data.accessToken;
    // تحميل كامل: لا يبقى في الذاكرة شيء من حساب المالك أو شركة سابقة
    window.location.assign(DASHBOARD_PATH);
  };

  /** الخروج من وضع الدعم والعودة لحساب مالك النظام */
  const exitSupport = () => {
    supportCookie.value = null;
    // بلا توكن وصول: أول طلب يجدّد الجلسة بتوكن المالك (التجديد لم يتغيّر)
    accessTokenCookie.value = null;
    window.location.assign("/dashboard/companies");
  };

  /**
   * `expired`: السيرفر أنهى الجلسة (لا المستخدم) — مسودات النماذج تبقى ليجدها
   * حين يدخل من جديد. الخروج بإرادته يمسحها: لا تبقى لمن يستخدم الجهاز بعده.
   */
  const logout = (options: { expired?: boolean } = {}) => {
    if (!options.expired) clearFormDrafts();
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
    country,
    currency,
    timezone,
    setDeviceLocale,
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    isSystemAdmin,
    isDisclaimerAccepted,
    hydrate,
    applyTokens: persist,
    supportTenant,
    enterSupport,
    exitSupport,
    login,
    register,
    logoFailed,
    acceptDisclaimer,
    logout,
    forgotPassword,
    resetPassword,
  };
});
