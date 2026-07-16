// stores/bonuses.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface Bonus {
  id: string;
  employeeId: string;
  amount: number;
  payoutDate: string;
  notes?: string;
  createdAt: string;
  employee?: {
    id: string;
    fullName: string;
    employeeCode: string;
  };
}

export const useBonusStore = defineStore("bonuses", () => {
  const api = useApi();
  const bonuses = ref<Bonus[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Bonus[]>("/bonuses");
      bonuses.value = res.data;
    } finally {
      loading.value = false;
    }
  };

  const create = async (data: Partial<Bonus>) => {
    const res = await api.post<Bonus>("/bonuses", data);
    bonuses.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, data: Partial<Bonus>) => {
    const res = await api.patch<Bonus>(`/bonuses/${id}`, data);
    const index = bonuses.value.findIndex((b) => b.id === id);
    if (index !== -1) bonuses.value[index] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/bonuses/${id}`);
    bonuses.value = bonuses.value.filter((b) => b.id !== id);
  };

  return {
    bonuses,
    loading,
    fetchAll,
    create,
    update,
    remove,
  };
});
