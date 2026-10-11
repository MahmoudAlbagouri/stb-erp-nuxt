import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { CreateLoanPayload, Loan, LoanStatus } from "@/types";

export type { CreateLoanPayload };

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

  // ✅ دالة جديدة لإنشاء قرض لموظف (Admin)
  const createForEmployee = async (
    employeeId: string,
    payload: CreateLoanPayload,
  ) => {
    const res = await api.post<Loan>(`/loans/admin/${employeeId}`, payload);
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
    await api.download(
      `/loans/export/${type}`,
      `loans_report_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  // ✅ التصدير الفردي
  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    await api.download(
      `/loans/${id}/export/${type}`,
      `loan_${id}_${todayStamp()}.${reportExtension(type)}`,
    );
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
    createForEmployee, // ✅ تم التصدير
    updateStatus,
    exportData,
    exportSingle,
    reset,
  };
});
