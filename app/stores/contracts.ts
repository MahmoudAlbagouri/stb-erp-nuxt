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
    payload: CreateContractPayload & { attachmentPaths?: string[] },
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
    try {
      const blob = await api.get<Blob>(
        `/contracts/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `contracts_report_${new Date().toISOString().split("T")[0]}.${extension}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (e: any) {
      console.error("Export Error:", e);
      throw e;
    }
  };

  // ✅ دالة التصدير الفردي
  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    try {
      const blob = await api.get<Blob>(
        `/contracts/${id}/export/${type}`,
        true,
        "blob",
      );
      if (!blob || blob.size === 0)
        throw new Error("الملف المستلم فارغ أو تالف");
      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `contract_${id}_${new Date().toISOString().split("T")[0]}.${extension}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (e: any) {
      console.error("Single Export Error:", e);
      throw e;
    }
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
