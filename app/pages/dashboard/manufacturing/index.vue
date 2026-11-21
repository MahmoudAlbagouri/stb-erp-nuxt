<!-- pages/dashboard/manufacturing/index.vue — أوامر الإنتاج ولوحة المصنع -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>أوامر الإنتاج</h1>
        <p>
          من التخطيط للإكمال: الخامات، الوقت، الاستلام بالدفعات، والتكلفة
          الفعلية
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'plan_production'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" /> <span>أمر إنتاج</span>
        </button>
      </div>
    </div>

    <div v-if="summary" class="stats-grid">
      <div class="stat-card">
        <span class="stat-card__label">مسودات</span
        ><strong>{{ summary.draft }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">مُطلقة</span
        ><strong>{{ summary.released }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">قيد التنفيذ</span
        ><strong>{{ summary.inProgress }}</strong>
      </div>
      <div class="stat-card" :class="{ 'is-warn': summary.late }">
        <span class="stat-card__label">متأخرة عن التسليم</span
        ><strong>{{ summary.late }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">مكتملة هذا الشهر</span>
        <strong>{{ summary.completedThisMonth }}</strong>
        <small>{{ formatCurrency(summary.producedValueThisMonth) }}</small>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">نسبة الهالك هذا الشهر</span>
        <strong>{{ formatNumber(summary.scrapRateThisMonth) }}%</strong>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        class="doc-tab"
        :class="{ 'is-active': filters.status === tab.value }"
        @click="setStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="filters.search"
          class="form-input"
          placeholder="رقم الأمر أو المنتج أو المرجع..."
          @input="onSearch"
        />
      </div>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>
    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <Factory :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا أوامر إنتاج</div>
        <div class="empty-state__text">أنشئ أمراً لمنتج له قائمة مكوّنات</div>
      </div>
    </div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الأمر</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>الإنجاز</th>
              <th>البدء / التسليم</th>
              <th>الحالة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in list.rows.value"
              :key="o.id"
              class="is-clickable"
              @click="open(o)"
            >
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ o.number }}</span>
                  <span class="doc-cell__sub"
                    >أولوية {{ o.priority
                    }}<template v-if="o.reference">
                      · {{ o.reference }}</template
                    ></span
                  >
                </div>
              </td>
              <td>
                <div class="doc-cell">
                  <span>{{ o.product?.name }}</span>
                  <span class="doc-cell__sub">{{ o.warehouse?.name }}</span>
                </div>
              </td>
              <td class="doc-num">
                {{ formatNumber(o.producedQuantity) }} /
                {{ formatNumber(o.plannedQuantity) }}
                {{ o.product?.baseUnit?.name }}
              </td>
              <td>
                <div class="progress">
                  <span :style="{ width: `${o.progress}%` }" />
                </div>
                <small class="doc-num">{{ formatNumber(o.progress) }}%</small>
              </td>
              <td>
                <div class="doc-cell">
                  <span class="doc-num">{{
                    o.plannedStartDate ? formatDate(o.plannedStartDate) : "—"
                  }}</span>
                  <span
                    class="doc-cell__sub"
                    :class="{ 'doc-num--out': o.late }"
                  >
                    {{ o.plannedEndDate ? formatDate(o.plannedEndDate) : "—"
                    }}<template v-if="o.late"> · متأخر</template>
                  </span>
                </div>
              </td>
              <td>
                <span
                  :class="['badge', `doc-status--${STATUS[o.status].tone}`]"
                  >{{ STATUS[o.status].label }}</span
                >
              </td>
              <td><ChevronLeft :size="16" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <DocPager
      v-if="list.ready.value"
      :total="list.total.value"
      :page="list.page.value"
      :total-pages="list.totalPages.value"
      label="أمر"
      @change="list.load"
    />

    <!-- ══ أمر جديد ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreate"
          class="modal-overlay"
          @click.self="showCreate = false"
        >
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <Factory :size="20" class="doc-modal__icon" /> أمر إنتاج جديد
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showCreate = false"
              >
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="create">
              <div class="doc-grid">
                <div class="form-group doc-grid__full">
                  <label>المنتج *</label>
                  <div v-if="form.product" class="picked">
                    <span
                      >{{ form.product.name }}
                      <small>{{ form.product.sku }}</small></span
                    >
                    <button
                      type="button"
                      class="btn btn--sm btn--ghost"
                      @click="clearProduct"
                    >
                      تغيير
                    </button>
                  </div>
                  <CatalogProductPicker
                    v-else
                    :types="['stocked']"
                    placeholder="ابحث عن المنتج المصنّع..."
                    @pick="pickProduct"
                  />
                </div>
                <div v-if="form.product" class="form-group doc-grid__full">
                  <label>قائمة المكوّنات *</label>
                  <select v-model="form.bomId" class="form-select" required>
                    <option v-if="!boms.length" value="" disabled>
                      لا قائمة تصنيع لهذا المنتج — أنشئها أولاً
                    </option>
                    <option v-for="b in boms" :key="b.id" :value="b.id">
                      {{ b.name }} (إصدار {{ b.version }}){{
                        b.isDefault ? " — الافتراضية" : ""
                      }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>الكمية المطلوبة *</label>
                  <StbNumberInput
                    v-model.number="form.plannedQuantity"
                    class="form-input"
                    min="0.0001"
                    step="any"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>الأولوية</label>
                  <select v-model.number="form.priority" class="form-select">
                    <option v-for="p in 5" :key="p" :value="p">
                      {{ p
                      }}{{ p === 1 ? " (عاجل)" : p === 5 ? " (منخفض)" : "" }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>مخزن الناتج *</label>
                  <select
                    v-model="form.warehouseId"
                    class="form-select"
                    required
                  >
                    <option v-for="w in warehouses" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>مخزن الخامات</label>
                  <select
                    v-model="form.materialsWarehouseId"
                    class="form-select"
                  >
                    <option value="">نفس مخزن الناتج</option>
                    <option v-for="w in warehouses" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>تاريخ البدء</label>
                  <StbDateInput
                    v-model="form.plannedStartDate"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>تاريخ التسليم</label>
                  <StbDateInput
                    v-model="form.plannedEndDate"
                    class="form-input"
                    :min="form.plannedStartDate"
                  />
                </div>
                <div class="form-group">
                  <label>رقم دفعة الناتج</label>
                  <input
                    v-model.trim="form.outputLotNumber"
                    class="form-input"
                    dir="ltr"
                    maxlength="60"
                    placeholder="فارغ = رقم الأمر"
                  />
                </div>
                <div class="form-group">
                  <label>مرجع / عميل</label>
                  <input
                    v-model.trim="form.reference"
                    class="form-input"
                    maxlength="200"
                    placeholder="اختياري"
                  />
                </div>
                <div class="form-group doc-grid__full">
                  <label>ملاحظات</label>
                  <textarea
                    v-model="form.note"
                    class="form-input"
                    rows="2"
                    maxlength="4000"
                  />
                </div>
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showCreate = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting || !form.bomId"
                >
                  إنشاء المسودة
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
import { ChevronLeft, Factory, Plus, Search, X } from "lucide-vue-next";
import { useManufacturingStore } from "@/stores/manufacturing";
import { useInventoryStore } from "@/stores/inventory";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { PRODUCTION_STATUS as STATUS } from "@/utils/manufacturing";
import type { Product } from "@/types/catalog";
import type {
  Bom,
  ProductionOrder,
  ProductionStatus,
  ProductionSummary,
} from "@/types/manufacturing";

definePageMeta({ middleware: "auth" });

const TABS: { value: ProductionStatus | "open" | ""; label: string }[] = [
  { value: "open", label: "المفتوحة" },
  { value: "draft", label: "مسودات" },
  { value: "released", label: "مُطلقة" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتملة" },
  { value: "cancelled", label: "ملغاة" },
  { value: "", label: "الكل" },
];

const store = useManufacturingStore();
const inventory = useInventoryStore();
const toast = useToast();
const router = useRouter();

const summary = ref<ProductionSummary | null>(null);
const filters = reactive({
  status: "open" as ProductionStatus | "open" | "",
  search: "",
});
let timer: ReturnType<typeof setTimeout> | null = null;

const list = usePagedList(
  (page) =>
    store.fetchOrders({
      status: filters.status,
      search: filters.search || undefined,
      page,
    }),
  "تعذر تحميل الأوامر",
);
const setStatus = (status: ProductionStatus | "open" | "") => {
  filters.status = status;
  list.load(1);
};
const onSearch = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => list.load(1), 300);
};
const open = (order: ProductionOrder) =>
  router.push(`/dashboard/manufacturing/orders/${order.id}`);

const warehouses = computed(() =>
  inventory.warehouses.filter((w) => w.isActive),
);

const emptyForm = () => ({
  product: null as Product | null,
  bomId: "",
  plannedQuantity: "" as number | "",
  priority: 3,
  warehouseId:
    warehouses.value.find((w) => w.type === "main")?.id ??
    warehouses.value[0]?.id ??
    "",
  materialsWarehouseId: "",
  plannedStartDate: "",
  plannedEndDate: "",
  outputLotNumber: "",
  reference: "",
  note: "",
});
const form = reactive(emptyForm());
const boms = ref<Bom[]>([]);
const showCreate = ref(false);
const submitting = ref(false);

const openCreate = () => {
  Object.assign(form, emptyForm());
  boms.value = [];
  showCreate.value = true;
};
const clearProduct = () => {
  form.product = null;
  form.bomId = "";
  boms.value = [];
};
const pickProduct = async (product: Product) => {
  form.product = product;
  try {
    boms.value = (
      await store.fetchBoms({
        kind: "production",
        productId: product.id,
        limit: 50,
      })
    ).data.filter((b) => b.isActive);
    form.bomId =
      boms.value.find((b) => b.isDefault)?.id ?? boms.value[0]?.id ?? "";
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل القوائم"));
  }
};

const create = async () => {
  if (!form.product) return;
  submitting.value = true;
  try {
    const order = await store.saveOrder({
      productId: form.product.id,
      bomId: form.bomId,
      plannedQuantity: Number(form.plannedQuantity),
      priority: form.priority,
      warehouseId: form.warehouseId,
      materialsWarehouseId: form.materialsWarehouseId || undefined,
      plannedStartDate: form.plannedStartDate || undefined,
      plannedEndDate: form.plannedEndDate || undefined,
      outputLotNumber: form.outputLotNumber || undefined,
      reference: form.reference || undefined,
      note: form.note || undefined,
    });
    toast.success(`أُنشئ ${order.number} — راجعه ثم أطلقه للتنفيذ`);
    showCreate.value = false;
    router.push(`/dashboard/manufacturing/orders/${order.id}`);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إنشاء الأمر"));
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  list.load(1);
  inventory.fetchWarehouses().catch(() => {});
  try {
    summary.value = await store.summary();
  } catch {
    // اللوحة اختيارية
  }
});
</script>

<style lang="scss" scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: $space-3;
  margin-bottom: $space-4;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  padding: $space-3 $space-4;
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-md;

  strong {
    font-size: $font-size-xl;
  }

  small,
  .stat-card__label {
    color: $stb-text-muted;
    font-size: $font-size-xs;
  }

  &.is-warn strong {
    color: $stb-danger;
  }
}

.progress {
  width: 90px;
  height: 6px;
  background: $stb-border;
  border-radius: 3px;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    background: $stb-success;
  }
}

.picked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-2 $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
}

.is-clickable {
  cursor: pointer;
}
</style>
