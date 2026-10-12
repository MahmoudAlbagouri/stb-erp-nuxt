// pos/types.ts — أنواع شاشة الكاشير (النسخة المحلية على الجهاز + طابور الرفع)
import type { SalesPaymentMethod, SalesSettings } from "@/types/sales";

// ─── ما ينزّله الجهاز من السيرفر ─────────────────────────────────────────────
export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  isStocked: boolean;
  categoryId: string | null;
  baseUnitId: string;
  baseUnitName: string;
  allowsFractions: boolean;
  taxRate: number;
  salePrice: number;
  priceIncludesTax: boolean;
  minSalePrice: number | null;
  allowDiscount: boolean;
  isWeighted: boolean;
  /** false = يُزال من الجهاز (حُذف أو أُوقف) */
  available: boolean;
  barcodes: { barcode: string; unitId: string | null }[];
  units: { unitId: string; name: string; factor: number; salePrice: number }[];
}

export interface PosCustomer {
  id: string;
  name: string;
  phone: string | null;
  taxNumber: string | null;
  available: boolean;
}

export interface PosCategory {
  id: string;
  name: string;
  parentId?: string | null;
  color?: string | null;
}

export interface PosDevice {
  id: string;
  name: string;
  code: string;
  warehouseId: string;
  warehouse?: { id: string; name: string } | null;
  lastCounter: number;
  lastSeenAt?: string | null;
  isActive: boolean;
  hasOpenShift?: boolean;
}

export interface PosDevicePayload {
  name: string;
  code?: string;
  warehouseId: string;
  isActive?: boolean;
}

export interface PosShiftRecord {
  id: string;
  deviceId: string;
  device?: Pick<PosDevice, "id" | "name" | "code"> | null;
  cashierName?: string | null;
  status: "open" | "closed";
  openedAt: string;
  openingCash: number;
  closedAt?: string | null;
  invoicesCount: number;
  salesTotal: number;
  cashTotal: number;
  cardTotal: number;
  expectedCash: number;
  closingCash?: number | null;
  cashDifference: number;
  note?: string | null;
}

export interface PosBootstrap {
  serverTime: string;
  /** true = يستبدل نسخة الجهاز كلها، false = تغييرات فقط */
  full: boolean;
  device: PosDevice;
  settings: SalesSettings;
  categories: PosCategory[];
  products: PosProduct[];
  customers: PosCustomer[];
  openShift: PosShiftRecord | null;
}

// ─── ما يُنشئه الجهاز محلياً ─────────────────────────────────────────────────
/** وردية الكاشير الحالية كما هي على الجهاز */
export interface LocalShift {
  id: string;
  openedAt: string;
  openingCash: number;
  cashierName: string;
}

export interface CartLine {
  key: number;
  product: PosProduct;
  /** null = وحدة الأساس */
  unitId: string | null;
  unitName: string;
  factor: number;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface SaleLine {
  productId: string;
  productName: string;
  unitId?: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface SalePayment {
  method: SalesPaymentMethod;
  amount: number;
  reference?: string;
}

/** فاتورة بيعت على الجهاز — تُحفظ محلياً (لإعادة الطباعة) وتُرفع للسيرفر */
export interface LocalSale {
  uuid: string;
  number: string;
  issuedAt: string;
  shiftId: string;
  customerId: string | null;
  customerName: string | null;
  customerTaxNumber: string | null;
  pricesIncludeTax: boolean;
  lines: SaleLine[];
  payments: SalePayment[];
  subtotal: number;
  taxTotal: number;
  total: number;
  /** ما دفعه العميل نقداً والباقي له (للإيصال فقط، لا يُرفع) */
  cashReceived: number;
  change: number;
  qrCode: string | null;
}

export type OutboxType = "shift.open" | "sale" | "shift.close";

/** عملية في طابور الرفع: تبقى حتى يؤكد السيرفر استلامها */
export interface OutboxEntry {
  /** ترتيب الإدخال = ترتيب الرفع */
  seq?: number;
  id: string;
  type: OutboxType;
  payload: Record<string, unknown>;
  createdAt: string;
  /** سبب رفض السيرفر لها (تبقى في الطابور للمراجعة) */
  error?: string;
}

export interface SyncResult {
  id: string;
  status: "ok" | "duplicate" | "error";
  message?: string;
}
