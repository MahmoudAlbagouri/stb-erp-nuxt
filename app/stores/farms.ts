// stores/farms.ts — المزارع: الأرض ووحداتها والخريطة، المحاصيل، الزراعات وسجل
// النخيل، العمليات، الحصاد، الآفات، والتقارير
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import { toQueryString } from "../utils/query";
import type { Paginated } from "@/types/catalog";
import type {
  BulkUnitsPayload,
  CalendarStep,
  CostReport,
  Crop,
  CropVariety,
  Farm,
  FarmDashboard,
  FarmHarvest,
  FarmInspection,
  FarmMap,
  FarmOperation,
  FarmPayload,
  FarmPlant,
  FarmReportQuery,
  FarmUnit,
  FarmUnitPayload,
  FarmWaterSource,
  HarvestPayload,
  InspectionPayload,
  InspectionStatus,
  OperationActuals,
  OperationPayload,
  PestReport,
  PlantDetail,
  PlantRemovalReason,
  PlantStatus,
  Planting,
  PlantingDetail,
  PlantingEndReason,
  PlantingPayload,
  RegistryReport,
  WaterReport,
  WeatherLog,
  YieldReport,
} from "@/types/farms";
import type { FieldBootstrap } from "@/field/db";

type Query = Record<string, string | number | boolean | undefined | null>;

export const useFarmsStore = defineStore("farms", () => {
  const api = useApi();

  // ─── المزارع (قائمة صغيرة تُحفظ للقوائم المنسدلة) ───
  const farms = ref<Farm[]>([]);
  const fetchFarms = async () => {
    farms.value = (await api.get<Farm[]>("/farms")).data;
    return farms.value;
  };
  const getFarm = async (id: string) => (await api.get<Farm>(`/farms/${id}`)).data;
  const saveFarm = async (payload: Partial<FarmPayload>, id?: string) => {
    const res = id
      ? await api.patch<Farm>(`/farms/${id}`, payload)
      : await api.post<Farm>("/farms", payload);
    await fetchFarms();
    return res.data;
  };
  const removeFarm = async (id: string) => {
    await api.del(`/farms/${id}`);
    await fetchFarms();
  };
  const fetchMap = async (id: string) =>
    (await api.get<FarmMap>(`/farms/${id}/map`)).data;

  // ─── الوحدات ───
  const fetchUnits = async (farmId: string) =>
    (await api.get<FarmUnit[]>(`/farms/${farmId}/units`)).data;
  const saveUnit = async (
    farmId: string,
    payload: Partial<FarmUnitPayload>,
    id?: string,
  ) =>
    (id
      ? await api.patch<FarmUnit>(`/farms/${farmId}/units/${id}`, payload)
      : await api.post<FarmUnit>(`/farms/${farmId}/units`, payload)
    ).data;
  const bulkUnits = async (farmId: string, payload: BulkUnitsPayload) =>
    (await api.post<FarmUnit[]>(`/farms/${farmId}/units/bulk`, payload)).data;
  const removeUnit = (farmId: string, id: string) =>
    api.del(`/farms/${farmId}/units/${id}`);

  // ─── المياه والطقس ───
  const fetchWaterSources = async (farmId: string) =>
    (await api.get<FarmWaterSource[]>(`/farms/${farmId}/water-sources`)).data;
  const saveWaterSource = async (
    farmId: string,
    payload: Partial<FarmWaterSource>,
    id?: string,
  ) =>
    (id
      ? await api.patch<FarmWaterSource>(
          `/farms/${farmId}/water-sources/${id}`,
          payload,
        )
      : await api.post<FarmWaterSource>(`/farms/${farmId}/water-sources`, payload)
    ).data;
  const removeWaterSource = (farmId: string, id: string) =>
    api.del(`/farms/${farmId}/water-sources/${id}`);
  const fetchWeather = async (farmId: string, query: Query = {}) =>
    (await api.get<WeatherLog[]>(`/farms/${farmId}/weather${toQueryString(query)}`))
      .data;
  const saveWeather = async (farmId: string, payload: Partial<WeatherLog>) =>
    (await api.post<WeatherLog>(`/farms/${farmId}/weather`, payload)).data;
  const removeWeather = (farmId: string, id: string) =>
    api.del(`/farms/${farmId}/weather/${id}`);

  // ─── المحاصيل ───
  const crops = ref<Crop[]>([]);
  const fetchCrops = async () => {
    crops.value = (await api.get<Crop[]>("/farm-crops")).data;
    return crops.value;
  };
  const saveCrop = async (payload: Partial<Crop>, id?: string) => {
    const res = id
      ? await api.patch<Crop>(`/farm-crops/${id}`, payload)
      : await api.post<Crop>("/farm-crops", payload);
    await fetchCrops();
    return res.data;
  };
  const removeCrop = async (id: string) => {
    await api.del(`/farm-crops/${id}`);
    await fetchCrops();
  };
  const saveVariety = async (
    cropId: string,
    payload: Partial<CropVariety>,
    id?: string,
  ) => {
    const res = id
      ? await api.patch<CropVariety>(`/farm-crops/${cropId}/varieties/${id}`, payload)
      : await api.post<CropVariety>(`/farm-crops/${cropId}/varieties`, payload);
    await fetchCrops();
    return res.data;
  };
  const removeVariety = async (cropId: string, id: string) => {
    await api.del(`/farm-crops/${cropId}/varieties/${id}`);
    await fetchCrops();
  };
  const fetchCalendar = async (cropId: string) =>
    (await api.get<CalendarStep[]>(`/farm-crops/${cropId}/calendar`)).data;
  const saveStep = async (
    cropId: string,
    payload: Partial<CalendarStep>,
    id?: string,
  ) =>
    (id
      ? await api.patch<CalendarStep>(`/farm-crops/${cropId}/calendar/${id}`, payload)
      : await api.post<CalendarStep>(`/farm-crops/${cropId}/calendar`, payload)
    ).data;
  const removeStep = (cropId: string, id: string) =>
    api.del(`/farm-crops/${cropId}/calendar/${id}`);

  // ─── الزراعات ───
  const fetchPlantings = async (query: Query = {}) =>
    (await api.get<Paginated<Planting>>(`/plantings${toQueryString(query)}`)).data;
  const getPlanting = async (id: string) =>
    (await api.get<PlantingDetail>(`/plantings/${id}`)).data;
  const savePlanting = async (payload: Partial<PlantingPayload>, id?: string) =>
    (id
      ? await api.patch<PlantingDetail>(`/plantings/${id}`, payload)
      : await api.post<PlantingDetail>("/plantings", payload)
    ).data;
  const activatePlanting = async (id: string, plantedAt?: string) =>
    (await api.post<PlantingDetail>(`/plantings/${id}/activate`, { plantedAt }))
      .data;
  const closePlanting = async (
    id: string,
    payload: { reason: PlantingEndReason; closedAt?: string; notes?: string },
  ) => (await api.post<PlantingDetail>(`/plantings/${id}/close`, payload)).data;
  const removePlanting = (id: string) => api.del(`/plantings/${id}`);
  const generatePlan = async (id: string, year?: number) =>
    (await api.post<{ created: number }>(`/plantings/${id}/plan`, { year })).data;
  const bulkPlants = async (
    plantingId: string,
    payload: {
      rows: { unitId: string; count: number; startPosition?: number }[];
      sex?: string;
      plantedAt?: string | null;
      plantedAtPrecision?: string;
      source?: string;
    },
  ) =>
    (
      await api.post<{ created: number; plantCount: number }>(
        `/plantings/${plantingId}/plants/bulk`,
        payload,
      )
    ).data;
  const createPlant = async (plantingId: string, payload: Record<string, unknown>) =>
    (await api.post<PlantDetail>(`/plantings/${plantingId}/plants`, payload)).data;

  // ─── سجل النخيل ───
  const fetchPlants = async (query: Query = {}) =>
    (await api.get<Paginated<FarmPlant>>(`/farm-plants${toQueryString(query)}`))
      .data;
  const getPlant = async (id: string) =>
    (await api.get<PlantDetail>(`/farm-plants/${id}`)).data;
  const updatePlant = async (id: string, payload: Record<string, unknown>) =>
    (await api.patch<PlantDetail>(`/farm-plants/${id}`, payload)).data;
  const setPlantStatus = async (
    id: string,
    payload: {
      status: PlantStatus;
      reason?: string | null;
      removalReason?: PlantRemovalReason | null;
    },
  ) => (await api.post<PlantDetail>(`/farm-plants/${id}/status`, payload)).data;

  // ─── العمليات ───
  const fetchOperations = async (query: Query = {}) =>
    (
      await api.get<Paginated<FarmOperation>>(
        `/farm-operations${toQueryString(query)}`,
      )
    ).data;
  const getOperation = async (id: string) =>
    (await api.get<FarmOperation>(`/farm-operations/${id}`)).data;
  const createOperation = async (payload: OperationPayload) =>
    (await api.post<FarmOperation>("/farm-operations", payload)).data;
  const completeOperation = async (id: string, payload: OperationActuals) =>
    (await api.post<FarmOperation>(`/farm-operations/${id}/complete`, payload))
      .data;
  const cancelOperation = async (id: string, reason: string) =>
    (await api.post<FarmOperation>(`/farm-operations/${id}/cancel`, { reason }))
      .data;
  const generateFarmPlan = async (farmId: string, year?: number) =>
    (
      await api.post<{ created: number; plantings: number }>(
        "/farm-operations/generate",
        { farmId, year },
      )
    ).data;

  // ─── الحصاد ───
  const fetchHarvests = async (query: Query = {}) =>
    (await api.get<Paginated<FarmHarvest>>(`/farm-harvests${toQueryString(query)}`))
      .data;
  const getHarvest = async (id: string) =>
    (await api.get<FarmHarvest>(`/farm-harvests/${id}`)).data;
  const createHarvest = async (payload: HarvestPayload) =>
    (await api.post<FarmHarvest>("/farm-harvests", payload)).data;
  const voidHarvest = async (id: string, reason: string) =>
    (await api.post<FarmHarvest>(`/farm-harvests/${id}/void`, { reason })).data;

  // ─── الآفات ───
  const fetchInspections = async (query: Query = {}) =>
    (
      await api.get<Paginated<FarmInspection>>(
        `/farm-inspections${toQueryString(query)}`,
      )
    ).data;
  const createInspection = async (payload: InspectionPayload) =>
    (await api.post<FarmInspection>("/farm-inspections", payload)).data;
  const setInspectionStatus = async (
    id: string,
    payload: { status: InspectionStatus; treatmentOperationId?: string | null; notes?: string },
  ) =>
    (await api.post<FarmInspection>(`/farm-inspections/${id}/status`, payload)).data;

  // ─── الشاشة الميدانية ───
  const fieldBootstrap = async (farmId: string) =>
    (
      await api.get<FieldBootstrap>(
        `/farm-field/bootstrap${toQueryString({ farmId })}`,
      )
    ).data;
  const fieldSync = async (
    operations: { id: string; type: string; occurredAt: string; payload: object }[],
  ) =>
    (
      await api.post<{
        results: { id: string; status: "ok" | "duplicate" | "error"; message?: string }[];
        serverTime: string;
      }>("/farm-field/sync", { operations })
    ).data;

  // ─── التقارير ───
  const report = async <T>(name: string, query: FarmReportQuery = {}) =>
    (await api.get<T>(`/farm-reports/${name}${toQueryString(query)}`)).data;

  return {
    farms,
    fetchFarms,
    getFarm,
    saveFarm,
    removeFarm,
    fetchMap,
    fetchUnits,
    saveUnit,
    bulkUnits,
    removeUnit,
    fetchWaterSources,
    saveWaterSource,
    removeWaterSource,
    fetchWeather,
    saveWeather,
    removeWeather,
    crops,
    fetchCrops,
    saveCrop,
    removeCrop,
    saveVariety,
    removeVariety,
    fetchCalendar,
    saveStep,
    removeStep,
    fetchPlantings,
    getPlanting,
    savePlanting,
    activatePlanting,
    closePlanting,
    removePlanting,
    generatePlan,
    bulkPlants,
    createPlant,
    fetchPlants,
    getPlant,
    updatePlant,
    setPlantStatus,
    fetchOperations,
    getOperation,
    createOperation,
    completeOperation,
    cancelOperation,
    generateFarmPlan,
    fetchHarvests,
    getHarvest,
    createHarvest,
    voidHarvest,
    fetchInspections,
    createInspection,
    setInspectionStatus,
    fieldBootstrap,
    fieldSync,
    dashboard: (q: FarmReportQuery = {}) => report<FarmDashboard>("dashboard", q),
    yieldReport: (q: FarmReportQuery = {}) => report<YieldReport>("yield", q),
    costReport: (q: FarmReportQuery = {}) => report<CostReport>("costs", q),
    pestReport: (q: FarmReportQuery = {}) => report<PestReport>("pests", q),
    registryReport: (q: FarmReportQuery = {}) => report<RegistryReport>("registry", q),
    waterReport: (q: FarmReportQuery = {}) => report<WaterReport>("water", q),
  };
});
