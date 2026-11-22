<!-- pages/dashboard/farms/plantings.vue — الزراعات: محصول على وحدة لمدة، بإنتاجه مقابل المتوقع -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الزراعات</h1>
        <p>
          كل محصول على وحدته: صف نخيل، بلوك زيتون، حقل قمح، دورة صوبة — بحصاده
          وتكلفته مقابل المتوقع
        </p>
      </div>
      <div class="page-header__actions">
        <button v-can="'manage_farms'" class="btn btn--primary" :disabled="!scope.farmId.value" @click="openCreate">
          <Plus :size="18" /> <span>زراعة جديدة</span>
        </button>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="t in STATUS_TABS"
        :key="t.value"
        class="doc-tab"
        :class="{ 'is-active': filters.status === t.value }"
        @click="setStatus(t.value)"
      >
        {{ t.label }}
      </button>
    </div>
    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input v-model="filters.search" class="form-input" placeholder="رقم، محصول، صنف، وحدة، موسم..." @input="onSearch" />
      </div>
      <select v-model="scope.farmId.value" class="form-select" @change="list.load(1)">
        <option v-for="f in scope.store.farms" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
      <select v-model="filters.cropId" class="form-select" @change="list.load(1)">
        <option value="">كل المحاصيل</option>
        <option v-for="c in store.crops" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <Sprout :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا زراعات</div>
        <div class="empty-state__text">أضف محصولاً على وحدة من وحدات المزرعة</div>
      </div>
    </div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الزراعة</th>
              <th>المحصول</th>
              <th>الوحدة</th>
              <th>العدد / المساحة</th>
              <th>الزرع</th>
              <th>الحصاد المتوقع</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in list.rows.value" :key="p.id" class="is-clickable" @click="openDetail(p.id)">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ p.number }}</span>
                  <span class="doc-cell__sub">{{ p.season || TRACKING[p.trackingMode] }}</span>
                </div>
              </td>
              <td>{{ p.crop?.name }}<span v-if="p.variety" class="doc-cell__sub"> — {{ p.variety.name }}</span></td>
              <td>{{ p.unit?.name }}</td>
              <td class="doc-num">
                <template v-if="p.trackingMode !== 'area'">{{ formatNumber(p.plantCount) }}</template>
                <template v-else>{{ formatArea(p.areaM2) }}</template>
              </td>
              <td>
                {{ p.plantedAt ? formatDate(p.plantedAt) : "—" }}
                <span v-if="p.plantedAt && p.plantedAtPrecision !== 'day'" class="doc-cell__sub">({{ PRECISION[p.plantedAtPrecision] }})</span>
              </td>
              <td>{{ p.expectedHarvestAt ? formatDate(p.expectedHarvestAt) : "—" }}</td>
              <td>
                <span :class="['badge', PLANTING_STATUS[p.status].badge]">{{ PLANTING_STATUS[p.status].label }}</span>
                <span v-if="p.closeReason" class="doc-cell__sub"> {{ END_REASON[p.closeReason] }}</span>
              </td>
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
      label="زراعة"
      @change="list.load"
    />

    <!-- ══ زراعة جديدة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3><Sprout :size="20" class="doc-modal__icon" /> زراعة جديدة</h3>
              <button class="btn btn--icon btn--ghost" @click="showCreate = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitCreate">
              <div class="doc-grid">
                <div class="form-group doc-grid__full">
                  <label>الوحدة *</label>
                  <select v-model="form.unitId" class="form-select" required>
                    <option value="" disabled>اختر</option>
                    <option v-for="o in scope.unitOptions.value" :key="o.id" :value="o.id">{{ o.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>المحصول *</label>
                  <select v-model="form.cropId" class="form-select" required @change="onCrop">
                    <option value="" disabled>اختر</option>
                    <option v-for="c in store.crops.filter((c) => c.isActive)" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>الصنف</label>
                  <select v-model="form.varietyId" class="form-select">
                    <option value="">—</option>
                    <option v-for="v in varieties" :key="v.id" :value="v.id">{{ v.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>طريقة المتابعة</label>
                  <select v-model="form.trackingMode" class="form-select">
                    <option v-for="(label, key) in TRACKING" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div v-if="form.trackingMode === 'count'" class="form-group">
                  <label>العدد</label>
                  <StbNumberInput v-model.number="form.plantCount" class="form-input" min="0" />
                </div>
                <div class="form-group">
                  <label>المساحة (م²)</label>
                  <StbNumberInput v-model.number="form.areaM2" class="form-input" min="0" step="any" placeholder="مساحة الوحدة" />
                </div>
                <div class="form-group">
                  <label>الحالة</label>
                  <select v-model="form.status" class="form-select">
                    <option value="active">مزروعة (قائمة)</option>
                    <option value="planned">مخططة (لم تُزرع بعد)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>تاريخ الزرع / الغرس</label>
                  <input v-model="form.plantedAt" type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label>دقة التاريخ</label>
                  <select v-model="form.plantedAtPrecision" class="form-select">
                    <option v-for="(label, key) in PRECISION" :key="key" :value="key">{{ label }}</option>
                  </select>
                  <small class="doc-hint">نخيل قديم يُعرف عامه فقط: "بالسنة"</small>
                </div>
                <div class="form-group">
                  <label>الموسم</label>
                  <input v-model.trim="form.season" class="form-input" maxlength="30" placeholder="2026/2027" />
                </div>
                <div class="form-group">
                  <label>الحصاد المتوقع</label>
                  <input v-model="form.expectedHarvestAt" type="date" class="form-input" />
                  <small class="doc-hint">فارغ = تاريخ الزرع + أيام الصنف</small>
                </div>
                <div class="form-group">
                  <label>الإنتاج المتوقع</label>
                  <StbNumberInput v-model.number="form.expectedYield" class="form-input" min="0" step="any" placeholder="من الصنف" />
                </div>
              </div>
              <label class="checkbox-label">
                <input v-model="form.generatePlan" type="checkbox" />
                <span>خطط عملياتها من التقويم الزراعي للمحصول</span>
              </label>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showCreate = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="saving" :class="{ 'btn--loading': saving }">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ تفاصيل الزراعة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="detail" class="modal-overlay" @click.self="detail = null">
          <div class="modal doc-modal doc-modal--lg">
            <div class="modal__header">
              <h3>
                {{ detail.number }} · {{ detail.crop?.name }}<template v-if="detail.variety"> — {{ detail.variety.name }}</template>
                <span :class="['badge', PLANTING_STATUS[detail.status].badge]">{{ PLANTING_STATUS[detail.status].label }}</span>
              </h3>
              <button class="btn btn--icon btn--ghost" @click="detail = null"><X :size="20" /></button>
            </div>
            <div class="doc-form">
              <div class="farm-kpis">
                <div class="farm-kpi">
                  <span>{{ detail.trackingMode === "area" ? "المساحة" : "القائم" }}</span>
                  <strong>{{ detail.trackingMode === "area" ? formatArea(detail.areaM2) : formatNumber(detail.plantCount) }}</strong>
                  <small v-if="detail.plantsByStatus.infested || detail.plantsByStatus.diseased">
                    {{ (detail.plantsByStatus.infested ?? 0) + (detail.plantsByStatus.diseased ?? 0) }} مصابة
                  </small>
                </div>
                <div class="farm-kpi">
                  <span>المحصود</span>
                  <strong>{{ formatNumber(detail.harvest.quantity) }}</strong>
                  <small>{{ detail.harvest.count }} جني · {{ formatCurrency(detail.harvest.value) }}</small>
                </div>
                <div class="farm-kpi">
                  <span>المتوقع</span>
                  <strong>{{ detail.expected === null ? "—" : formatNumber(detail.expected) }}</strong>
                  <small v-if="detail.expected">{{ formatNumber(Math.round((detail.harvest.quantity / detail.expected) * 1000) / 10) }}% منه</small>
                </div>
                <div class="farm-kpi">
                  <span>تكلفة العمليات</span>
                  <strong>{{ formatCurrency(detail.operations.inputCost + detail.operations.laborCost) }}</strong>
                  <small>{{ detail.operations.done }} منفّذة · {{ detail.operations.planned }} مخططة</small>
                </div>
                <div class="farm-kpi">
                  <span>المياه</span>
                  <strong>{{ formatNumber(detail.operations.waterM3) }} م³</strong>
                </div>
              </div>
              <dl class="planting-facts">
                <dt>الوحدة</dt><dd>{{ detail.unit?.name }}</dd>
                <dt>الزرع</dt><dd>{{ detail.plantedAt ? formatDate(detail.plantedAt) : "—" }} ({{ PRECISION[detail.plantedAtPrecision] }})</dd>
                <dt>الموسم</dt><dd>{{ detail.season || "—" }}</dd>
                <dt>الحصاد المتوقع</dt><dd>{{ detail.expectedHarvestAt ? formatDate(detail.expectedHarvestAt) : "—" }}</dd>
                <template v-if="detail.closeReason">
                  <dt>انتهت</dt><dd>{{ detail.closedAt ? formatDate(detail.closedAt) : "" }} — {{ END_REASON[detail.closeReason] }}</dd>
                </template>
              </dl>

              <!-- تسجيل النخيل -->
              <div v-if="detail.trackingMode === 'individual' && isOpen" v-can="'manage_farms'" class="doc-section">
                <strong>تسجيل نخيل/أشجار في الصفوف</strong>
                <div v-for="(row, i) in bulkRows" :key="i" class="farm-lines__row">
                  <select v-model="row.unitId" class="form-select">
                    <option v-for="o in rowsUnder" :key="o.id" :value="o.id">{{ o.label }}</option>
                  </select>
                  <StbNumberInput v-model.number="row.count" class="form-input" min="1" max="5000" placeholder="العدد" />
                  <StbNumberInput v-model.number="row.startPosition" class="form-input" min="1" placeholder="من رقم (تلقائي)" />
                  <button class="btn btn--sm btn--danger btn--icon" @click="bulkRows.splice(i, 1)"><Trash2 :size="14" /></button>
                </div>
                <div class="doc-actions">
                  <button class="btn btn--sm btn--ghost" @click="addBulkRow"><Plus :size="14" /> صف</button>
                  <button class="btn btn--sm btn--ghost" @click="fillAllRows">كل الصفوف بعدد جورها</button>
                  <select v-model="bulkSex" class="form-select bulk-sex">
                    <option v-for="(label, key) in PLANT_SEX" :key="key" :value="key">{{ label }}</option>
                  </select>
                  <button class="btn btn--sm btn--primary" :disabled="!bulkRows.length || saving" @click="submitBulk">
                    تسجيل {{ bulkTotal }} نبتة
                  </button>
                </div>
              </div>

              <div class="modal__footer">
                <NuxtLink v-if="detail.trackingMode === 'individual'" :to="`/dashboard/farms/plants?plantingId=${detail.id}`" class="btn btn--ghost">
                  <TreePalm :size="16" /> السجل
                </NuxtLink>
                <NuxtLink :to="`/dashboard/farms/operations?plantingId=${detail.id}`" class="btn btn--ghost">
                  <ClipboardList :size="16" /> العمليات
                </NuxtLink>
                <button v-if="isOpen" v-can="'manage_farms'" class="btn btn--ghost" :disabled="saving" @click="plan">
                  <CalendarPlus :size="16" /> خطة التقويم
                </button>
                <button v-if="detail.status === 'planned'" v-can="'manage_farms'" class="btn btn--primary" :disabled="saving" @click="activate">
                  زُرعت الآن
                </button>
                <template v-if="isOpen">
                  <select v-model="closeReason" v-can="'manage_farms'" class="form-select close-reason">
                    <option value="" disabled>إنهاء بسبب...</option>
                    <option v-for="(label, key) in END_REASON" :key="key" :value="key">{{ label }}</option>
                  </select>
                  <button v-can="'manage_farms'" class="btn btn--danger" :disabled="!closeReason || saving" @click="close">إنهاء</button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  CalendarPlus,
  ClipboardList,
  Plus,
  Search,
  Sprout,
  Trash2,
  TreePalm,
  X,
} from "lucide-vue-next";
import { useFarmsStore } from "@/stores/farms";
import { useFarmScope } from "@/composables/useFarmScope";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import {
  END_REASON,
  PLANTING_STATUS,
  PLANT_SEX,
  PRECISION,
  TRACKING,
  formatArea,
} from "@/utils/farms";
import type {
  DatePrecision,
  PlantSex,
  PlantingDetail,
  PlantingEndReason,
  TrackingMode,
} from "@/types/farms";

definePageMeta({ middleware: "auth" });

const STATUS_TABS = [
  { value: "open", label: "القائمة والمخططة" },
  { value: "", label: "الكل" },
  { value: "closed", label: "المنتهية" },
  { value: "failed", label: "الفاشلة" },
] as const;

const store = useFarmsStore();
const scope = useFarmScope();
const toast = useToast();
const route = useRoute();
const saving = ref(false);

const filters = reactive({ status: "open" as string, search: "", cropId: "" });
const list = usePagedList((page) =>
  store.fetchPlantings({
    farmId: scope.farmId.value || undefined,
    status: filters.status || undefined,
    cropId: filters.cropId || undefined,
    search: filters.search || undefined,
    page,
  }),
);
const setStatus = (status: string) => {
  filters.status = status;
  void list.load(1);
};
let timer: ReturnType<typeof setTimeout> | undefined;
const onSearch = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => list.load(1), 300);
};

// ─── زراعة جديدة ───
const emptyForm = () => ({
  unitId: "",
  cropId: "",
  varietyId: "",
  trackingMode: "count" as TrackingMode,
  plantCount: "" as number | "",
  areaM2: "" as number | "",
  status: "active" as "active" | "planned",
  plantedAt: new Date().toISOString().slice(0, 10),
  plantedAtPrecision: "day" as DatePrecision,
  season: "",
  expectedHarvestAt: "",
  expectedYield: "" as number | "",
  generatePlan: true,
});
const form = reactive(emptyForm());
const showCreate = ref(false);
const varieties = computed(
  () => store.crops.find((c) => c.id === form.cropId)?.varieties?.filter((v) => v.isActive) ?? [],
);
const onCrop = () => {
  const crop = store.crops.find((c) => c.id === form.cropId);
  if (crop) form.trackingMode = crop.defaultTrackingMode;
  form.varietyId = "";
};
const openCreate = () => {
  Object.assign(form, emptyForm());
  showCreate.value = true;
};
const submitCreate = async () => {
  saving.value = true;
  try {
    const planting = await store.savePlanting({
      unitId: form.unitId,
      cropId: form.cropId,
      varietyId: form.varietyId || null,
      trackingMode: form.trackingMode,
      plantCount: form.trackingMode === "count" && form.plantCount !== "" ? Number(form.plantCount) : undefined,
      areaM2: form.areaM2 === "" ? undefined : Number(form.areaM2),
      status: form.status,
      plantedAt: form.plantedAt || null,
      plantedAtPrecision: form.plantedAtPrecision,
      season: form.season || null,
      expectedHarvestAt: form.expectedHarvestAt || null,
      expectedYield: form.expectedYield === "" ? undefined : Number(form.expectedYield),
      generatePlan: form.generatePlan,
    });
    toast.success(`أُضيفت ${planting.number}`);
    showCreate.value = false;
    await list.load(1);
    detail.value = planting;
    prepareBulk();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الزراعة"));
  } finally {
    saving.value = false;
  }
};

// ─── التفاصيل ───
const detail = ref<PlantingDetail | null>(null);
const isOpen = computed(() => !!detail.value && ["active", "planned"].includes(detail.value.status));
const openDetail = async (id: string) => {
  try {
    detail.value = await store.getPlanting(id);
    if (detail.value.farmId !== scope.farmId.value) {
      scope.farmId.value = detail.value.farmId;
      await scope.loadUnits();
    }
    prepareBulk();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فتح الزراعة"));
  }
};
const run = async (work: () => Promise<PlantingDetail | void>, done: string) => {
  saving.value = true;
  try {
    const result = await work();
    if (result) detail.value = result;
    toast.success(done);
    void list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التنفيذ"));
  } finally {
    saving.value = false;
  }
};
const activate = () => run(() => store.activatePlanting(detail.value!.id), "بدأت الزراعة");
const closeReason = ref<PlantingEndReason | "">("");
const close = () =>
  run(
    () => store.closePlanting(detail.value!.id, { reason: closeReason.value as PlantingEndReason }),
    "انتهت الزراعة",
  );
const plan = () =>
  run(async () => {
    const { created } = await store.generatePlan(detail.value!.id);
    toast.info(created ? `خُطّطت ${created} عملية` : "الخطة موجودة من قبل");
    return store.getPlanting(detail.value!.id);
  }, "تم");

// ─── تسجيل النخيل ───
const rowsUnder = computed(() => {
  const anchor = scope.units.value.find((u) => u.id === detail.value?.unitId);
  if (!anchor) return [];
  return scope.unitOptions.value.filter(
    (o) => o.id === anchor.id || o.unit.path.startsWith(`${anchor.path}/`),
  );
});
const bulkRows = ref<{ unitId: string; count: number | ""; startPosition: number | "" }[]>([]);
const bulkSex = ref<PlantSex>("female");
const bulkTotal = computed(() => bulkRows.value.reduce((s, r) => s + (Number(r.count) || 0), 0));
const prepareBulk = () => {
  bulkRows.value = [];
  closeReason.value = "";
};
const addBulkRow = () =>
  bulkRows.value.push({ unitId: rowsUnder.value[0]?.id ?? "", count: "", startPosition: "" });
/** كل الصفوف (الأوراق) تحت وحدة الزراعة بعدد جورها المخطط */
const fillAllRows = () => {
  const leaves = rowsUnder.value.filter(
    (o) => !scope.units.value.some((u) => u.parentId === o.id),
  );
  bulkRows.value = leaves.map((o) => ({
    unitId: o.id,
    count: o.unit.plannedPositions ?? "",
    startPosition: "",
  }));
};
const submitBulk = () =>
  run(async () => {
    const rows = bulkRows.value
      .filter((r) => r.unitId && Number(r.count) > 0)
      .map((r) => ({
        unitId: r.unitId,
        count: Number(r.count),
        ...(r.startPosition !== "" ? { startPosition: Number(r.startPosition) } : {}),
      }));
    const { created } = await store.bulkPlants(detail.value!.id, { rows, sex: bulkSex.value });
    toast.info(`سُجّلت ${created} نبتة بوسومها`);
    bulkRows.value = [];
    return store.getPlanting(detail.value!.id);
  }, "تم التسجيل");

onMounted(async () => {
  try {
    await Promise.all([scope.init(), store.fetchCrops()]);
    await list.load(1);
    const open = route.query.open;
    if (typeof open === "string") await openDetail(open);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحميل"));
  }
});
</script>

<style lang="scss" scoped>
.planting-facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: $space-1 $space-3;
  margin: 0 0 $space-3;
  font-size: $font-size-sm;

  dt {
    color: $stb-text-secondary;
  }
  dd {
    margin: 0;
  }
}

.bulk-sex {
  width: auto;
}

.close-reason {
  width: auto;
}
</style>
