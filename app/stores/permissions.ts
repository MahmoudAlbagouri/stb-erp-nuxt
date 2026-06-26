// stores/permissions.ts
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import { ref } from "vue";

// تعريف النوع محلياً لضمان التطابق مع الـ API Response
export interface Permission {
  id: string;
  name: string;
  displayNameAr: string;
  scope: "system" | "tenant";
  tenantId: string | null;
}

export interface CreatePermissionPayload {
  name: string;
  displayNameAr?: string; // اختياري حسب الحاجة
}

export const usePermissionsStore = defineStore("permissions", () => {
  const api = useApi();

  const permissions = ref<Permission[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      // تأكد أن المسار صحيح بناءً على إعدادات axios base URL
      const res = await api.get<{ data: Permission[] }>("/permissions");
      // التعامل مع الـ response wrapper إذا كان موجوداً
      permissions.value = res.data.data || res.data;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message;
    } finally {
      loading.value = false;
    }
  };

  const getById = async (id: string) => {
    const res = await api.get<{ data: Permission }>(`/permissions/${id}`);
    return res.data.data || res.data;
  };

  const create = async (payload: CreatePermissionPayload) => {
    const res = await api.post<{ data: Permission }>("/permissions", payload);
    const newPerm = res.data.data || res.data;
    permissions.value.unshift(newPerm);
    return newPerm;
  };

  const update = async (
    id: string,
    payload: Partial<CreatePermissionPayload>,
  ) => {
    const res = await api.patch<{ data: Permission }>(
      `/permissions/${id}`,
      payload,
    );
    const updatedPerm = res.data.data || res.data;
    const idx = permissions.value.findIndex((p) => p.id === id);
    if (idx !== -1) permissions.value[idx] = updatedPerm;
    return updatedPerm;
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
