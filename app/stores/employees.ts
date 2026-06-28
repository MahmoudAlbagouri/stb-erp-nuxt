// stores/employees.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from "@/types";

export const useEmployeesStore = defineStore("employees", () => {
  const api = useApi();

  const employees = ref<Employee[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      // الآن TypeScript يعرف أن res هو ApiResponse<Employee[]>
      const res = await api.get<Employee[]>("/employees");
      employees.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const getById = async (id: string) => {
    const res = await api.get<Employee>(`/employees/${id}`);
    return res.data;
  };

  const create = async (payload: CreateEmployeePayload) => {
    const cleanPayload = { ...payload };
    delete (cleanPayload as any).employeeCode;
    const res = await api.post<Employee>("/employees", cleanPayload);
    employees.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: UpdateEmployeePayload) => {
    const cleanPayload = { ...payload };
    delete (cleanPayload as any).employeeCode;
    const res = await api.patch<Employee>(`/employees/${id}`, cleanPayload);
    const idx = employees.value.findIndex((e: Employee) => e.id === id);
    if (idx !== -1) employees.value[idx] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/employees/${id}`);
    employees.value = employees.value.filter((e: Employee) => e.id !== id);
  };

  const exportData = async (type: "excel" | "pdf") => {
    try {
      // هنا TypeScript يعرف أن النتيجة Blob مباشرة
      const blob = await api.get<Blob>(
        `/employees/export/${type}`,
        true,
        "blob",
      );

      if (!blob || blob.size === 0) {
        throw new Error("الملف المستلم فارغ أو تالف");
      }

      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `employees_report_${new Date().toISOString().split("T")[0]}.${extension}`;

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
    employees.value = [];
    loading.value = false;
    error.value = null;
  };

  return {
    employees,
    loading,
    error,
    fetchAll,
    getById,
    create,
    update,
    remove,
    exportData,
    reset, // ✅ تم التصدير
  };
});
