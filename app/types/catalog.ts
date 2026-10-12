// types/catalog.ts — أنواع موديول الأصناف (مطابقة لكيانات الباك إند)

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  nameEn?: string | null;
  parentId?: string | null;
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Unit {
  id: string;
  name: string;
  symbol?: string | null;
  /** تقبل كسوراً (كيلو/لتر) — القطعة لا تُباع 1.5 */
  allowsFractions: boolean;
  isActive: boolean;
}

/** تصنيف الضريبة حسب هيئة الزكاة والضريبة */
export type TaxCategory = "S" | "Z" | "E" | "O";

export interface TaxRate {
  id: string;
  name: string;
  /** نسبة مئوية: 15 تعني 15% */
  rate: number;
  category: TaxCategory;
  isDefault: boolean;
  isActive: boolean;
}

export type ProductType = "stocked" | "service";

export interface ProductBarcode {
  id?: string;
  barcode: string;
  /** null = وحدة الأساس */
  unitId?: string | null;
}

export interface ProductUnit {
  id?: string;
  unitId: string;
  /** كم وحدة أساس تساوي هذه الوحدة */
  factor: number;
  /** null = سعر الأساس × المعامل */
  salePrice?: number | null;
  unit?: Unit;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string | null;
  sku: string;
  type: ProductType;
  categoryId?: string | null;
  category?: ProductCategory | null;
  baseUnitId: string;
  baseUnit?: Unit;
  taxRateId: string;
  taxRate?: TaxRate;
  salePrice: number;
  priceIncludesTax: boolean;
  minSalePrice?: number | null;
  allowDiscount: boolean;
  isWeighted: boolean;
  description?: string | null;
  imagePath?: string | null;
  isActive: boolean;
  barcodes?: ProductBarcode[];
  units?: ProductUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  name: string;
  nameEn?: string;
  sku?: string;
  type?: ProductType;
  categoryId?: string | null;
  baseUnitId: string;
  taxRateId?: string;
  salePrice: number;
  priceIncludesTax?: boolean;
  minSalePrice?: number | null;
  allowDiscount?: boolean;
  isWeighted?: boolean;
  description?: string;
  isActive?: boolean;
  barcodes?: ProductBarcode[];
  units?: Pick<ProductUnit, "unitId" | "factor" | "salePrice">[];
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  type?: ProductType | "";
  isActive?: "true" | "false" | "";
  page?: number;
  limit?: number;
}

export type CategoryPayload = Partial<
  Pick<ProductCategory, "name" | "nameEn" | "parentId" | "color" | "isActive">
>;
export type UnitPayload = Partial<
  Pick<Unit, "name" | "symbol" | "allowsFractions" | "isActive">
>;
export type TaxRatePayload = Partial<
  Pick<TaxRate, "name" | "rate" | "category" | "isDefault" | "isActive">
>;
