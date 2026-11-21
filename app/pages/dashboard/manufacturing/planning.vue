<!-- pages/dashboard/manufacturing/planning.vue — تخطيط الاحتياجات، حمل المراكز، وأداء المصنع -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>التخطيط والأداء</h1>
        <p>ماذا ينقص ومتى يُطلب، هل تكفي طاقة المصنع، وكيف كان الأداء فعلاً</p>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="doc-tab"
        :class="{ 'is-active': tab === t.id }"
        @click="setTab(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ══ MRP ══ -->
    <template v-if="tab === 'mrp'">
      <div class="card doc-filters">
        <select
          v-model="mrpFilters.warehouseId"
          class="form-select"
          @change="loadMrp"
        >
          <option value="">كل المخازن</option>
          <option v-for="w in inventory.warehouses" :key="w.id" :value="w.id">
            {{ w.name }}
          </option>
        </select>
        <label class="checkbox-label">
          <input
            v-model="mrpFilters.includeReorder"
            type="checkbox"
            @change="loadMrp"
          />
          <span>أضف ما نقص عن حد إعادة الطلب</span>
        </label>
        <button
          v-can="'manage_purchases'"
          class="btn btn--primary"
          :disabled="!selectedBuy.length || busy"
          @click="showDrafts = true"
        >
          <ShoppingCart :size="16" /> مسودات شراء ({{ selectedBuy.length }})
        </button>
      </div>
      <div v-if="loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <div v-else-if="!mrpRows.length" class="card">
        <div class="empty-state">
          <div class="empty-state__title">لا احتياجات</div>
          <div class="empty-state__text">
            الأوامر المفتوحة يغطيها المتاح والقادم
          </div>
        </div>
      </div>
      <div v-else class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th />
                <th>الصنف</th>
                <th>المطلوب</th>
                <th>المتاح</th>
                <th>القادم</th>
                <th>الناقص</th>
                <th>الإجراء</th>
                <th>المورد</th>
                <th>اطلب قبل</th>
                <th>للأوامر</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in mrpRows"
                :key="r.productId"
                :class="{ 'is-muted': r.action === 'none' }"
              >
                <td>
                  <input
                    v-if="r.action === 'buy' && r.supplierId"
                    v-model="selected"
                    type="checkbox"
                    :value="r.productId"
                  />
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ r.name }}</span>
                    <span class="doc-cell__sub"
                      >{{ r.sku
                      }}<template v-if="r.level > 1">
                        · مستوى {{ r.level }}</template
                      ></span
                    >
                  </div>
                </td>
                <td class="doc-num">
                  {{ formatNumber(r.required) }} {{ r.unit }}
                </td>
                <td class="doc-num">{{ formatNumber(r.onHand) }}</td>
                <td class="doc-num">{{ formatNumber(r.incoming) }}</td>
                <td
                  class="doc-num"
                  :class="r.shortage > 0 ? 'doc-num--out' : ''"
                >
                  {{ formatNumber(r.shortage) }}
                </td>
                <td>
                  <span
                    v-if="r.action === 'buy'"
                    class="badge doc-status--progress"
                    >شراء</span
                  >
                  <span
                    v-else-if="r.action === 'make'"
                    class="badge doc-status--info"
                    >تصنيع</span
                  >
                  <span v-else class="badge doc-status--done">مغطّى</span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span>{{ r.supplierName || "—" }}</span>
                    <span v-if="r.leadTimeDays !== null" class="doc-cell__sub"
                      >توريد {{ r.leadTimeDays }} يوم</span
                    >
                  </div>
                </td>
                <td
                  class="doc-num"
                  :class="{ 'doc-num--out': r.orderBy && r.orderBy < today }"
                >
                  {{ r.orderBy ? formatDate(r.orderBy) : "—" }}
                </td>
                <td class="doc-cell__sub">{{ r.orders.join("، ") }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ الطاقة ══ -->
    <template v-else-if="tab === 'capacity'">
      <div class="card doc-filters">
        <StbDateInput v-model="range.from" class="form-input" title="من" />
        <StbDateInput v-model="range.to" class="form-input" title="إلى" />
        <button class="btn btn--ghost" @click="loadCapacity">عرض</button>
      </div>
      <div v-if="loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <div
        v-for="c in capacityRows"
        v-else
        :key="c.workCenterId"
        class="card section"
      >
        <div class="cap-head">
          <strong>{{ c.name }}</strong>
          <span :class="c.utilization > 100 ? 'doc-num--out' : 'doc-num--in'">
            {{ formatNumber(c.utilization) }}% حمل
            <template v-if="c.overloadedDays">
              · {{ c.overloadedDays }} يوم فوق الطاقة</template
            >
          </span>
        </div>
        <div class="cap-days">
          <div
            v-for="d in c.days"
            :key="d.date"
            class="cap-day"
            :title="`${formatDate(d.date)}: ${formatMinutes(d.load)} من ${formatMinutes(d.available)}`"
          >
            <div class="cap-day__bar">
              <span
                :style="{ height: `${Math.min(d.utilization, 100)}%` }"
                :class="{ over: d.utilization > 100 }"
              />
            </div>
            <small>{{ d.date.slice(8) }}</small>
          </div>
        </div>
      </div>
      <div v-if="!loading && !capacityRows.length" class="card">
        <div class="empty-state">
          <div class="empty-state__title">لا مراكز عمل فعّالة</div>
        </div>
      </div>
    </template>

    <!-- ══ الأداء ══ -->
    <template v-else>
      <div class="card doc-filters">
        <StbDateInput v-model="range.from" class="form-input" title="من" />
        <StbDateInput v-model="range.to" class="form-input" title="إلى" />
        <button class="btn btn--ghost" @click="loadPerformance">عرض</button>
      </div>
      <div v-if="loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <template v-else-if="performance">
        <section class="card section">
          <h3 class="section__title">المنتجات: المخطط مقابل الفعلي</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>أوامر</th>
                  <th>أُنتج</th>
                  <th>هالك</th>
                  <th>تكلفة الوحدة المخططة</th>
                  <th>الفعلية</th>
                  <th>الفرق</th>
                  <th>متوسط المدة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in performance.products" :key="p.productId">
                  <td>{{ p.name }}</td>
                  <td class="doc-num">{{ p.orders }}</td>
                  <td class="doc-num">
                    {{ formatNumber(p.producedQuantity) }}
                  </td>
                  <td class="doc-num">
                    {{ formatNumber(p.scrapQuantity) }} ({{
                      formatNumber(p.scrapRate)
                    }}%)
                  </td>
                  <td class="doc-money">
                    {{ formatCurrency(p.plannedUnitCost) }}
                  </td>
                  <td class="doc-money">
                    {{ formatCurrency(p.actualUnitCost) }}
                  </td>
                  <td
                    class="doc-num"
                    :class="p.costVariance > 0 ? 'doc-num--out' : 'doc-num--in'"
                  >
                    {{ formatNumber(p.costVariance) }}%
                  </td>
                  <td class="doc-num">
                    {{
                      p.avgLeadHours !== null
                        ? `${formatNumber(p.avgLeadHours)} س`
                        : "—"
                    }}
                  </td>
                </tr>
                <tr v-if="!performance.products.length">
                  <td colspan="8" class="doc-lines__empty">
                    لا أوامر مكتملة في الفترة
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="card section">
          <h3 class="section__title">كفاءة مراكز العمل (OEE)</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>المركز</th>
                  <th>تشغيل</th>
                  <th>تجهيز</th>
                  <th>توقف</th>
                  <th>الإتاحة</th>
                  <th>الأداء</th>
                  <th>الجودة</th>
                  <th>OEE</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in performance.workCenters" :key="w.workCenterId">
                  <td>{{ w.name }}</td>
                  <td class="doc-num">{{ formatMinutes(w.runMinutes) }}</td>
                  <td class="doc-num">{{ formatMinutes(w.setupMinutes) }}</td>
                  <td class="doc-num">
                    {{ formatMinutes(w.downtimeMinutes) }}
                  </td>
                  <td class="doc-num">{{ pct(w.availability) }}</td>
                  <td class="doc-num">{{ pct(w.performance) }}</td>
                  <td class="doc-num">{{ pct(w.quality) }}</td>
                  <td class="doc-num doc-num--strong">{{ pct(w.oee) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div class="two-cols">
          <section class="card section">
            <h3 class="section__title">التوقف بأسبابه</h3>
            <div
              v-for="d in performance.downtime"
              :key="`${d.workCenterId}-${d.reason}`"
              class="bar-row"
            >
              <span
                >{{ DOWNTIME_REASONS[d.reason] ?? d.reason }}
                <small>({{ d.workCenter }})</small></span
              >
              <div class="bar">
                <span :style="{ width: `${share(d.minutes, maxDowntime)}%` }" />
              </div>
              <span class="doc-num">{{ formatMinutes(d.minutes) }}</span>
            </div>
            <div v-if="!performance.downtime.length" class="doc-lines__empty">
              لا توقف مسجّل
            </div>
          </section>
          <section class="card section">
            <h3 class="section__title">الهالك بأسبابه</h3>
            <div
              v-for="s in performance.scrap"
              :key="s.reason ?? 'none'"
              class="bar-row"
            >
              <span>{{ s.reason ? SCRAP_REASONS[s.reason] : "بلا سبب" }}</span>
              <div class="bar bar--danger">
                <span :style="{ width: `${share(s.quantity, maxScrap)}%` }" />
              </div>
              <span class="doc-num">{{ formatNumber(s.quantity) }}</span>
            </div>
            <div v-if="!performance.scrap.length" class="doc-lines__empty">
              لا هالك مسجّل
            </div>
          </section>
        </div>
      </template>
    </template>

    <!-- مسودات الشراء -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDrafts"
          class="modal-overlay"
          @click.self="showDrafts = false"
        >
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <ShoppingCart :size="20" class="doc-modal__icon" /> مسودات شراء
                من النقص
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showDrafts = false"
              >
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="createDrafts">
              <p>
                مسودة لكل مورد بكميات النقص وآخر سعر شراء، وتاريخ طلب اليوم.
                راجعها ثم اعتمدها عند الاستلام.
              </p>
              <div class="form-group">
                <label>مخزن الاستلام *</label>
                <select v-model="draftWarehouse" class="form-select" required>
                  <option
                    v-for="w in inventory.warehouses"
                    :key="w.id"
                    :value="w.id"
                  >
                    {{ w.name }}
                  </option>
                </select>
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showDrafts = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': busy }"
                  :disabled="busy"
                >
                  إنشاء
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
import { ShoppingCart, X } from "lucide-vue-next";
import { useManufacturingStore } from "@/stores/manufacturing";
import { useInventoryStore } from "@/stores/inventory";
import { useToast } from "@/composables/useToast";
import {
  DOWNTIME_REASONS,
  SCRAP_REASONS,
  formatMinutes,
} from "@/utils/manufacturing";
import type {
  CapacityRow,
  MrpRow,
  PerformanceReport,
} from "@/types/manufacturing";

definePageMeta({ middleware: "auth" });

const TABS = [
  { id: "mrp", label: "الاحتياجات (MRP)" },
  { id: "capacity", label: "حمل مراكز العمل" },
  { id: "performance", label: "الأداء" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const store = useManufacturingStore();
const inventory = useInventoryStore();
const toast = useToast();
const router = useRouter();

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const today = day(0);

const tab = ref<Tab>("mrp");
const loading = ref(false);
const busy = ref(false);
const range = reactive({ from: day(0), to: day(13) });

const mrpFilters = reactive({ warehouseId: "", includeReorder: false });
const mrpRows = ref<MrpRow[]>([]);
const selected = ref<string[]>([]);
const selectedBuy = computed(() =>
  mrpRows.value.filter((r) => selected.value.includes(r.productId)),
);
const showDrafts = ref(false);
const draftWarehouse = ref("");

const loadMrp = async () => {
  loading.value = true;
  try {
    mrpRows.value = await store.mrp({
      warehouseId: mrpFilters.warehouseId || undefined,
      includeReorder: mrpFilters.includeReorder ? "true" : undefined,
    });
    selected.value = mrpRows.value
      .filter((r) => r.action === "buy" && r.supplierId)
      .map((r) => r.productId);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حساب الاحتياجات"));
  } finally {
    loading.value = false;
  }
};

const createDrafts = async () => {
  busy.value = true;
  try {
    const drafts = await store.mrpPurchaseDrafts({
      warehouseId: draftWarehouse.value,
      lines: selectedBuy.value.map((r) => ({
        productId: r.productId,
        quantity: r.shortage,
        supplierId: r.supplierId!,
      })),
    });
    toast.success(`أُنشئت ${drafts.length} مسودة شراء`);
    showDrafts.value = false;
    router.push("/dashboard/purchasing");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إنشاء المسودات"));
  } finally {
    busy.value = false;
  }
};

const capacityRows = ref<CapacityRow[]>([]);
const loadCapacity = async () => {
  loading.value = true;
  try {
    capacityRows.value = await store.capacity(range.from, range.to);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حساب الحمل"));
  } finally {
    loading.value = false;
  }
};

const performance = ref<PerformanceReport | null>(null);
const loadPerformance = async () => {
  loading.value = true;
  try {
    performance.value = await store.performance(range.from, range.to);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الأداء"));
  } finally {
    loading.value = false;
  }
};
const maxDowntime = computed(() =>
  Math.max(...(performance.value?.downtime ?? []).map((d) => d.minutes), 1),
);
const maxScrap = computed(() =>
  Math.max(...(performance.value?.scrap ?? []).map((s) => s.quantity), 1),
);
const share = (value: number, max: number) => Math.round((value / max) * 100);
const pct = (value: number | null) =>
  value === null ? "—" : `${formatNumber(value)}%`;

const setTab = (next: Tab) => {
  tab.value = next;
  if (next === "mrp") loadMrp();
  else if (next === "capacity") {
    range.from = day(0);
    range.to = day(13);
    loadCapacity();
  } else {
    range.from = day(-30);
    range.to = day(0);
    loadPerformance();
  }
};

onMounted(async () => {
  await inventory.fetchWarehouses().catch(() => {});
  draftWarehouse.value =
    inventory.warehouses.find((w) => w.type === "main")?.id ?? "";
  loadMrp();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;
.section {
  margin-bottom: $space-4;
  padding: $space-4;

  &__title {
    margin-bottom: $space-3;
    font-size: $font-size-base;
  }
}

.is-muted {
  opacity: 0.6;
}

.cap-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: $space-3;
}

.cap-days {
  display: flex;
  gap: 4px;
  overflow-x: auto;
}

.cap-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 26px;

  &__bar {
    width: 18px;
    height: 80px;
    display: flex;
    align-items: flex-end;
    background: $stb-border;
    border-radius: 3px;
    overflow: hidden;

    span {
      width: 100%;
      background: $stb-success;

      &.over {
        background: $stb-danger;
      }
    }
  }

  small {
    color: $stb-text-muted;
    font-size: 10px;
  }
}

.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;

  @include respond-to("sm") {
    grid-template-columns: 1fr;
  }
}

.bar-row {
  display: grid;
  grid-template-columns: 1.4fr 2fr auto;
  gap: $space-2;
  align-items: center;
  padding: $space-1 0;
  font-size: $font-size-sm;
}

.bar {
  height: 8px;
  background: $stb-border;
  border-radius: 4px;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    background: $stb-warning;
  }

  &--danger span {
    background: $stb-danger;
  }
}
</style>
