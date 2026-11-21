// types/restaurant.ts — المطعم المتقدم (مطابقة للباك إند)

export interface ModifierOption {
  id?: string;
  name: string;
  priceDelta: number;
  productId: string | null;
  quantity: number;
  removesProductId: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  isActive: boolean;
  options?: ModifierOption[];
}

export interface ModifierGroupPayload {
  name: string;
  minSelect?: number;
  maxSelect?: number;
  sortOrder?: number;
  isActive?: boolean;
  options: ModifierOption[];
}

export interface KitchenStation {
  id: string;
  name: string;
  branchId: string | null;
  categoryIds: string[];
  targetMinutes: number | null;
  sortOrder: number;
  isActive: boolean;
}

export type ReservationStatus =
  | "booked"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Reservation {
  id: string;
  number: string;
  branchId: string | null;
  tableId: string | null;
  table?: { id: string; name: string; seats: number } | null;
  customerName: string;
  phone: string | null;
  guestCount: number;
  reservedAt: string;
  durationMinutes: number;
  status: ReservationStatus;
  source: string;
  note: string | null;
  seatedAt: string | null;
  completedAt: string | null;
}

export interface ReservationPayload {
  customerName: string;
  phone?: string;
  guestCount: number;
  reservedAt: string;
  durationMinutes?: number;
  tableId?: string | null;
  source?: string;
  note?: string;
}

export type MenuClass = "star" | "plowhorse" | "puzzle" | "dog";

export interface MenuEngineering {
  popularityThreshold: number;
  averageUnitMargin: number;
  totalRevenue: number;
  totalCost: number;
  items: {
    productId: string;
    name: string;
    categoryName: string | null;
    isComposite: boolean;
    quantity: number;
    revenue: number;
    cost: number;
    margin: number;
    unitMargin: number;
    costPercent: number;
    mix: number;
    class: MenuClass;
  }[];
}

export interface ConsumptionRow {
  productId: string;
  name: string;
  sku: string;
  unit: string | null;
  recipeUsage: number;
  directSales: number;
  theoretical: number;
  waste: number;
  spoilage: number;
  otherAdjustments: number;
  stocktakeDifference: number;
  actual: number;
  variance: number;
  variancePercent: number | null;
  varianceValue: number;
}

export interface ServiceReport {
  orders: number;
  revenue: number;
  averageCheck: number;
  covers: number;
  revenuePerCover: number | null;
  byType: { dineIn: number; takeaway: number; delivery: number };
  averageTableMinutes: number | null;
  byHour: { hour: number; orders: number; revenue: number }[];
  kitchen: {
    tickets: number;
    avgWaitMinutes?: number | null;
    avgPrepMinutes?: number | null;
    avgTotalMinutes?: number | null;
  };
  stations: {
    stationId: string;
    name: string;
    tickets: number;
    avgPrepMinutes?: number | null;
    avgTotalMinutes?: number | null;
  }[];
  reservations: {
    total: number;
    honored: number;
    cancelled: number;
    noShow: number;
    noShowRate: number;
    guests: number;
  };
}
