// stores/posAdmin.ts — إدارة نقاط البيع من لوحة التحكم (الأجهزة والورديات).
// شاشة الكاشير نفسها لها متجرها (stores/pos) الذي يعمل بلا إنترنت.
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type {
  BulkTablesPayload,
  DiningTablePayload,
  DiningTableRecord,
  KitchenOrderRecord,
  KitchenOrderStatus,
  PosAuditRecord,
  PosCashierPayload,
  PosCashierRecord,
  PosCashMovementRecord,
  PosDevice,
  PosDevicePayload,
  PosPromotionPayload,
  PosPromotionRecord,
  PosShiftRecord,
  RestaurantSettingsRecord,
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

  // ─── المطاعم: الطاولات وإعدادات المطبخ وشاشته ───
  const fetchTables = async () =>
    (await api.get<DiningTableRecord[]>(`${BASE}/restaurant/tables`)).data;

  const createTable = async (payload: DiningTablePayload) =>
    (await api.post<DiningTableRecord>(`${BASE}/restaurant/tables`, payload)).data;

  const createTables = async (payload: BulkTablesPayload) =>
    (
      await api.post<{ created: number; skipped: number }>(
        `${BASE}/restaurant/tables/bulk`,
        payload,
      )
    ).data;

  const updateTable = async (id: string, payload: DiningTablePayload) =>
    (await api.patch<DiningTableRecord>(`${BASE}/restaurant/tables/${id}`, payload))
      .data;

  const removeTable = async (id: string) => {
    await api.del(`${BASE}/restaurant/tables/${id}`);
  };

  const fetchRestaurantSettings = async () =>
    (await api.get<RestaurantSettingsRecord>(`${BASE}/restaurant/settings`)).data;

  const updateRestaurantSettings = async (
    payload: Partial<RestaurantSettingsRecord>,
  ) =>
    (
      await api.patch<RestaurantSettingsRecord>(`${BASE}/restaurant/settings`, payload)
    ).data;

  const fetchKitchenBoard = async (branchId?: string) =>
    (
      await api.get<KitchenOrderRecord[]>(
        `${BASE}/kitchen/orders${toQueryString({ branchId })}`,
      )
    ).data;

  const setKitchenStatus = async (id: string, status: KitchenOrderStatus) =>
    (await api.patch<KitchenOrderRecord>(`${BASE}/kitchen/orders/${id}`, { status }))
      .data;

  const fetchShifts = async (
    filters: { deviceId?: string; status?: string; page?: number } = {},
  ) =>
    (
      await api.get<Paginated<PosShiftRecord>>(
        `${BASE}/shifts${toQueryString(filters)}`,
      )
    ).data;

  // ─── العروض والأسعار الخاصة ───
  const fetchPromotions = async () =>
    (await api.get<PosPromotionRecord[]>(`${BASE}/promotions`)).data;

  const createPromotion = async (payload: PosPromotionPayload) =>
    (await api.post<PosPromotionRecord>(`${BASE}/promotions`, payload)).data;

  const updatePromotion = async (
    id: string,
    payload: Partial<PosPromotionPayload>,
  ) =>
    (await api.patch<PosPromotionRecord>(`${BASE}/promotions/${id}`, payload))
      .data;

  const removePromotion = async (id: string) => {
    await api.del(`${BASE}/promotions/${id}`);
  };

  // ─── سجل التدقيق وحركات الدرج ───
  const fetchAudit = async (
    filters: {
      deviceId?: string;
      shiftId?: string;
      action?: PosAuditRecord["action"] | "";
      from?: string;
      to?: string;
      page?: number;
    } = {},
  ) =>
    (
      await api.get<Paginated<PosAuditRecord>>(
        `${BASE}/audit${toQueryString(filters)}`,
      )
    ).data;

  const fetchCashMovements = async (
    filters: { deviceId?: string; shiftId?: string; page?: number } = {},
  ) =>
    (
      await api.get<Paginated<PosCashMovementRecord>>(
        `${BASE}/cash-movements${toQueryString(filters)}`,
      )
    ).data;

  return {
    fetchTables,
    createTable,
    createTables,
    updateTable,
    removeTable,
    fetchRestaurantSettings,
    updateRestaurantSettings,
    fetchKitchenBoard,
    setKitchenStatus,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    removePromotion,
    fetchAudit,
    fetchCashMovements,
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
