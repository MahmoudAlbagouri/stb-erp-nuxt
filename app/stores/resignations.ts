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

  const fetchAll = async (status?: ResignationStatus) => {
    loading.value = true;
    try {
      const res = await api.get<ResignationRequest[]>(
        `/resignations${status ? `?status=${status}` : ""}`,
      );
      requests.value = res.data;
    } finally {
      loading.value = false;
    }
  };

  const create = async (data: Partial<ResignationRequest>) => {
    const res = await api.post<ResignationRequest>(
      "/resignations/my-request",
      data,
    );
    requests.value.unshift(res.data);
    return res.data;
  };

  const cancelMyRequest = async () => {
    const res = await api.post<ResignationRequest>(
      "/resignations/my-request/cancel",
    );
    const index = requests.value.findIndex((r) => r.id === res.data.id);
    if (index !== -1) requests.value[index] = res.data;
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
    const index = requests.value.findIndex((r) => r.id === id);
    if (index !== -1) requests.value[index] = res.data;
    return res.data;
  };

  return {
    requests,
    loading,
    fetchAll,
    create,
    cancelMyRequest,
    makeDecision,
  };
});
