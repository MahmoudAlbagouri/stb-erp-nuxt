// stores/eos.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export enum EOSReason {
  RESIGNATION = "استقالة",
  TERMINATION = "فسخ عقد",
  CONTRACT_END = "انتهاء عقد",
  // RETIREMENT = "تقاعد",
  OTHER = "أخرى",
}

import type { EndOfService } from "@/types";

export type { EndOfService };

export const useEOSStore = defineStore("eos", () => {
  const api = useApi();
  const records = ref<EndOfService[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<EndOfService[]>("/eos");
      records.value = res.data;
    } finally {
      loading.value = false;
    }
  };

  const create = async (data: Partial<EndOfService>) => {
    // ✅ إرسال البيانات كما هي، الباك-إند الآن يقبل القيم العربية مباشرة
    const res = await api.post<EndOfService>("/eos", data);
    records.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, data: Partial<EndOfService>) => {
    const res = await api.patch<EndOfService>(`/eos/${id}`, data);
    const index = records.value.findIndex((r) => r.id === id);
    if (index !== -1) records.value[index] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/eos/${id}`);
    records.value = records.value.filter((r) => r.id !== id);
  };

  const reset = () => {
    records.value = [];
    loading.value = false;
  };

  return { records, loading, fetchAll, create, update, remove, reset };
});
