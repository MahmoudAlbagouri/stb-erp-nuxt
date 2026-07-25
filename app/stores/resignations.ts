// stores/resignations.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export enum ResignationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export interface ResignationRequest {
  id: string;
  employeeId: string;
  requestDate: string;
  lastWorkingDay: string;
  reason: string;
  status: ResignationStatus;
  managerNotes?: string;
  decisionDate?: string;
  createdAt: string;
  employee?: {
    id: string;
    fullName: string;
    employeeCode: string;
  };
}

export const useResignationStore = defineStore("resignations", () => {
  const api = useApi();
  const requests = ref<ResignationRequest[]>([]);
  const loading = ref(false);

  // ✅ جلب جميع الطلبات (للمدراء)
  const fetchAll = async (status?: ResignationStatus) => {
    loading.value = true;
    try {
      const res = await api.get<ResignationRequest[]>(
        `/resignations${status ? `?status=${status}` : ""}`,
      );
      requests.value = res.data;
    } catch (error) {
      console.error("Failed to fetch all resignations:", error);
    } finally {
      loading.value = false;
    }
  };

  // ✅ جلب طلبات الموظف الحالي فقط (المسار الجديد)
  const fetchMyRequests = async () => {
    loading.value = true;
    try {
      const res = await api.get<ResignationRequest[]>(
        "/resignations/my-requests",
      );
      requests.value = res.data;
    } catch (error) {
      console.error("Failed to fetch my requests:", error);
    } finally {
      loading.value = false;
    }
  };

  const create = async (data: { lastWorkingDay: string; reason: string }) => {
    const res = await api.post<ResignationRequest>(
      "/resignations/my-request",
      data,
    );
    await fetchMyRequests(); // تحديث قائمة طلباتي بعد الإضافة
    return res.data;
  };

  const cancelMyRequest = async () => {
    const res = await api.post<ResignationRequest>(
      "/resignations/my-request/cancel",
    );
    await fetchMyRequests(); // تحديث القائمة بعد الإلغاء
    return res.data;
  };

  const makeDecision = async (
    id: string,
    newStatus: ResignationStatus.APPROVED | ResignationStatus.REJECTED,
    managerNotes?: string,
  ) => {
    const res = await api.post<ResignationRequest>(
      `/resignations/${id}/decision`,
      { newStatus, managerNotes },
    );
    await fetchAll(); // المدير يحتاج تحديث القائمة الكاملة
    return res.data;
  };

  const reset = () => {
    requests.value = [];
    loading.value = false;
  };

  return {
    requests,
    loading,
    fetchAll,
    fetchMyRequests, // ✅ تصدير الدالة الجديدة
    create,
    cancelMyRequest,
    makeDecision,
    reset,
  };
});
