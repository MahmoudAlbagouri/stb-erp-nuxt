// stores/advances.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Advance } from "@/types";

export interface CreateAdvancePayload {
  amount: number;
  reason?: string;
  repaymentDate: string;
}

export const useAdvancesStore = defineStore("advances", () => {
  const api = useApi();
  const advances = ref<Advance[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Advance[]>("/advances");
      advances.value = res.data;
    } catch (error) {
      console.error("Failed to fetch advances:", error);
    } finally {
      loading.value = false;
    }
  };

  const createMyAdvance = async (payload: CreateAdvancePayload) => {
    const res = await api.post<Advance>("/advances/my-advances", payload);
    await fetchAll();
    return res.data;
  };

  const createForEmployee = async (
    employeeId: string,
    payload: CreateAdvancePayload,
  ) => {
    const res = await api.post<Advance>(
      `/advances/admin/${employeeId}`,
      payload,
    );
    await fetchAll();
    return res.data;
  };

  const updateStatus = async (
    id: string,
    status: "pending" | "approved" | "rejected" | "paid",
  ) => {
    const res = await api.patch<Advance>(`/advances/${id}/status`, { status });
    await fetchAll();
    return res.data;
  };

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(
        `/advances/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `advances_report_${new Date().toISOString().split("T")[0]}.${extension}`;
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
        `/advances/${id}/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `advance_${id}_${new Date().toISOString().split("T")[0]}.${extension}`;
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
    advances.value = [];
    loading.value = false;
  };

  return {
    advances,
    loading,
    fetchAll,
    createMyAdvance,
    createForEmployee,
    updateStatus,
    exportData,
    exportSingle,
    reset,
  };
});
