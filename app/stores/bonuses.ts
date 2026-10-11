// stores/bonuses.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

import { BonusStatus, type Bonus, type DisbursedByUser } from "@/types";

export { BonusStatus };
export type { Bonus, DisbursedByUser };

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

  // ✅ دالة جديدة لتحديث الحالة
  const updateStatus = async (id: string, status: BonusStatus) => {
    const res = await api.patch<Bonus>(`/bonuses/${id}/status`, { status });
    const index = bonuses.value.findIndex((b) => b.id === id);
    if (index !== -1) bonuses.value[index] = res.data;
    return res.data;
  };

  // ✅ تأكيد الصرف الاستثنائي المباشر (Off-Cycle Disbursement)
  const disburseBonus = async (id: string) => {
    const res = await api.patch<Bonus>(`/bonuses/${id}/disburse`);
    const index = bonuses.value.findIndex((b) => b.id === id);
    if (index !== -1)
      bonuses.value[index] = { ...bonuses.value[index], ...res.data };
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/bonuses/${id}`);
    bonuses.value = bonuses.value.filter((b) => b.id !== id);
  };

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    await api.download(
      `/bonuses/export/${type}`,
      `bonuses_report_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  // ✅ التصدير الفردي
  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    await api.download(
      `/bonuses/${id}/export/${type}`,
      `bonus_${id}_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  const reset = () => {
    bonuses.value = [];
    loading.value = false;
  };

  return {
    reset,
    bonuses,
    loading,
    fetchAll,
    create,
    update,
    updateStatus,
    disburseBonus, // ✅ تصدير الدالة الجديدة
    remove,
    exportData,
    exportSingle,
  };
});
