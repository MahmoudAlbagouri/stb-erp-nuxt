// stores/deductions.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

import { DeductionStatus, type Deduction } from "@/types";

export { DeductionStatus };
export type { Deduction };

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

  // ✅ دالة جديدة لتحديث الحالة
  const updateStatus = async (id: string, status: DeductionStatus) => {
    const res = await api.patch<Deduction>(`/deductions/${id}/status`, {
      status,
    });
    const index = deductions.value.findIndex((d) => d.id === id);
    if (index !== -1) deductions.value[index] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/deductions/${id}`);
    deductions.value = deductions.value.filter((d) => d.id !== id);
  };

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    await api.download(
      `/deductions/export/${type}`,
      `deductions_report_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  // ✅ التصدير الفردي
  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    await api.download(
      `/deductions/${id}/export/${type}`,
      `deduction_${id}_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  const reset = () => {
    deductions.value = [];
    loading.value = false;
  };

  return {
    reset,
    deductions,
    loading,
    fetchAll,
    create,
    update,
    updateStatus, // ✅ تصدير الدالة
    remove,
    exportData,
    exportSingle,
  };
});
