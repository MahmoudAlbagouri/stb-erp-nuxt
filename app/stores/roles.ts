// stores/roles.ts
import { defineStore } from "pinia";
import { useApi } from "~/composables/useApi";
import type { Role, CreateRolePayload, UpdateRolePayload } from "@/types";
import { ref } from "vue";

export const useRolesStore = defineStore("roles", () => {
  const api = useApi();

  const roles = ref<Role[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<Role[]>("/roles");
      roles.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const getById = async (id: string) => {
    const res = await api.get<Role>(`/roles/${id}`);
    return res.data;
  };

  const create = async (payload: CreateRolePayload) => {
    const res = await api.post<Role>("/roles", payload);
    roles.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: UpdateRolePayload) => {
    const res = await api.patch<Role>(`/roles/${id}`, payload);
    const idx = roles.value.findIndex((r) => r.id === id);
    if (idx !== -1) roles.value[idx] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/roles/${id}`);
    roles.value = roles.value.filter((r) => r.id !== id);
  };

  // ✅ دالة تفريغ المتجر (للاستخدام عند تسجيل الخروج)
  const reset = () => {
    roles.value = [];
    loading.value = false;
    error.value = null;
  };

  return {
    roles,
    loading,
    error,
    fetchAll,
    getById,
    create,
    update,
    remove,
    reset, // ✅ تم التصدير
  };
});
