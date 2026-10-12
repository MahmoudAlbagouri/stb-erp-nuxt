// stores/purchasing.ts — موديول المشتريات: الموردون + الفواتير + المرتجعات + السداد
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type {
  PurchaseInvoice,
  PurchaseInvoiceFilters,
  PurchaseInvoicePayload,
  PurchaseReturn,
  PurchaseReturnPayload,
  PurchaseReturnStatus,
  PurchasingSummary,
  Supplier,
  SupplierFilters,
  SupplierPayload,
  SupplierPayment,
  SupplierPaymentPayload,
  SupplierPaymentStatus,
  SupplierStatement,
} from "@/types/purchasing";

const BASE = "/purchasing";
/** أقصى عدد موردين في قوائم الاختيار (حد الصفحة في الـ API) */
const OPTIONS_LIMIT = 200;

export const usePurchasingStore = defineStore("purchasing", () => {
  const api = useApi();

  // ─── الموردون ───────────────────────────────────────────────────────────────
  const fetchSuppliers = async (filters: SupplierFilters = {}) =>
    (
      await api.get<Paginated<Supplier>>(
        `${BASE}/suppliers${toQueryString(filters)}`,
      )
    ).data;

  /** الموردون الفعّالون لقوائم الاختيار في النماذج */
  const supplierOptions = ref<Supplier[]>([]);
  const optionsLoaded = ref(false);

  const fetchSupplierOptions = async (force = false) => {
    if (optionsLoaded.value && !force) return;
    const res = await fetchSuppliers({ isActive: "true", limit: OPTIONS_LIMIT });
    supplierOptions.value = res.data;
    optionsLoaded.value = true;
  };

  const getSupplier = async (id: string) =>
    (await api.get<Supplier>(`${BASE}/suppliers/${id}`)).data;

  const createSupplier = async (payload: SupplierPayload) => {
    const res = await api.post<Supplier>(`${BASE}/suppliers`, payload);
    optionsLoaded.value = false;
    return res.data;
  };

  const updateSupplier = async (id: string, payload: Partial<SupplierPayload>) => {
    const res = await api.patch<Supplier>(`${BASE}/suppliers/${id}`, payload);
    optionsLoaded.value = false;
    return res.data;
  };

  const removeSupplier = async (id: string) => {
    await api.del(`${BASE}/suppliers/${id}`);
    optionsLoaded.value = false;
  };

  const getStatement = async (id: string, from?: string, to?: string) =>
    (
      await api.get<SupplierStatement>(
        `${BASE}/suppliers/${id}/statement${toQueryString({ from, to })}`,
      )
    ).data;

  const fetchSummary = async () =>
    (await api.get<PurchasingSummary>(`${BASE}/summary`)).data;

  // ─── فواتير الشراء ──────────────────────────────────────────────────────────
  const fetchInvoices = async (filters: PurchaseInvoiceFilters = {}) =>
    (
      await api.get<Paginated<PurchaseInvoice>>(
        `${BASE}/invoices${toQueryString(filters)}`,
      )
    ).data;

  const getInvoice = async (id: string) =>
    (await api.get<PurchaseInvoice>(`${BASE}/invoices/${id}`)).data;

  const createInvoice = async (payload: PurchaseInvoicePayload) =>
    (await api.post<PurchaseInvoice>(`${BASE}/invoices`, payload)).data;

  const updateInvoice = async (
    id: string,
    payload: Partial<PurchaseInvoicePayload>,
  ) => (await api.patch<PurchaseInvoice>(`${BASE}/invoices/${id}`, payload)).data;

  const postInvoice = async (id: string) =>
    (await api.post<PurchaseInvoice>(`${BASE}/invoices/${id}/post`, {})).data;

  const cancelInvoice = async (id: string) =>
    (await api.post<PurchaseInvoice>(`${BASE}/invoices/${id}/cancel`, {})).data;

  // ─── المرتجعات ──────────────────────────────────────────────────────────────
  const fetchReturns = async (
    filters: {
      status?: PurchaseReturnStatus | "";
      supplierId?: string;
      page?: number;
    } = {},
  ) =>
    (
      await api.get<Paginated<PurchaseReturn>>(
        `${BASE}/returns${toQueryString(filters)}`,
      )
    ).data;

  const getReturn = async (id: string) =>
    (await api.get<PurchaseReturn>(`${BASE}/returns/${id}`)).data;

  const createReturn = async (payload: PurchaseReturnPayload) =>
    (await api.post<PurchaseReturn>(`${BASE}/returns`, payload)).data;

  const postReturn = async (id: string) =>
    (await api.post<PurchaseReturn>(`${BASE}/returns/${id}/post`, {})).data;

  const cancelReturn = async (id: string) =>
    (await api.post<PurchaseReturn>(`${BASE}/returns/${id}/cancel`, {})).data;

  // ─── السداد ─────────────────────────────────────────────────────────────────
  const fetchPayments = async (
    filters: {
      status?: SupplierPaymentStatus | "";
      supplierId?: string;
      page?: number;
    } = {},
  ) =>
    (
      await api.get<Paginated<SupplierPayment>>(
        `${BASE}/payments${toQueryString(filters)}`,
      )
    ).data;

  const createPayment = async (payload: SupplierPaymentPayload) =>
    (await api.post<SupplierPayment>(`${BASE}/payments`, payload)).data;

  const cancelPayment = async (id: string) =>
    (await api.post<SupplierPayment>(`${BASE}/payments/${id}/cancel`, {})).data;

  const reset = () => {
    supplierOptions.value = [];
    optionsLoaded.value = false;
  };

  return {
    supplierOptions,
    fetchSuppliers,
    fetchSupplierOptions,
    getSupplier,
    createSupplier,
    updateSupplier,
    removeSupplier,
    getStatement,
    fetchSummary,
    fetchInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    postInvoice,
    cancelInvoice,
    fetchReturns,
    getReturn,
    createReturn,
    postReturn,
    cancelReturn,
    fetchPayments,
    createPayment,
    cancelPayment,
    reset,
  };
});
