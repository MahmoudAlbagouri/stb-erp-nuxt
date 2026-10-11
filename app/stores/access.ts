// stores/access.ts
// بيانات الوصول الخاصة بالخطة: المميزات المفعّلة + حدود الاستخدام.
// (الصلاحيات نفسها تأتي من التوكن عبر auth store)
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { QuotaUsage } from "@/types";

interface AccessResponse {
  /** مالك النظام: بلا قيود خطة */
  unrestricted: boolean;
  status: string;
  features: string[];
  quotas: Record<string, QuotaUsage>;
}

export const useAccessStore = defineStore("access", () => {
  const api = useApi();

  const unrestricted = ref(false);
  const status = ref<string | null>(null);
  const features = ref<string[]>([]);
  const quotas = ref<Record<string, QuotaUsage>>({});
  /** true بعد أول تحميل ناجح — قبله لا نقفل شيئاً (الباك إند هو خط الحماية) */
  const loaded = ref(false);
  const loading = ref(false);

  let inFlight: Promise<void> | null = null;

  const fetch = (force = false): Promise<void> => {
    if (loaded.value && !force) return Promise.resolve();
    if (inFlight) return inFlight;

    loading.value = true;
    inFlight = api
      .get<AccessResponse>("/subscriptions/me/access")
      .then((res) => {
        unrestricted.value = res.data.unrestricted;
        status.value = res.data.status;
        features.value = res.data.features ?? [];
        quotas.value = res.data.quotas ?? {};
        loaded.value = true;
      })
      .catch((error) => {
        console.error("Failed to load access data:", error);
      })
      .finally(() => {
        loading.value = false;
        inFlight = null;
      });
    return inFlight;
  };

  const reset = () => {
    unrestricted.value = false;
    status.value = null;
    features.value = [];
    quotas.value = {};
    loaded.value = false;
    loading.value = false;
  };

  return {
    unrestricted,
    status,
    features,
    quotas,
    loaded,
    loading,
    fetch,
    reset,
  };
});
