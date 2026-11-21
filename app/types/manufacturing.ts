// types/manufacturing.ts — المصانع والوصفات والدفعات (مطابقة لكيانات الباك إند)

// ─── مراكز العمل ─────────────────────────────────────────────────────────────
export interface WorkCenter {
  id: string;
  code: string;
  name: string;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
  parallelUnits: number;
  hoursPerDay: number;
  workingDays: number[];
  efficiencyPercent: number;
  costPerHour: number;
  overheadPerHour: number;
  note: string | null;
  isActive: boolean;
}

export type WorkCenterPayload = Partial<
  Omit<WorkCenter, "id" | "branch" | "code">
> & { name: string; code?: string };

// ─── قوائم المكوّنات ─────────────────────────────────────────────────────────
export type BomKind = "production" | "recipe";

export interface BomProduct {
  id: string;
  name: string;
  sku: string;
  type?: string;
  baseUnit?: { name: string; allowsFractions?: boolean } | null;
}

export interface BomLine {
  id?: string;
  componentId: string;
  component?: BomProduct;
  quantity: number;
  scrapPercent: number;
  operationSequence: number | null;
  note?: string | null;
}

export interface BomOperation {
  id?: string;
  sequence: number;
  name: string;
  workCenterId: string;
  workCenter?: WorkCenter;
  setupMinutes: number;
  runMinutes: number;
  instructions?: string | null;
}

export interface BomByproduct {
  id?: string;
  productId: string;
  product?: BomProduct;
  quantity: number;
}

export interface Bom {
  id: string;
  code: string;
  kind: BomKind;
  productId: string;
  product?: BomProduct;
  name: string;
  version: number;
  isDefault: boolean;
  outputQuantity: number;
  expectedYieldPercent: number;
  prepMinutes: number | null;
  note: string | null;
  isActive: boolean;
  linesCount?: number;
  lines?: BomLine[];
  operations?: BomOperation[];
  byproducts?: BomByproduct[];
}

export interface BomPayload {
  kind: BomKind;
  productId: string;
  name?: string;
  isDefault?: boolean;
  outputQuantity?: number;
  expectedYieldPercent?: number;
  prepMinutes?: number | null;
  note?: string;
  isActive?: boolean;
  lines: Omit<BomLine, "id" | "component">[];
  operations?: Omit<BomOperation, "id" | "workCenter">[];
  byproducts?: Omit<BomByproduct, "id" | "product">[];
}

export interface BomCost {
  bomId: string;
  outputQuantity: number;
  materials: {
    componentId: string;
    name: string;
    sku: string;
    unit: string | null;
    quantity: number;
    unitCost: number;
    cost: number;
    share: number;
    isComposite: boolean;
  }[];
  materialCost: number;
  operations: {
    sequence: number;
    name: string;
    workCenter: string;
    minutes: number;
    laborCost: number;
    overheadCost: number;
  }[];
  laborCost: number;
  overheadCost: number;
  byproductCredit: number;
  totalCost: number;
  unitCost: number;
  netSalePrice: number | null;
  costPercent: number | null;
  margin: number | null;
}

// ─── أوامر الإنتاج ───────────────────────────────────────────────────────────
export type ProductionStatus =
  | "draft"
  | "released"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ScrapReason =
  | "defect"
  | "process_loss"
  | "machine"
  | "material"
  | "operator"
  | "sample"
  | "other";

export type DowntimeReason =
  | "breakdown"
  | "no_material"
  | "changeover"
  | "quality"
  | "no_operator"
  | "power"
  | "maintenance"
  | "other";

export type TimeLogKind = "setup" | "run" | "downtime";

export interface ProductionMaterial {
  id: string;
  productId: string;
  product?: BomProduct;
  plannedQuantity: number;
  issuedQuantity: number;
  returnedQuantity: number;
  cost: number;
  operationSequence: number | null;
}

export interface ProductionOperation {
  id: string;
  sequence: number;
  name: string;
  workCenterId: string;
  workCenter?: WorkCenter;
  status: "pending" | "in_progress" | "paused" | "done";
  plannedSetupMinutes: number;
  plannedRunMinutes: number;
  actualSetupMinutes: number;
  actualRunMinutes: number;
  downtimeMinutes: number;
  quantityDone: number;
  quantityScrapped: number;
  costPerHour: number;
  overheadPerHour: number;
  startedAt: string | null;
  finishedAt: string | null;
  instructions: string | null;
}

export interface ProductionTimeLog {
  id: string;
  operationId: string;
  workCenterId: string;
  kind: TimeLogKind;
  startedAt: string;
  endedAt: string | null;
  minutes: number;
  downtimeReason: DowntimeReason | null;
  operatorName: string | null;
  quantity: number;
  scrapQuantity: number;
  scrapReason: ScrapReason | null;
  note: string | null;
}

export interface ProductionTransaction {
  id: string;
  type: "issue" | "return" | "output";
  value: number;
  quantity: number;
  scrapQuantity: number;
  scrapReason: ScrapReason | null;
  note: string | null;
  occurredAt: string;
}

export interface ProductionOrder {
  id: string;
  number: string;
  productId: string;
  product?: BomProduct;
  bomId: string;
  bom?: Bom;
  status: ProductionStatus;
  priority: number;
  plannedQuantity: number;
  producedQuantity: number;
  scrapQuantity: number;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  materialsWarehouseId: string;
  materialsWarehouse?: { id: string; name: string };
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  outputLotNumber: string | null;
  outputExpiryDate: string | null;
  reference: string | null;
  note: string | null;
  plannedMaterialCost: number;
  plannedLaborCost: number;
  plannedOverheadCost: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  byproductValue: number;
  receivedValue: number;
  varianceValue: number;
  unitCost: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  progress: number;
  late: boolean;
  materials?: ProductionMaterial[];
  operations?: ProductionOperation[];
  byproducts?: {
    id: string;
    productId: string;
    product?: BomProduct;
    plannedQuantity: number;
    receivedQuantity: number;
    value: number;
  }[];
  timeLogs?: ProductionTimeLog[];
  transactions?: ProductionTransaction[];
  costToDate?: { material: number; labor: number; overhead: number; total: number };
}

export interface ProductionOrderPayload {
  productId: string;
  bomId?: string;
  plannedQuantity: number;
  warehouseId: string;
  materialsWarehouseId?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  priority?: number;
  outputLotNumber?: string;
  outputExpiryDate?: string;
  reference?: string;
  note?: string;
}

export interface ProductionSummary {
  draft: number;
  released: number;
  inProgress: number;
  late: number;
  completedThisMonth: number;
  producedValueThisMonth: number;
  scrapRateThisMonth: number;
  openOperations: number;
}

// ─── التخطيط ─────────────────────────────────────────────────────────────────
export interface MrpRow {
  productId: string;
  name: string;
  sku: string;
  unit: string | null;
  procurement: "buy" | "make";
  required: number;
  onHand: number;
  incoming: number;
  shortage: number;
  action: "buy" | "make" | "none";
  supplierId: string | null;
  supplierName: string | null;
  leadTimeDays: number | null;
  lastCost: number;
  needDate: string | null;
  orderBy: string | null;
  orders: string[];
  level: number;
}

export interface CapacityRow {
  workCenterId: string;
  code: string;
  name: string;
  available: number;
  load: number;
  utilization: number;
  overloadedDays: number;
  days: { date: string; available: number; load: number; utilization: number }[];
}

export interface PerformanceReport {
  products: {
    productId: string;
    name: string;
    sku: string;
    orders: number;
    plannedQuantity: number;
    producedQuantity: number;
    scrapQuantity: number;
    scrapRate: number;
    actualCost: number;
    actualUnitCost: number;
    plannedUnitCost: number;
    costVariance: number;
    avgLeadHours: number | null;
  }[];
  downtime: {
    workCenterId: string;
    workCenter: string;
    reason: DowntimeReason;
    minutes: number;
    events: number;
  }[];
  workCenters: {
    workCenterId: string;
    name: string;
    setupMinutes: number;
    runMinutes: number;
    downtimeMinutes: number;
    goodQuantity: number;
    scrapQuantity: number;
    availability: number | null;
    performance: number | null;
    quality: number | null;
    oee: number | null;
  }[];
  scrap: { reason: ScrapReason | null; quantity: number; events: number }[];
}

// ─── الدفعات ─────────────────────────────────────────────────────────────────
export type LotStatus = "active" | "expiring" | "expired" | "no_expiry";

export interface LotRow {
  id: string;
  lotNumber: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string | null;
  expiryDate: string | null;
  manufactureDate: string | null;
  source: string;
  daysToExpiry: number | null;
  status: LotStatus;
  quantity: number;
  value: number;
  warehouses: { warehouseId: string; name: string; quantity: number }[];
}

export interface LotTrace {
  lot: LotRow;
  movements: {
    movementId: string;
    occurredAt: string;
    type: string;
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    referenceType: string | null;
    referenceId: string | null;
    referenceNumber: string | null;
    partyName: string | null;
  }[];
}

export interface AvailableLot {
  lotId: string;
  lotNumber: string;
  expiryDate: string | null;
  quantity: number;
  expired: boolean;
}

export interface UnassignedRow {
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  sku: string;
  unassigned: number;
}

export interface LotSummary {
  expired: number;
  expiredValue: number;
  expiring: number;
  expiringValue: number;
  lotsInStock: number;
}
