// stores/loans.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Loan, LoanStatus } from "@/types";

// ✅ تعريف نوع البيانات المرسل للباك إند مطابق تماماً لـ CreateLoanDto
export interface CreateLoanPayload {
  totalAmount: number;
  installmentsCount: number;
  reason?: string;
  startDate: string; // YYYY-MM-DD
}

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

  // ✅ تقديم قرض للموظف الحالي (Self-Service)
  const createMyLoan = async (payload: CreateLoanPayload) => {
    const res = await api.post<Loan>("/loans/my-loans", payload);
    await fetchAll(); // تحديث القائمة بعد الإضافة
    return res.data;
  };

  // تحديث حالة القرض (موافقة/رفض)
  const updateStatus = async (id: string, status: LoanStatus) => {
    const res = await api.patch<Loan>(`/loans/${id}/status`, { status });
    await fetchAll();
    return res.data;
  };

  // ✅ دالة تفريغ المتجر (للاستخدام عند تسجيل الخروج)
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
    reset, // ✅ تم التصدير
  };
});
