// stores/posAdmin.ts — إدارة نقاط البيع من لوحة التحكم (الأجهزة والورديات).
// شاشة الكاشير نفسها لها متجرها (stores/pos) الذي يعمل بلا إنترنت.
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type { PosDevice, PosDevicePayload, PosShiftRecord } from "@/pos/types";

const BASE = "/pos";

export const usePosAdminStore = defineStore("posAdmin", () => {
  const api = useApi();

  const fetchDevices = async () =>
    (await api.get<PosDevice[]>(`${BASE}/devices`)).data;

  const createDevice = async (payload: PosDevicePayload) =>
    (await api.post<PosDevice>(`${BASE}/devices`, payload)).data;

  const updateDevice = async (id: string, payload: Partial<PosDevicePayload>) =>
    (await api.patch<PosDevice>(`${BASE}/devices/${id}`, payload)).data;

  const removeDevice = async (id: string) => {
    await api.del(`${BASE}/devices/${id}`);
  };

  const fetchShifts = async (
    filters: { deviceId?: string; status?: string; page?: number } = {},
  ) =>
    (
      await api.get<Paginated<PosShiftRecord>>(
        `${BASE}/shifts${toQueryString(filters)}`,
      )
    ).data;

  return { fetchDevices, createDevice, updateDevice, removeDevice, fetchShifts };
});
