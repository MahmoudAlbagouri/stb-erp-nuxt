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

  // ✅ دالة تصدير التقارير (Excel / PDF)
  const exportData = async (type: "excel" | "pdf") => {
    try {
      // هنا TypeScript يعرف أن النتيجة Blob مباشرة
      const blob = await api.get<Blob>(
        `/settlements/export/${type}`,
        true,
        "blob",
      );

      if (!blob || blob.size === 0) {
        throw new Error("الملف المستلم فارغ أو تالف");
      }

      const extension = type === "excel" ? "xlsx" : "pdf";
      const fileName = `settlements_report_${new Date().toISOString().split("T")[0]}.${extension}`;

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
    exportData, // ✅ تم التصدير
    reset,
  };
});
