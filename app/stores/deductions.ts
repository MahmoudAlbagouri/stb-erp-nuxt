// stores/deductions.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface Deduction {
  id: string;
  employeeId: string;
  name: string;
  totalAmount: number;
  monthlyAmount: number;
  installmentsCount: number;
  paidInstallments: number;
  startDate: string;
  notes?: string;
  createdAt: string;
  employee?: {
    id: string;
    fullName: string;
    employeeCode: string;
  };
}

export const useDeductionStore = defineStore("deductions", () => {
  const api = useApi();
  const deductions = ref<Deduction[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Deduction[]>("/deductions");
      deductions.value = res.data;
    } finally {
      loading.value = false;
    }
  };

  const create = async (data: Partial<Deduction>) => {
    const res = await api.post<Deduction>("/deductions", data);
    deductions.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, data: Partial<Deduction>) => {
    const res = await api.patch<Deduction>(`/deductions/${id}`, data);
    const index = deductions.value.findIndex((d) => d.id === id);
    if (index !== -1) deductions.value[index] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/deductions/${id}`);
    deductions.value = deductions.value.filter((d) => d.id !== id);
  };

  return {
    deductions,
    loading,
    fetchAll,
    create,
    update,
    remove,
  };
});
