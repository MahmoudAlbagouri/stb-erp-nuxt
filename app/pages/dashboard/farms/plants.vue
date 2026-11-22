<!-- pages/dashboard/farms/plants.vue — سجل النخيل والأشجار: نخلة نخلة بوسمها وتاريخها -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>سجل النخيل والأشجار</h1>
        <p>كل نخلة بوسمها وموقعها في الصف وجنسها وعمرها، وتاريخ حالاتها وإنتاجها وعلاجها</p>
      </div>
    </div>

    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input v-model="filters.search" class="form-input" dir="ltr" placeholder="الوسم: A-B1-R3-07" @input="onSearch" />
      </div>
      <select v-model="scope.farmId.value" class="form-select" @change="onFarm">
        <option v-for="f in scope.store.farms" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
      <select v-model="filters.unitId" class="form-select" @change="list.load(1)">
        <option value="">كل الوحدات</option>
        <option v-for="o in scope.unitOptions.value" :key="o.id" :value="o.id">{{ o.label }}</option>
      </select>
      <select v-model="filters.status" class="form-select" @change="list.load(1)">
        <option value="live">القائمة</option>
        <option value="">الكل</option>
        <option v-for="(s, key) in PLANT_STATUS" :key="key" :value="key">{{ s.label }}</option>
      </select>
      <select v-model="filters.sex" class="form-select" @change="list.load(1)">
        <option value="">الجنس: الكل</option>
        <option v-for="(label, key) in PLANT_SEX" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>
    <p v-if="filters.plantingId" class="doc-hint">
      مفلترة بزراعة واحدة —
      <button class="btn btn--sm btn--ghost" @click="clearPlanting">عرض الكل</button>
    </p>

    <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <TreePalm :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا نخيل مسجّلة</div>
        <div class="empty-state__text">سجّل نخيل الصفوف من صفحة الزراعات (زراعة نخلة نخلة)</div>
      </div>
    </div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الوسم</th>
              <th>الوحدة</th>
              <th>الصنف</th>
              <th>الجنس</th>
              <th>العمر</th>
              <th>المصدر</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in list.rows.value" :key="p.id" class="is-clickable" @click="openDetail(p.id)">
              <td><span class="doc-code" dir="ltr">{{ p.tag }}</span></td>
              <td>{{ p.unit?.name }}<span v-if="p.position" class="doc-cell__sub"> · جورة {{ p.position }}</span></td>
              <td>{{ p.planting?.variety?.name ?? p.planting?.crop?.name }}</td>
              <td>{{ PLANT_SEX[p.sex] }}</td>
              <td>{{ ageOf(p.plantedAt) }}</td>
              <td>{{ PLANT_SOURCE[p.source] }}</td>
              <td><span :class="['badge', PLANT_STATUS[p.status].badge]">{{ PLANT_STATUS[p.status].label }}</span></td>
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
      label="نبتة"
      @change="list.load"
    />

    <!-- ══ النخلة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="plant" class="modal-overlay" @click.self="plant = null">
          <div class="modal doc-modal doc-modal--lg">
            <div class="modal__header">
              <h3>
                <TreePalm :size="20" class="doc-modal__icon" />
                <span dir="ltr">{{ plant.tag }}</span>
                <span :class="['badge', PLANT_STATUS[plant.status].badge]">{{ PLANT_STATUS[plant.status].label }}</span>
              </h3>
              <button class="btn btn--icon btn--ghost" @click="plant = null"><X :size="20" /></button>
            </div>
            <div class="doc-form">
              <div class="farm-split">
                <div>
                  <dl class="plant-facts">
                    <dt>الموقع</dt><dd>{{ plant.unit?.name }}<template v-if="plant.position"> · جورة {{ plant.position }}</template></dd>
                    <dt>الصنف</dt><dd>{{ plant.planting?.crop?.name }}<template v-if="plant.planting?.variety"> — {{ plant.planting.variety.name }}</template></dd>
                    <dt>الجنس</dt><dd>{{ PLANT_SEX[plant.sex] }}</dd>
                    <dt>الغرس</dt><dd>{{ plant.plantedAt ? formatDate(plant.plantedAt) : "—" }} ({{ PRECISION[plant.plantedAtPrecision] }}) · {{ ageOf(plant.plantedAt) }}</dd>
                    <dt>المصدر</dt><dd>{{ PLANT_SOURCE[plant.source] }}<template v-if="plant.motherPlant"> من <span dir="ltr">{{ plant.motherPlant.tag }}</span></template></dd>
                    <dt>فسائل منها</dt><dd>{{ plant.offshootCount }}</dd>
                    <template v-if="plant.removalReason">
                      <dt>أُزيلت</dt><dd>{{ plant.removedAt ? formatDate(plant.removedAt) : "" }} — {{ REMOVAL_REASON[plant.removalReason] }}</dd>
                    </template>
                  </dl>
                  <h4>الإنتاج بالسنة</h4>
                  <table class="data-table">
                    <tbody>
                      <tr v-if="!plant.yields.length"><td class="doc-hint">لم يُسجَّل جني لهذه النخلة بعينها</td></tr>
                      <tr v-for="y in plant.yields" :key="y.year">
                        <td>{{ y.year }}</td>
                        <td class="doc-num">{{ formatNumber(y.quantity) }}</td>
                        <td class="doc-cell__sub">{{ y.harvests }} جني</td>
                      </tr>
                    </tbody>
                  </table>
                  <h4>العمليات عليها</h4>
                  <div class="farm-chips">
                    <span v-if="!plant.operations.length" class="doc-hint">لا عمليات مستهدفة لها بعينها</span>
                    <span v-for="o in plant.operations" :key="o.id" class="farm-chip">
                      {{ OPERATION_TYPE[o.type] }} · {{ formatDate(o.performedAt) }}<template v-if="o.quantity"> · {{ o.quantity }}</template>
                    </span>
                  </div>
                  <h4>الفحوص</h4>
                  <div class="farm-chips">
                    <span v-if="!plant.inspections.length" class="doc-hint">لا فحوص</span>
                    <span
                      v-for="i in plant.inspections"
                      :key="i.id"
                      :class="['farm-chip', i.status !== 'resolved' && i.severity ? 'farm-chip--danger' : '']"
                    >
                      {{ PEST[i.pest] }} ({{ SEVERITY[i.severity] }}) · {{ formatDate(i.inspectedAt) }} · {{ INSPECTION_STATUS[i.status].label }}
                    </span>
                  </div>
                </div>
                <div>
                  <h4>تاريخ الحالات</h4>
                  <ol class="plant-timeline">
                    <li v-for="h in plant.history" :key="h.id">
                      <strong>{{ PLANT_STATUS[h.toStatus].label }}</strong>
                      <span>{{ formatDateTime(h.occurredAt) }}</span>
                      <small v-if="h.reason">{{ REMOVAL_REASON[h.reason as keyof typeof REMOVAL_REASON] ?? PEST[h.reason as keyof typeof PEST] ?? h.reason }}</small>
                    </li>
                  </ol>

                  <div v-can="'record_farm_work'" class="doc-section">
                    <strong>تغيير الحالة</strong>
                    <select v-model="statusForm.status" class="form-select">
                      <option v-for="(s, key) in PLANT_STATUS" :key="key" :value="key">{{ s.label }}</option>
                    </select>
                    <select v-if="gone" v-model="statusForm.removalReason" class="form-select">
                      <option value="" disabled>السبب *</option>
                      <option v-for="(label, key) in REMOVAL_REASON" :key="key" :value="key">{{ label }}</option>
                    </select>
                    <input v-model.trim="statusForm.reason" class="form-input" maxlength="200" placeholder="ملاحظة (اختياري)" />
                    <button class="btn btn--sm btn--primary" :disabled="saving || statusForm.status === plant.status || (gone && !statusForm.removalReason)" @click="saveStatus">
                      حفظ الحالة
                    </button>
                  </div>

                  <div v-if="['dead', 'removed'].includes(plant.status)" v-can="'manage_farms'" class="doc-section">
                    <strong>غرس بديل في نفس الجورة</strong>
                    <select v-model="replacementSource" class="form-select">
                      <option v-for="(label, key) in PLANT_SOURCE" :key="key" :value="key">{{ label }}</option>
                    </select>
                    <button class="btn btn--sm btn--primary" :disabled="saving" @click="replace">غرس البديل</button>
                  </div>
                </div>
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
import { Search, TreePalm, X } from "lucide-vue-next";
import { useFarmsStore } from "@/stores/farms";
import { useFarmScope } from "@/composables/useFarmScope";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import {
  INSPECTION_STATUS,
  OPERATION_TYPE,
  PEST,
  PLANT_SEX,
  PLANT_SOURCE,
  PLANT_STATUS,
  PRECISION,
  REMOVAL_REASON,
  SEVERITY,
} from "@/utils/farms";
import type { PlantDetail, PlantRemovalReason, PlantSource, PlantStatus } from "@/types/farms";

definePageMeta({ middleware: "auth" });

const store = useFarmsStore();
const scope = useFarmScope();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const saving = ref(false);

const filters = reactive({
  search: "",
  unitId: "",
  status: "live",
  sex: "",
  plantingId: typeof route.query.plantingId === "string" ? route.query.plantingId : "",
});
const list = usePagedList((page) =>
  store.fetchPlants({
    farmId: filters.plantingId ? undefined : scope.farmId.value || undefined,
    plantingId: filters.plantingId || undefined,
    unitId: filters.unitId || undefined,
    status: filters.status || undefined,
    sex: filters.sex || undefined,
    search: filters.search || undefined,
    limit: 50,
    page,
  }),
);
let timer: ReturnType<typeof setTimeout> | undefined;
const onSearch = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => list.load(1), 300);
};
const onFarm = () => {
  filters.unitId = "";
  void list.load(1);
};
const clearPlanting = () => {
  filters.plantingId = "";
  void router.replace({ query: {} });
  void list.load(1);
};

/** العمر بالسنوات من تاريخ الغرس */
const ageOf = (plantedAt: string | null) => {
  if (!plantedAt) return "—";
  const years = (Date.now() - new Date(plantedAt).getTime()) / (365.25 * 86_400_000);
  return years < 1 ? `${Math.max(0, Math.round(years * 12))} شهر` : `${Math.floor(years)} سنة`;
};

// ─── النخلة ───
const plant = ref<PlantDetail | null>(null);
const statusForm = reactive({
  status: "healthy" as PlantStatus,
  removalReason: "" as PlantRemovalReason | "",
  reason: "",
});
const gone = computed(() => ["dead", "removed"].includes(statusForm.status));
const openDetail = async (id: string) => {
  try {
    plant.value = await store.getPlant(id);
    Object.assign(statusForm, { status: plant.value.status, removalReason: "", reason: "" });
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فتح النخلة"));
  }
};
const saveStatus = async () => {
  if (!plant.value) return;
  saving.value = true;
  try {
    plant.value = await store.setPlantStatus(plant.value.id, {
      status: statusForm.status,
      reason: statusForm.reason || null,
      removalReason: gone.value ? (statusForm.removalReason as PlantRemovalReason) : null,
    });
    toast.success("حُفظت الحالة");
    void list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    saving.value = false;
  }
};
const replacementSource = ref<PlantSource>("offshoot");
const replace = async () => {
  if (!plant.value) return;
  saving.value = true;
  try {
    const created = await store.createPlant(plant.value.plantingId, {
      unitId: plant.value.unitId,
      replacesPlantId: plant.value.id,
      source: replacementSource.value,
      sex: plant.value.sex,
    });
    toast.success(`غُرست ${created.tag}`);
    plant.value = created;
    void list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الغرس"));
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    await scope.init();
    await list.load(1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحميل"));
  }
});
</script>

<style lang="scss" scoped>
.plant-facts {
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

h4 {
  margin: $space-3 0 $space-2;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}

.plant-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  max-height: 260px;
  overflow-y: auto;

  li {
    display: flex;
    flex-direction: column;
    padding: $space-2 $space-3;
    border-inline-start: 3px solid $stb-primary;
    background: $stb-surface-2;
    border-radius: $radius-sm;
    font-size: $font-size-sm;

    span,
    small {
      color: $stb-text-secondary;
      font-size: $font-size-xs;
    }
  }
}

.doc-section {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-top: $space-3;
}
</style>
