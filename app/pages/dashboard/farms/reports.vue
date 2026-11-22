<!-- pages/dashboard/farms/reports.vue — تقارير المزارع: الإنتاجية، تكلفة الكيلو، الآفات، سجل النخيل، المياه -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>تقارير المزارع</h1>
        <p>من بيانات سُجّلت وقت حدوثها: الإنتاج مقابل المتوقع، تكلفة الكيلو وهامشه، الآفات، والمياه</p>
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
    <div class="card doc-filters doc-filters--even">
      <select v-model="filters.farmId" class="form-select" @change="load">
        <option value="">كل المزارع</option>
        <option v-for="f in store.farms" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
      <select v-model="filters.cropId" class="form-select" @change="load">
        <option value="">كل المحاصيل</option>
        <option v-for="c in store.crops" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <input v-model="filters.from" type="date" class="form-input" @change="load" />
      <input v-model="filters.to" type="date" class="form-input" @change="load" />
      <select v-if="tab === 'yield'" v-model="filters.groupBy" class="form-select" @change="load">
        <option value="planting">لكل زراعة</option>
        <option value="variety">لكل صنف</option>
        <option value="unit">لكل وحدة</option>
        <option value="plant">لكل نخلة</option>
        <option value="month">لكل شهر</option>
      </select>
      <select v-if="tab === 'costs'" v-model="filters.groupBy" class="form-select" @change="load">
        <option value="planting">لكل زراعة</option>
        <option value="type">لكل نوع عملية</option>
        <option value="month">لكل شهر</option>
      </select>
    </div>

    <div v-if="loading" class="empty-state"><div class="spinner spinner--lg" /></div>

    <!-- ══ الإنتاجية ══ -->
    <template v-else-if="tab === 'yield' && yields">
      <div v-if="yields.top" class="farm-split">
        <div class="card doc-table-card">
          <h3 class="report-title">الأعلى إنتاجاً ({{ yields.plants }} نخلة · المتوسط {{ yields.average ?? "—" }})</h3>
          <table class="data-table">
            <thead><tr><th>الوسم</th><th>الوحدة</th><th>الصنف</th><th>الإنتاج</th><th>جني</th></tr></thead>
            <tbody>
              <tr v-for="p in yields.top" :key="p.plantId">
                <td dir="ltr">{{ p.tag }}</td><td>{{ p.unitName }}</td><td>{{ p.varietyName ?? "—" }}</td>
                <td class="doc-num">{{ formatNumber(p.quantity) }}</td><td class="doc-num">{{ p.harvests }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card doc-table-card">
          <h3 class="report-title">الأقل إنتاجاً</h3>
          <table class="data-table">
            <thead><tr><th>الوسم</th><th>الإنتاج</th></tr></thead>
            <tbody>
              <tr v-for="p in yields.bottom" :key="p.plantId">
                <td dir="ltr">{{ p.tag }}</td><td class="doc-num">{{ formatNumber(p.quantity) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ GROUP_LABEL[filters.groupBy] }}</th>
                <th>المحصود</th>
                <th>المرفوض</th>
                <th>القيمة</th>
                <th v-if="filters.groupBy === 'planting'">للنبتة</th>
                <th v-if="filters.groupBy === 'planting'">للهكتار</th>
                <th v-if="filters.groupBy === 'planting'">من المتوقع</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!yields.rows?.length"><td colspan="7" class="doc-hint">لا حصاد في الفترة</td></tr>
              <tr v-for="r in yields.rows" :key="r.key ?? 'none'">
                <td>{{ r.label }}<span v-if="r.number" class="doc-cell__sub"> · {{ r.number }}</span></td>
                <td class="doc-num">{{ formatNumber(r.quantity) }}<span class="doc-cell__sub"> ({{ r.harvests }} جني)</span></td>
                <td class="doc-num">
                  {{ formatNumber(r.rejectQuantity) }}
                  <span v-if="r.rejectRate" class="doc-cell__sub">{{ formatNumber(Math.round(r.rejectRate * 1000) / 10) }}%</span>
                </td>
                <td class="doc-money">{{ formatCurrency(r.value) }}</td>
                <template v-if="filters.groupBy === 'planting'">
                  <td class="doc-num">{{ r.perPlant ?? "—" }}</td>
                  <td class="doc-num">{{ r.perHectare === null || r.perHectare === undefined ? "—" : formatNumber(r.perHectare) }}</td>
                  <td>
                    <div v-if="r.achievement !== null && r.achievement !== undefined" class="bar">
                      <span :style="{ width: `${Math.min(100, r.achievement)}%` }" :class="{ low: r.achievement < 60 }" />
                      <b>{{ r.achievement }}%</b>
                    </div>
                    <span v-else class="doc-hint">لا متوقع</span>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ التكلفة ══ -->
    <template v-else-if="tab === 'costs' && costs">
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ GROUP_LABEL[filters.groupBy] }}</th>
                <th>المدخلات</th>
                <th>العمالة</th>
                <th>المياه</th>
                <th>الإجمالي</th>
                <th>الحصاد</th>
                <th v-if="filters.groupBy === 'planting'">تكلفة الوحدة</th>
                <th v-if="filters.groupBy === 'planting'">الهامش</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!costs.rows.length"><td colspan="8" class="doc-hint">لا تكاليف في الفترة</td></tr>
              <tr v-for="r in costs.rows" :key="r.plantingId ?? r.key">
                <td>
                  <template v-if="filters.groupBy === 'type'">{{ OPERATION_TYPE[r.key as FarmOperationType] ?? r.key }}</template>
                  <template v-else>{{ r.label ?? r.key }}</template>
                  <span class="doc-cell__sub"> · {{ r.operations }} عملية</span>
                </td>
                <td class="doc-money">{{ formatCurrency(r.inputCost) }}</td>
                <td class="doc-money">{{ formatCurrency(r.laborCost) }}<span class="doc-cell__sub"> {{ formatNumber(r.laborHours) }} س</span></td>
                <td class="doc-num">{{ formatNumber(r.waterM3) }} م³</td>
                <td class="doc-money"><strong>{{ formatCurrency(r.totalCost) }}</strong></td>
                <td class="doc-num">{{ formatNumber(r.harvestQuantity) }}<span class="doc-cell__sub"> {{ formatCurrency(r.harvestValue) }}</span></td>
                <template v-if="filters.groupBy === 'planting'">
                  <td class="doc-money">{{ r.costPerUnit === null || r.costPerUnit === undefined ? "—" : formatCurrency(r.costPerUnit) }}</td>
                  <td class="doc-money" :class="{ negative: (r.margin ?? 0) < 0 }">{{ formatCurrency(r.margin ?? 0) }}</td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="costs.unallocatedCost" class="doc-hint report-note">
          {{ formatCurrency(costs.unallocatedCost) }} على وحدات بلا زراعة قائمة (تجهيز أرض...) لم تُحمَّل على زراعة.
        </p>
        <p class="doc-hint report-note">
          عملية على حوش أو قطاع تُوزَّع على زراعاته بعدد النبات (أو المساحة). العمالة من تكلفة ساعة المزرعة.
        </p>
      </div>
    </template>

    <!-- ══ الآفات ══ -->
    <template v-else-if="tab === 'pests' && pests">
      <div class="card doc-table-card">
        <table class="data-table">
          <thead><tr><th>الآفة</th><th>فحوص</th><th>مفتوحة</th><th>متوسط الشدة</th><th>نسبة الإصابة</th></tr></thead>
          <tbody>
            <tr v-if="!pests.byPest.length"><td colspan="5" class="doc-hint">لا فحوص في الفترة</td></tr>
            <tr v-for="p in pests.byPest" :key="p.pest">
              <td>{{ PEST[p.pest] }}<span v-if="p.pestName" class="doc-cell__sub"> — {{ p.pestName }}</span></td>
              <td class="doc-num">{{ p.inspections }}</td>
              <td class="doc-num">{{ p.open }}</td>
              <td class="doc-num">{{ p.averageSeverity }}</td>
              <td class="doc-num">
                <template v-if="p.incidence !== null">{{ formatNumber(Math.round(p.incidence * 1000) / 10) }}% ({{ p.affected }}/{{ p.sampled }})</template>
                <template v-else>—</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card doc-table-card">
        <h3 class="report-title">أكثر الوحدات إصابة</h3>
        <table class="data-table">
          <tbody>
            <tr v-for="u in pests.byUnit" :key="u.unitId">
              <td>{{ u.unitName }}</td>
              <td class="doc-num">{{ u.count }} إصابة</td>
              <td>{{ SEVERITY[u.maxSeverity] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ══ سجل النخيل ══ -->
    <template v-else-if="tab === 'registry' && registry">
      <div class="farm-kpis">
        <div v-for="(count, sex) in registry.bySex" :key="sex" class="farm-kpi">
          <span>{{ PLANT_SEX[sex as PlantSex] }}</span><strong>{{ formatNumber(count ?? 0) }}</strong>
        </div>
        <div v-for="band in AGE_BANDS" :key="band" class="farm-kpi">
          <span>العمر {{ band === "unknown" ? "غير معروف" : `${band} سنة` }}</span>
          <strong>{{ formatNumber(registry.byAge[band] ?? 0) }}</strong>
        </div>
      </div>
      <div class="farm-split">
        <div class="card doc-table-card">
          <table class="data-table">
            <thead><tr><th>الصنف</th><th>القائمة</th><th>مصابة/مريضة</th><th>ميتة/مقلوعة</th></tr></thead>
            <tbody>
              <tr v-for="v in registry.varieties" :key="`${v.cropName}-${v.varietyName}`">
                <td>{{ v.cropName }}<template v-if="v.varietyName"> — {{ v.varietyName }}</template></td>
                <td class="doc-num">{{ formatNumber(v.live) }}</td>
                <td class="doc-num">{{ (v.byStatus.infested ?? 0) + (v.byStatus.diseased ?? 0) }}</td>
                <td class="doc-num">{{ (v.byStatus.dead ?? 0) + (v.byStatus.removed ?? 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card farm-panel">
          <h3>ما أُزيل في الفترة ولماذا</h3>
          <div class="farm-chips">
            <span v-if="!registry.removals.length" class="doc-hint">لا شيء</span>
            <span v-for="r in registry.removals" :key="r.reason" class="farm-chip">{{ REMOVAL_REASON[r.reason] ?? r.reason }}: {{ r.count }}</span>
          </div>
          <h3>المصدر</h3>
          <div class="farm-chips">
            <span v-for="o in registry.origins" :key="o.source" class="farm-chip">
              {{ PLANT_SOURCE[o.source] }}: {{ o.count }}<template v-if="o.replacements"> ({{ o.replacements }} بديل)</template>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ المياه ══ -->
    <template v-else-if="tab === 'water' && water">
      <div class="farm-split">
        <div class="card doc-table-card">
          <table class="data-table">
            <thead><tr><th>الوحدة</th><th>م³</th><th>ريّات</th><th>لكل هكتار</th></tr></thead>
            <tbody>
              <tr v-if="!water.byUnit.length"><td colspan="4" class="doc-hint">لا ري مسجّل بكمية في الفترة</td></tr>
              <tr v-for="u in water.byUnit" :key="u.unitId ?? 'all'">
                <td>{{ u.unitName }}</td>
                <td class="doc-num">{{ formatNumber(u.waterM3) }}</td>
                <td class="doc-num">{{ u.irrigations }}</td>
                <td class="doc-num">{{ u.perHectare === null ? "—" : formatNumber(u.perHectare) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card doc-table-card">
          <table class="data-table">
            <thead><tr><th>المصدر</th><th>م³</th><th>ساعات فعلية</th><th>ساعات بالطاقة</th></tr></thead>
            <tbody>
              <tr v-for="s in water.bySource" :key="s.sourceId ?? 'none'">
                <td>{{ s.sourceName }}</td>
                <td class="doc-num">{{ formatNumber(s.waterM3) }}</td>
                <td class="doc-num">{{ s.hours }}</td>
                <td class="doc-num">{{ s.capacityHours ?? "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useFarmsStore } from "@/stores/farms";
import { useToast } from "@/composables/useToast";
import {
  OPERATION_TYPE,
  PEST,
  PLANT_SEX,
  PLANT_SOURCE,
  REMOVAL_REASON,
  SEVERITY,
} from "@/utils/farms";
import type {
  CostReport,
  FarmOperationType,
  FarmReportQuery,
  PestReport,
  PlantSex,
  RegistryReport,
  WaterReport,
  YieldReport,
} from "@/types/farms";

definePageMeta({ middleware: "auth" });

const TABS = [
  { id: "yield", label: "الإنتاجية" },
  { id: "costs", label: "التكلفة والهامش" },
  { id: "pests", label: "الآفات" },
  { id: "registry", label: "سجل النخيل" },
  { id: "water", label: "المياه" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const GROUP_LABEL: Record<string, string> = {
  planting: "الزراعة",
  variety: "الصنف",
  unit: "الوحدة",
  plant: "النخلة",
  type: "نوع العملية",
  month: "الشهر",
};
const AGE_BANDS = ["0-2", "3-5", "6-10", "11-20", "20+", "unknown"];

const store = useFarmsStore();
const toast = useToast();
const tab = ref<Tab>("yield");
const loading = ref(false);
const filters = reactive({
  farmId: "",
  cropId: "",
  from: `${new Date().getFullYear()}-01-01`,
  to: "",
  groupBy: "planting" as NonNullable<FarmReportQuery["groupBy"]>,
});
const yields = ref<YieldReport | null>(null);
const costs = ref<CostReport | null>(null);
const pests = ref<PestReport | null>(null);
const registry = ref<RegistryReport | null>(null);
const water = ref<WaterReport | null>(null);

const setTab = (t: Tab) => {
  tab.value = t;
  filters.groupBy = "planting";
  void load();
};

const load = async () => {
  loading.value = true;
  const query: FarmReportQuery = {
    farmId: filters.farmId || undefined,
    cropId: filters.cropId || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    groupBy: ["yield", "costs"].includes(tab.value) ? filters.groupBy : undefined,
  };
  try {
    if (tab.value === "yield") yields.value = await store.yieldReport(query);
    else if (tab.value === "costs") costs.value = await store.costReport(query);
    else if (tab.value === "pests") pests.value = await store.pestReport(query);
    else if (tab.value === "registry") registry.value = await store.registryReport(query);
    else water.value = await store.waterReport(query);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل التقرير"));
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    await Promise.all([store.farms.length ? null : store.fetchFarms(), store.fetchCrops()]);
  } catch {
    // الفلاتر تبقى فارغة
  }
  await load();
});
</script>

<style lang="scss" scoped>
.report-title {
  margin: 0;
  padding: $space-3 $space-4 0;
  font-size: $font-size-base;
}

.report-note {
  padding: 0 $space-4 $space-3;
  margin: 0;
}

.bar {
  position: relative;
  width: 140px;
  height: 18px;
  background: $stb-surface-2;
  border-radius: 9px;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    background: $stb-success;

    &.low {
      background: $stb-warning;
    }
  }

  b {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-xs;
  }
}

.negative {
  color: $stb-danger;
}

.card + .card {
  margin-top: $space-4;
}
</style>
