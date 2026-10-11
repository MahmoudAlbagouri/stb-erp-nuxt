// stores/employees.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from "@/types";

/** فلاتر صفحة الموظفين (تُرسل كـ query params) */
export type EmployeeFilters = Record<string, QueryValue>;

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
    } catch (e) {
      error.value = getErrorMessage(e);
    } finally {
      loading.value = false;
    }
  };

  // ✅ دالة جديدة لجلب البيانات المفلترة من الـ Backend
  const fetchFilteredFromBackend = async (filters: EmployeeFilters) => {
    loading.value = true;
    error.value = null;
    try {
      // نستخدم endpoint الفلترة الموجود في الـ Controller
      const res = await api.get<Employee[]>(
        `/employees/filter${toQueryString(filters)}`,
      );
      filteredEmployees.value = res.data;
      return res.data;
    } catch (e) {
      error.value = getErrorMessage(e);
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
    // كود الموظف يولّده الباك إند
    const { employeeCode: _code, ...cleanPayload } = payload;
    const res = await api.post<Employee>("/employees", cleanPayload);
    employees.value.unshift(res.data);
    // تحديث القائمة المفلترة أيضاً
    filteredEmployees.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: UpdateEmployeePayload) => {
    const { employeeCode: _code, ...cleanPayload } = payload;
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
    await api.download(
      `/employees/export/${type}`,
      `employees_report_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    await api.download(
      `/employees/${id}/export/${type}`,
      `employee_profile_${id}_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  const exportFiltered = async (
    type: "excel" | "pdf",
    filters: EmployeeFilters,
  ) => {
    await api.download(
      `/employees/export-filtered/${type}${toQueryString(filters)}`,
      `employees_filtered_${todayStamp()}.${reportExtension(type)}`,
    );
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
