// stores/departments.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface Department {
  id: string;
  name: string;
  tenantId: string;
  createdAt: string;
  employeesCount?: number;
}

export interface CreateDepartmentPayload {
  name: string;
}

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export const useDepartmentsStore = defineStore("departments", () => {
  const api = useApi();

  const departments = ref<Department[]>([]);
  const departmentsWithCounts = ref<Department[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<Department[]>("/departments");
      departments.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const fetchStats = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<Department[]>("/departments/stats");
      departmentsWithCounts.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const create = async (payload: CreateDepartmentPayload) => {
    const res = await api.post<Department>("/departments", payload);
    departments.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: UpdateDepartmentPayload) => {
    const res = await api.patch<Department>(`/departments/${id}`, payload);
    const idx = departments.value.findIndex((d) => d.id === id);
    if (idx !== -1) departments.value[idx] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/departments/${id}`);
    departments.value = departments.value.filter((d) => d.id !== id);
  };

  const reset = () => {
    departments.value = [];
    departmentsWithCounts.value = [];
    loading.value = false;
    error.value = null;
  };

  return {
    departments,
    departmentsWithCounts,
    loading,
    error,
    fetchAll,
    fetchStats,
    create,
    update,
    remove,
    reset,
  };
});
