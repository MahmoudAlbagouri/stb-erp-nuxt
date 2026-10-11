// stores/leaves.ts
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type {
  LeaveRequest,
  LeaveBalance,
  CreateLeavePayload,
  SetBalancePayload,
  EmployeeLeaveSummary,
} from "@/types";
import { ref } from "vue";

export const useLeavesStore = defineStore("leaves", () => {
  const api = useApi();
  const requests = ref<LeaveRequest[]>([]);
  const balances = ref<LeaveBalance[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      const res = await api.get<LeaveRequest[]>("/leaves");
      requests.value = res.data;
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      loading.value = false;
    }
  };

  const createMyLeave = async (payload: CreateLeavePayload) => {
    const res = await api.post<LeaveRequest>("/leaves/my-leaves", payload);
    await fetchAll();
    return res.data;
  };

  const createAdminLeave = async (
    employeeId: string,
    payload: CreateLeavePayload,
  ) => {
    const res = await api.post<LeaveRequest>(
      `/leaves/admin/${employeeId}`,
      payload,
    );
    await fetchAll();
    return res.data;
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const res = await api.patch<LeaveRequest>(`/leaves/${id}/status`, {
      status,
    });
    await fetchAll();
    return res.data;
  };

  const setBalance = async (payload: SetBalancePayload) => {
    const res = await api.post<LeaveBalance>("/leaves/balance", payload);
    return res.data;
  };

  const getAccrualDetails = async (employeeId: string) => {
    try {
      const res = await api.get(`/leaves/accrual/${employeeId}`);
      return res.data;
    } catch (error) {
      console.error("Failed to fetch accrual details:", error);
      return null;
    }
  };

  // ✅ ملخص إجازات الموظف لصفحة تفاصيل الموظف
  // (الفعلي المستهلك + الرصيد المتبقي + عدد أيام كل طلب)
  const getEmployeeLeaveSummary = async (employeeId: string) => {
    try {
      const res = await api.get<EmployeeLeaveSummary>(
        `/leaves/summary/${employeeId}`,
      );
      return res.data;
    } catch (error) {
      console.error("Failed to fetch employee leave summary:", error);
      return null;
    }
  };

  // ✅ التصدير الجماعي
  const exportData = async (type: "excel" | "pdf") => {
    await api.download(
      `/leaves/export/${type}`,
      `leaves_report_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  // ✅ التصدير الفردي
  const exportSingle = async (id: string, type: "excel" | "pdf") => {
    await api.download(
      `/leaves/${id}/export/${type}`,
      `leave_${id}_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  const reset = () => {
    requests.value = [];
    balances.value = [];
    loading.value = false;
  };

  return {
    requests,
    balances,
    loading,
    fetchAll,
    createMyLeave,
    createAdminLeave,
    updateStatus,
    setBalance,
    getAccrualDetails,
    getEmployeeLeaveSummary,
    exportData,
    exportSingle,
    reset,
  };
});
