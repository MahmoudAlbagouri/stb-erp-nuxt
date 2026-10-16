<!-- pages/dashboard/inventory/stocktakes.vue — الجرد: عدّ فعلي ثم اعتماد يسوّي الأرصدة -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الجرد</h1>
        <p>سجّل ما عددته فعلياً، وعند الاعتماد يُسوّى رصيد النظام عليه</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_stocktakes'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>جرد جديد</span>
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
        <option value="">كل المخازن</option>
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
        <ClipboardCheck :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد عمليات جرد</div>
        <div class="empty-state__text">
          الجرد الدوري يكشف العجز والزيادة ويُبقي أرصدة النظام مطابقة للواقع
        </div>
        <button
          v-can="'manage_stocktakes'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> جرد جديد
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
                <th>المخزن</th>
                <th>الأصناف</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in list.rows.value" :key="s.id">
                <td><code class="doc-code">{{ s.number }}</code></td>
                <td>{{ s.warehouse?.name || "—" }}</td>
                <td>
                  <span class="doc-num">{{ formatNumber(s.linesCount ?? 0) }}</span>
                </td>
                <td>
                  <span class="doc-num">
                    {{ formatDate(s.postedAt || s.createdAt) }}
                  </span>
                </td>
                <td>
                  <span
                    :class="['badge', `doc-status--${STOCKTAKE_STATUS[s.status].tone}`]"
                  >
                    {{ STOCKTAKE_STATUS[s.status].label }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <template v-if="s.status === 'draft'">
                      <NuxtLink
                        v-can="'manage_stocktakes'"
                        :to="`/stocktake/${s.id}`"
                        class="btn btn--sm btn--primary"
                        title="عدّ بالباركود من الجوال أو التابلت — يعمل بلا إنترنت"
                      >
                        <ScanBarcode :size="14" /> شاشة العدّ
                      </NuxtLink>
                      <button
                        v-can="'manage_stocktakes'"
                        class="btn btn--sm btn--secondary"
                        @click="openForm(s)"
                      >
                        <Pencil :size="14" /> مراجعة واعتماد
                      </button>
                      <button
                        v-can="'manage_stocktakes'"
                        class="btn btn--sm btn--danger btn--icon"
                        title="إلغاء الجرد"
                        @click="askCancel(s)"
                      >
                        <Ban :size="14" />
                      </button>
                    </template>
                    <button
                      v-else
                      class="btn btn--sm btn--ghost"
                      @click="openForm(s)"
                    >
                      <Eye :size="14" /> عرض
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
        label="جرد"
        @change="list.load"
      />
    </template>

    <!-- ══ نموذج الجرد (مسودة قابلة للتعديل، أو عرض فقط) ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <ClipboardCheck :size="20" class="doc-modal__icon" />
                {{ form.number ? `الجرد ${form.number}` : "جرد جديد" }}
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
              <FormDraftNotice v-if="!readOnly" :draft="draft" />
              <div class="doc-grid">
                <div class="form-group">
                  <label>المخزن *</label>
                  <select
                    v-model="form.warehouseId"
                    class="form-select"
                    required
                    :disabled="readOnly || form.lines.length > 0"
                  >
                    <option value="" disabled>اختر المخزن...</option>
                    <option v-for="w in warehouseOptions" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                  <small v-if="!readOnly && form.lines.length" class="doc-hint">
                    احذف الأصناف لتغيير المخزن
                  </small>
                </div>
                <div class="form-group">
                  <label>ملاحظة</label>
                  <input
                    v-model.trim="form.note"
                    class="form-input"
                    maxlength="500"
                    :disabled="readOnly"
                    :placeholder="readOnly ? '' : 'مثال: جرد نهاية الشهر'"
                  />
                </div>
              </div>

              <section class="doc-section">
                <h4 class="doc-section__title">الأصناف المعدودة</h4>

                <template v-if="!readOnly">
                  <StockProductPicker
                    :warehouse-id="form.warehouseId"
                    :exclude="form.lines.map((l) => l.productId)"
                    @pick="addLine"
                  />
                  <button
                    type="button"
                    class="btn btn--dashed btn--sm btn--full"
                    :disabled="!form.warehouseId || loadingAll"
                    @click="addAllWarehouseItems"
                  >
                    <ListPlus :size="14" />
                    {{ loadingAll ? "جارٍ التحميل..." : "إضافة كل أصناف المخزن" }}
                  </button>
                </template>

                <div class="doc-lines" :style="{ '--doc-cols': LINE_COLS }">
                  <div class="doc-lines__head">
                    <span>الصنف</span>
                    <span>رصيد النظام</span>
                    <span>المعدود</span>
                    <span>الفرق</span>
                    <span />
                  </div>
                  <div v-if="!form.lines.length" class="doc-lines__empty">
                    لم تُضف أصناف بعد — ابحث عن صنف أو أضف كل أصناف المخزن
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
                      <span class="doc-lines__label">رصيد النظام</span>
                      <span class="doc-num">{{ formatNumber(line.system) }}</span>
                    </div>
                    <div>
                      <span class="doc-lines__label">المعدود</span>
                      <StbNumberInput
                        v-if="!readOnly"
                        v-model.number="line.counted"
                        class="form-input"
                        min="0"
                        :step="line.allowsFractions ? 'any' : '1'"
                        required
                      />
                      <span v-else class="doc-num doc-num--strong">
                        {{ formatNumber(Number(line.counted)) }}
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">الفرق</span>
                      <span
                        v-if="line.counted !== ''"
                        class="doc-num"
                        :class="{
                          'doc-num--in': difference(line) > 0,
                          'doc-num--out': difference(line) < 0,
                        }"
                      >
                        {{ difference(line) ? formatSigned(difference(line)) : "0" }}
                      </span>
                      <span v-else>—</span>
                    </div>
                    <button
                      v-if="!readOnly"
                      type="button"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="form.lines.splice(index, 1)"
                    >
                      <Trash2 :size="14" />
                    </button>
                    <span v-else />
                  </div>
                </div>

                <div v-if="form.lines.length" class="totals">
                  <span>
                    عجز:
                    <strong class="doc-money doc-money--out">
                      {{ formatCurrency(totals.shortage) }}
                    </strong>
                  </span>
                  <span>
                    زيادة:
                    <strong class="doc-money doc-money--in">
                      {{ formatCurrency(totals.surplus) }}
                    </strong>
                  </span>
                  <span class="doc-hint">بمتوسط التكلفة</span>
                </div>
              </section>

              <div v-if="!readOnly" class="doc-note">
                <Info :size="16" />
                <span>
                  الاعتماد يجعل رصيد كل صنف مساوياً للكمية المعدودة ولا يمكن
                  التراجع عنه. الأصناف غير المدرجة لا تتغير. للعدّ بالباركود من
                  الجوال داخل المخزن (يعمل بلا إنترنت) افتح «شاشة العدّ»، ثم
                  ارجع هنا للمراجعة والاعتماد بعد رفع كل العدّ.
                </span>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeForm">
                  {{ readOnly ? "إغلاق" : "إلغاء" }}
                </button>
                <template v-if="!readOnly">
                  <button
                    type="button"
                    class="btn btn--ghost"
                    :disabled="submitting || !form.warehouseId"
                    @click="openCountingScreen"
                  >
                    <ScanBarcode :size="16" /> شاشة العدّ
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
                    @click="askPost"
                  >
                    <CheckCheck :size="16" /> حفظ واعتماد
                  </button>
                </template>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showPostConfirm"
      title="اعتماد الجرد"
      message="ستُسوّى أرصدة الأصناف المدرجة على الكميات المعدودة. لا يمكن التراجع بعد الاعتماد."
      confirm-text="اعتماد"
      :loading="submitting"
      @confirm="submitForm(true)"
    />

    <ConfirmDialog
      v-model="showCancelConfirm"
      title="إلغاء الجرد"
      :message="`هل تريد إلغاء الجرد ${cancelTarget?.number}؟ لن تتغير أي أرصدة.`"
      confirm-text="إلغاء الجرد"
      :loading="cancelling"
      @confirm="doCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  Ban,
  CheckCheck,
  ClipboardCheck,
  Eye,
  Info,
  ListPlus,
  Pencil,
  Plus,
  ScanBarcode,
  Trash2,
  X,
} from "lucide-vue-next";
import { useInventoryStore } from "@/stores/inventory";
import { useFormDraft } from "@/composables/useFormDraft";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  StockLookupRow,
  Stocktake,
  StocktakePayload,
  StocktakeStatus,
} from "@/types/inventory";

definePageMeta({ middleware: "auth" });

const store = useInventoryStore();
const toast = useToast();

const LINE_COLS = "2fr 0.8fr 1fr 0.8fr auto";
/** أقصى عدد أصناف يُحمَّل بزر "كل أصناف المخزن" (حد الصفحة في الـ API) */
const BULK_LIMIT = 200;

const STATUS_TABS: { value: StocktakeStatus | ""; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "posted", label: "معتمد" },
  { value: "cancelled", label: "ملغي" },
];

// ─── القائمة ──────────────────────────────────────────────────────────────────
const filters = reactive({
  status: "" as StocktakeStatus | "",
  warehouseId: "",
});

const list = usePagedList(
  (page) => store.fetchStocktakes({ ...filters, page }),
  "تعذر تحميل عمليات الجرد",
);

const setStatus = (status: StocktakeStatus | "") => {
  filters.status = status;
  list.load(1);
};

// ─── النموذج ──────────────────────────────────────────────────────────────────
interface FormLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  allowsFractions: boolean;
  /** رصيد النظام: الحالي للمسودة، ولحظة الاعتماد للمعتمد */
  system: number;
  unitCost: number;
  counted: number | "";
}

const showForm = ref(false);
const submitting = ref(false);
const loadingAll = ref(false);
const form = reactive({
  id: null as string | null,
  number: "",
  status: "draft" as StocktakeStatus,
  warehouseId: "",
  note: "",
  lines: [] as FormLine[],
});
/**
 * updatedAt كما فُتح الجرد: يُرسل مع الحفظ، فإن عُدّ شيء من شاشة العدّ بعدها
 * يرفض السيرفر الحفظ (409) بدل أن يمسحه
 */
const loadedVersion = ref<string | null>(null);

const readOnly = computed(() => form.status !== "draft");

// عدّ طويل في النافذة لا يضيع إن أُغلقت أو انقطع النت قبل الحفظ
const draft = useFormDraft("stocktake", {
  open: showForm,
  documentId: () => form.id,
  snapshot: () => form,
  apply: (data) => Object.assign(form, data),
});

// جرد قديم قد يكون على مخزن أُوقف لاحقاً: يبقى ظاهراً في العرض
const warehouseOptions = computed(() =>
  store.warehouses.filter((w) => w.isActive || w.id === form.warehouseId),
);

const difference = (line: FormLine) =>
  line.counted === "" ? 0 : Number(line.counted) - line.system;

const totals = computed(() => {
  let shortage = 0;
  let surplus = 0;
  for (const line of form.lines) {
    const value = difference(line) * line.unitCost;
    if (value < 0) shortage += -value;
    else surplus += value;
  }
  return { shortage, surplus };
});

const openCreate = () => {
  Object.assign(form, {
    id: null,
    number: "",
    status: "draft",
    warehouseId: filters.warehouseId,
    note: "",
    lines: [],
  });
  loadedVersion.value = null;
  showForm.value = true;
  draft.start();
};

const openForm = async (stocktake: Stocktake) => {
  try {
    const full = await store.getStocktake(stocktake.id);
    Object.assign(form, {
      id: full.id,
      number: full.number,
      status: full.status,
      warehouseId: full.warehouseId,
      note: full.note ?? "",
      lines: (full.lines ?? []).map(
        (line): FormLine => ({
          productId: line.productId,
          name: line.product?.name ?? "",
          sku: line.product?.sku ?? "",
          unit: line.product?.baseUnit?.name ?? "",
          allowsFractions: line.product?.baseUnit?.allowsFractions ?? true,
          system: line.expectedQuantity ?? line.currentQuantity ?? 0,
          unitCost: line.unitCost,
          counted: line.countedQuantity,
        }),
      ),
    });
    loadedVersion.value = full.updatedAt ?? null;
    showForm.value = true;
    if (full.status === "draft") draft.start(loadedVersion.value);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الجرد"));
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
    system: row.quantity,
    unitCost: row.avgCost,
    counted: "",
  });
};

/** يضيف كل ما له رصيد في المخزن (غير المضاف) ليُعدّ صنفاً صنفاً */
const addAllWarehouseItems = async () => {
  loadingAll.value = true;
  try {
    const res = await store.fetchStock({
      warehouseId: form.warehouseId,
      limit: BULK_LIMIT,
    });
    const existing = new Set(form.lines.map((l) => l.productId));
    for (const row of res.data) {
      if (existing.has(row.productId)) continue;
      form.lines.push({
        productId: row.productId,
        name: row.productName,
        sku: row.sku,
        unit: row.unit ?? "",
        allowsFractions: true,
        system: row.quantity,
        unitCost: row.avgCost,
        counted: "",
      });
    }
    if (res.total > BULK_LIMIT) {
      toast.warning(
        `أُضيف أول ${BULK_LIMIT} صنف من ${res.total} — أضف الباقي بالبحث أو في جرد آخر`,
      );
    } else if (!res.data.length) {
      toast.info("لا توجد أصناف لها رصيد في هذا المخزن");
    }
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل أصناف المخزن"));
  } finally {
    loadingAll.value = false;
  }
};

const buildPayload = (): StocktakePayload => ({
  warehouseId: form.warehouseId,
  note: form.note || undefined,
  lines: form.lines.map((l) => ({
    productId: l.productId,
    countedQuantity: Number(l.counted),
  })),
  expectedUpdatedAt: (form.id && loadedVersion.value) || undefined,
});

/** حفظ ما في النافذة ثم فتح شاشة العدّ عليه (جرد جديد يُنشأ فارغاً إن لزم) */
const openCountingScreen = async (event: MouseEvent) => {
  const formEl = (event.currentTarget as HTMLElement).closest("form");
  if (formEl && !formEl.reportValidity()) return;
  submitting.value = true;
  try {
    const saved = form.id
      ? await store.updateStocktake(form.id, buildPayload())
      : await store.createStocktake(buildPayload());
    form.id = saved.id;
    loadedVersion.value = saved.updatedAt ?? null;
    draft.saved(loadedVersion.value);
    showForm.value = false;
    await navigateTo(`/stocktake/${saved.id}`);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الجرد"));
  } finally {
    submitting.value = false;
  }
};

// ─── الحفظ والاعتماد ──────────────────────────────────────────────────────────
const showPostConfirm = ref(false);

const askPost = (event: MouseEvent) => {
  const formEl = (event.currentTarget as HTMLElement).closest("form");
  if (formEl && !formEl.reportValidity()) return;
  showPostConfirm.value = true;
};

/** يحفظ المسودة، ثم يعتمدها إن طُلب */
const submitForm = async (post: boolean) => {
  submitting.value = true;
  try {
    const saved = form.id
      ? await store.updateStocktake(form.id, buildPayload())
      : await store.createStocktake(buildPayload());
    // من هنا فشل الاعتماد يُبقي المسودة محفوظة: نكمل عليها
    form.id = saved.id;
    form.number = saved.number;
    loadedVersion.value = saved.updatedAt ?? null;
    draft.saved(loadedVersion.value);

    if (post) {
      await store.postStocktake(saved.id);
      toast.success(`تم اعتماد الجرد ${saved.number}`);
    } else {
      toast.success(`تم حفظ الجرد ${saved.number} كمسودة`);
    }
    showPostConfirm.value = false;
    showForm.value = false;
  } catch (e) {
    showPostConfirm.value = false;
    toast.error(getErrorMessage(e, "تعذر حفظ الجرد"));
  } finally {
    submitting.value = false;
    await list.load();
  }
};

// ─── الإلغاء ──────────────────────────────────────────────────────────────────
const showCancelConfirm = ref(false);
const cancelling = ref(false);
const cancelTarget = ref<Stocktake | null>(null);

const askCancel = (stocktake: Stocktake) => {
  cancelTarget.value = stocktake;
  showCancelConfirm.value = true;
};

const doCancel = async () => {
  if (!cancelTarget.value) return;
  cancelling.value = true;
  try {
    await store.cancelStocktake(cancelTarget.value.id);
    toast.success("تم إلغاء الجرد");
    showCancelConfirm.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إلغاء الجرد"));
  } finally {
    cancelling.value = false;
  }
};

onMounted(() => {
  store.fetchWarehouses().catch(() => {});
  list.load(1);
});
</script>

<style lang="scss" scoped>
.totals {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-2 $space-5;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}
</style>
