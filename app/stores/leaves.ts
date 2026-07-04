import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type {
  LeaveRequest,
  LeaveBalance,
  CreateLeavePayload,
  SetBalancePayload,
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
    reset,
  };
});
