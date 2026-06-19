// stores/advances.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Advance, AdvanceStatus, CreateAdvancePayload } from "../types";

export const useAdvancesStore = defineStore("advances", () => {
  const api = useApi();

  const advances = ref<Advance[]>([]);
  const loading = ref(false);

  // جلب جميع السلف
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

  // ✅ جديد: تقديم سلفة للموظف الحالي (Self-Service)
  const createMyAdvance = async (payload: CreateAdvancePayload) => {
    const res = await api.post<Advance>("/advances/my-advances", payload);
    await fetchAll(); // تحديث القائمة بعد الإضافة
    return res.data;
  };

  // تقديم سلفة لموظف آخر (Admin)
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

  // تحديث حالة السلفة (موافقة/رفض)
  const updateStatus = async (id: string, status: AdvanceStatus) => {
    const res = await api.patch<Advance>(`/advances/${id}/status`, { status });
    await fetchAll();
    return res.data;
  };

  return {
    advances,
    loading,
    fetchAll,
    createMyAdvance, // تصدير الدالة الجديدة
    createForEmployee,
    updateStatus,
  };
});
