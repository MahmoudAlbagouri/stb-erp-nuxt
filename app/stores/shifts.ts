// stores/shifts.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface Shift {
  id: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  gracePeriod: number;
  tenantId: string;
  createdAt: string;
}

export interface CreateShiftPayload {
  name: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
}

export type UpdateShiftPayload = Partial<CreateShiftPayload>;

export const useShiftsStore = defineStore("shifts", () => {
  const api = useApi();

  const shifts = ref<Shift[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<Shift[]>("/shifts");
      shifts.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const create = async (payload: CreateShiftPayload) => {
    const res = await api.post<Shift>("/shifts", payload);
    shifts.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: UpdateShiftPayload) => {
    const res = await api.patch<Shift>(`/shifts/${id}`, payload);
    const idx = shifts.value.findIndex((s) => s.id === id);
    if (idx !== -1) shifts.value[idx] = res.data;
    return res.data;
  };

  // ⚠️ لا يوجد DELETE /shifts/:id في الـ Controller حالياً، فمفيش دالة remove هنا.
  // لو أضفتها في الباك اند، ضيف هنا:
  // const remove = async (id: string) => {
  //   await api.del(`/shifts/${id}`);
  //   shifts.value = shifts.value.filter((s) => s.id !== id);
  // };

  const reset = () => {
    shifts.value = [];
    loading.value = false;
    error.value = null;
  };

  return { shifts, loading, error, fetchAll, create, update, reset };
});
