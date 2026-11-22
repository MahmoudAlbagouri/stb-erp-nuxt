// types/farms.ts — المزارع: الأرض ووحداتها، المحاصيل، الزراعات وسجل النخيل،
// العمليات، الحصاد، الآفات، والتقارير (مرآة src/modules/farms في الباك إند)

/** نقاط [خط الطول، خط العرض] */
export type GeoRing = [number, number][];

export type FarmOwnership = "owned" | "leased" | "partnership" | "other";
export type FarmUnitKind =
  | "sector"
  | "block"
  | "row"
  | "field"
  | "greenhouse"
  | "bed"
  | "nursery"
  | "other";
export type SoilType =
  | "sandy"
  | "loamy_sand"
  | "loam"
  | "clay"
  | "silt"
  | "saline"
  | "calcareous"
  | "other";
export type IrrigationMethod =
  | "drip"
  | "bubbler"
  | "sprinkler"
  | "pivot"
  | "flood"
  | "manual"
  | "none";
export type WaterSourceKind =
  | "well"
  | "network"
  | "canal"
  | "tank"
  | "desalination"
  | "rainwater"
  | "other";

export interface Farm {
  id: string;
  code: string;
  name: string;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
  warehouseId: string | null;
  warehouse?: { id: string; name: string } | null;
  ownership: FarmOwnership;
  leaseEndsOn: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  boundary: GeoRing | null;
  areaM2: number | null;
  laborHourCost: number | null;
  notes: string | null;
  isActive: boolean;
  unitCount?: number;
  activePlantings?: number;
  livePlants?: number;
  openInspections?: number;
}

export interface FarmPayload {
  code?: string;
  name: string;
  warehouseId?: string | null;
  ownership?: FarmOwnership;
  leaseEndsOn?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  boundary?: GeoRing | null;
  areaM2?: number | null;
  laborHourCost?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface FarmUnit {
  id: string;
  farmId: string;
  parentId: string | null;
  kind: FarmUnitKind;
  name: string;
  code: string | null;
  path: string;
  depth: number;
  sortOrder: number;
  boundary: GeoRing | null;
  areaM2: number | null;
  soilType: SoilType | null;
  irrigationMethod: IrrigationMethod | null;
  irrigationIntervalDays: number | null;
  plannedPositions: number | null;
  waterSourceId: string | null;
  waterSource?: FarmWaterSource | null;
  notes: string | null;
  isActive: boolean;
}

export interface FarmUnitPayload {
  parentId?: string | null;
  kind: FarmUnitKind;
  name: string;
  code?: string | null;
  sortOrder?: number;
  boundary?: GeoRing | null;
  areaM2?: number | null;
  soilType?: SoilType | null;
  irrigationMethod?: IrrigationMethod | null;
  irrigationIntervalDays?: number | null;
  plannedPositions?: number | null;
  waterSourceId?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface BulkUnitsPayload {
  parentId?: string | null;
  kind: FarmUnitKind;
  count: number;
  namePrefix: string;
  startNumber?: number;
  codePrefix?: string;
  plannedPositions?: number | null;
  areaM2?: number | null;
  irrigationMethod?: IrrigationMethod | null;
  irrigationIntervalDays?: number | null;
}

export interface FarmWaterSource {
  id: string;
  farmId: string;
  name: string;
  kind: WaterSourceKind;
  capacityM3PerHour: number | null;
  depthM: number | null;
  salinityPpm: number | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  isActive: boolean;
}

export interface WeatherLog {
  id: string;
  date: string;
  tempMin: number | null;
  tempMax: number | null;
  rainMm: number | null;
  humidity: number | null;
  windKmh: number | null;
  frost: boolean;
  dustStorm: boolean;
  notes: string | null;
}

export interface FarmMapUnit {
  id: string;
  parentId: string | null;
  kind: FarmUnitKind;
  name: string;
  code: string | null;
  depth: number;
  boundary: GeoRing | null;
  areaM2: number | null;
  plantings: {
    id: string;
    number: string;
    cropName: string;
    varietyName: string | null;
    plantCount: number;
    expectedHarvestAt: string | null;
  }[];
  livePlants: number;
  infestedPlants: number;
  openInspections: number;
  maxSeverity: number;
  lastIrrigationAt: string | null;
  irrigationIntervalDays: number | null;
  irrigationDue: boolean;
  harvestAllowedAt: string | null;
  harvestReady: boolean;
}

export interface FarmMap {
  farm: Farm;
  units: FarmMapUnit[];
  today: string;
}

// ─── المحاصيل ───
export type CropCategory =
  | "palm"
  | "fruit_tree"
  | "field_crop"
  | "vegetable"
  | "forage"
  | "greenhouse"
  | "ornamental"
  | "other";
export type CropLifecycle = "perennial" | "annual";
export type TrackingMode = "individual" | "count" | "area";
export type DatePrecision = "day" | "month" | "year" | "estimated";

export interface ProductRef {
  id: string;
  name: string;
  sku?: string;
  baseUnit?: { name: string } | null;
}

export interface CropVariety {
  id: string;
  cropId: string;
  name: string;
  harvestProductId: string | null;
  harvestProduct?: ProductRef | null;
  standardCost: number | null;
  expectedYieldPerPlant: number | null;
  expectedYieldPerHectare: number | null;
  daysToHarvest: number | null;
  yearsToBearing: number | null;
  harvestMonths: number[] | null;
  notes: string | null;
  isActive: boolean;
}

export interface Crop {
  id: string;
  name: string;
  category: CropCategory;
  lifecycle: CropLifecycle;
  defaultTrackingMode: TrackingMode;
  harvestProductId: string | null;
  harvestProduct?: ProductRef | null;
  notes: string | null;
  isActive: boolean;
  varieties?: CropVariety[];
}

export interface CalendarStep {
  id: string;
  cropId: string;
  varietyId: string | null;
  variety?: { id: string; name: string } | null;
  operationType: FarmOperationType;
  title: string;
  anchor: "planting" | "yearly";
  dayOffset: number | null;
  month: number | null;
  day: number | null;
  repeatEveryDays: number | null;
  repeatCount: number | null;
  sortOrder: number;
  notes: string | null;
}

// ─── الزراعات والنخيل ───
export type PlantingStatus = "planned" | "active" | "closed" | "failed";
export type PlantingEndReason =
  | "completed"
  | "crop_failure"
  | "pest"
  | "disease"
  | "frost"
  | "heat"
  | "drought"
  | "flood"
  | "salinity"
  | "removed"
  | "other";

export interface Planting {
  id: string;
  number: string;
  farmId: string;
  farm?: Farm;
  unitId: string;
  unit?: FarmUnit;
  cropId: string;
  crop?: Crop;
  varietyId: string | null;
  variety?: CropVariety | null;
  trackingMode: TrackingMode;
  plantCount: number;
  areaM2: number | null;
  plantedAt: string | null;
  plantedAtPrecision: DatePrecision;
  season: string | null;
  expectedHarvestAt: string | null;
  expectedYield: number | null;
  status: PlantingStatus;
  startedAt: string | null;
  closedAt: string | null;
  closeReason: PlantingEndReason | null;
  notes: string | null;
  createdAt: string;
}

export interface PlantingDetail extends Planting {
  plantsByStatus: Partial<Record<PlantStatus, number>>;
  harvest: {
    quantity: number;
    rejectQuantity: number;
    value: number;
    count: number;
    lastAt: string | null;
  };
  operations: {
    planned: number;
    done: number;
    inputCost: number;
    laborCost: number;
    waterM3: number;
  };
  expected: number | null;
}

export interface PlantingPayload {
  unitId: string;
  cropId: string;
  varietyId?: string | null;
  trackingMode?: TrackingMode;
  plantCount?: number;
  areaM2?: number | null;
  plantedAt?: string | null;
  plantedAtPrecision?: DatePrecision;
  season?: string | null;
  expectedHarvestAt?: string | null;
  expectedYield?: number | null;
  status?: "planned" | "active";
  generatePlan?: boolean;
  notes?: string | null;
}

export type PlantSex = "female" | "male" | "unknown";
export type PlantSource =
  | "offshoot"
  | "tissue_culture"
  | "seedling"
  | "seed"
  | "nursery"
  | "existing"
  | "other";
export type PlantStatus =
  | "healthy"
  | "infested"
  | "diseased"
  | "weak"
  | "dead"
  | "removed";
export type PlantRemovalReason =
  | "dead"
  | "pest"
  | "disease"
  | "replaced"
  | "transplanted"
  | "storm"
  | "salinity"
  | "excess_male"
  | "other";

export interface FarmPlant {
  id: string;
  farmId: string;
  farm?: Farm;
  plantingId: string;
  planting?: Planting;
  unitId: string;
  unit?: FarmUnit;
  tag: string;
  position: number | null;
  sex: PlantSex;
  plantedAt: string | null;
  plantedAtPrecision: DatePrecision;
  source: PlantSource;
  motherPlantId: string | null;
  motherPlant?: { id: string; tag: string } | null;
  replacesPlantId: string | null;
  status: PlantStatus;
  statusChangedAt: string | null;
  removedAt: string | null;
  removalReason: PlantRemovalReason | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
}

export interface PlantDetail extends FarmPlant {
  history: {
    id: string;
    fromStatus: PlantStatus | null;
    toStatus: PlantStatus;
    reason: string | null;
    sourceType: string;
    occurredAt: string;
  }[];
  yields: { year: number; quantity: number; harvests: number }[];
  operations: {
    id: string;
    number: string;
    type: FarmOperationType;
    performedAt: string;
    quantity: number | null;
  }[];
  inspections: {
    id: string;
    number: string;
    pest: PestType;
    severity: number;
    status: InspectionStatus;
    inspectedAt: string;
  }[];
  offshootCount: number;
}

// ─── العمليات ───
export type FarmOperationType =
  | "irrigation"
  | "fertilization"
  | "spraying"
  | "pollination"
  | "pruning"
  | "frond_removal"
  | "thinning"
  | "bagging"
  | "bunch_tying"
  | "offshoot_removal"
  | "weeding"
  | "tillage"
  | "sowing"
  | "transplanting"
  | "mowing"
  | "soil_test"
  | "cleaning"
  | "maintenance"
  | "other";
export type FarmOperationStatus = "planned" | "done" | "cancelled";

export interface OperationInputLine {
  id: string;
  productId: string;
  product?: ProductRef;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
  phiDays: number | null;
}

export interface FarmOperation {
  id: string;
  number: string;
  farmId: string;
  farm?: Farm;
  unitId: string | null;
  unit?: FarmUnit | null;
  plantingId: string | null;
  planting?: Planting | null;
  type: FarmOperationType;
  title: string | null;
  status: FarmOperationStatus;
  plannedDate: string | null;
  calendarStepId: string | null;
  performedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  quantity: number | null;
  quantityUnit: string | null;
  waterM3: number | null;
  waterSourceId: string | null;
  waterSource?: FarmWaterSource | null;
  plantsCovered: number | null;
  areaCoveredM2: number | null;
  workerCount: number | null;
  laborHours: number | null;
  laborCost: number;
  inputCost: number;
  targetPest: string | null;
  harvestAllowedAt: string | null;
  inspectionId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  supervisorName: string | null;
  notes: string | null;
  inputs?: OperationInputLine[];
  workers?: { id: string; employeeId: string | null; name: string; hours: number | null }[];
  plants?: { id: string; tag: string; quantity: number | null }[];
}

export interface OperationActuals {
  performedAt?: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  waterM3?: number | null;
  waterSourceId?: string | null;
  plantsCovered?: number | null;
  areaCoveredM2?: number | null;
  workerCount?: number | null;
  laborHours?: number | null;
  workers?: { employeeId?: string | null; name?: string; hours?: number | null }[];
  inputs?: {
    productId: string;
    warehouseId?: string;
    quantity: number;
    phiDays?: number | null;
  }[];
  plantIds?: string[];
  targetPest?: string | null;
  supervisorName?: string | null;
  notes?: string | null;
}

export interface OperationPayload extends OperationActuals {
  farmId: string;
  unitId?: string | null;
  plantingId?: string | null;
  type: FarmOperationType;
  title?: string | null;
  status?: "planned" | "done";
  plannedDate?: string | null;
  inspectionId?: string | null;
  clientUuid?: string;
}

// ─── الحصاد ───
export type HarvestGrade = "extra" | "first" | "second" | "third" | "industrial";
export type HarvestRejectReason =
  | "pest"
  | "disease"
  | "damage"
  | "overripe"
  | "underripe"
  | "weather"
  | "sorting"
  | "other";

export interface FarmHarvest {
  id: string;
  number: string;
  farmId: string;
  farm?: Farm;
  unitId: string | null;
  unit?: FarmUnit | null;
  plantingId: string | null;
  planting?: Planting | null;
  plantId: string | null;
  plant?: FarmPlant | null;
  harvestedAt: string;
  productId: string;
  product?: ProductRef;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  quantity: number;
  grossQuantity: number | null;
  containers: number | null;
  containerLabel: string | null;
  grade: HarvestGrade | null;
  rejectQuantity: number | null;
  rejectReason: HarvestRejectReason | null;
  unitCost: number;
  valuation: "manual" | "standard" | "average" | "zero";
  value: number;
  lotNumber: string;
  workerCount: number | null;
  laborHours: number | null;
  laborCost: number;
  status: "recorded" | "voided";
  voidedAt: string | null;
  voidReason: string | null;
  phiViolation: boolean;
  supervisorName: string | null;
  notes: string | null;
}

export interface HarvestPayload {
  farmId: string;
  unitId?: string | null;
  plantingId?: string | null;
  plantId?: string | null;
  harvestedAt?: string;
  productId?: string;
  warehouseId?: string;
  quantity: number;
  grossQuantity?: number | null;
  containers?: number | null;
  containerLabel?: string | null;
  grade?: HarvestGrade | null;
  rejectQuantity?: number | null;
  rejectReason?: HarvestRejectReason | null;
  unitCost?: number | null;
  lotNumber?: string;
  workerCount?: number | null;
  laborHours?: number | null;
  supervisorName?: string | null;
  notes?: string | null;
  clientUuid?: string;
}

// ─── الآفات ───
export type PestType =
  | "red_palm_weevil"
  | "dubas_bug"
  | "lesser_date_moth"
  | "date_spider_mite"
  | "scale_insect"
  | "longhorn_borer"
  | "termites"
  | "bayoud"
  | "black_scorch"
  | "inflorescence_rot"
  | "aphids"
  | "whitefly"
  | "thrips"
  | "leaf_miner"
  | "fruit_fly"
  | "powdery_mildew"
  | "downy_mildew"
  | "root_rot"
  | "viral"
  | "nematodes"
  | "weeds"
  | "rodents"
  | "birds"
  | "locust"
  | "nutrient_deficiency"
  | "other";
export type InspectionStatus = "open" | "treating" | "resolved";

export interface FarmInspection {
  id: string;
  number: string;
  farmId: string;
  farm?: Farm;
  unitId: string | null;
  unit?: FarmUnit | null;
  plantingId: string | null;
  planting?: Planting | null;
  plantId: string | null;
  plant?: FarmPlant | null;
  inspectedAt: string;
  pest: PestType;
  pestName: string | null;
  severity: number;
  affectedCount: number | null;
  sampledCount: number | null;
  status: InspectionStatus;
  resolvedAt: string | null;
  treatmentOperationId: string | null;
  inspectorName: string | null;
  notes: string | null;
}

export interface InspectionPayload {
  farmId: string;
  unitId?: string | null;
  plantingId?: string | null;
  plantId?: string | null;
  inspectedAt?: string;
  pest: PestType;
  pestName?: string | null;
  severity: number;
  affectedCount?: number | null;
  sampledCount?: number | null;
  markPlant?: boolean;
  inspectorName?: string | null;
  notes?: string | null;
  clientUuid?: string;
}

// ─── التقارير ───
export interface FarmDashboard {
  period: { from: string; to: string };
  farms: number;
  areaM2: number;
  units: number;
  plantings: { category: CropCategory; plantings: number; plants: number; areaM2: number }[];
  plants: { byStatus: Partial<Record<PlantStatus, number>>; live: number };
  operations: {
    overdue: number;
    upcoming: number;
    byType: {
      type: FarmOperationType;
      count: number;
      inputCost: number;
      laborCost: number;
      laborHours: number;
      waterM3: number;
    }[];
  };
  harvest: {
    productId: string;
    productName: string;
    unitName: string | null;
    quantity: number;
    rejectQuantity: number;
    value: number;
    count: number;
  }[];
  costs: { inputs: number; labor: number; total: number };
  inspections: {
    open: number;
    bySeverity: { severity: number; count: number }[];
    topPests: { pest: PestType; pestName: string | null; count: number }[];
  };
  waterM3Last30Days: number;
}

export interface FarmReportQuery {
  farmId?: string;
  unitId?: string;
  cropId?: string;
  from?: string;
  to?: string;
  groupBy?: "planting" | "variety" | "unit" | "plant" | "type" | "month";
}

export interface YieldRow {
  key: string | null;
  label: string;
  number?: string;
  season?: string | null;
  quantity: number;
  rejectQuantity: number;
  grossQuantity: number;
  value: number;
  harvests: number;
  containers: number;
  rejectRate: number | null;
  plantCount?: number;
  areaM2?: number | null;
  perPlant?: number | null;
  perHectare?: number | null;
  expected?: number | null;
  achievement?: number | null;
}

export interface YieldReport {
  period: { from: string; to: string };
  groupBy: string;
  rows?: YieldRow[];
  plants?: number;
  average?: number | null;
  top?: { plantId: string; tag: string; unitName: string; varietyName: string | null; quantity: number; harvests: number }[];
  bottom?: { plantId: string; tag: string; unitName: string; varietyName: string | null; quantity: number; harvests: number }[];
}

export interface CostRow {
  plantingId?: string;
  key?: string;
  number?: string;
  label?: string;
  plantCount?: number;
  areaM2?: number | null;
  operations: number;
  inputCost: number;
  laborCost: number;
  laborHours: number;
  waterM3: number;
  totalCost: number;
  harvestQuantity: number;
  harvestValue: number;
  costPerUnit?: number | null;
  costPerPlant?: number | null;
  margin?: number;
}

export interface CostReport {
  period: { from: string; to: string };
  groupBy: string;
  rows: CostRow[];
  unallocatedCost?: number;
}

export interface PestReport {
  period: { from: string; to: string };
  byPest: {
    pest: PestType;
    pestName: string | null;
    inspections: number;
    open: number;
    averageSeverity: number;
    affected: number;
    sampled: number;
    incidence: number | null;
  }[];
  byMonth: { month: string; pest: PestType; count: number }[];
  byUnit: { unitId: string; unitName: string; count: number; maxSeverity: number }[];
}

export interface RegistryReport {
  period: { from: string; to: string };
  varieties: {
    cropName: string;
    varietyName: string | null;
    byStatus: Partial<Record<PlantStatus, number>>;
    live: number;
  }[];
  bySex: Partial<Record<PlantSex, number>>;
  byAge: Record<string, number>;
  removals: { reason: PlantRemovalReason; count: number }[];
  origins: { source: PlantSource; count: number; replacements: number }[];
}

export interface WaterReport {
  period: { from: string; to: string };
  byUnit: {
    unitId: string | null;
    unitName: string;
    waterM3: number;
    irrigations: number;
    minutes: number;
    perHectare: number | null;
  }[];
  bySource: {
    sourceId: string | null;
    sourceName: string;
    waterM3: number;
    hours: number;
    capacityHours: number | null;
  }[];
  byMonth: { month: string; waterM3: number }[];
}
