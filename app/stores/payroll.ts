import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { DisbursedByUser, Employee } from "@/types";

export type { DisbursedByUser };

// ✅ تم تحديث الحقول لتطابق التفصيل الجديد في PayrollItem (الباك إند)
export interface PayrollItem {
  id: string;
  payrollId: string;
  employeeId: string;

  // المستحقات
  basicSalary: string;
  housingAllowance: string;
  transportAllowance: string;
  otherAllowances: string;
  overtimeAmount: string;
  bonusesAmount: string; // إجمالي المكافآت المستحقة (مصروفة سلفاً + غير مصروفة)
  settlementsAmount: string; // إجمالي التسويات/بدل الإجازات المستحقة
  eosAmount: string; // مكافأة نهاية الخدمة المستحقة هذا الشهر

  // المدفوعات المسبقة (تُخصم من الصافي لمنع الازدواجية)
  prepaidBonuses: string;
  prepaidSettlements: string;
  prepaidAllowances: string;

  // الخصومات
  loanDeduction: string;
  advanceDeduction: string;
  unpaidLeaveDeduction: string;
  otherDeductions: string;

  netSalary: string;
  notes: string | null;
  employee: Employee;
}

export interface PayrollDetail {
  id: string;
  month: number;
  year: number;
  totalNetSalary: string;
  paymentDate: string;
  tenantId: string;
  generatedAt: string;
  isDisbursed: boolean;
  disbursedAt?: string;
  disbursedBy?: DisbursedByUser;
  items: PayrollItem[];
}

export interface PayrollSummary {
  id: string;
  month: number;
  year: number;
  totalNetSalary: string;
  paymentDate: string;
  generatedAt: string;
  isDisbursed: boolean;
  disbursedAt?: string;
  disbursedBy?: DisbursedByUser;
  items?: PayrollItem[];
  /** إجمالي الخصومات (إن أعاده الباك إند) */
  totalDeductions?: number | string;
}

export const usePayrollStore = defineStore("payroll", () => {
  const api = useApi();
  const payrolls = ref<PayrollSummary[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async (year?: number, month?: number) => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<PayrollSummary[]>(
        `/payroll${toQueryString({ year, month: year ? month : undefined })}`,
      );
      payrolls.value = res.data ?? [];
    } catch (e) {
      error.value = getErrorMessage(e);
    } finally {
      loading.value = false;
    }
  };

  const generate = async (month: number, year: number) => {
    const res = await api.post<PayrollSummary>(
      `/payroll/generate/${month}/${year}`,
    );
    const newItem = res.data;
    payrolls.value.unshift(newItem);
    return newItem;
  };

  // ✅ دالة جديدة لتأكيد الصرف
  const disburse = async (id: string) => {
    const res = await api.patch<PayrollSummary>(`/payroll/${id}/disburse`);
    const updated = res.data;

    // تحديث السجل في القائمة المحلية
    const idx = payrolls.value.findIndex((p) => p.id === id);
    if (idx !== -1) {
      payrolls.value[idx] = { ...payrolls.value[idx], ...updated };
    }
    return updated;
  };

  const exportData = async (
    type: "excel" | "pdf",
    month: number,
    year: number,
  ) => {
    await api.download(
      `/payroll/export/${type}/${month}/${year}`,
      `payroll_${year}_${month}.${reportExtension(type)}`,
    );
  };

  const fetchById = async (id: string): Promise<PayrollDetail> => {
    loading.value = true;
    try {
      const res = await api.get<PayrollDetail | null>(`/payroll/${id}`);
      if (!res.data) throw new Error("بيانات المسير غير متوفرة");
      return res.data;
    } catch (e) {
      error.value = getErrorMessage(e);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    payrolls.value = [];
    loading.value = false;
    error.value = null;
  };

  return {
    payrolls,
    loading,
    error,
    fetchAll,
    generate,
    disburse, // ✅ تصدير الدالة الجديدة
    exportData,
    fetchById,
    reset,
  };
});
