<!-- pages/dashboard/inventory/index.vue — أرصدة المخزون + التسوية والرصيد الافتتاحي -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>أرصدة المخزون</h1>
        <p>رصيد كل صنف في كل مخزن وقيمته بمتوسط التكلفة</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'adjust_stock'"
          class="btn btn--ghost"
          @click="openAdjust('opening')"
        >
          <PackagePlus :size="16" />
          <span>رصيد افتتاحي</span>
        </button>
        <button
          v-can="'adjust_stock'"
          class="btn btn--primary"
          @click="openAdjust('adjustment')"
        >
          <Scale :size="18" />
          <span>تسوية مخزون</span>
        </button>
      </div>
    </div>

    <!-- ══ الأرقام ══ -->
    <div class="doc-stats">
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--accent"><Banknote :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatCurrency(summary.value) }}</div>
          <div class="stat-card__label">قيمة المخزون</div>
        </div>
      </div>
      <button
        class="stat-card"
        :class="{ 'is-active': filters.alert === 'low' }"
        @click="toggleAlert('low')"
      >
        <div class="stat-card__icon doc-tone--warning">
          <AlertTriangle :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatNumber(summary.low) }}</div>
          <div class="stat-card__label">تحت حد الطلب</div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ 'is-active': filters.alert === 'negative' }"
        @click="toggleAlert('negative')"
      >
        <div class="stat-card__icon doc-tone--danger">
          <TrendingDown :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatNumber(summary.negative) }}</div>
          <div class="stat-card__label">رصيد سالب</div>
        </div>
      </button>
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--info"><Truck :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            {{ formatCurrency(summary.inTransitValue) }}
          </div>
          <div class="stat-card__label">بضاعة في الطريق</div>
        </div>
      </div>
    </div>

    <!-- ══ الفلاتر ══ -->
    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="filters.search"
          class="form-input"
          placeholder="بحث باسم الصنف أو كوده..."
          @input="onSearchInput"
        />
      </div>
      <select
        v-model="filters.warehouseId"
        class="form-select"
        @change="onWarehouseChange"
      >
        <option value="">كل المخازن</option>
        <option v-for="w in store.warehouses" :key="w.id" :value="w.id">
          {{ w.name }}
        </option>
      </select>
      <select v-model="filters.alert" class="form-select" @change="list.load(1)">
        <option value="">كل الأرصدة</option>
        <option value="low">تحت حد الطلب</option>
        <option value="negative">رصيد سالب</option>
      </select>
    </div>

    <!-- ══ القائمة ══ -->
    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <PackageSearch :size="44" class="empty-state__icon" />
        <div class="empty-state__title">
          {{ hasFilters ? "لا توجد أرصدة مطابقة" : "لا توجد أرصدة بعد" }}
        </div>
        <div class="empty-state__text">
          {{
            hasFilters
              ? "جرّب تغيير كلمة البحث أو الفلاتر"
              : "ابدأ بتسجيل الرصيد الافتتاحي لأصنافك في المخزن الرئيسي"
          }}
        </div>
        <button
          v-if="!hasFilters"
          v-can="'adjust_stock'"
          class="btn btn--primary"
          @click="openAdjust('opening')"
        >
          <PackagePlus :size="16" /> رصيد افتتاحي
        </button>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>المخزن</th>
                <th>الرصيد</th>
                <th>حد الطلب</th>
                <th>متوسط التكلفة</th>
                <th>القيمة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in list.rows.value"
                :key="`${row.warehouseId}-${row.productId}`"
              >
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ row.productName }}</span>
                    <span class="doc-cell__sub">{{ row.sku }}</span>
                  </div>
                </td>
                <td>{{ row.warehouseName }}</td>
                <td>
                  <span class="doc-qty">
                    <span
                      class="doc-num"
                      :class="
                        row.quantity < 0 ? 'doc-num--out' : 'doc-num--strong'
                      "
                    >
                      {{ formatNumber(row.quantity) }}
                    </span>
                    <span class="doc-cell__sub">{{ row.unit }}</span>
                  </span>
                </td>
                <td>
                  <span v-if="row.minQuantity !== null" class="doc-num">
                    {{ formatNumber(row.minQuantity) }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <span class="doc-money">{{ formatCurrency(row.avgCost) }}</span>
                </td>
                <td>
                  <span class="doc-money doc-money--strong">
                    {{ formatCurrency(row.value) }}
                  </span>
                </td>
                <td>
                  <span :class="['badge', STOCK_STATUS[row.status].className]">
                    {{ STOCK_STATUS[row.status].label }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <NuxtLink
                      class="btn btn--sm btn--ghost"
                      :to="{
                        path: '/dashboard/inventory/movements',
                        query: {
                          productId: row.productId,
                          warehouseId: row.warehouseId,
                          name: row.productName,
                        },
                      }"
                    >
                      <History :size="14" /> الحركات
                    </NuxtLink>
                    <button
                      v-can="'adjust_stock'"
                      class="btn btn--sm btn--ghost btn--icon"
                      title="حد إعادة الطلب"
                      @click="openMin(row)"
                    >
                      <BellRing :size="14" />
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
        label="رصيد"
        @change="list.load"
      />
    </template>

    <!-- ══ نموذج التسوية / الرصيد الافتتاحي ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAdjust" class="modal-overlay" @click.self="closeAdjust">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <component
                  :is="isOpening ? PackagePlus : Scale"
                  :size="20"
                  class="doc-modal__icon"
                />
                {{ isOpening ? "رصيد افتتاحي" : "تسوية مخزون" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeAdjust"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="submitAdjust">
              <div class="doc-grid">
                <div class="form-group">
                  <label>المخزن *</label>
                  <select
                    v-model="adjust.warehouseId"
                    class="form-select"
                    required
                    :disabled="adjust.lines.length > 0"
                  >
                    <option value="" disabled>اختر المخزن...</option>
                    <option v-for="w in activeWarehouses" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                  <small v-if="adjust.lines.length" class="doc-hint">
                    احذف الأصناف لتغيير المخزن
                  </small>
                </div>
                <div class="form-group">
                  <label>{{ isOpening ? "ملاحظة" : "سبب التسوية" }}</label>
                  <input
                    v-model.trim="adjust.note"
                    class="form-input"
                    maxlength="500"
                    :placeholder="isOpening ? 'اختياري' : 'تالف، فاقد، خطأ إدخال...'"
                  />
                </div>
              </div>

              <div v-if="!isOpening" class="doc-note">
                <Info :size="16" />
                <span>
                  اكتب الكمية موجبة للزيادة وسالبة للنقص — مثال:
                  <span class="doc-num doc-num--strong">-3</span>
                  لثلاث قطع تالفة.
                </span>
              </div>

              <section class="doc-section">
                <h4 class="doc-section__title">الأصناف</h4>
                <StockProductPicker
                  :warehouse-id="adjust.warehouseId"
                  :exclude="adjust.lines.map((l) => l.productId)"
                  @pick="addAdjustLine"
                />

                <div class="doc-lines" :style="{ '--doc-cols': ADJUST_COLS }">
                  <div class="doc-lines__head">
                    <span>الصنف</span>
                    <span>الرصيد الحالي</span>
                    <span>الكمية</span>
                    <span>تكلفة الوحدة</span>
                    <span>الرصيد بعد</span>
                    <span />
                  </div>
                  <div v-if="!adjust.lines.length" class="doc-lines__empty">
                    لم تُضف أصناف بعد — ابحث عن صنف بالأعلى
                  </div>
                  <div
                    v-for="(line, index) in adjust.lines"
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
                      <span class="doc-lines__label">الرصيد الحالي</span>
                      <span class="doc-num">{{ formatNumber(line.current) }}</span>
                    </div>
                    <div>
                      <span class="doc-lines__label">الكمية</span>
                      <StbNumberInput
                        v-model.number="line.quantity"
                        class="form-input"
                        :min="isOpening ? MIN_QUANTITY : undefined"
                        :step="line.allowsFractions ? 'any' : '1'"
                        required
                      />
                    </div>
                    <div>
                      <span class="doc-lines__label">تكلفة الوحدة</span>
                      <StbNumberInput
                        v-model.number="line.unitCost"
                        class="form-input"
                        min="0"
                        step="any"
                        :required="isOpening"
                        :disabled="Number(line.quantity) < 0"
                        :placeholder="isOpening ? '' : 'بالمتوسط'"
                      />
                    </div>
                    <div>
                      <span class="doc-lines__label">الرصيد بعد</span>
                      <span
                        class="doc-num"
                        :class="
                          balanceAfter(line) < 0 ? 'doc-num--out' : 'doc-num--strong'
                        "
                      >
                        {{ formatNumber(balanceAfter(line)) }}
                      </span>
                    </div>
                    <button
                      type="button"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="adjust.lines.splice(index, 1)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>
              </section>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeAdjust">
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting || !adjust.lines.length"
                >
                  {{ isOpening ? "تسجيل الرصيد" : "تنفيذ التسوية" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ حد إعادة الطلب ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="minTarget" class="modal-overlay" @click.self="minTarget = null">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <BellRing :size="20" class="doc-modal__icon" />
                حد إعادة الطلب
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="minTarget = null"
              >
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="submitMin">
              <p class="doc-hint">
                {{ minTarget.productName }} — {{ minTarget.warehouseName }}
              </p>
              <div class="form-group">
                <label>نبّهني عندما يصل الرصيد إلى</label>
                <StbNumberInput
                  v-model.number="minValue"
                  class="form-input"
                  min="0"
                  step="any"
                  placeholder="اتركه فارغاً لإلغاء التنبيه"
                />
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="minTarget = null"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  AlertTriangle,
  Banknote,
  BellRing,
  History,
  Info,
  PackagePlus,
  PackageSearch,
  Scale,
  Search,
  Trash2,
  TrendingDown,
  Truck,
  X,
} from "lucide-vue-next";
import { useInventoryStore } from "@/stores/inventory";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  StockAlert,
  StockLookupRow,
  StockRow,
  StockSummary,
} from "@/types/inventory";

definePageMeta({ middleware: "auth" });

const store = useInventoryStore();
const toast = useToast();
const route = useRoute();

const MIN_QUANTITY = "0.0001";
const ADJUST_COLS = "2fr 0.8fr 1fr 1fr 0.8fr auto";

const STOCK_STATUS: Record<
  StockRow["status"],
  { label: string; className: string }
> = {
  ok: { label: "متوفر", className: "doc-status--done" },
  low: { label: "منخفض", className: "doc-status--progress" },
  negative: { label: "سالب", className: "doc-status--cancelled" },
};

// ─── الفلاتر والقائمة ─────────────────────────────────────────────────────────
const filters = reactive({
  search: "",
  // قادماً من صفحة المخازن: ‎?warehouseId=...
  warehouseId:
    typeof route.query.warehouseId === "string" ? route.query.warehouseId : "",
  alert: "" as StockAlert | "",
});

const hasFilters = computed(
  () => !!filters.search || !!filters.warehouseId || !!filters.alert,
);

const list = usePagedList(
  (page) => store.fetchStock({ ...filters, page }),
  "تعذر تحميل الأرصدة",
);

const summary = ref<StockSummary>({
  items: 0,
  value: 0,
  low: 0,
  negative: 0,
  inTransitValue: 0,
});

const loadSummary = async () => {
  try {
    summary.value = await store.fetchSummary(filters.warehouseId || undefined);
  } catch {
    // الأرقام العلوية مكمّلة: فشلها لا يمنع عرض القائمة
  }
};

const refresh = () => Promise.all([list.load(), loadSummary()]);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => list.load(1), 350);
};

const onWarehouseChange = () => {
  list.load(1);
  loadSummary();
};

const toggleAlert = (alert: StockAlert) => {
  filters.alert = filters.alert === alert ? "" : alert;
  list.load(1);
};

const activeWarehouses = computed(() =>
  store.warehouses.filter((w) => w.isActive),
);

// ─── التسوية / الرصيد الافتتاحي ───────────────────────────────────────────────
interface AdjustLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  allowsFractions: boolean;
  current: number;
  quantity: number | "";
  unitCost: number | "";
}

const showAdjust = ref(false);
const submitting = ref(false);
const adjust = reactive({
  type: "adjustment" as "opening" | "adjustment",
  warehouseId: "",
  note: "",
  lines: [] as AdjustLine[],
});

const isOpening = computed(() => adjust.type === "opening");

const openAdjust = (type: "opening" | "adjustment") => {
  adjust.type = type;
  adjust.note = "";
  adjust.lines = [];
  // الافتراضي: المخزن المفلتر عليه، وإلا الرئيسي
  adjust.warehouseId =
    activeWarehouses.value.find((w) => w.id === filters.warehouseId)?.id ??
    activeWarehouses.value.find((w) => w.type === "main")?.id ??
    "";
  showAdjust.value = true;
};

const closeAdjust = () => {
  if (!submitting.value) showAdjust.value = false;
};

const addAdjustLine = (row: StockLookupRow) => {
  adjust.lines.push({
    productId: row.productId,
    name: row.name,
    sku: row.sku,
    unit: row.unit ?? "",
    allowsFractions: row.allowsFractions,
    current: row.quantity,
    quantity: "",
    // الرصيد الافتتاحي: نقترح متوسط التكلفة الحالي إن وُجد
    unitCost: isOpening.value && row.avgCost > 0 ? row.avgCost : "",
  });
};

const balanceAfter = (line: AdjustLine) =>
  line.current + (Number(line.quantity) || 0);

const submitAdjust = async () => {
  if (adjust.lines.some((l) => !Number(l.quantity))) {
    toast.error("أدخل كمية (غير الصفر) لكل صنف");
    return;
  }
  submitting.value = true;
  try {
    await store.adjust({
      warehouseId: adjust.warehouseId,
      type: adjust.type,
      note: adjust.note || undefined,
      lines: adjust.lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost:
          l.unitCost === "" || Number(l.quantity) < 0
            ? undefined
            : Number(l.unitCost),
      })),
    });
    toast.success(isOpening.value ? "تم تسجيل الرصيد الافتتاحي" : "تمت التسوية");
    showAdjust.value = false;
    await refresh();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تنفيذ العملية"));
  } finally {
    submitting.value = false;
  }
};

// ─── حد إعادة الطلب ───────────────────────────────────────────────────────────
const minTarget = ref<StockRow | null>(null);
const minValue = ref<number | "">("");

const openMin = (row: StockRow) => {
  minTarget.value = row;
  minValue.value = row.minQuantity ?? "";
};

const submitMin = async () => {
  if (!minTarget.value) return;
  submitting.value = true;
  try {
    await store.setMinQuantity(
      minTarget.value.warehouseId,
      minTarget.value.productId,
      minValue.value === "" ? null : Number(minValue.value),
    );
    toast.success("تم حفظ حد إعادة الطلب");
    minTarget.value = null;
    await refresh();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ حد إعادة الطلب"));
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  try {
    await store.fetchWarehouses();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل المخازن"));
  }
  await refresh();
});
</script>
