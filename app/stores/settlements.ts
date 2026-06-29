// stores/settlements.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Settlement,
  SettlementPreview,
  ConfirmSettlementPayload,
} from "@/types";

export const useSettlementsStore = defineStore("settlements", () => {
  const api = useApi();

  const settlements = ref<Settlement[]>([]);
  const loading = ref(false);
  const calculating = ref(false);

  // ── جلب كل التسويات المؤرشفة ─────────────────────────────────────────────
  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<Settlement[]>("/settlements");
      settlements.value = res.data;
    } catch (e: any) {
      console.error("Failed to fetch settlements:", e);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  // ── حساب مستحقات موظف (للعرض فقط، لا يُحفظ) ─────────────────────────────
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

  // ── تأكيد التسوية وأرشفتها ────────────────────────────────────────────────
  const confirm = async (
    payload: ConfirmSettlementPayload,
  ): Promise<Settlement> => {
    const res = await api.post<Settlement>("/settlements/confirm", payload);
    // أضف السجل الجديد في أول القائمة بدون إعادة جلب كاملة
    settlements.value.unshift(res.data);
    return res.data;
  };

  // ── جلب تسوية موظف محدد ──────────────────────────────────────────────────
  const getByEmployee = async (
    employeeId: string,
  ): Promise<Settlement | null> => {
    try {
      const res = await api.get<Settlement>(
        `/settlements/employee/${employeeId}`,
      );
      return res.data;
    } catch {
      return null;
    }
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
    getByEmployee,
    reset,
  };
});
