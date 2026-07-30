// stores/subscription.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";

export const useSubscriptionStore = defineStore("subscription", () => {
  const api = useApi();
  const subscription = ref<any>(null);
  const loading = ref(false);

  // ✅ دالة لجلب بيانات الاشتراك
  const fetchMySubscription = async () => {
    loading.value = true;
    try {
      const res = await api.get("/subscriptions/me");
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
  const formattedPrice = computed(() => {
    const price = subscription.value?.plan?.price;
    if (!price && price !== 0) return "مجاناً";

    const numPrice = Number(price);
    return isNaN(numPrice)
      ? "0 ر.س"
      : `${numPrice.toLocaleString("ar-SA")} ر.س`;
  });

  return {
    subscription,
    loading,
    daysRemaining,
    formattedPrice,
    fetchMySubscription,
  };
});
