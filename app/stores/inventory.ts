// stores/inventory.ts — موديول المخزون: المخازن + الأرصدة + الحركات + التحويلات + الجرد
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type {
  AdjustmentPayload,
  DocumentFilters,
  MovementFilters,
  ReceivePayload,
  StockFilters,
  StockLookupRow,
  StockMovement,
  StockRow,
  StockSummary,
  Stocktake,
  StocktakePayload,
  StocktakeStatus,
  StockTransfer,
  TransferPayload,
  TransferStatus,
  Warehouse,
  WarehousePayload,
} from "@/types/inventory";

const BASE = "/inventory";

export const useInventoryStore = defineStore("inventory", () => {
  const api = useApi();

  // ─── المخازن (قائمة صغيرة تُحمَّل كاملة وتُستخدم في كل الصفحات) ─────────────
  const warehouses = ref<Warehouse[]>([]);
  const warehousesLoaded = ref(false);
  const warehousesLoading = ref(false);

  const fetchWarehouses = async (force = false) => {
    if (warehousesLoaded.value && !force) return;
    warehousesLoading.value = true;
    try {
      warehouses.value = (await api.get<Warehouse[]>(`${BASE}/warehouses`)).data;
      warehousesLoaded.value = true;
    } finally {
      warehousesLoading.value = false;
    }
  };

  const createWarehouse = async (payload: WarehousePayload) => {
    const res = await api.post<Warehouse>(`${BASE}/warehouses`, payload);
    await fetchWarehouses(true);
    return res.data;
  };

  const updateWarehouse = async (
    id: string,
    payload: Partial<WarehousePayload>,
  ) => {
    const res = await api.patch<Warehouse>(`${BASE}/warehouses/${id}`, payload);
    await fetchWarehouses(true);
    return res.data;
  };

  const removeWarehouse = async (id: string) => {
    await api.del(`${BASE}/warehouses/${id}`);
    await fetchWarehouses(true);
  };

  // ─── الأرصدة والحركات ───────────────────────────────────────────────────────
  const fetchStock = async (filters: StockFilters = {}) =>
    (
      await api.get<Paginated<StockRow>>(
        `${BASE}/stock${toQueryString(filters)}`,
      )
    ).data;

  const fetchSummary = async (warehouseId?: string) =>
    (
      await api.get<StockSummary>(
        `${BASE}/stock/summary${toQueryString({ warehouseId })}`,
      )
    ).data;

  const lookup = async (warehouseId: string, search: string) =>
    (
      await api.get<StockLookupRow[]>(
        `${BASE}/stock/lookup${toQueryString({ warehouseId, search })}`,
      )
    ).data;

  const setMinQuantity = async (
    warehouseId: string,
    productId: string,
    minQuantity: number | null,
  ) => {
    await api.patch(`${BASE}/stock/min-quantity`, {
      warehouseId,
      productId,
      minQuantity,
    });
  };

  const fetchMovements = async (filters: MovementFilters = {}) =>
    (
      await api.get<Paginated<StockMovement>>(
        `${BASE}/movements${toQueryString(filters)}`,
      )
    ).data;

  const adjust = async (payload: AdjustmentPayload) =>
    (await api.post<StockMovement[]>(`${BASE}/adjustments`, payload)).data;

  // ─── التحويلات ──────────────────────────────────────────────────────────────
  const fetchTransfers = async (
    filters: DocumentFilters<TransferStatus> = {},
  ) =>
    (
      await api.get<Paginated<StockTransfer>>(
        `${BASE}/transfers${toQueryString(filters)}`,
      )
    ).data;

  const getTransfer = async (id: string) =>
    (await api.get<StockTransfer>(`${BASE}/transfers/${id}`)).data;

  const createTransfer = async (payload: TransferPayload) =>
    (await api.post<StockTransfer>(`${BASE}/transfers`, payload)).data;

  const updateTransfer = async (id: string, payload: Partial<TransferPayload>) =>
    (await api.patch<StockTransfer>(`${BASE}/transfers/${id}`, payload)).data;

  const sendTransfer = async (id: string) =>
    (await api.post<StockTransfer>(`${BASE}/transfers/${id}/send`, {})).data;

  const receiveTransfer = async (id: string, payload: ReceivePayload = {}) =>
    (await api.post<StockTransfer>(`${BASE}/transfers/${id}/receive`, payload))
      .data;

  const cancelTransfer = async (id: string) =>
    (await api.post<StockTransfer>(`${BASE}/transfers/${id}/cancel`, {})).data;

  // ─── الجرد ──────────────────────────────────────────────────────────────────
  const fetchStocktakes = async (
    filters: DocumentFilters<StocktakeStatus> = {},
  ) =>
    (
      await api.get<Paginated<Stocktake>>(
        `${BASE}/stocktakes${toQueryString(filters)}`,
      )
    ).data;

  const getStocktake = async (id: string) =>
    (await api.get<Stocktake>(`${BASE}/stocktakes/${id}`)).data;

  const createStocktake = async (payload: StocktakePayload) =>
    (await api.post<Stocktake>(`${BASE}/stocktakes`, payload)).data;

  const updateStocktake = async (
    id: string,
    payload: Partial<StocktakePayload>,
  ) => (await api.patch<Stocktake>(`${BASE}/stocktakes/${id}`, payload)).data;

  const postStocktake = async (id: string) =>
    (await api.post<Stocktake>(`${BASE}/stocktakes/${id}/post`, {})).data;

  const cancelStocktake = async (id: string) =>
    (await api.post<Stocktake>(`${BASE}/stocktakes/${id}/cancel`, {})).data;

  const reset = () => {
    warehouses.value = [];
    warehousesLoaded.value = false;
    warehousesLoading.value = false;
  };

  return {
    warehouses,
    warehousesLoaded,
    warehousesLoading,
    fetchWarehouses,
    createWarehouse,
    updateWarehouse,
    removeWarehouse,
    fetchStock,
    fetchSummary,
    lookup,
    setMinQuantity,
    fetchMovements,
    adjust,
    fetchTransfers,
    getTransfer,
    createTransfer,
    updateTransfer,
    sendTransfer,
    receiveTransfer,
    cancelTransfer,
    fetchStocktakes,
    getStocktake,
    createStocktake,
    updateStocktake,
    postStocktake,
    cancelStocktake,
    reset,
  };
});
