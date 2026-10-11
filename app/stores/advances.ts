// stores/advances.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Advance, AdvanceStatus, CreateAdvancePayload } from "@/types";

export type { CreateAdvancePayload };

export const useAdvancesStore = defineStore("advances", () => {
  const api = useApi();
  const advances = ref<Advance[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Advance[]>("/advances");
      advances.value = res.data;
    } catch (error) {
      console.error("Failed to fetch advances:", error);
    } finally {
      loading.value = false;
    }
  };

  const createMyAdvance = async (payload: CreateAdvancePayload) => {
    const res = await api.post<Advance>("/advances/my-advances", payload);
    await fetchAll();
    return res.data;
  };

  const createForEmployee = async (
    employeeId: string,
    payload: CreateAdvancePayload,
  ) => {
    const res = await api.post<Advance>(
      `/advances/admin/${employeeId}`,
      payload,
    );
    await fetchAll();
    return res.data;
  };

  const updateStatus = async (
    id: string,
    status: AdvanceStatus,
  ) => {
    const res = await api.patch<Advance>(`/advances/${id}/status`, { status });
    await fetchAll();
    return res.data;
  };

  // ✅ تأكيد الصرف الاستثنائي المباشر (Off-Cycle Disbursement) — تسليم
  // مبلغ السلفة للموظف فعلياً خارج دورة المسير. لا يغيّر موعد أو قيمة
  // خصم السداد الشهري في المسير.
  const disburseAdvance = async (id: string) => {
    const res = await api.patch<Advance>(`/advances/${id}/disburse`);
    const idx = advances.value.findIndex((a) => a.id === id);
    if (idx !== -1)
      advances.value[idx] = { ...advances.value[idx], ...res.data };
    return res.data;
  };

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    await api.download(
      `/advances/export/${type}`,
      `advances_report_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  // ✅ التصدير الفردي
  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    await api.download(
      `/advances/${id}/export/${type}`,
      `advance_${id}_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  const reset = () => {
    advances.value = [];
    loading.value = false;
  };

  return {
    advances,
    loading,
    fetchAll,
    createMyAdvance,
    createForEmployee,
    updateStatus,
    disburseAdvance, // ✅ تصدير الدالة الجديدة
    exportData,
    exportSingle,
    reset,
  };
});
