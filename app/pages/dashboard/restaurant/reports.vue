<!-- pages/dashboard/restaurant/reports.vue — هندسة المنيو، الاستهلاك، الخدمة، والهالك -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>تقارير المطعم</h1>
        <p>أي طبق يستحق مكانه في المنيو، أين يضيع المخزون، وكيف كانت الخدمة</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'adjust_stock'"
          class="btn btn--ghost"
          @click="openWaste"
        >
          <Trash :size="16" /> تسجيل هالك طبق
        </button>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="doc-tab"
        :class="{ 'is-active': tab === t.id }"
        @click="
          tab = t.id;
          load();
        "
      >
        {{ t.label }}
      </button>
    </div>
    <div class="card doc-filters">
      <StbDateInput v-model="range.from" class="form-input" title="من" />
      <StbDateInput v-model="range.to" class="form-input" title="إلى" />
      <button class="btn btn--ghost" @click="load">عرض</button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- هندسة المنيو -->
    <template v-else-if="tab === 'menu' && menu">
      <div class="quadrants">
        <div
          v-for="c in CLASSES"
          :key="c.id"
          class="quadrant"
          :class="`quadrant--${c.id}`"
        >
          <strong>{{ c.label }}</strong>
          <small>{{ c.hint }}</small>
          <span
            >{{ menu.items.filter((i) => i.class === c.id).length }} صنف</span
          >
        </div>
      </div>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>النصيب</th>
                <th>الإيراد</th>
                <th>التكلفة</th>
                <th>نسبة التكلفة</th>
                <th>هامش الوحدة</th>
                <th>التصنيف</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in menu.items" :key="i.productId">
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ i.name }}</span
                    ><span class="doc-cell__sub">{{ i.categoryName }}</span>
                  </div>
                </td>
                <td class="doc-num">{{ formatNumber(i.quantity) }}</td>
                <td class="doc-num">{{ formatNumber(i.mix) }}%</td>
                <td class="doc-money">{{ formatCurrency(i.revenue) }}</td>
                <td class="doc-money">{{ formatCurrency(i.cost) }}</td>
                <td
                  class="doc-num"
                  :class="{ 'doc-num--out': i.costPercent > 35 }"
                >
                  {{ formatNumber(i.costPercent) }}%
                </td>
                <td class="doc-money">{{ formatCurrency(i.unitMargin) }}</td>
                <td>
                  <span class="badge" :class="`class--${i.class}`">{{
                    CLASSES.find((c) => c.id === i.class)?.label
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- الاستهلاك -->
    <div v-else-if="tab === 'consumption'" class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>المكوّن</th>
              <th>الوصفات</th>
              <th>بيع مباشر</th>
              <th>النظري</th>
              <th>هالك</th>
              <th>تالف/منتهي</th>
              <th>تسويات أخرى</th>
              <th>فرق جرد</th>
              <th>الفعلي</th>
              <th>الفرق</th>
              <th>قيمته</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in consumptionRows" :key="r.productId">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ r.name }}</span
                  ><span class="doc-cell__sub">{{ r.unit }}</span>
                </div>
              </td>
              <td class="doc-num">{{ formatNumber(r.recipeUsage) }}</td>
              <td class="doc-num">{{ formatNumber(r.directSales) }}</td>
              <td class="doc-num doc-num--strong">
                {{ formatNumber(r.theoretical) }}
              </td>
              <td class="doc-num">{{ formatNumber(r.waste) }}</td>
              <td class="doc-num">{{ formatNumber(r.spoilage) }}</td>
              <td class="doc-num">{{ formatNumber(r.otherAdjustments) }}</td>
              <td class="doc-num">{{ formatNumber(r.stocktakeDifference) }}</td>
              <td class="doc-num doc-num--strong">
                {{ formatNumber(r.actual) }}
              </td>
              <td
                class="doc-num"
                :class="{ 'doc-num--out': (r.variancePercent ?? 0) > 5 }"
              >
                {{ formatNumber(r.variance)
                }}<template v-if="r.variancePercent !== null">
                  ({{ formatNumber(r.variancePercent) }}%)</template
                >
              </td>
              <td class="doc-money">{{ formatCurrency(r.varianceValue) }}</td>
            </tr>
            <tr v-if="!consumptionRows.length">
              <td colspan="11" class="doc-lines__empty">
                لا استهلاك لمكوّنات الوصفات في الفترة
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- الخدمة -->
    <template v-else-if="tab === 'service' && service">
      <div class="stats">
        <div class="stat">
          <small>الطلبات</small><strong>{{ service.orders }}</strong>
        </div>
        <div class="stat">
          <small>الإيراد</small
          ><strong>{{ formatCurrency(service.revenue) }}</strong>
        </div>
        <div class="stat">
          <small>متوسط الفاتورة</small
          ><strong>{{ formatCurrency(service.averageCheck) }}</strong>
        </div>
        <div class="stat">
          <small>الضيوف</small><strong>{{ service.covers }}</strong>
        </div>
        <div class="stat">
          <small>إيراد الضيف</small
          ><strong>{{
            service.revenuePerCover !== null
              ? formatCurrency(service.revenuePerCover)
              : "—"
          }}</strong>
        </div>
        <div class="stat">
          <small>مدة الطاولة</small
          ><strong>{{
            service.averageTableMinutes !== null
              ? `${formatNumber(service.averageTableMinutes)} د`
              : "—"
          }}</strong>
        </div>
        <div class="stat">
          <small>انتظار المطبخ</small
          ><strong>{{ minutes(service.kitchen.avgWaitMinutes) }}</strong>
        </div>
        <div class="stat">
          <small>التحضير</small
          ><strong>{{ minutes(service.kitchen.avgPrepMinutes) }}</strong>
        </div>
        <div class="stat">
          <small>نسبة عدم حضور الحجوزات</small
          ><strong>{{ formatNumber(service.reservations.noShowRate) }}%</strong>
        </div>
      </div>
      <div class="two-cols">
        <section class="card section">
          <h3 class="section__title">الطلب بالساعة</h3>
          <div v-for="h in service.byHour" :key="h.hour" class="bar-row">
            <span class="doc-num"
              >{{ String(h.hour).padStart(2, "0") }}:00</span
            >
            <div class="bar">
              <span :style="{ width: `${barShare(h.orders)}%` }" />
            </div>
            <span class="doc-num">{{ h.orders }}</span>
          </div>
        </section>
        <section class="card section">
          <h3 class="section__title">المحطات</h3>
          <div v-for="s in service.stations" :key="s.stationId" class="bar-row">
            <span>{{ s.name }}</span>
            <span class="doc-cell__sub">{{ s.tickets }} بون</span>
            <span class="doc-num"
              >تحضير {{ minutes(s.avgPrepMinutes) }} · كلي
              {{ minutes(s.avgTotalMinutes) }}</span
            >
          </div>
          <div v-if="!service.stations.length" class="doc-lines__empty">
            لا محطات
          </div>
          <h3 class="section__title spaced">نوع الطلب</h3>
          <p>
            صالة {{ service.byType.dineIn }} · سفري
            {{ service.byType.takeaway }} · توصيل {{ service.byType.delivery }}
          </p>
        </section>
      </div>
    </template>

    <!-- هالك طبق -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="waste" class="modal-overlay" @click.self="waste = null">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3><Trash :size="20" class="doc-modal__icon" /> تسجيل هالك</h3>
              <button class="btn btn--icon btn--ghost" @click="waste = null">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="saveWaste">
              <p class="doc-hint">
                طبق: تخرج مكوّنات وصفته. مكوّن: يخرج هو. تُسجَّل تسوية سببها
                "هالك تشغيل".
              </p>
              <div class="form-group">
                <label>الصنف *</label>
                <div v-if="waste.product" class="picked">
                  {{ waste.product.name }}
                  <button
                    type="button"
                    class="btn btn--sm btn--ghost"
                    @click="waste.product = null"
                  >
                    تغيير
                  </button>
                </div>
                <CatalogProductPicker
                  v-else
                  :types="['composite', 'stocked']"
                  @pick="(p: Product) => (waste!.product = p)"
                />
              </div>
              <div class="form-group">
                <label>المخزن *</label>
                <select
                  v-model="waste.warehouseId"
                  class="form-select"
                  required
                >
                  <option
                    v-for="w in inventory.warehouses"
                    :key="w.id"
                    :value="w.id"
                  >
                    {{ w.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>الكمية *</label
                ><StbNumberInput
                  v-model.number="waste.quantity"
                  class="form-input"
                  min="0.0001"
                  step="any"
                  required
                />
              </div>
              <div class="form-group">
                <label>السبب</label
                ><input
                  v-model.trim="waste.note"
                  class="form-input"
                  maxlength="300"
                  placeholder="سقط، احترق، رجع من الطاولة..."
                />
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="waste = null"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="busy || !waste.product"
                >
                  تسجيل
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
import { onMounted, reactive, ref } from "vue";
import { Trash, X } from "lucide-vue-next";
import { useRestaurantStore } from "@/stores/restaurant";
import { useInventoryStore } from "@/stores/inventory";
import { useToast } from "@/composables/useToast";
import type { Product } from "@/types/catalog";
import type {
  ConsumptionRow,
  MenuEngineering,
  ServiceReport,
} from "@/types/restaurant";

definePageMeta({ middleware: "auth" });

const TABS = [
  { id: "menu", label: "هندسة المنيو" },
  { id: "consumption", label: "الاستهلاك النظري والفعلي" },
  { id: "service", label: "الخدمة والمطبخ" },
] as const;
const CLASSES = [
  { id: "star", label: "نجم", hint: "شعبي ومربح — حافظ عليه" },
  {
    id: "plowhorse",
    label: "حصان عمل",
    hint: "شعبي وهامشه قليل — راجع سعره أو وصفته",
  },
  { id: "puzzle", label: "لغز", hint: "مربح وقليل الطلب — روّج له" },
  { id: "dog", label: "خاسر", hint: "قليل الطلب والهامش — فكّر في حذفه" },
] as const;

const store = useRestaurantStore();
const inventory = useInventoryStore();
const toast = useToast();
const tab = ref<(typeof TABS)[number]["id"]>("menu");
const loading = ref(false);
const busy = ref(false);

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const range = reactive({ from: day(-30), to: day(0) });

const menu = ref<MenuEngineering | null>(null);
const consumptionRows = ref<ConsumptionRow[]>([]);
const service = ref<ServiceReport | null>(null);

const load = async () => {
  loading.value = true;
  try {
    if (tab.value === "menu")
      menu.value = await store.menuEngineering(range.from, range.to);
    else if (tab.value === "consumption")
      consumptionRows.value = await store.consumption(range.from, range.to);
    else service.value = await store.service(range.from, range.to);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل التقرير"));
  } finally {
    loading.value = false;
  }
};

const minutes = (value?: number | null) =>
  value === null || value === undefined ? "—" : `${formatNumber(value)} د`;
const barShare = (orders: number) =>
  Math.round(
    (orders /
      Math.max(...(service.value?.byHour ?? []).map((h) => h.orders), 1)) *
      100,
  );

const waste = ref<{
  product: Product | null;
  warehouseId: string;
  quantity: number | "";
  note: string;
} | null>(null);
const openWaste = async () => {
  await inventory.fetchWarehouses().catch(() => {});
  waste.value = {
    product: null,
    warehouseId:
      inventory.warehouses.find((w) => w.type === "main")?.id ??
      inventory.warehouses[0]?.id ??
      "",
    quantity: 1,
    note: "",
  };
};
const saveWaste = async () => {
  const w = waste.value!;
  busy.value = true;
  try {
    await store.recordWaste({
      productId: w.product!.id,
      warehouseId: w.warehouseId,
      quantity: Number(w.quantity),
      note: w.note || undefined,
    });
    toast.success("سُجّل الهالك");
    waste.value = null;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التسجيل"));
  } finally {
    busy.value = false;
  }
};

onMounted(load);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;
.quadrants {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-3;
  margin-bottom: $space-4;

  @include respond-to("sm") {
    grid-template-columns: 1fr 1fr;
  }
}

.quadrant {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  padding: $space-3;
  border-radius: $radius-md;
  border: 1px solid $stb-border;

  small {
    color: $stb-text-muted;
    font-size: $font-size-xs;
  }

  &--star {
    border-color: $stb-success;
  }
  &--plowhorse {
    border-color: $stb-warning;
  }
  &--puzzle {
    border-color: $stb-accent;
  }
  &--dog {
    border-color: $stb-danger;
  }
}

.class--star {
  color: $stb-success;
}
.class--plowhorse {
  color: $stb-warning;
}
.class--puzzle {
  color: $stb-accent;
}
.class--dog {
  color: $stb-danger;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: $space-3;
  margin-bottom: $space-4;
}

.stat {
  display: flex;
  flex-direction: column;
  padding: $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  background: $stb-surface;

  small {
    color: $stb-text-muted;
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

.section {
  padding: $space-4;

  &__title {
    margin-bottom: $space-3;
    font-size: $font-size-base;

    &.spaced {
      margin-top: $space-4;
    }
  }
}

.bar-row {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  gap: $space-2;
  align-items: center;
  padding: 2px 0;
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
    background: $stb-accent;
  }
}

.picked {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
