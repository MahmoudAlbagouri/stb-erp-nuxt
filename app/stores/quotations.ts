// stores/quotations.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";

export interface QuotationItem {
  description: string;
  qty: number;
  unitPrice: number;
  total?: number;
}

export interface BankAccount {
  bankName: string;
  iban: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  invoiceNumber?: string | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: QuotationItem[];
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  status: "draft" | "sent" | "approved" | "rejected";
  notes?: string;
  bankAccounts?: BankAccount[];
  termsAndConditions?: string[];
  createdAt: string;
}

export type QuotationPayload = Pick<
  Quotation,
  | "customerName"
  | "customerPhone"
  | "customerAddress"
  | "items"
  | "notes"
  | "bankAccounts"
  | "termsAndConditions"
>;

export const useQuotationsStore = defineStore("quotations", () => {
  const api = useApi();

  const quotations = ref<Quotation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pdfLoading = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<Quotation[]>("/quotations");
      quotations.value = res.data;
    } catch (e) {
      error.value = getErrorMessage(e);
    } finally {
      loading.value = false;
    }
  };

  const create = async (payload: QuotationPayload) => {
    const res = await api.post<Quotation>("/quotations", payload);
    quotations.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: Partial<QuotationPayload>) => {
    const res = await api.patch<Quotation>(`/quotations/${id}`, payload);
    const idx = quotations.value.findIndex((q) => q.id === id);
    if (idx !== -1) quotations.value[idx] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/quotations/${id}`);
    quotations.value = quotations.value.filter((q) => q.id !== id);
  };

  const approve = async (id: string) => {
    const res = await api.patch<Quotation>(`/quotations/${id}/approve`, {});
    const idx = quotations.value.findIndex((q) => q.id === id);
    if (idx !== -1) quotations.value[idx] = res.data;
    return res.data;
  };

  const downloadQuotationPdf = async (id: string) => {
    pdfLoading.value = id;
    try {
      await api.download(`/quotations/${id}/pdf`, `quotation-${id}.pdf`);
    } finally {
      pdfLoading.value = null;
    }
  };

  const downloadInvoicePdf = async (id: string) => {
    pdfLoading.value = id;
    try {
      await api.download(
        `/quotations/${id}/invoice-pdf`,
        `invoice-${id}.pdf`,
      );
    } finally {
      pdfLoading.value = null;
    }
  };

  // ✅ دالة تفريغ المتجر (للاستخدام عند تسجيل الخروج)
  const reset = () => {
    quotations.value = [];
    loading.value = false;
    error.value = null;
    pdfLoading.value = null;
  };

  return {
    quotations,
    loading,
    error,
    pdfLoading,
    fetchAll,
    create,
    update,
    remove,
    approve,
    downloadQuotationPdf,
    downloadInvoicePdf,
    reset, // ✅ تم التصدير
  };
});
