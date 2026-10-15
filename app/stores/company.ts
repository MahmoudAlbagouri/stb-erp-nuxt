// stores/company.ts — هوية الشركة المطبوعة: اسمها وشعارها
//
// الفواتير والتقارير المطبوعة من لوحة التحكم تقرأ الشعار من هنا (شاشة الكاشير
// تحفظ نسختها مع بيانات جهازها لتطبع بلا إنترنت).
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface CompanyBranding {
  companyName: string;
  /** Data URL، أو null بلا شعار */
  logo: string | null;
}

export const useCompanyStore = defineStore("company", () => {
  const api = useApi();
  const branding = ref<CompanyBranding | null>(null);
  let loading: Promise<CompanyBranding | null> | null = null;

  /** يجلب الهوية مرة في الجلسة (force = من جديد). لا يرمي: الطباعة تكمل بدونها */
  const fetchBranding = (force = false): Promise<CompanyBranding | null> => {
    if (branding.value && !force) return Promise.resolve(branding.value);
    if (loading && !force) return loading;
    loading = api
      .get<CompanyBranding>("/tenants/me/branding")
      .then((res) => (branding.value = res.data))
      .catch(() => branding.value)
      .finally(() => (loading = null));
    return loading;
  };

  /** يرفع الشعار أو يغيّره (مدير الشركة) — Data URL جهّزته prepareLogo */
  const setLogo = async (logo: string) => {
    const res = await api.patch<CompanyBranding>("/tenants/me/logo", { logo });
    branding.value = res.data;
    return res.data;
  };

  const removeLogo = async () => {
    const res = await api.del<CompanyBranding>("/tenants/me/logo");
    branding.value = res.data;
    return res.data;
  };

  const reset = () => {
    branding.value = null;
  };

  return { branding, fetchBranding, setLogo, removeLogo, reset };
});
