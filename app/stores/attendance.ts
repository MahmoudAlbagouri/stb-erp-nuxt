// stores/attendance.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  BiometricDevice,
  CreateDevicePayload,
  DeviceStatus,
} from "@/types";

export type PunchType =
  | "check_in"
  | "check_out"
  | "break_out"
  | "break_in"
  | "overtime_in"
  | "overtime_out"
  | "leave";

export interface AttendanceLog {
  id: string;
  deviceUserId: string;
  employeeId?: string;
  employee?: {
    id: string;
    fullName: string;
    employeeCode: string;
  };
  deviceId?: string;
  device?: {
    id: string;
    alias?: string;
    serialNumber: string;
    location?: string;
  };
  punchTime: string;
  punchType: PunchType;
  verifyMode: string;
  deviceSn?: string;
  isManualEntry: boolean;
  isEdited: boolean;
  editedByName?: string;
  editedAt?: string;
  createdByName?: string;
  originalPunchTime?: string;
  leaveReason?: string;
  workHours?: number;
  overtimeHours?: number;
  createdAt: string;
}

export interface AttendanceLogFilters {
  from?: string;
  to?: string;
  punchType?: PunchType;
  employeeId?: string;
  employeeName?: string;
  page?: number;
  limit?: number;
}

export interface CreateManualLogPayload {
  employeeId: string;
  punchTime: string; // ISO datetime
  punchType: PunchType;
  leaveReason?: string;
}

export interface UpdateLogPayload {
  punchTime: string;
  punchType?: PunchType;
  leaveReason?: string;
}

export const useAttendanceStore = defineStore("attendance", () => {
  const api = useApi();

  const devices = ref<BiometricDevice[]>([]);
  const logs = ref<AttendanceLog[]>([]);
  const logsTotal = ref(0);
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

  const pushUserToDevice = async (deviceId: string, employeeId: string) => {
    const res = await api.post(
      `/attendance/devices/${deviceId}/push-user/${employeeId}`,
      {},
    );
    return res.data;
  };

  // --- Logs Management ---

  const buildQuery = (filters?: AttendanceLogFilters): string => {
    const params = new URLSearchParams();
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.punchType) params.set("punchType", filters.punchType);
    if (filters?.employeeId) params.set("employeeId", filters.employeeId);
    if (filters?.employeeName) params.set("employeeName", filters.employeeName);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    return params.toString();
  };

  const fetchLogs = async (filters?: AttendanceLogFilters) => {
    loading.value = true;
    try {
      const qs = buildQuery(filters);
      const res = await api.get<any>(`/attendance/logs${qs ? `?${qs}` : ""}`);
      logs.value = res.data.data || [];
      logsTotal.value = res.data.total || 0;
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      loading.value = false;
    }
  };

  // ✅ إضافة بصمة/إجازة يدوية (بشرط ألا يتجاوز الفارق 24 ساعة — يتحقق منه الباك اند)
  const createManualLog = async (payload: CreateManualLogPayload) => {
    const res = await api.post<AttendanceLog>("/attendance/logs", payload);
    return res.data;
  };

  // ✅ تعديل بصمة موجودة (مرة واحدة فقط، خلال 24 ساعة من وقتها الأصلي)
  const updateLog = async (id: string, payload: UpdateLogPayload) => {
    const res = await api.patch<AttendanceLog>(
      `/attendance/logs/${id}`,
      payload,
    );
    const idx = logs.value.findIndex((l) => l.id === id);
    if (idx !== -1) logs.value[idx] = res.data;
    return res.data;
  };

  // ✅ تصدير نتائج الفلترة الحالية PDF أو Excel
  const exportLogs = async (
    filters: AttendanceLogFilters | undefined,
    type: "excel" | "pdf",
  ) => {
    const qs = buildQuery(filters);
    const blob = await api.get<Blob>(
      `/attendance/logs/export/${type}${qs ? `?${qs}` : ""}`,
      true,
      "blob",
    );
    if (!blob || blob.size === 0) throw new Error("الملف المستلم فارغ أو تالف");

    const extension = type === "excel" ? "xlsx" : "pdf";
    const fileName = `attendance_logs_${new Date().toISOString().split("T")[0]}.${extension}`;
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
  };

  const reset = () => {
    devices.value = [];
    logs.value = [];
    logsTotal.value = 0;
    loading.value = false;
  };

  return {
    devices,
    logs,
    logsTotal,
    loading,
    fetchDevices,
    createDevice,
    updateDeviceStatus,
    deleteDevice,
    pushUserToDevice,
    fetchLogs,
    createManualLog,
    updateLog,
    exportLogs,
    reset,
  };
});
