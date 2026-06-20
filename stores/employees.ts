// stores/employees.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useRuntimeConfig } from "#imports";
import { useApi } from "../composables/useApi";
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from "../types";

export const useEmployeesStore = defineStore("employees", () => {
  const api = useApi();
  const config = useRuntimeConfig();

  const employees = ref<Employee[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
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

  // ✅ تنظيف الـ Payload قبل الإرسال لمنع إرسال employeeCode فارغ
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
      const token = localStorage.getItem("stb_access_token");
      const baseUrl = (config.public.apiBase as string).replace(/\/$/, "");
      const url = `${baseUrl}/employees/export/${type}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:
            type === "excel"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/pdf",
        },
      });

      if (!response.ok) {
        throw new Error(`فشل في تحميل التقرير (${response.status})`);
      }

      const blob = await response.blob();
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `employees_report_${new Date().toISOString().split("T")[0]}.${extension}`;

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (e: any) {
      console.error("Export Error:", e);
      throw e;
    }
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
  };
});
