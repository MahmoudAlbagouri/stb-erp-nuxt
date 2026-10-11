// stores/subscription.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
import type { SubscriptionSummary } from "@/types";

export const useSubscriptionStore = defineStore("subscription", () => {
  const api = useApi();
  const subscription = ref<SubscriptionSummary | null>(null);
  const loading = ref(false);

  // ✅ دالة لجلب بيانات الاشتراك
  const fetchMySubscription = async () => {
    loading.value = true;
    try {
      const res = await api.get<SubscriptionSummary>("/subscriptions/me");
      subscription.value = res.data;
    } catch (e) {
      console.error("Failed to fetch subscription:", e);
      subscription.value = null;
    } finally {
      loading.value = false;
    }
  };

  // ✅ حساب الأيام المتبقية للتجربة (Computed Property)
  const daysRemaining = computed(() => {
    if (
      !subscription.value ||
      subscription.value.status !== "trial" ||
      !subscription.value.endDate
    ) {
      return 0;
    }
    const end = new Date(subscription.value.endDate).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  // ✅ تنسيق السعر لتجنب NaN
  const formattedPrice = computed(() =>
    formatPrice(subscription.value?.plan?.price),
  );

  const reset = () => {
    subscription.value = null;
    loading.value = false;
  };

  return {
    reset,
    subscription,
    loading,
    daysRemaining,
    formattedPrice,
    fetchMySubscription,
  };
});
