// stores/attendance.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  AttendanceLog,
  AttendanceSettings,
  BiometricDevice,
  CreateDevicePayload,
  DailySummaryRow,
  DeviceSetup,
  DeviceStatus,
  ImportMapping,
  ImportPreview,
  ImportResult,
  MonthlyReport,
  PublicHoliday,
  PunchType,
  UnlinkedPin,
  UpdateDevicePayload,
} from "@/types";

export type { AttendanceLog, PunchType };

export interface AttendanceLogFilters {
  from?: string;
  to?: string;
  punchType?: PunchType;
  employeeId?: string;
  employeeName?: string;
  page?: number;
  limit?: number;
}

/** عدد السجلات في الصفحة */
export const ATTENDANCE_PAGE_SIZE = 50;

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

export interface HolidayPayload {
  name: string;
  startDate: string;
  endDate?: string;
}

export const useAttendanceStore = defineStore("attendance", () => {
  const api = useApi();

  const devices = ref<BiometricDevice[]>([]);
  const logs = ref<AttendanceLog[]>([]);
  const logsTotal = ref(0);
  const logsPage = ref(1);
  const loading = ref(false);
  const unlinkedPins = ref<UnlinkedPin[]>([]);

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

  /** الجهاز الجديد، ومعه مفتاحه (Hikvision / API) مرة واحدة */
  const createDevice = async (payload: CreateDevicePayload) => {
    const res = await api.post<BiometricDevice>("/attendance/devices", payload);
    await fetchDevices();
    return res.data;
  };

  const updateDevice = async (id: string, payload: UpdateDevicePayload) => {
    const res = await api.patch<BiometricDevice>(
      `/attendance/devices/${id}`,
      payload,
    );
    await fetchDevices();
    return res.data;
  };

  const updateDeviceStatus = (id: string, status: DeviceStatus) =>
    updateDevice(id, { status });

  const deleteDevice = async (id: string) => {
    await api.del(`/attendance/devices/${id}`);
    await fetchDevices();
  };

  const pushUserToDevice = async (deviceId: string, employeeId: string) => {
    const res = await api.post<{ queued: number }>(
      `/attendance/devices/${deviceId}/push-user/${employeeId}`,
      {},
    );
    return res.data;
  };

  /** كل الموظفين النشطين (أو موظفو فرع الجهاز) إلى جهاز ZKTeco */
  const syncAllUsers = async (deviceId: string, branchOnly: boolean) => {
    const res = await api.post<{ employees: number }>(
      `/attendance/devices/${deviceId}/sync-users`,
      { branchOnly },
    );
    return res.data;
  };

  const fetchDeviceSetup = async (deviceId: string) =>
    (await api.get<DeviceSetup>(`/attendance/devices/${deviceId}/setup`)).data;

  /** مفتاح جديد؛ القديم يتوقف فوراً */
  const regenerateKey = async (deviceId: string) =>
    (
      await api.post<BiometricDevice>(
        `/attendance/devices/${deviceId}/regenerate-key`,
        {},
      )
    ).data;

  // --- Logs Management ---

  const fetchLogs = async (filters?: AttendanceLogFilters) => {
    loading.value = true;
    try {
      const page = filters?.page ?? 1;
      const res = await api.get<{ data: AttendanceLog[]; total: number }>(
        `/attendance/logs${toQueryString({
          ...filters,
          page,
          limit: filters?.limit ?? ATTENDANCE_PAGE_SIZE,
        })}`,
      );
      logs.value = res.data.data || [];
      logsTotal.value = res.data.total || 0;
      logsPage.value = page;
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
    await api.download(
      `/attendance/logs/export/${type}${toQueryString(filters)}`,
      `attendance_logs_${todayStamp()}.${reportExtension(type)}`,
    );
  };

  // --- أرقام البصمة غير المربوطة ---

  const fetchUnlinkedPins = async () => {
    try {
      unlinkedPins.value = (
        await api.get<UnlinkedPin[]>("/attendance/unlinked-pins")
      ).data;
    } catch (error) {
      console.error("Failed to fetch unlinked pins:", error);
    }
  };

  /** يربط الرقم بالموظف، ومعه كل ما وصل به من قبل */
  const linkPin = async (pin: string, employeeId: string) => {
    const res = await api.post<{ linked: number }>(
      "/attendance/unlinked-pins/link",
      { pin, employeeId },
    );
    await fetchUnlinkedPins();
    return res.data;
  };

  // --- الاستيراد من ملف ---

  const previewImport = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<ImportPreview>("/attendance/import/preview", form))
      .data;
  };

  const importPunches = async (file: File, mapping: ImportMapping) => {
    const form = new FormData();
    form.append("file", file);
    for (const [key, value] of Object.entries(mapping)) {
      if (value !== undefined && value !== null && value !== "") {
        form.append(key, String(value));
      }
    }
    return (await api.post<ImportResult>("/attendance/import", form)).data;
  };

  // --- الملخصات ---

  const fetchDailySummary = async (date: string) =>
    (
      await api.get<DailySummaryRow[]>(
        `/attendance/summary/daily${toQueryString({ date })}`,
      )
    ).data;

  const fetchMonthlyReport = async (
    employeeId: string,
    month: number,
    year: number,
  ) =>
    (
      await api.get<MonthlyReport>(
        `/attendance/summary/employee/${employeeId}/monthly${toQueryString({ month, year })}`,
      )
    ).data;

  // --- الإعدادات والعطلات ---

  const fetchSettings = async () =>
    (await api.get<AttendanceSettings>("/attendance/settings")).data;

  const updateSettings = async (payload: Partial<AttendanceSettings>) =>
    (await api.patch<AttendanceSettings>("/attendance/settings", payload)).data;

  const fetchHolidays = async (year?: number) =>
    (
      await api.get<PublicHoliday[]>(
        `/attendance/holidays${toQueryString({ year })}`,
      )
    ).data;

  const createHoliday = async (payload: HolidayPayload) =>
    (await api.post<PublicHoliday>("/attendance/holidays", payload)).data;

  const deleteHoliday = async (id: string) => {
    await api.del(`/attendance/holidays/${id}`);
  };

  const reset = () => {
    devices.value = [];
    logs.value = [];
    logsTotal.value = 0;
    logsPage.value = 1;
    loading.value = false;
    unlinkedPins.value = [];
  };

  return {
    devices,
    logs,
    logsTotal,
    logsPage,
    loading,
    unlinkedPins,
    fetchDevices,
    createDevice,
    updateDevice,
    updateDeviceStatus,
    deleteDevice,
    pushUserToDevice,
    syncAllUsers,
    fetchDeviceSetup,
    regenerateKey,
    fetchLogs,
    createManualLog,
    updateLog,
    exportLogs,
    fetchUnlinkedPins,
    linkPin,
    previewImport,
    importPunches,
    fetchDailySummary,
    fetchMonthlyReport,
    fetchSettings,
    updateSettings,
    fetchHolidays,
    createHoliday,
    deleteHoliday,
    reset,
  };
});
