// stores/employees.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from "../types";

export const useEmployeesStore = defineStore("employees", () => {
  const api = useApi();

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

  const create = async (payload: CreateEmployeePayload) => {
    const res = await api.post<Employee>("/employees", payload);
    employees.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: UpdateEmployeePayload) => {
    const res = await api.patch<Employee>(`/employees/${id}`, payload);
    const idx = employees.value.findIndex((e) => e.id === id);
    if (idx !== -1) employees.value[idx] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/employees/${id}`);
    employees.value = employees.value.filter((e) => e.id !== id);
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
  };
});
