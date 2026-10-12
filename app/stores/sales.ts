// stores/sales.ts — موديول المبيعات: العملاء + الفواتير + المرتجعات + المقبوضات
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type {
  Customer,
  CustomerFilters,
  CustomerPayload,
  CustomerPayment,
  CustomerPaymentPayload,
  CustomerPaymentStatus,
  CustomerStatement,
  PaymentDirection,
  SalesInvoice,
  SalesInvoiceFilters,
  SalesInvoicePayload,
  SalesReturn,
  SalesReturnPayload,
  SalesReturnStatus,
  SalesSettings,
  SalesSummary,
  Tender,
} from "@/types/sales";

const BASE = "/sales";
/** أقصى عدد عملاء في قوائم الاختيار (حد الصفحة في الـ API) */
const OPTIONS_LIMIT = 200;

export const useSalesStore = defineStore("sales", () => {
  const api = useApi();

  // ─── إعدادات الفوترة (بيانات البائع المطبوعة على الفاتورة) ──────────────────
  const settings = ref<SalesSettings | null>(null);

  const fetchSettings = async (force = false) => {
    if (settings.value && !force) return settings.value;
    settings.value = (await api.get<SalesSettings>(`${BASE}/settings`)).data;
    return settings.value;
  };

  const updateSettings = async (payload: SalesSettings) => {
    settings.value = (
      await api.patch<SalesSettings>(`${BASE}/settings`, payload)
    ).data;
    return settings.value;
  };

  // ─── العملاء ────────────────────────────────────────────────────────────────
  const fetchCustomers = async (filters: CustomerFilters = {}) =>
    (
      await api.get<Paginated<Customer>>(
        `${BASE}/customers${toQueryString(filters)}`,
      )
    ).data;

  /** العملاء الفعّالون لقوائم الاختيار في النماذج */
  const customerOptions = ref<Customer[]>([]);
  const optionsLoaded = ref(false);

  const fetchCustomerOptions = async (force = false) => {
    if (optionsLoaded.value && !force) return;
    const res = await fetchCustomers({ isActive: "true", limit: OPTIONS_LIMIT });
    customerOptions.value = res.data;
    optionsLoaded.value = true;
  };

  const createCustomer = async (payload: CustomerPayload) => {
    const res = await api.post<Customer>(`${BASE}/customers`, payload);
    optionsLoaded.value = false;
    return res.data;
  };

  const updateCustomer = async (id: string, payload: Partial<CustomerPayload>) => {
    const res = await api.patch<Customer>(`${BASE}/customers/${id}`, payload);
    optionsLoaded.value = false;
    return res.data;
  };

  const removeCustomer = async (id: string) => {
    await api.del(`${BASE}/customers/${id}`);
    optionsLoaded.value = false;
  };

  const getStatement = async (id: string, from?: string, to?: string) =>
    (
      await api.get<CustomerStatement>(
        `${BASE}/customers/${id}/statement${toQueryString({ from, to })}`,
      )
    ).data;

  const fetchSummary = async () =>
    (await api.get<SalesSummary>(`${BASE}/summary`)).data;

  // ─── فواتير البيع ───────────────────────────────────────────────────────────
  const fetchInvoices = async (filters: SalesInvoiceFilters = {}) =>
    (
      await api.get<Paginated<SalesInvoice>>(
        `${BASE}/invoices${toQueryString(filters)}`,
      )
    ).data;

  const getInvoice = async (id: string) =>
    (await api.get<SalesInvoice>(`${BASE}/invoices/${id}`)).data;

  const createInvoice = async (payload: SalesInvoicePayload) =>
    (await api.post<SalesInvoice>(`${BASE}/invoices`, payload)).data;

  const updateInvoice = async (
    id: string,
    payload: Partial<SalesInvoicePayload>,
  ) => (await api.patch<SalesInvoice>(`${BASE}/invoices/${id}`, payload)).data;

  const issueInvoice = async (id: string, payments: Tender[] = []) =>
    (
      await api.post<SalesInvoice>(`${BASE}/invoices/${id}/issue`, {
        payments,
      })
    ).data;

  const cancelInvoice = async (id: string) =>
    (await api.post<SalesInvoice>(`${BASE}/invoices/${id}/cancel`, {})).data;

  // ─── المرتجعات ──────────────────────────────────────────────────────────────
  const fetchReturns = async (
    filters: {
      status?: SalesReturnStatus | "";
      customerId?: string;
      page?: number;
    } = {},
  ) =>
    (
      await api.get<Paginated<SalesReturn>>(
        `${BASE}/returns${toQueryString(filters)}`,
      )
    ).data;

  const getReturn = async (id: string) =>
    (await api.get<SalesReturn>(`${BASE}/returns/${id}`)).data;

  const createReturn = async (payload: SalesReturnPayload) =>
    (await api.post<SalesReturn>(`${BASE}/returns`, payload)).data;

  const issueReturn = async (id: string, refund?: Tender) =>
    (
      await api.post<SalesReturn>(
        `${BASE}/returns/${id}/issue`,
        refund ? { refund } : {},
      )
    ).data;

  const cancelReturn = async (id: string) =>
    (await api.post<SalesReturn>(`${BASE}/returns/${id}/cancel`, {})).data;

  // ─── المقبوضات ──────────────────────────────────────────────────────────────
  const fetchPayments = async (
    filters: {
      status?: CustomerPaymentStatus | "";
      direction?: PaymentDirection | "";
      customerId?: string;
      page?: number;
    } = {},
  ) =>
    (
      await api.get<Paginated<CustomerPayment>>(
        `${BASE}/payments${toQueryString(filters)}`,
      )
    ).data;

  const createPayment = async (payload: CustomerPaymentPayload) =>
    (await api.post<CustomerPayment>(`${BASE}/payments`, payload)).data;

  const cancelPayment = async (id: string) =>
    (await api.post<CustomerPayment>(`${BASE}/payments/${id}/cancel`, {})).data;

  const reset = () => {
    settings.value = null;
    customerOptions.value = [];
    optionsLoaded.value = false;
  };

  return {
    settings,
    fetchSettings,
    updateSettings,
    customerOptions,
    fetchCustomers,
    fetchCustomerOptions,
    createCustomer,
    updateCustomer,
    removeCustomer,
    getStatement,
    fetchSummary,
    fetchInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    issueInvoice,
    cancelInvoice,
    fetchReturns,
    getReturn,
    createReturn,
    issueReturn,
    cancelReturn,
    fetchPayments,
    createPayment,
    cancelPayment,
    reset,
  };
});
