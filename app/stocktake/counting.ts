// stocktake/counting.ts — حسابات شاشة العدّ (بلا شبكة ولا تخزين)
import type { StocktakeCatalogProduct, StocktakeCountLine } from "@/types/inventory";
import type { PendingCount } from "./db";

/** الصنف كما تعرضه الشاشة: الكمية المعدودة الآن ومن أين جاءت */
export interface CountedItem {
  productId: string;
  quantity: number;
  /** وقت آخر عدّ (لترتيب الأحدث أولاً) */
  countedAt: string | null;
  /** على الجهاز ولم يُرفع بعد */
  local: boolean;
}

/**
 * ما عُدّ كما يراه العادّ: نسخة السيرفر (وفيها عدّ الأجهزة الأخرى) وفوقها
 * عدّ هذا الجهاز الذي لم يُرفع. المرفوض لا يُحسب — يظهر في قائمته بسببه.
 */
export const countedItems = (
  lines: StocktakeCountLine[],
  pending: PendingCount[],
): CountedItem[] => {
  const items = new Map<string, CountedItem>(
    lines.map((line) => [
      line.productId,
      {
        productId: line.productId,
        quantity: line.countedQuantity,
        countedAt: line.countedAt,
        local: false,
      },
    ]),
  );
  for (const count of pending) {
    if (count.error) continue;
    if (count.countedQuantity === null) items.delete(count.productId);
    else {
      items.set(count.productId, {
        productId: count.productId,
        quantity: count.countedQuantity,
        countedAt: count.countedAt,
        local: true,
      });
    }
  }
  return [...items.values()].sort((a, b) =>
    (b.countedAt ?? "").localeCompare(a.countedAt ?? ""),
  );
};

/** للبحث بالعربي: بلا تشكيل، والألف والتاء المربوطة والياء بصورة واحدة */
export const normalizeSearch = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();

export interface CatalogIndex {
  byId: Map<string, StocktakeCatalogProduct>;
  /** الباركود أو الكود ← الصنف وكم وحدة أساس تعدّه المسحة */
  byCode: Map<string, { product: StocktakeCatalogProduct; factor: number }>;
  search: (term: string, limit?: number) => StocktakeCatalogProduct[];
}

export const indexCatalog = (products: StocktakeCatalogProduct[]): CatalogIndex => {
  const byId = new Map(products.map((p) => [p.id, p]));
  const byCode = new Map<string, { product: StocktakeCatalogProduct; factor: number }>();
  for (const product of products) {
    byCode.set(product.sku.toLowerCase(), { product, factor: 1 });
    for (const barcode of product.barcodes) {
      byCode.set(barcode.code.toLowerCase(), { product, factor: barcode.factor });
    }
  }
  const texts = products.map((product) => ({
    product,
    text: normalizeSearch(
      [product.name, product.sku, ...product.barcodes.map((b) => b.code)].join(" "),
    ),
  }));

  const search = (term: string, limit = 30) => {
    const needle = normalizeSearch(term);
    if (!needle) return [];
    const found: StocktakeCatalogProduct[] = [];
    for (const { product, text } of texts) {
      if (text.includes(needle)) found.push(product);
      if (found.length >= limit) break;
    }
    return found;
  };

  return { byId, byCode, search };
};

/** كمية صالحة للعدّ: لا سالب، وبلا كسور لوحدة لا تقبلها، و4 خانات على الأكثر */
export const cleanQuantity = (value: number, allowsFractions: boolean): number | null => {
  if (!Number.isFinite(value) || value < 0) return null;
  const rounded = allowsFractions ? Math.round(value * 10000) / 10000 : Math.round(value);
  return rounded;
};
