// stores/tenants.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface Tenant {
  id: string;
  companyName: string;
  logo_url: string | null;
  domain: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  status: "active" | "trial" | "inactive";
  language: string;
  timezone: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const useTenantStore = defineStore("tenants", () => {
  const api = useApi();
  const tenants = ref<Tenant[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // جلب كل الشركات
  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      // المسار حسب الـ API المرفق: GET /tenants
      const res = await api.get<Tenant[]>("/tenants");
      tenants.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  // إضافة شركة جديدة
  const create = async (data: Partial<Tenant>) => {
    // POST /tenants
    const res = await api.post<Tenant>("/tenants", data);
    tenants.value.unshift(res.data);
    return res.data;
  };

  // تحديث شركة
  const update = async (id: string, data: Partial<Tenant>) => {
    // PATCH /tenants/:id
    const res = await api.patch<Tenant>(`/tenants/${id}`, data);
    const index = tenants.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      tenants.value[index] = res.data;
    }
    return res.data;
  };

  // حذف شركة
  const deleteTenant = async (id: string) => {
    // DELETE /tenants/:id
    await api.del(`/tenants/${id}`);
    tenants.value = tenants.value.filter((t) => t.id !== id);
  };

  const reset = () => {
    tenants.value = [];
    loading.value = false;
    error.value = null;
  };

  return {
    tenants,
    loading,
    error,
    fetchAll,
    create,
    update,
    delete: deleteTenant, // rename for clarity in component
    reset,
  };
});
