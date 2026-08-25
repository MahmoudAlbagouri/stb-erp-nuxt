// stores/payroll.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface Employee {
  id: string;
  fullName: string;
  employeeCode: string;
  nationalityType: string;
  nationalId: string;
  nationalIdCardPath: string | null;
  phone: string;
  jobTitle: string;
  department: string;
  status: string;
}

export interface PayrollItem {
  id: string;
  payrollId: string;
  employeeId: string;
  basicSalary: string;
  allowances: string;
  overtimeAmount: string;
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
  items: PayrollItem[];
}

export interface PayrollSummary {
  id: string;
  month: number;
  year: number;
  totalNetSalary: string;
  paymentDate: string;
  generatedAt: string;
  items?: any[];
}

export const usePayrollStore = defineStore("payroll", () => {
  const api = useApi();
  const payrolls = ref<PayrollSummary[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // جلب كل المسيرات
  const fetchAll = async (year?: number, month?: number) => {
    loading.value = true;
    error.value = null;
    try {
      let url = "/payroll";
      const params = new URLSearchParams();
      if (year) params.append("year", String(year));
      if (month && year) params.append("month", String(month));
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get<any>(url);
      // التعامل الآمن مع هيكلية الرد سواء كانت مصفوفة مباشرة أو داخل data
      payrolls.value = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  // توليد مسير جديد
  const generate = async (month: number, year: number) => {
    const res = await api.post<any>(`/payroll/generate/${month}/${year}`);
    const newItem = res.data?.data || res.data;
    payrolls.value.unshift(newItem);
    return newItem;
  };

  // التصدير
  const exportData = async (
    type: "excel" | "pdf",
    month: number,
    year: number,
  ) => {
    try {
      const blob = await api.get<Blob>(
        `/payroll/export/${type}/${month}/${year}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");

      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `payroll_${year}_${month}.${extension}`;
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

  // ✅ دالة جلب تفاصيل مسير محدد (مصححة)
  const fetchById = async (id: string): Promise<PayrollDetail> => {
    loading.value = true;
    try {
      // نستخدم any هنا لتجنب تعارض الأنواع لأن الـ API يرجع wrapper
      const res: any = await api.get(`/payroll/${id}`);

      // التحقق من مكان البيانات: هل هي في res.data.data أم res.data مباشرة؟
      // بناءً على الـ JSON المرفق، البيانات داخل res.data.data
      const payload = res.data?.data || res.data;

      if (!payload) throw new Error("بيانات المسير غير متوفرة");

      return payload as PayrollDetail;
    } catch (e: any) {
      error.value = e.message;
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
    exportData,
    fetchById,
    reset,
  };
});
