<template>
  <div class="page-container">
    <!-- ══ Page Header ═════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>عروض الأسعار والفواتير</h1>
        <p>إدارة عروض الأسعار وتحويلها إلى فواتير ضريبية</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--primary" @click="openCreate">
          <Plus :size="18" />
          <span>إنشاء عرض سعر جديد</span>
        </button>
      </div>
    </div>

    <!-- ══ Loading & Empty State ════════════════════════════════════════════ -->
    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!store.quotations.length" class="card empty-card">
      <div class="empty-state">
        <FileText :size="40" class="empty-icon" />
        <div class="empty-state__title">لا توجد عروض أسعار</div>
        <div class="empty-state__text">
          أنشئ عرض سعر جديد لبدء إدارة المبيعات والفواتير
        </div>
        <button class="btn btn--primary mt-4" @click="openCreate">
          <Plus :size="16" />
          إنشاء عرض سعر
        </button>
      </div>
    </div>

    <!-- ══ Quotations Table ═════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>رقم العرض</th>
            <th>العميل</th>
            <th>الحالة</th>
            <th>الإجمالي</th>
            <th>التاريخ</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in store.quotations" :key="q.id">
            <td>
              <strong>{{ q.quotationNumber }}</strong>
              <span v-if="q.invoiceNumber" class="invoice-badge">
                {{ q.invoiceNumber }}
              </span>
            </td>
            <td>{{ q.customerName }}</td>
            <td>
              <span :class="`badge badge--${q.status}`">
                {{ getStatusLabel(q.status) }}
              </span>
            </td>
            <td>{{ formatCurrency(q.grandTotal) }}</td>
            <td>{{ formatDate(q.createdAt) }}</td>
            <td class="actions-cell">
              <!-- طباعة عرض السعر -->
              <button
                class="btn btn--ghost btn--sm"
                @click="store.downloadQuotationPdf(q.id)"
                title="طباعة عرض السعر"
              >
                <FileText :size="14" />
              </button>

              <!-- طباعة الفاتورة (فقط إذا كان معتمداً) -->
              <button
                v-if="q.status === 'approved'"
                class="btn btn--ghost btn--sm"
                @click="store.downloadInvoicePdf(q.id)"
                title="طباعة الفاتورة"
              >
                <Receipt :size="14" />
              </button>

              <!-- الموافقة وتحويل لفاتورة -->
              <button
                v-if="q.status !== 'approved'"
                class="btn btn--success btn--sm"
                @click="handleApprove(q)"
                title="موافقة وتحويل لفاتورة"
              >
                <CheckCircle :size="14" />
              </button>

              <!-- حذف -->
              <button
                class="btn btn--danger btn--sm"
                @click="confirmDelete(q)"
                title="حذف"
              >
                <Trash2 :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═ Modal لإنشاء/تعديل عرض السعر ══════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal modal-xl">
            <div class="modal__header">
              <h3>
                {{ editing ? "تعديل عرض السعر" : "إنشاء عرض سعر جديد" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                <X :size="20" />
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="modal-form">
              <!-- بيانات العميل -->
              <div class="grid-2">
                <div class="form-group">
                  <label>اسم العميل *</label>
                  <input
                    v-model="form.customerName"
                    type="text"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>رقم الجوال</label>
                  <input
                    v-model="form.customerPhone"
                    type="tel"
                    class="form-input"
                  />
                </div>
              </div>

              <!-- العناصر -->
              <div class="form-group full-width">
                <label>العناصر *</label>
                <div
                  v-for="(item, index) in form.items"
                  :key="index"
                  class="item-row"
                >
                  <input
                    v-model="item.description"
                    placeholder="وصف المنتج/الخدمة"
                    class="form-input"
                    style="flex: 3"
                    required
                  />
                  <input
                    v-model.number="item.qty"
                    type="number"
                    min="1"
                    placeholder="الكمية"
                    class="form-input"
                    style="flex: 1"
                    required
                  />
                  <input
                    v-model.number="item.unitPrice"
                    type="number"
                    min="0"
                    placeholder="سعر الوحدة"
                    class="form-input"
                    style="flex: 1"
                    required
                  />
                  <button
                    type="button"
                    class="btn btn--danger btn--sm"
                    @click="removeItem(index)"
                  >
                    <X :size="14" />
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn--outline btn--sm mt-2"
                  @click="addItem"
                >
                  <Plus :size="14" /> إضافة عنصر
                </button>
              </div>

              <!-- الحسابات البنكية -->
              <div class="form-group full-width">
                <label>الحسابات البنكية</label>
                <div
                  v-for="(acc, index) in form.bankAccounts"
                  :key="index"
                  class="item-row"
                >
                  <input
                    v-model="acc.bankName"
                    placeholder="اسم البنك"
                    class="form-input"
                    style="flex: 1"
                  />
                  <input
                    v-model="acc.iban"
                    placeholder="IBAN"
                    class="form-input"
                    style="flex: 2"
                  />
                  <button
                    type="button"
                    class="btn btn--danger btn--sm"
                    @click="removeBankAccount(index)"
                  >
                    <X :size="14" />
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn--outline btn--sm mt-2"
                  @click="addBankAccount"
                >
                  <Plus :size="14" /> إضافة حساب بنكي
                </button>
              </div>

              <!-- الشروط والأحكام -->
              <div class="form-group full-width">
                <label>الشروط والأحكام</label>
                <textarea
                  v-model="termsText"
                  class="form-input"
                  rows="3"
                  placeholder="اكتب كل شرط في سطر منفصل..."
                ></textarea>
              </div>

              <!-- ملاحظات -->
              <div class="form-group full-width">
                <label>ملاحظات</label>
                <textarea
                  v-model="form.notes"
                  class="form-input"
                  rows="2"
                ></textarea>
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="submitting"
                >
                  <span v-if="submitting" class="spinner" />
                  <span v-else>{{
                    editing ? "حفظ التغييرات" : "إنشاء العرض"
                  }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═ Confirm Delete ════════════════════════════════════════════════════ -->
    <ConfirmDialog
      v-model="showConfirm"
      title="حذف عرض السعر"
      :message="`هل تريد حذف عرض السعر '${deleteTarget?.quotationNumber}'؟`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useQuotationsStore } from "@/stores/quotations";
import { useToast } from "../../composables/useToast";

import {
  Plus,
  FileText,
  Receipt,
  CheckCircle,
  Trash2,
  X,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useQuotationsStore();
const toast = useToast();

// ─── Modal State ───────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<any>(null);

const EMPTY_FORM = {
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  items: [{ description: "", qty: 1, unitPrice: 0 }] as any[],
  bankAccounts: [] as any[],
  notes: "",
};

const form = reactive({ ...EMPTY_FORM });
const termsText = ref("");

// ─── Open / Close ─────────────────────────────────────────────────────────────
const openCreate = () => {
  editing.value = null;
  Object.assign(form, JSON.parse(JSON.stringify(EMPTY_FORM)));
  termsText.value = "";
  showModal.value = true;
};

// ─── Item Management ──────────────────────────────────────────────────────────
const addItem = () => {
  form.items.push({ description: "", qty: 1, unitPrice: 0 });
};

const removeItem = (index: number) => {
  if (form.items.length > 1) form.items.splice(index, 1);
};

const addBankAccount = () => {
  form.bankAccounts.push({ bankName: "", iban: "" });
};

const removeBankAccount = (index: number) => {
  form.bankAccounts.splice(index, 1);
};

// ─── Submit ──────────────────────────────────────────────────────────────────
const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload = {
      ...form,
      termsAndConditions: termsText.value.split("\n").filter((t) => t.trim()),
    };

    if (editing.value) {
      await store.update(editing.value.id, payload);
      toast.success("تم تحديث عرض السعر");
    } else {
      await store.create(payload);
      toast.success("تم إنشاء عرض السعر بنجاح");
    }

    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
};

// ─── Approve ──────────────────────────────────────────────────────────────────
const handleApprove = async (q: any) => {
  try {
    await store.approve(q.id);
    toast.success("تمت الموافقة وتحويل العرض إلى فاتورة");
  } catch (e: any) {
    toast.error(e.message);
  }
};

// ─── Delete ──────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<any>(null);

const confirmDelete = (q: any) => {
  deleteTarget.value = q;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم حذف عرض السعر");
    showConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    deleting.value = false;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusLabel = (s: string) =>
  ({
    draft: "مسودة",
    sent: "مرسل",
    approved: "معتمد (فاتورة)",
    rejected: "مرفوض",
  })[s] ?? s;

const formatCurrency = (n: number) =>
  n.toLocaleString("ar-SA", { style: "currency", currency: "SAR" });

const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.table-card {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;

  th {
    background-color: $stb-primary;
    color: #fff;
    padding: 12px 16px;
    text-align: right;
    font-weight: 700;
  }

  td {
    padding: 12px 16px;
    border-bottom: 1px solid $stb-border;
    vertical-align: middle;
  }

  tr:hover td {
    background-color: rgba($stb-primary, 0.05);
  }
}

.actions-cell {
  display: flex;
  gap: $space-1;
  justify-content: flex-start;
}

.invoice-badge {
  display: block;
  font-size: $font-size-xs;
  color: $stb-accent;
  margin-top: 4px;
  font-family: monospace;
}

.badge {
  padding: 4px 10px;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 600;

  &--draft {
    background: #fef3c7;
    color: #92400e;
  }
  &--sent {
    background: #dbeafe;
    color: #1e40af;
  }
  &--approved {
    background: #dcfce7;
    color: #166534;
  }
  &--rejected {
    background: #fee2e2;
    color: #991b1b;
  }
}

.item-row {
  display: flex;
  gap: $space-2;
  margin-bottom: $space-2;
  align-items: center;
}

.modal-xl {
  max-width: 900px;
}

.mt-2 {
  margin-top: $space-2 !important;
}

.mt-4 {
  margin-top: $space-4 !important;
}
</style>
