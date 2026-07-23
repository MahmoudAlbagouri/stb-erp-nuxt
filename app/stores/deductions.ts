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
  employee?: { id: string; fullName: string; employeeCode: string };
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

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(
        `/deductions/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `deductions_report_${new Date().toISOString().split("T")[0]}.${extension}`;
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
        `/deductions/${id}/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `deduction_${id}_${new Date().toISOString().split("T")[0]}.${extension}`;
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
    deductions,
    loading,
    fetchAll,
    create,
    update,
    remove,
    exportData,
    exportSingle,
  };
});
