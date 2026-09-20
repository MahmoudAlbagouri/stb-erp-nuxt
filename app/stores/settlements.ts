import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Settlement,
  SettlementPreview,
  ConfirmSettlementPayload,
} from "@/types";

// ✅ تعريف واجهة المستخدم الذي قام بالصرف (متطابقة مع Payroll)
export interface DisbursedByUser {
  id: string;
  username: string;
  email?: string;
}

// ✅ تحديث نوع Settlement ليشمل حقول الصرف
export interface SettlementWithDisbursement extends Settlement {
  isDisbursed?: boolean;
  disbursedAt?: string;
  disbursedBy?: DisbursedByUser;
}

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
    } catch (e: any) {
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
    try {
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
    disburse, // ✅ تصدير الدالة الجديدة
    getByEmployee,
    exportData,
    reset,
  };
});
