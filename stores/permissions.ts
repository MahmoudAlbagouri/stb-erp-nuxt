// stores/permissions.ts
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type { Permission, CreatePermissionPayload } from "../types";
import { ref } from "vue";

export const usePermissionsStore = defineStore("permissions", () => {
  const api = useApi();

  const permissions = ref<Permission[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<Permission[]>("/permissions");
      permissions.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const getById = async (id: string) => {
    const res = await api.get<Permission>(`/permissions/${id}`);
    return res.data;
  };

  const create = async (payload: CreatePermissionPayload) => {
    const res = await api.post<Permission>("/permissions", payload);
    permissions.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, name: string) => {
    const res = await api.patch<Permission>(`/permissions/${id}`, { name });
    const idx = permissions.value.findIndex((p) => p.id === id);
    if (idx !== -1) permissions.value[idx] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/permissions/${id}`);
    permissions.value = permissions.value.filter((p) => p.id !== id);
  };

  return {
    permissions,
    loading,
    error,
    fetchAll,
    getById,
    create,
    update,
    remove,
  };
});
