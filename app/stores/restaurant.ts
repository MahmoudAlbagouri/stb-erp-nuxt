// stores/restaurant.ts — المطعم المتقدم: الإضافات، المحطات، الحجوزات، الهالك والتقارير
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  ConsumptionRow,
  KitchenStation,
  MenuEngineering,
  ModifierGroup,
  ModifierGroupPayload,
  Reservation,
  ReservationPayload,
  ReservationStatus,
  ServiceReport,
} from "@/types/restaurant";

const BASE = "/restaurant";

export const useRestaurantStore = defineStore("restaurant", () => {
  const api = useApi();

  const groups = ref<ModifierGroup[]>([]);
  const fetchGroups = async () => {
    groups.value = (await api.get<ModifierGroup[]>(`${BASE}/modifier-groups`)).data;
    return groups.value;
  };
  const saveGroup = async (payload: ModifierGroupPayload, id?: string) => {
    const res = id
      ? await api.patch<ModifierGroup>(`${BASE}/modifier-groups/${id}`, payload)
      : await api.post<ModifierGroup>(`${BASE}/modifier-groups`, payload);
    await fetchGroups();
    return res.data;
  };
  const removeGroup = async (id: string) => {
    await api.del(`${BASE}/modifier-groups/${id}`);
    await fetchGroups();
  };
  const productGroups = async (productId: string) =>
    (await api.get<ModifierGroup[]>(`${BASE}/products/${productId}/modifier-groups`)).data;
  const setProductGroups = async (productId: string, groupIds: string[]) =>
    (
      await api.post<ModifierGroup[]>(`${BASE}/products/${productId}/modifier-groups`, {
        groupIds,
      })
    ).data;

  const stations = ref<KitchenStation[]>([]);
  const fetchStations = async () => {
    stations.value = (await api.get<KitchenStation[]>(`${BASE}/stations`)).data;
    return stations.value;
  };
  const saveStation = async (payload: Partial<KitchenStation>, id?: string) => {
    const res = id
      ? await api.patch<KitchenStation>(`${BASE}/stations/${id}`, payload)
      : await api.post<KitchenStation>(`${BASE}/stations`, payload);
    await fetchStations();
    return res.data;
  };
  const removeStation = async (id: string) => {
    await api.del(`${BASE}/stations/${id}`);
    await fetchStations();
  };

  const fetchReservations = async (date: string) =>
    (await api.get<Reservation[]>(`${BASE}/reservations${toQueryString({ date })}`)).data;
  const saveReservation = async (payload: Partial<ReservationPayload>, id?: string) =>
    (
      id
        ? await api.patch<Reservation>(`${BASE}/reservations/${id}`, payload)
        : await api.post<Reservation>(`${BASE}/reservations`, payload)
    ).data;
  const setReservationStatus = async (id: string, status: ReservationStatus) =>
    (await api.post<Reservation>(`${BASE}/reservations/${id}/status`, { status })).data;

  const recordWaste = async (payload: {
    warehouseId: string;
    productId: string;
    quantity: number;
    note?: string;
  }) => (await api.post<unknown>(`${BASE}/waste`, payload)).data;

  const menuEngineering = async (from: string, to: string) =>
    (
      await api.get<MenuEngineering>(
        `${BASE}/reports/menu-engineering${toQueryString({ from, to })}`,
      )
    ).data;
  const consumption = async (from: string, to: string) =>
    (
      await api.get<ConsumptionRow[]>(
        `${BASE}/reports/consumption${toQueryString({ from, to })}`,
      )
    ).data;
  const service = async (from: string, to: string) =>
    (await api.get<ServiceReport>(`${BASE}/reports/service${toQueryString({ from, to })}`)).data;

  const reset = () => {
    groups.value = [];
    stations.value = [];
  };

  return {
    groups,
    fetchGroups,
    saveGroup,
    removeGroup,
    productGroups,
    setProductGroups,
    stations,
    fetchStations,
    saveStation,
    removeStation,
    fetchReservations,
    saveReservation,
    setReservationStatus,
    recordWaste,
    menuEngineering,
    consumption,
    service,
    reset,
  };
});
