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
  employee?: { id: string; fullName: string; employeeCode: string };
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

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(`/bonuses/export/${type}`, true, "blob");
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `bonuses_report_${new Date().toISOString().split("T")[0]}.${extension}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (e: any) {
      console.error("Export Error:", e);
      throw e;
    }
  };

  // ✅ التصدير الفردي
  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(
        `/bonuses/${id}/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `bonus_${id}_${new Date().toISOString().split("T")[0]}.${extension}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (e: any) {
      console.error("Single Export Error:", e);
      throw e;
    }
  };

  return {
    bonuses,
    loading,
    fetchAll,
    create,
    update,
    remove,
    exportData,
    exportSingle,
  };
});
