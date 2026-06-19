// stores/contracts.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Contract,
  CreateContractPayload,
  UpdateContractPayload,
} from "../types";

export const useContractsStore = defineStore("contracts", () => {
  const api = useApi();

  const contracts = ref<Contract[]>([]);
  const loading = ref(false);

  // جلب جميع العقود
  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Contract[]>("/contracts");
      contracts.value = res.data;
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    } finally {
      loading.value = false;
    }
  };

  // إنشاء عقد جديد
  const create = async (payload: CreateContractPayload) => {
    const res = await api.post<Contract>("/contracts", payload);
    await fetchAll(); // تحديث القائمة
    return res.data;
  };

  // تحديث عقد
  const update = async (id: string, payload: UpdateContractPayload) => {
    const res = await api.patch<Contract>(`/contracts/${id}`, payload);
    await fetchAll();
    return res.data;
  };

  // حذف عقد
  const remove = async (id: string) => {
    await api.del(`/contracts/${id}`);
    contracts.value = contracts.value.filter((c) => c.id !== id);
  };

  return {
    contracts,
    loading,
    fetchAll,
    create,
    update,
    remove,
  };
});
