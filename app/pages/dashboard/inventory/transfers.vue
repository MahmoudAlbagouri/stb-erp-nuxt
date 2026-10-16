<!-- pages/dashboard/inventory/transfers.vue — التحويلات بين المخازن (إرسال ثم استلام) -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>التحويلات بين المخازن</h1>
        <p>تُرسَل البضاعة من مخزن وتُستلَم في الآخر — وبينهما تكون "في الطريق"</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_stock_transfers'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>تحويل جديد</span>
        </button>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        class="doc-tab"
        :class="{ 'is-active': filters.status === tab.value }"
        @click="setStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="card doc-filters doc-filters--even">
      <select
        v-model="filters.warehouseId"
        class="form-select"
        @change="list.load(1)"
      >
        <option value="">كل المخازن (مرسِل أو مستلِم)</option>
        <option v-for="w in store.warehouses" :key="w.id" :value="w.id">
          {{ w.name }}
        </option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <ArrowLeftRight :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد تحويلات</div>
        <div class="empty-state__text">
          حوّل البضاعة من المخزن الرئيسي إلى مخازن الفروع ونقاط البيع
        </div>
        <button
          v-can="'manage_stock_transfers'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> تحويل جديد
        </button>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>من</th>
                <th>إلى</th>
                <th>الأصناف</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in list.rows.value" :key="t.id">
                <td><code class="doc-code">{{ t.number }}</code></td>
                <td>{{ t.fromWarehouse?.name || "—" }}</td>
                <td>{{ t.toWarehouse?.name || "—" }}</td>
                <td>
                  <span class="doc-num">{{ formatNumber(t.linesCount ?? 0) }}</span>
                </td>
                <td>
                  <span class="doc-num">{{ formatDate(t.sentAt || t.createdAt) }}</span>
                </td>
                <td>
                  <span
                    :class="['badge', `doc-status--${TRANSFER_STATUS[t.status].tone}`]"
                  >
                    {{ TRANSFER_STATUS[t.status].label }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <template v-if="t.status === 'draft'">
                      <button
                        v-can="'manage_stock_transfers'"
                        class="btn btn--sm btn--primary"
                        @click="askAction('send', t)"
                      >
                        <Send :size="14" /> إرسال
                      </button>
                      <button
                        v-can="'manage_stock_transfers'"
                        class="btn btn--sm btn--ghost"
                        @click="openEdit(t)"
                      >
                        <Pencil :size="14" /> تعديل
                      </button>
                    </template>
                    <button
                      v-if="t.status === 'in_transit'"
                      v-can="'receive_stock_transfers'"
                      class="btn btn--sm btn--success"
                      @click="openDetails(t, true)"
                    >
                      <PackageCheck :size="14" /> استلام
                    </button>
                    <button
                      class="btn btn--sm btn--ghost btn--icon"
                      title="عرض"
                      @click="openDetails(t, false)"
                    >
                      <Eye :size="14" />
                    </button>
                    <button
                      v-if="t.status === 'draft' || t.status === 'in_transit'"
                      v-can="'manage_stock_transfers'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="إلغاء التحويل"
                      @click="askAction('cancel', t)"
                    >
                      <Ban :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DocPager
        :total="list.total.value"
        :page="list.page.value"
        :total-pages="list.totalPages.value"
        label="تحويل"
        @change="list.load"
      />
    </template>

    <!-- ══ نموذج التحويل (مسودة) ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <ArrowLeftRight :size="20" class="doc-modal__icon" />
                {{ editingId ? `تعديل التحويل ${editingNumber}` : "تحويل جديد" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeForm"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="submitForm(false)">
              <FormDraftNotice :draft="draft" />
              <div class="doc-grid">
                <div class="form-group">
                  <label>من مخزن *</label>
                  <select
                    v-model="form.fromWarehouseId"
                    class="form-select"
                    required
                    :disabled="form.lines.length > 0"
                  >
                    <option value="" disabled>اختر...</option>
                    <option v-for="w in activeWarehouses" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                  <small v-if="form.lines.length" class="doc-hint">
                    احذف الأصناف لتغيير المخزن المرسِل
                  </small>
                </div>
                <div class="form-group">
                  <label>إلى مخزن *</label>
                  <select v-model="form.toWarehouseId" class="form-select" required>
                    <option value="" disabled>اختر...</option>
                    <option
                      v-for="w in activeWarehouses.filter(
                        (w) => w.id !== form.fromWarehouseId,
                      )"
                      :key="w.id"
                      :value="w.id"
                    >
                      {{ w.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group doc-grid__full">
                  <label>ملاحظة</label>
                  <input
                    v-model.trim="form.note"
                    class="form-input"
                    maxlength="500"
                    placeholder="اختياري"
                  />
                </div>
              </div>

              <section class="doc-section">
                <h4 class="doc-section__title">الأصناف</h4>
                <StockProductPicker
                  :warehouse-id="form.fromWarehouseId"
                  :exclude="form.lines.map((l) => l.productId)"
                  @pick="addLine"
                />

                <div class="doc-lines" :style="{ '--doc-cols': FORM_COLS }">
                  <div class="doc-lines__head">
                    <span>الصنف</span>
                    <span>المتاح</span>
                    <span>الكمية</span>
                    <span />
                  </div>
                  <div v-if="!form.lines.length" class="doc-lines__empty">
                    لم تُضف أصناف بعد — ابحث عن صنف بالأعلى
                  </div>
                  <div
                    v-for="(line, index) in form.lines"
                    :key="line.productId"
                    class="doc-lines__row"
                  >
                    <div class="doc-cell">
                      <span class="doc-cell__main">{{ line.name }}</span>
                      <span class="doc-cell__sub">
                        {{ line.sku }} · {{ line.unit }}
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">المتاح</span>
                      <span
                        class="doc-num"
                        :class="{ 'doc-num--out': exceeds(line) }"
                      >
                        {{
                          line.available === null
                            ? "—"
                            : formatNumber(line.available)
                        }}
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">الكمية</span>
                      <StbNumberInput
                        v-model.number="line.quantity"
                        class="form-input"
                        min="0.0001"
                        :step="line.allowsFractions ? 'any' : '1'"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="form.lines.splice(index, 1)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>

                <div v-if="form.lines.some(exceeds)" class="doc-note">
                  <AlertTriangle :size="16" />
                  <span>
                    بعض الكميات أكبر من المتاح في المخزن المرسِل — قد يُرفض
                    الإرسال إذا كان المخزن لا يسمح بالرصيد السالب.
                  </span>
                </div>
              </section>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeForm">
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--secondary"
                  :disabled="submitting || !form.lines.length"
                >
                  حفظ كمسودة
                </button>
                <button
                  type="button"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting || !form.lines.length"
                  @click="submitAndSend"
                >
                  <Send :size="16" /> حفظ وإرسال
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ عرض / استلام ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="details" class="modal-overlay" @click.self="closeDetails">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <component
                  :is="receiving ? PackageCheck : ArrowLeftRight"
                  :size="20"
                  class="doc-modal__icon"
                />
                {{ receiving ? "استلام التحويل" : "التحويل" }} {{ details.number }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeDetails"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="submitReceive">
              <div class="doc-grid">
                <div class="doc-cell">
                  <span class="doc-cell__sub">من</span>
                  <span class="doc-cell__main">{{ details.fromWarehouse?.name }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">إلى</span>
                  <span class="doc-cell__main">{{ details.toWarehouse?.name }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">الحالة</span>
                  <span>
                    <span
                      :class="[
                        'badge',
                        `doc-status--${TRANSFER_STATUS[details.status].tone}`,
                      ]"
                    >
                      {{ TRANSFER_STATUS[details.status].label }}
                    </span>
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">
                    {{ details.receivedAt ? "أُرسل / استُلم" : "تاريخ الإرسال" }}
                  </span>
                  <span class="doc-num">
                    {{ details.sentAt ? formatDateTime(details.sentAt) : "لم يُرسل" }}
                    <template v-if="details.receivedAt">
                      / {{ formatDateTime(details.receivedAt) }}
                    </template>
                  </span>
                </div>
                <div v-if="details.note" class="doc-cell doc-grid__full">
                  <span class="doc-cell__sub">ملاحظة</span>
                  <span>{{ details.note }}</span>
                </div>
              </div>

              <div v-if="receiving" class="doc-note">
                <Info :size="16" />
                <span>
                  عدّل الكمية المستلمة إذا وصل أقل من المرسَل. الفرق يُسجَّل عجزاً
                  على التحويل ولا يدخل أي مخزن.
                </span>
              </div>

              <div class="doc-lines" :style="{ '--doc-cols': DETAILS_COLS }">
                <div class="doc-lines__head">
                  <span>الصنف</span>
                  <span>المرسَل</span>
                  <span>المستلَم</span>
                  <span>الفرق</span>
                </div>
                <div
                  v-for="line in receiveLines"
                  :key="line.productId"
                  class="doc-lines__row"
                >
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ line.name }}</span>
                    <span class="doc-cell__sub">{{ line.sku }} · {{ line.unit }}</span>
                  </div>
                  <div>
                    <span class="doc-lines__label">المرسَل</span>
                    <span class="doc-num doc-num--strong">
                      {{ formatNumber(line.quantity) }}
                    </span>
                  </div>
                  <div>
                    <span class="doc-lines__label">المستلَم</span>
                    <StbNumberInput
                      v-if="receiving"
                      v-model.number="line.received"
                      class="form-input"
                      min="0"
                      :max="line.quantity"
                      :step="line.allowsFractions ? 'any' : '1'"
                      required
                    />
                    <span v-else class="doc-num">
                      {{ line.received === "" ? "—" : formatNumber(line.received) }}
                    </span>
                  </div>
                  <div>
                    <span class="doc-lines__label">الفرق</span>
                    <span
                      class="doc-num"
                      :class="{ 'doc-num--out': shortage(line) > 0 }"
                    >
                      {{
                        line.received === ""
                          ? "—"
                          : shortage(line) > 0
                            ? formatSigned(-shortage(line))
                            : "0"
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeDetails">
                  {{ receiving ? "إلغاء" : "إغلاق" }}
                </button>
                <button
                  v-if="receiving"
                  type="submit"
                  class="btn btn--success"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting"
                >
                  <PackageCheck :size="16" /> تأكيد الاستلام
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      :title="pendingAction === 'send' ? 'إرسال التحويل' : 'إلغاء التحويل'"
      :message="confirmMessage"
      :confirm-text="pendingAction === 'send' ? 'إرسال' : 'إلغاء التحويل'"
      :loading="acting"
      @confirm="runAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Eye,
  Info,
  PackageCheck,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-vue-next";
import { useInventoryStore } from "@/stores/inventory";
import { useFormDraft } from "@/composables/useFormDraft";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  StockLookupRow,
  StockTransfer,
  TransferPayload,
  TransferStatus,
} from "@/types/inventory";

definePageMeta({ middleware: "auth" });

const store = useInventoryStore();
const toast = useToast();

const FORM_COLS = "2fr 0.8fr 1fr auto";
const DETAILS_COLS = "2fr 0.8fr 1fr 0.8fr";

const STATUS_TABS: { value: TransferStatus | ""; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "in_transit", label: "في الطريق" },
  { value: "received", label: "مستلَم" },
  { value: "cancelled", label: "ملغي" },
];

// ─── القائمة ──────────────────────────────────────────────────────────────────
const filters = reactive({
  status: "" as TransferStatus | "",
  warehouseId: "",
});

const list = usePagedList(
  (page) => store.fetchTransfers({ ...filters, page }),
  "تعذر تحميل التحويلات",
);

const setStatus = (status: TransferStatus | "") => {
  filters.status = status;
  list.load(1);
};

const activeWarehouses = computed(() =>
  store.warehouses.filter((w) => w.isActive),
);

// ─── نموذج المسودة ────────────────────────────────────────────────────────────
interface FormLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  allowsFractions: boolean;
  /** null = غير معروف (تعديل مسودة قديمة) */
  available: number | null;
  quantity: number | "";
}

const showForm = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const editingNumber = ref("");
const form = reactive({
  fromWarehouseId: "",
  toWarehouseId: "",
  note: "",
  lines: [] as FormLine[],
});

// تحويل طويل لا يضيع إن أُغلقت النافذة أو انقطع النت قبل الحفظ
const draft = useFormDraft("stock-transfer", {
  open: showForm,
  documentId: () => editingId.value,
  snapshot: () => form,
  apply: (data) => Object.assign(form, data),
});

const exceeds = (line: FormLine) =>
  line.available !== null &&
  line.quantity !== "" &&
  Number(line.quantity) > line.available;

const openCreate = () => {
  editingId.value = null;
  editingNumber.value = "";
  form.fromWarehouseId =
    activeWarehouses.value.find((w) => w.type === "main")?.id ?? "";
  form.toWarehouseId = "";
  form.note = "";
  form.lines = [];
  showForm.value = true;
  draft.start();
};

const openEdit = async (transfer: StockTransfer) => {
  try {
    const full = await store.getTransfer(transfer.id);
    editingId.value = full.id;
    editingNumber.value = full.number;
    form.fromWarehouseId = full.fromWarehouseId;
    form.toWarehouseId = full.toWarehouseId;
    form.note = full.note ?? "";
    form.lines = (full.lines ?? []).map((line) => ({
      productId: line.productId,
      name: line.product?.name ?? "",
      sku: line.product?.sku ?? "",
      unit: line.product?.baseUnit?.name ?? "",
      allowsFractions: line.product?.baseUnit?.allowsFractions ?? true,
      available: null,
      quantity: line.quantity,
    }));
    showForm.value = true;
    draft.start(full.updatedAt ?? null);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل التحويل"));
  }
};

const closeForm = () => {
  if (!submitting.value) showForm.value = false;
};

const addLine = (row: StockLookupRow) => {
  form.lines.push({
    productId: row.productId,
    name: row.name,
    sku: row.sku,
    unit: row.unit ?? "",
    allowsFractions: row.allowsFractions,
    available: row.quantity,
    quantity: "",
  });
};

const buildPayload = (): TransferPayload => ({
  fromWarehouseId: form.fromWarehouseId,
  toWarehouseId: form.toWarehouseId,
  note: form.note || undefined,
  lines: form.lines.map((l) => ({
    productId: l.productId,
    quantity: Number(l.quantity),
  })),
});

/** يحفظ المسودة، ثم يرسلها إن طُلب */
const submitForm = async (send: boolean) => {
  submitting.value = true;
  try {
    const saved = editingId.value
      ? await store.updateTransfer(editingId.value, buildPayload())
      : await store.createTransfer(buildPayload());
    // من هنا أي فشل (في الإرسال) يُبقي المسودة محفوظة: نكمل التعديل عليها
    editingId.value = saved.id;
    editingNumber.value = saved.number;
    draft.saved(saved.updatedAt ?? null);

    if (send) {
      await store.sendTransfer(saved.id);
      toast.success(`تم إرسال التحويل ${saved.number}`);
    } else {
      toast.success(`تم حفظ التحويل ${saved.number} كمسودة`);
    }
    showForm.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ التحويل"));
  } finally {
    submitting.value = false;
    await list.load();
  }
};

// زر "حفظ وإرسال" خارج submit: نتحقق من صحة الحقول يدوياً
const submitAndSend = (event: MouseEvent) => {
  const formEl = (event.currentTarget as HTMLElement).closest("form");
  if (formEl && !formEl.reportValidity()) return;
  submitForm(true);
};

// ─── العرض والاستلام ──────────────────────────────────────────────────────────
interface ReceiveLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  allowsFractions: boolean;
  quantity: number;
  received: number | "";
}

const details = ref<StockTransfer | null>(null);
const receiving = ref(false);
const receiveLines = ref<ReceiveLine[]>([]);

const shortage = (line: ReceiveLine) =>
  line.received === "" ? 0 : line.quantity - Number(line.received);

const openDetails = async (transfer: StockTransfer, receive: boolean) => {
  try {
    const full = await store.getTransfer(transfer.id);
    receiveLines.value = (full.lines ?? []).map((line) => ({
      productId: line.productId,
      name: line.product?.name ?? "",
      sku: line.product?.sku ?? "",
      unit: line.product?.baseUnit?.name ?? "",
      allowsFractions: line.product?.baseUnit?.allowsFractions ?? true,
      quantity: line.quantity,
      // عند الاستلام: الافتراضي أن كل المرسَل وصل
      received: line.receivedQuantity ?? (receive ? line.quantity : ""),
    }));
    receiving.value = receive && full.status === "in_transit";
    details.value = full;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل التحويل"));
  }
};

const closeDetails = () => {
  if (!submitting.value) details.value = null;
};

const submitReceive = async () => {
  if (!details.value || !receiving.value) return;
  submitting.value = true;
  try {
    await store.receiveTransfer(details.value.id, {
      lines: receiveLines.value.map((l) => ({
        productId: l.productId,
        receivedQuantity: Number(l.received),
      })),
    });
    toast.success(`تم استلام التحويل ${details.value.number}`);
    details.value = null;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر استلام التحويل"));
  } finally {
    submitting.value = false;
  }
};

// ─── إرسال / إلغاء من القائمة ─────────────────────────────────────────────────
const showConfirm = ref(false);
const acting = ref(false);
const pendingAction = ref<"send" | "cancel">("send");
const actionTarget = ref<StockTransfer | null>(null);

const confirmMessage = computed(() => {
  const transfer = actionTarget.value;
  if (!transfer) return "";
  if (pendingAction.value === "send") {
    return `سيُخصم التحويل ${transfer.number} من "${transfer.fromWarehouse?.name}" ويصبح في الطريق إلى "${transfer.toWarehouse?.name}".`;
  }
  return transfer.status === "in_transit"
    ? `إلغاء التحويل ${transfer.number} يعيد البضاعة إلى "${transfer.fromWarehouse?.name}".`
    : `هل تريد إلغاء المسودة ${transfer.number}؟`;
});

const askAction = (action: "send" | "cancel", transfer: StockTransfer) => {
  pendingAction.value = action;
  actionTarget.value = transfer;
  showConfirm.value = true;
};

const runAction = async () => {
  if (!actionTarget.value) return;
  acting.value = true;
  try {
    if (pendingAction.value === "send") {
      await store.sendTransfer(actionTarget.value.id);
      toast.success("تم إرسال التحويل");
    } else {
      await store.cancelTransfer(actionTarget.value.id);
      toast.success("تم إلغاء التحويل");
    }
    showConfirm.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تنفيذ العملية"));
  } finally {
    acting.value = false;
  }
};

onMounted(() => {
  store.fetchWarehouses().catch(() => {});
  list.load(1);
});
</script>
