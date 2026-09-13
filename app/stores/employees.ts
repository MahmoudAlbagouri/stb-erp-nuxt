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
  // ✅ حالة جديدة لتخزين نتائج الفلترة القادمة من السيرفر
  const filteredEmployees = ref<Employee[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<Employee[]>("/employees");
      employees.value = res.data;
      // عند جلب الكل، نفترض أن القائمة المفلترة هي نفسها الكل مبدئياً
      filteredEmployees.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  // ✅ دالة جديدة لجلب البيانات المفلترة من الـ Backend
  const fetchFilteredFromBackend = async (filters: Record<string, any>) => {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          params.append(k, String(v));
        }
      });

      const queryString = params.toString();
      // نستخدم endpoint الفلترة الموجود في الـ Controller
      const url = queryString
        ? `/employees/filter?${queryString}`
        : "/employees/filter";

      const res = await api.get<Employee[]>(url);
      filteredEmployees.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e.message;
      filteredEmployees.value = []; // تفريغ القائمة في حالة الخطأ
      throw e;
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
    // تحديث القائمة المفلترة أيضاً
    filteredEmployees.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: UpdateEmployeePayload) => {
    const cleanPayload = { ...payload };
    delete (cleanPayload as any).employeeCode;
    const res = await api.patch<Employee>(`/employees/${id}`, cleanPayload);

    const idx = employees.value.findIndex((e: Employee) => e.id === id);
    if (idx !== -1) employees.value[idx] = res.data;

    const idxFiltered = filteredEmployees.value.findIndex(
      (e: Employee) => e.id === id,
    );
    if (idxFiltered !== -1) filteredEmployees.value[idxFiltered] = res.data;

    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/employees/${id}`);
    employees.value = employees.value.filter((e: Employee) => e.id !== id);
    filteredEmployees.value = filteredEmployees.value.filter(
      (e: Employee) => e.id !== id,
    );
  };

  const exportData = async (type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(
        `/employees/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
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

  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(
        `/employees/${id}/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `employee_profile_${id}_${new Date().toISOString().split("T")[0]}.${extension}`;
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

  const exportFiltered = async (
    type: "excel" | "pdf",
    filters: Record<string, any>,
  ) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "")
          params.append(k, String(v));
      });
      const blob = await api.get<Blob>(
        `/employees/export-filtered/${type}?${params.toString()}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `employees_filtered_${new Date().toISOString().split("T")[0]}.${extension}`;
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
      console.error("Filtered Export Error:", e);
      throw e;
    }
  };

  const reset = () => {
    employees.value = [];
    filteredEmployees.value = [];
    loading.value = false;
    error.value = null;
  };

  return {
    employees,
    filteredEmployees, // ✅ تصدير الحالة الجديدة
    loading,
    error,
    fetchAll,
    fetchFilteredFromBackend, // ✅ تصدير الدالة الجديدة
    getById,
    create,
    update,
    remove,
    exportData,
    exportSingle,
    exportFiltered,
    reset,
  };
});
