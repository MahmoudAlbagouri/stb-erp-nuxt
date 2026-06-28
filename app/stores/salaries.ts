// stores/salaries.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Salary, CreateSalaryPayload, UpdateSalaryPayload } from "@/types";

export const useSalariesStore = defineStore("salaries", () => {
  const api = useApi();

  const salaries = ref<Salary[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Salary[]>("/salaries");
      salaries.value = res.data;
    } catch (error) {
      console.error("Failed to fetch salaries:", error);
    } finally {
      loading.value = false;
    }
  };

  const create = async (payload: CreateSalaryPayload) => {
    const res = await api.post<Salary>("/salaries", payload);
    await fetchAll();
    return res.data;
  };

  const update = async (id: string, payload: UpdateSalaryPayload) => {
    const res = await api.patch<Salary>(`/salaries/${id}`, payload);
    await fetchAll();
    return res.data;
  };

  // ✅ دالة تفريغ المتجر (للاستخدام عند تسجيل الخروج)
  const reset = () => {
    salaries.value = [];
    loading.value = false;
  };

  return {
    salaries,
    loading,
    fetchAll,
    create,
    update,
    reset, // ✅ تم التصدير
  };
});
