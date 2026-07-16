// stores/plans.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface PlanQuotas {
  max_users?: number;
  max_employees?: number;
  [key: string]: number | undefined;
}

export interface Plan {
  id: string;
  name: string;
  nameAr: string;
  description: string | null;
  price: string;
  billingCycle: "monthly" | "yearly" | "lifetime";
  features: string[];
  quotas: PlanQuotas;
  isActive: boolean;
  isCustom: boolean;
  sortOrder: number;
  created_at: string;
}

export interface AvailableFeature {
  name: string;
  labelAr: string;
}

export const usePlanStore = defineStore("plans", () => {
  const api = useApi();
  const plans = ref<Plan[]>([]);
  const availableFeatures = ref<AvailableFeature[]>([]);
  const loading = ref(false);

  // جلب كل الخطط
  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Plan[]>("/plans");
      plans.value = res.data;
    } finally {
      loading.value = false;
    }
  };

  // جلب قائمة الميزات المتاحة
  const fetchFeatures = async () => {
    try {
      const res = await api.get<AvailableFeature[]>("/plans/features/list");
      availableFeatures.value = res.data;
    } catch (e) {
      console.error("Failed to fetch features", e);
    }
  };

  // إنشاء خطة جديدة
  const create = async (data: Partial<Plan>) => {
    const res = await api.post<Plan>("/plans", data);
    plans.value.push(res.data);
    return res.data;
  };

  // تحديث خطة
  const update = async (id: string, data: Partial<Plan>) => {
    const res = await api.patch<Plan>(`/plans/${id}`, data);
    const index = plans.value.findIndex((p) => p.id === id);
    if (index !== -1) plans.value[index] = res.data;
    return res.data;
  };

  // حذف خطة
  const deletePlan = async (id: string) => {
    await api.del(`/plans/${id}`);
    plans.value = plans.value.filter((p) => p.id !== id);
  };

  return {
    plans,
    availableFeatures,
    loading,
    fetchAll,
    fetchFeatures,
    create,
    update,
    deletePlan,
  };
});
