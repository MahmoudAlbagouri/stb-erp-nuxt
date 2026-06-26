// stores/attendance.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "../composables/useApi";
import type {
  BiometricDevice,
  AttendanceLog,
  CreateDevicePayload,
  DeviceStatus,
} from "@/types";

export const useAttendanceStore = defineStore("attendance", () => {
  const api = useApi();

  const devices = ref<BiometricDevice[]>([]);
  const logs = ref<AttendanceLog[]>([]);
  const loading = ref(false);

  // --- Devices Management ---

  const fetchDevices = async () => {
    loading.value = true;
    try {
      const res = await api.get<BiometricDevice[]>("/attendance/devices");
      devices.value = res.data;
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      loading.value = false;
    }
  };

  const createDevice = async (payload: CreateDevicePayload) => {
    const res = await api.post<BiometricDevice>("/attendance/devices", payload);
    await fetchDevices();
    return res.data;
  };

  const updateDeviceStatus = async (id: string, status: DeviceStatus) => {
    const res = await api.patch<BiometricDevice>(`/attendance/devices/${id}`, {
      status,
    });
    await fetchDevices();
    return res.data;
  };

  const deleteDevice = async (id: string) => {
    await api.del(`/attendance/devices/${id}`);
    await fetchDevices();
  };

  // ✅ الدالة المحدثة: تقبل deviceId و employeeId فقط
  const pushUserToDevice = async (deviceId: string, employeeId: string) => {
    // الـ Backend سيستخرج البيانات من employeeId
    const res = await api.post(
      `/attendance/devices/${deviceId}/push-user/${employeeId}`,
      {},
    );
    return res.data;
  };

  // --- Logs Management ---

  const fetchLogs = async (params?: { from?: string; to?: string }) => {
    loading.value = true;
    try {
      let query = "/attendance/logs?";
      if (params?.from) query += `from=${params.from}&`;
      if (params?.to) query += `to=${params.to}&`;

      const res = await api.get<any>(query);
      logs.value = res.data.data || [];
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      loading.value = false;
    }
  };

  return {
    devices,
    logs,
    loading,
    fetchDevices,
    createDevice,
    updateDeviceStatus,
    deleteDevice,
    pushUserToDevice,
    fetchLogs,
  };
});
