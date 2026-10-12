// stores/catalog.ts — موديول الأصناف: المنتجات + التصنيفات + الوحدات + الضرائب
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type {
  CategoryPayload,
  Paginated,
  Product,
  ProductCategory,
  ProductFilters,
  ProductPayload,
  TaxRate,
  TaxRatePayload,
  Unit,
  UnitPayload,
} from "@/types/catalog";

const BASE = "/catalog";

export const useCatalogStore = defineStore("catalog", () => {
  const api = useApi();

  // ─── الأصناف (القائمة مُرقَّمة من السيرفر) ─────────────────────────────────
  const products = ref<Product[]>([]);
  const total = ref(0);
  const page = ref(1);
  const totalPages = ref(1);
  const loading = ref(false);

  const fetchProducts = async (filters: ProductFilters = {}) => {
    loading.value = true;
    try {
      const res = await api.get<Paginated<Product>>(
        `${BASE}/products${toQueryString(filters)}`,
      );
      products.value = res.data.data;
      total.value = res.data.total;
      page.value = res.data.page;
      totalPages.value = Math.max(res.data.totalPages, 1);
    } finally {
      loading.value = false;
    }
  };

  const getProduct = async (id: string) =>
    (await api.get<Product>(`${BASE}/products/${id}`)).data;

  const createProduct = async (payload: ProductPayload) =>
    (await api.post<Product>(`${BASE}/products`, payload)).data;

  const updateProduct = async (id: string, payload: Partial<ProductPayload>) =>
    (await api.patch<Product>(`${BASE}/products/${id}`, payload)).data;

  const removeProduct = async (id: string) => {
    await api.del(`${BASE}/products/${id}`);
  };

  // ─── الإعدادات (قوائم صغيرة تُحمَّل كاملة وتُستخدم في النماذج) ──────────────
  const categories = ref<ProductCategory[]>([]);
  const units = ref<Unit[]>([]);
  const taxRates = ref<TaxRate[]>([]);
  const settingsLoaded = ref(false);
  const settingsLoading = ref(false);

  const fetchSettings = async (force = false) => {
    if (settingsLoaded.value && !force) return;
    settingsLoading.value = true;
    try {
      const [c, u, t] = await Promise.all([
        api.get<ProductCategory[]>(`${BASE}/categories`),
        api.get<Unit[]>(`${BASE}/units`),
        api.get<TaxRate[]>(`${BASE}/tax-rates`),
      ]);
      categories.value = c.data;
      units.value = u.data;
      taxRates.value = t.data;
      settingsLoaded.value = true;
    } finally {
      settingsLoading.value = false;
    }
  };

  /** عمليات CRUD متطابقة للتصنيفات/الوحدات/الضرائب */
  const settingsCrud = <T extends { id: string }, P>(resource: string) => ({
    create: async (payload: P) => {
      const res = await api.post<T>(`${BASE}/${resource}`, payload);
      await fetchSettings(true);
      return res.data;
    },
    update: async (id: string, payload: P) => {
      const res = await api.patch<T>(`${BASE}/${resource}/${id}`, payload);
      await fetchSettings(true);
      return res.data;
    },
    remove: async (id: string) => {
      await api.del(`${BASE}/${resource}/${id}`);
      await fetchSettings(true);
    },
  });

  const categoryApi = settingsCrud<ProductCategory, CategoryPayload>(
    "categories",
  );
  const unitApi = settingsCrud<Unit, UnitPayload>("units");
  const taxRateApi = settingsCrud<TaxRate, TaxRatePayload>("tax-rates");

  const reset = () => {
    products.value = [];
    total.value = 0;
    page.value = 1;
    totalPages.value = 1;
    categories.value = [];
    units.value = [];
    taxRates.value = [];
    settingsLoaded.value = false;
    loading.value = false;
    settingsLoading.value = false;
  };

  return {
    products,
    total,
    page,
    totalPages,
    loading,
    fetchProducts,
    getProduct,
    createProduct,
    updateProduct,
    removeProduct,
    categories,
    units,
    taxRates,
    settingsLoaded,
    settingsLoading,
    fetchSettings,
    categoryApi,
    unitApi,
    taxRateApi,
    reset,
  };
});
