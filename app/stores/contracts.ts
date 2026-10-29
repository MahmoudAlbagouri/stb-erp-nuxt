// stores/contracts.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Contract,
  CreateContractPayload,
  UpdateContractPayload,
} from "@/types";

export const useContractsStore = defineStore("contracts", () => {
  const api = useApi();
  const contracts = ref<Contract[]>([]);
  const loading = ref(false);

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

  const create = async (
    payload: CreateContractPayload,
  ) => {
    const res = await api.post<Contract>("/contracts", payload);
    await fetchAll();
    return res.data;
  };

  const update = async (id: string, payload: UpdateContractPayload) => {
    const res = await api.patch<Contract>(`/contracts/${id}`, payload);
    await fetchAll();
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/contracts/${id}`);
    contracts.value = contracts.value.filter((c) => c.id !== id);
  };

  // ✅ دالة التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    await api.download(
      `/contracts/export/${type}`,
      `contracts_report_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  // ✅ دالة التصدير الفردي
  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    await api.download(
      `/contracts/${id}/export/${type}`,
      `contract_${id}_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  const reset = () => {
    contracts.value = [];
    loading.value = false;
  };

  return {
    contracts,
    loading,
    fetchAll,
    create,
    update,
    remove,
    exportData,
    exportSingle,
    reset,
  };
});
