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

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(
        `/salaries/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `salaries_report_${new Date().toISOString().split("T")[0]}.${extension}`;
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
        `/salaries/${id}/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `salary_${id}_${new Date().toISOString().split("T")[0]}.${extension}`;
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
    exportData,
    exportSingle,
    reset,
  };
});
