// stores/loans.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Loan, LoanStatus } from "@/types";

export interface CreateLoanPayload {
  totalAmount: number;
  installmentsCount: number;
  reason?: string;
  startDate: string;
}

export const useLoansStore = defineStore("loans", () => {
  const api = useApi();
  const loans = ref<Loan[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Loan[]>("/loans");
      loans.value = res.data;
    } catch (error) {
      console.error("Failed to fetch loans:", error);
    } finally {
      loading.value = false;
    }
  };

  const createMyLoan = async (payload: CreateLoanPayload) => {
    const res = await api.post<Loan>("/loans/my-loans", payload);
    await fetchAll();
    return res.data;
  };

  const updateStatus = async (id: string, status: LoanStatus) => {
    const res = await api.patch<Loan>(`/loans/${id}/status`, { status });
    await fetchAll();
    return res.data;
  };

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(`/loans/export/${type}`, true, "blob");
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `loans_report_${new Date().toISOString().split("T")[0]}.${extension}`;
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
        `/loans/${id}/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `loan_${id}_${new Date().toISOString().split("T")[0]}.${extension}`;
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
    loans.value = [];
    loading.value = false;
  };

  return {
    loans,
    loading,
    fetchAll,
    createMyLoan,
    updateStatus,
    exportData,
    exportSingle,
    reset,
  };
});
