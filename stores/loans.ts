// stores/loans.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Loan, LoanStatus, CreateLoanPayload } from "../types";

export const useLoansStore = defineStore("loans", () => {
  const api = useApi();

  const loans = ref<Loan[]>([]);
  const loading = ref(false);

  // جلب جميع القروض
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

  // تقديم قرض للموظف الحالي (Self-Service)
  const createMyLoan = async (payload: CreateLoanPayload) => {
    const res = await api.post<Loan>("/loans/my-loans", payload);
    await fetchAll();
    return res.data;
  };

  // تحديث حالة القرض (موافقة/رفض)
  const updateStatus = async (id: string, status: LoanStatus) => {
    const res = await api.patch<Loan>(`/loans/${id}/status`, { status });
    await fetchAll();
    return res.data;
  };

  return {
    loans,
    loading,
    fetchAll,
    createMyLoan,
    updateStatus,
  };
});
