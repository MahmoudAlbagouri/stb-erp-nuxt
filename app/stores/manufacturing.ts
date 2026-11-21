// stores/manufacturing.ts — المصانع: مراكز العمل، القوائم والوصفات، أوامر الإنتاج، التخطيط — والدفعات
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type {
  AvailableLot,
  Bom,
  BomCost,
  BomKind,
  BomPayload,
  CapacityRow,
  DowntimeReason,
  LotRow,
  LotSummary,
  LotTrace,
  MrpRow,
  PerformanceReport,
  ProductionOrder,
  ProductionOrderPayload,
  ProductionStatus,
  ProductionSummary,
  ScrapReason,
  TimeLogKind,
  UnassignedRow,
  WorkCenter,
  WorkCenterPayload,
} from "@/types/manufacturing";

const BASE = "/manufacturing";

export const useManufacturingStore = defineStore("manufacturing", () => {
  const api = useApi();

  // ─── مراكز العمل (قائمة صغيرة) ─────────────────────────────────────────────
  const workCenters = ref<WorkCenter[]>([]);
  const fetchWorkCenters = async () => {
    workCenters.value = (await api.get<WorkCenter[]>(`${BASE}/work-centers`)).data;
    return workCenters.value;
  };
  const saveWorkCenter = async (payload: WorkCenterPayload, id?: string) => {
    const res = id
      ? await api.patch<WorkCenter>(`${BASE}/work-centers/${id}`, payload)
      : await api.post<WorkCenter>(`${BASE}/work-centers`, payload);
    await fetchWorkCenters();
    return res.data;
  };
  const removeWorkCenter = async (id: string) => {
    await api.del(`${BASE}/work-centers/${id}`);
    await fetchWorkCenters();
  };

  // ─── القوائم والوصفات ──────────────────────────────────────────────────────
  const fetchBoms = async (
    filters: { kind?: BomKind; search?: string; productId?: string; page?: number; limit?: number } = {},
  ) =>
    (await api.get<Paginated<Bom>>(`${BASE}/boms${toQueryString(filters)}`)).data;
  const getBom = async (id: string) => (await api.get<Bom>(`${BASE}/boms/${id}`)).data;
  const bomCost = async (id: string) =>
    (await api.get<BomCost>(`${BASE}/boms/${id}/cost`)).data;
  const saveBom = async (payload: Partial<BomPayload>, id?: string) =>
    (
      id
        ? await api.patch<Bom>(`${BASE}/boms/${id}`, payload)
        : await api.post<Bom>(`${BASE}/boms`, payload)
    ).data;
  const duplicateBom = async (id: string) =>
    (await api.post<Bom>(`${BASE}/boms/${id}/duplicate`, {})).data;
  const removeBom = async (id: string) => api.del(`${BASE}/boms/${id}`);

  // ─── أوامر الإنتاج ─────────────────────────────────────────────────────────
  const fetchOrders = async (
    filters: {
      status?: ProductionStatus | "open" | "";
      search?: string;
      productId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) =>
    (
      await api.get<Paginated<ProductionOrder>>(
        `${BASE}/orders${toQueryString(filters)}`,
      )
    ).data;
  const summary = async () =>
    (await api.get<ProductionSummary>(`${BASE}/orders/summary`)).data;
  const getOrder = async (id: string) =>
    (await api.get<ProductionOrder>(`${BASE}/orders/${id}`)).data;
  const saveOrder = async (payload: Partial<ProductionOrderPayload>, id?: string) =>
    (
      id
        ? await api.patch<ProductionOrder>(`${BASE}/orders/${id}`, payload)
        : await api.post<ProductionOrder>(`${BASE}/orders`, payload)
    ).data;
  const action = async <T extends object>(id: string, path: string, body: T) =>
    (await api.post<ProductionOrder>(`${BASE}/orders/${id}/${path}`, body)).data;

  const release = (id: string) => action(id, "release", {});
  const issue = (
    id: string,
    lines?: { productId: string; quantity: number; lotId?: string }[],
    note?: string,
  ) => action(id, "issue", { lines, note });
  const returnMaterials = (
    id: string,
    lines: { productId: string; quantity: number }[],
    note?: string,
  ) => action(id, "return", { lines, note });
  const startTime = (
    id: string,
    body: {
      operationId: string;
      kind: TimeLogKind;
      downtimeReason?: DowntimeReason;
      operatorName?: string;
      note?: string;
    },
  ) => action(id, "time/start", body);
  const stopTime = (
    id: string,
    logId: string,
    body: {
      quantity?: number;
      scrapQuantity?: number;
      scrapReason?: ScrapReason;
      note?: string;
    } = {},
  ) => action(id, `time/${logId}/stop`, body);
  const manualTime = (
    id: string,
    body: {
      operationId: string;
      kind: TimeLogKind;
      minutes: number;
      downtimeReason?: DowntimeReason;
      quantity?: number;
      scrapQuantity?: number;
      scrapReason?: ScrapReason;
      operatorName?: string;
      note?: string;
    },
  ) => action(id, "time/manual", body);
  const finishOperation = (id: string, operationId: string) =>
    action(id, `operations/${operationId}/finish`, {});
  const output = (
    id: string,
    body: {
      quantity: number;
      scrapQuantity?: number;
      scrapReason?: ScrapReason;
      lotNumber?: string;
      expiryDate?: string;
      final?: boolean;
      byproducts?: { productId: string; quantity: number }[];
      note?: string;
    },
  ) => action(id, "output", body);
  const cancel = (id: string, note?: string) => action(id, "cancel", { note });

  // ─── التخطيط ───────────────────────────────────────────────────────────────
  const mrp = async (filters: { warehouseId?: string; includeReorder?: string } = {}) =>
    (await api.get<MrpRow[]>(`${BASE}/planning/mrp${toQueryString(filters)}`)).data;
  const mrpPurchaseDrafts = async (payload: {
    warehouseId: string;
    lines: { productId: string; quantity: number; supplierId: string }[];
  }) =>
    (
      await api.post<{ id: string; number: string; supplierId: string }[]>(
        `${BASE}/planning/mrp/purchase-drafts`,
        payload,
      )
    ).data;
  const capacity = async (from: string, to: string) =>
    (
      await api.get<CapacityRow[]>(
        `${BASE}/planning/capacity${toQueryString({ from, to })}`,
      )
    ).data;
  const performance = async (from: string, to: string) =>
    (
      await api.get<PerformanceReport>(
        `${BASE}/planning/performance${toQueryString({ from, to })}`,
      )
    ).data;

  // ─── الدفعات ───────────────────────────────────────────────────────────────
  const fetchLots = async (
    filters: {
      status?: string;
      search?: string;
      productId?: string;
      warehouseId?: string;
      days?: number;
      page?: number;
      limit?: number;
    } = {},
  ) =>
    (await api.get<Paginated<LotRow>>(`/inventory/lots${toQueryString(filters)}`)).data;
  const lotSummary = async (days?: number) =>
    (await api.get<LotSummary>(`/inventory/lots/summary${toQueryString({ days })}`)).data;
  const lotTrace = async (id: string) =>
    (await api.get<LotTrace>(`/inventory/lots/${id}`)).data;
  const availableLots = async (productId: string, warehouseId: string) =>
    (
      await api.get<AvailableLot[]>(
        `/inventory/lots/available${toQueryString({ productId, warehouseId })}`,
      )
    ).data;
  const unassigned = async () =>
    (await api.get<UnassignedRow[]>(`/inventory/lots/unassigned`)).data;
  const assignLot = async (payload: {
    warehouseId: string;
    productId: string;
    quantity: number;
    lotNumber: string;
    expiryDate?: string;
  }) => (await api.post<LotRow>(`/inventory/lots/assign`, payload)).data;
  const updateLot = async (
    id: string,
    payload: { expiryDate?: string | null; manufactureDate?: string | null; note?: string | null },
  ) => (await api.patch<LotRow>(`/inventory/lots/${id}`, payload)).data;

  const reset = () => {
    workCenters.value = [];
  };

  return {
    workCenters,
    fetchWorkCenters,
    saveWorkCenter,
    removeWorkCenter,
    fetchBoms,
    getBom,
    bomCost,
    saveBom,
    duplicateBom,
    removeBom,
    fetchOrders,
    summary,
    getOrder,
    saveOrder,
    release,
    issue,
    returnMaterials,
    startTime,
    stopTime,
    manualTime,
    finishOperation,
    output,
    cancel,
    mrp,
    mrpPurchaseDrafts,
    capacity,
    performance,
    fetchLots,
    lotSummary,
    lotTrace,
    availableLots,
    unassigned,
    assignLot,
    updateLot,
    reset,
  };
});
