// stores/posAdmin.ts — إدارة نقاط البيع من لوحة التحكم (الأجهزة والورديات).
// شاشة الكاشير نفسها لها متجرها (stores/pos) الذي يعمل بلا إنترنت.
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type {
  PosCashierPayload,
  PosCashierRecord,
  PosDevice,
  PosDevicePayload,
  PosShiftRecord,
} from "@/pos/types";

const BASE = "/pos";

export const usePosAdminStore = defineStore("posAdmin", () => {
  const api = useApi();

  const fetchDevices = async () =>
    (await api.get<PosDevice[]>(`${BASE}/devices`)).data;

  const createDevice = async (payload: PosDevicePayload) =>
    (await api.post<PosDevice>(`${BASE}/devices`, payload)).data;

  const updateDevice = async (id: string, payload: Partial<PosDevicePayload>) =>
    (await api.patch<PosDevice>(`${BASE}/devices/${id}`, payload)).data;

  /** يفكّ ربط الجهاز بشاشته ليُربط بشاشة أخرى */
  const unbindDevice = async (id: string) =>
    (await api.post<PosDevice>(`${BASE}/devices/${id}/unbind`, {})).data;

  const removeDevice = async (id: string) => {
    await api.del(`${BASE}/devices/${id}`);
  };

  // ─── الكاشيرات (الرقم السري يُرسل ولا يعود أبداً) ───
  const fetchCashiers = async () =>
    (await api.get<PosCashierRecord[]>(`${BASE}/cashiers`)).data;

  const createCashier = async (payload: PosCashierPayload) =>
    (await api.post<PosCashierRecord>(`${BASE}/cashiers`, payload)).data;

  const updateCashier = async (id: string, payload: PosCashierPayload) =>
    (await api.patch<PosCashierRecord>(`${BASE}/cashiers/${id}`, payload)).data;

  const removeCashier = async (id: string) => {
    await api.del(`${BASE}/cashiers/${id}`);
  };

  const fetchShifts = async (
    filters: { deviceId?: string; status?: string; page?: number } = {},
  ) =>
    (
      await api.get<Paginated<PosShiftRecord>>(
        `${BASE}/shifts${toQueryString(filters)}`,
      )
    ).data;

  return {
    fetchDevices,
    createDevice,
    updateDevice,
    unbindDevice,
    removeDevice,
    fetchCashiers,
    createCashier,
    updateCashier,
    removeCashier,
    fetchShifts,
  };
});
