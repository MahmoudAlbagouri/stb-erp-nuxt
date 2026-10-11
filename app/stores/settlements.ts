import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Settlement,
  SettlementPreview,
  ConfirmSettlementPayload,
} from "@/types";

export type { DisbursedByUser } from "@/types";

/** حقول الصرف أصبحت جزءاً من Settlement نفسه — الاسم باقٍ للتوافق */
export type SettlementWithDisbursement = Settlement;

export const useSettlementsStore = defineStore("settlements", () => {
  const api = useApi();

  // ✅ استخدام النوع المحدث
  const settlements = ref<SettlementWithDisbursement[]>([]);
  const loading = ref(false);
  const calculating = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<SettlementWithDisbursement[]>("/settlements");
      settlements.value = res.data;
    } catch (e) {
      console.error("Failed to fetch settlements:", e);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const calculate = async (employeeId: string): Promise<SettlementPreview> => {
    calculating.value = true;
    try {
      const res = await api.post<SettlementPreview>(
        `/settlements/calculate/${employeeId}`,
      );
      return res.data;
    } finally {
      calculating.value = false;
    }
  };

  const confirm = async (
    payload: ConfirmSettlementPayload,
  ): Promise<SettlementWithDisbursement> => {
    const res = await api.post<SettlementWithDisbursement>(
      "/settlements/confirm",
      payload,
    );
    settlements.value.unshift(res.data);
    return res.data;
  };

  // ✅ دالة جديدة لتأكيد الصرف
  const disburse = async (id: string): Promise<SettlementWithDisbursement> => {
    const res = await api.patch<SettlementWithDisbursement>(
      `/settlements/${id}/disburse`,
    );
    const updated = res.data;

    // تحديث السجل في القائمة المحلية
    const idx = settlements.value.findIndex((s) => s.id === id);
    if (idx !== -1) {
      settlements.value[idx] = updated;
    }
    return updated;
  };

  const getByEmployee = async (
    employeeId: string,
  ): Promise<SettlementWithDisbursement | null> => {
    try {
      const res = await api.get<SettlementWithDisbursement>(
        `/settlements/employee/${employeeId}`,
      );
      return res.data;
    } catch {
      return null;
    }
  };

  const exportData = async (type: "excel" | "pdf") => {
    await api.download(
      `/settlements/export/${type}`,
      `settlements_report_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  const reset = () => {
    settlements.value = [];
    loading.value = false;
    calculating.value = false;
  };

  return {
    settlements,
    loading,
    calculating,
    fetchAll,
    calculate,
    confirm,
    disburse, // ✅ تصدير الدالة الجديدة
    getByEmployee,
    exportData,
    reset,
  };
});
