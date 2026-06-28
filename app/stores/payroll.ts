// stores/payroll.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface Payroll {
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
  const payrolls = ref<Payroll[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // جلب كل المسيرات مع فلاتر اختيارية
  const fetchAll = async (year?: number, month?: number) => {
    loading.value = true;
    error.value = null;
    try {
      let url = "/payroll";
      const params = new URLSearchParams();
      if (year) params.append("year", String(year));
      if (month && year) params.append("month", String(month));

      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get<Payroll[]>(url);
      payrolls.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  // توليد مسير جديد
  const generate = async (month: number, year: number) => {
    const res = await api.post<Payroll>(`/payroll/generate/${month}/${year}`);
    payrolls.value.unshift(res.data);
    return res.data;
  };

  // التصدير (Excel / PDF)
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

  // ✅ دالة تفريغ المتجر (للاستخدام عند تسجيل الخروج)
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
    reset, // ✅ تم التصدير
  };
});
