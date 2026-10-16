// types/inventory.ts — أنواع موديول المخزون (مطابقة لكيانات الباك إند)

export type WarehouseType = "main" | "branch";

export interface Warehouse {
  id: string;
  name: string;
  code?: string | null;
  type: WarehouseType;
  address?: string | null;
  phone?: string | null;
  /** يُسمح أن ينزل الرصيد تحت الصفر (الفروع: نعم، الرئيسي: لا) */
  allowNegativeStock: boolean;
  isActive: boolean;
  /** الفرع الذي يتبعه المخزن */
  branchId: string;
  branch?: { id: string; name: string } | null;
}

export interface WarehousePayload {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  allowNegativeStock?: boolean;
  isActive?: boolean;
  /** يُترك فارغاً للفرع الرئيسي */
  branchId?: string;
}

// ─── الأرصدة ─────────────────────────────────────────────────────────────────
export type StockAlert = "low" | "negative";

export interface StockRow {
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string | null;
  quantity: number;
  minQuantity: number | null;
  avgCost: number;
  value: number;
  status: "ok" | StockAlert;
}

export interface StockSummary {
  items: number;
  value: number;
  low: number;
  negative: number;
  inTransitValue: number;
}

export interface StockFilters {
  warehouseId?: string;
  search?: string;
  alert?: StockAlert | "";
  page?: number;
  limit?: number;
}

/** صنف في قائمة اختيار الأصناف داخل مستند، مع رصيده في المخزن المحدد */
export interface StockLookupRow {
  productId: string;
  name: string;
  sku: string;
  unit: string | null;
  allowsFractions: boolean;
  quantity: number;
  avgCost: number;
}

// ─── الحركات ─────────────────────────────────────────────────────────────────
export type StockMovementType =
  | "opening"
  | "purchase"
  | "purchase_return"
  | "sale"
  | "sale_return"
  | "transfer_out"
  | "transfer_in"
  | "adjustment"
  | "stocktake";

export interface StockMovement {
  id: string;
  warehouseId: string;
  warehouse?: Pick<Warehouse, "id" | "name"> | null;
  productId: string;
  product?: { id: string; name: string; sku: string } | null;
  type: StockMovementType;
  /** موجبة = دخول، سالبة = خروج */
  quantity: number;
  unitCost: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  occurredAt: string;
}

export interface MovementFilters {
  warehouseId?: string;
  productId?: string;
  type?: StockMovementType | "";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdjustmentPayload {
  warehouseId: string;
  type: "opening" | "adjustment";
  note?: string;
  lines: { productId: string; quantity: number; unitCost?: number }[];
}

// ─── التحويلات ───────────────────────────────────────────────────────────────
export type TransferStatus = "draft" | "in_transit" | "received" | "cancelled";

/** بيانات الصنف كما تأتي مع أسطر المستندات */
export interface LineProduct {
  id: string;
  name: string;
  sku: string;
  baseUnitId?: string;
  baseUnit?: { name: string; allowsFractions: boolean } | null;
}

export interface TransferLine {
  id: string;
  productId: string;
  product?: LineProduct | null;
  quantity: number;
  receivedQuantity?: number | null;
  unitCost: number;
}

export interface StockTransfer {
  id: string;
  number: string;
  fromWarehouseId: string;
  fromWarehouse?: Warehouse | null;
  toWarehouseId: string;
  toWarehouse?: Warehouse | null;
  status: TransferStatus;
  note?: string | null;
  createdAt: string;
  sentAt?: string | null;
  receivedAt?: string | null;
  lines?: TransferLine[];
  linesCount?: number;
  /** آخر تعديل على السيرفر — مسودة النموذج على الجهاز تقارن به */
  updatedAt?: string;
}

export interface TransferPayload {
  fromWarehouseId: string;
  toWarehouseId: string;
  note?: string;
  lines: { productId: string; quantity: number }[];
}

export interface ReceivePayload {
  lines?: { productId: string; receivedQuantity: number }[];
}

// ─── الجرد ───────────────────────────────────────────────────────────────────
export type StocktakeStatus = "draft" | "posted" | "cancelled";

export interface StocktakeLine {
  id: string;
  productId: string;
  product?: LineProduct | null;
  countedQuantity: number;
  /** رصيد النظام لحظة الاعتماد (بعد الاعتماد فقط) */
  expectedQuantity?: number | null;
  /** رصيد النظام الحالي (للمسودة فقط) */
  currentQuantity?: number;
  unitCost: number;
}

export interface Stocktake {
  id: string;
  number: string;
  warehouseId: string;
  warehouse?: Warehouse | null;
  status: StocktakeStatus;
  note?: string | null;
  createdAt: string;
  postedAt?: string | null;
  lines?: StocktakeLine[];
  linesCount?: number;
  /** آخر تعديل: يُرسل مع الحفظ (expectedUpdatedAt) فلا يمسح ما عُدّ بعد الفتح */
  updatedAt?: string;
}

export interface StocktakePayload {
  warehouseId: string;
  note?: string;
  lines: { productId: string; countedQuantity: number }[];
  /** updatedAt كما فُتح الجرد: تغيّر بعدها (عُدّ من شاشة العدّ) ← 409 */
  expectedUpdatedAt?: string;
}

// ─── شاشة العدّ ──────────────────────────────────────────────────────────────
export interface StocktakeCountLine {
  productId: string;
  countedQuantity: number;
  countedAt: string | null;
}

/** ما عُدّ في الجرد على السيرفر الآن */
export interface StocktakeCounts {
  id: string;
  number: string;
  status: StocktakeStatus;
  warehouseId: string;
  warehouseName: string;
  updatedAt: string;
  lines: StocktakeCountLine[];
}

export interface StocktakeCountInput {
  productId: string;
  /** null = أُزيل الصنف من الجرد */
  countedQuantity: number | null;
  /** وقت العدّ على الجهاز: الأحدث يكسب إن عدّ الصنف جهازان */
  countedAt: string;
}

/** ok سُجّل، stale عند السيرفر عدّ أحدث، error رُفض بسببه */
export interface StocktakeCountResult {
  productId: string;
  status: "ok" | "stale" | "error";
  message?: string;
}

/** صنف في نسخة شاشة العدّ للبحث بلا إنترنت */
export interface StocktakeCatalogProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  allowsFractions: boolean;
  isActive: boolean;
  /** factor: كم وحدة أساس يعدّها الباركود (باركود الكرتونة = 24) */
  barcodes: { code: string; factor: number }[];
}

export interface DocumentFilters<S extends string> {
  status?: S | "";
  warehouseId?: string;
  page?: number;
  limit?: number;
}
