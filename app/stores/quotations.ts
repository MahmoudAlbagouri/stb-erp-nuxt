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

export const useQuotationsStore = defineStore("quotations", () => {
  const api = useApi();

  const quotations = ref<Quotation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<Quotation[]>("/quotations");
      quotations.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const create = async (payload: any) => {
    const res = await api.post<Quotation>("/quotations", payload);
    quotations.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: any) => {
    const res = await api.patch<Quotation>(`/quotations/${id}`, payload);
    const idx = quotations.value.findIndex((q) => q.id === id);
    if (idx !== -1) quotations.value[idx] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/quotations/${id}`);
    quotations.value = quotations.value.filter((q) => q.id !== id);
  };

  // ✅ الموافقة وتحويل العرض لفاتورة
  const approve = async (id: string) => {
    const res = await api.patch<Quotation>(`/quotations/${id}/approve`, {});
    const idx = quotations.value.findIndex((q) => q.id === id);
    if (idx !== -1) quotations.value[idx] = res.data;
    return res.data;
  };

  // ✅ تحميل عرض السعر PDF
  const downloadQuotationPdf = async (id: string) => {
    const blob = await api.get<Blob>(`/quotations/${id}/pdf`, true, "blob");
    handleFileDownload(blob, `quotation-${id}.pdf`);
  };

  // ✅ تحميل الفاتورة PDF
  const downloadInvoicePdf = async (id: string) => {
    const blob = await api.get<Blob>(
      `/quotations/${id}/invoice-pdf`,
      true,
      "blob",
    );
    handleFileDownload(blob, `invoice-${id}.pdf`);
  };

  // دالة مساعدة لتنزيل الملفات
  const handleFileDownload = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  return {
    quotations,
    loading,
    error,
    fetchAll,
    create,
    update,
    remove,
    approve,
    downloadQuotationPdf,
    downloadInvoicePdf,
  };
});
