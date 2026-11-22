<!-- pages/dashboard/farms/index.vue — المزارع: أرقام السنة، وكل مزرعة بحدودها -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>المزارع</h1>
        <p>
          الأراضي وتقسيمها على الخريطة، وما يحتاج انتباهاً الآن: المتأخر،
          الإصابات، والري
        </p>
      </div>
      <div class="page-header__actions">
        <button v-can="'manage_farms'" class="btn btn--primary" @click="openForm()">
          <Plus :size="18" /> <span>مزرعة جديدة</span>
        </button>
      </div>
    </div>

    <div v-if="dash" class="farm-kpis">
      <div class="farm-kpi">
        <span>المساحة</span>
        <strong>{{ formatArea(dash.areaM2) }}</strong>
        <small>{{ dash.farms }} مزرعة · {{ dash.units }} وحدة</small>
      </div>
      <div class="farm-kpi">
        <span>النخيل والأشجار القائمة</span>
        <strong>{{ formatNumber(dash.plants.live) }}</strong>
        <small v-if="infested">{{ infested }} مصابة أو مريضة</small>
      </div>
      <div class="farm-kpi" :class="{ 'is-warn': dash.operations.overdue }">
        <span>عمليات متأخرة</span>
        <strong>{{ dash.operations.overdue }}</strong>
        <small>{{ dash.operations.upcoming }} خلال 7 أيام</small>
      </div>
      <div class="farm-kpi" :class="{ 'is-warn': dash.inspections.open }">
        <span>إصابات مفتوحة</span>
        <strong>{{ dash.inspections.open }}</strong>
        <small v-if="dash.inspections.topPests[0]">
          أكثرها: {{ PEST[dash.inspections.topPests[0].pest] }}
        </small>
      </div>
      <div class="farm-kpi">
        <span>حصاد السنة</span>
        <strong>{{ formatCurrency(harvestValue) }}</strong>
        <small>{{ dash.harvest.length }} منتج</small>
      </div>
      <div class="farm-kpi">
        <span>تكاليف السنة</span>
        <strong>{{ formatCurrency(dash.costs.total) }}</strong>
        <small>
          مدخلات {{ formatCurrency(dash.costs.inputs) }} · عمالة
          {{ formatCurrency(dash.costs.labor) }}
        </small>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>
    <div v-else-if="!store.farms.length" class="card">
      <div class="empty-state">
        <MapIcon :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا مزارع بعد</div>
        <div class="empty-state__text">
          أضف المزرعة وارسم حدودها، ثم قسّمها قطاعات وأحواشاً وصفوفاً
        </div>
      </div>
    </div>
    <div v-else class="farm-cards">
      <div v-for="f in store.farms" :key="f.id" class="card farm-card">
        <div class="farm-card__head">
          <div>
            <h3>{{ f.name }}</h3>
            <span class="doc-cell__sub">
              {{ f.code }} · {{ OWNERSHIP[f.ownership] }}
              <template v-if="f.warehouse"> · {{ f.warehouse.name }}</template>
            </span>
          </div>
          <span :class="['badge', f.isActive ? 'badge--active' : 'badge--inactive']">
            {{ f.isActive ? "نشطة" : "موقوفة" }}
          </span>
        </div>
        <div class="farm-card__stats">
          <div>
            <span>المساحة</span><strong>{{ formatArea(f.areaM2) }}</strong>
          </div>
          <div>
            <span>الوحدات</span><strong>{{ f.unitCount ?? 0 }}</strong>
          </div>
          <div>
            <span>زراعات قائمة</span><strong>{{ f.activePlantings ?? 0 }}</strong>
          </div>
          <div>
            <span>نخيل/أشجار</span><strong>{{ formatNumber(f.livePlants ?? 0) }}</strong>
          </div>
          <div :class="{ 'is-danger': f.openInspections }">
            <span>إصابات مفتوحة</span><strong>{{ f.openInspections ?? 0 }}</strong>
          </div>
        </div>
        <div class="farm-card__actions">
          <NuxtLink
            :to="f.unitCount ? `/dashboard/farms/${f.id}` : `/dashboard/farms/${f.id}?tab=units`"
            class="btn btn--primary btn--sm"
          >
            <MapIcon :size="14" /> {{ f.unitCount ? "الخريطة والتقسيم" : "قسّم المزرعة" }}
          </NuxtLink>
          <button v-can="'manage_farms'" class="btn btn--ghost btn--sm" @click="openForm(f)">
            <Pencil :size="14" /> تعديل
          </button>
          <button
            v-can="'manage_farms'"
            class="btn btn--danger btn--sm btn--icon"
            title="حذف"
            @click="askDelete(f)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- ══ مزرعة جديدة / تعديل ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal doc-modal--lg">
            <div class="modal__header">
              <h3>
                <MapIcon :size="20" class="doc-modal__icon" />
                {{ editing ? `تعديل ${editing.name}` : "مزرعة جديدة" }}
              </h3>
              <button class="btn btn--icon btn--ghost" @click="closeModal">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="submit">
              <div class="doc-grid">
                <div class="form-group">
                  <label>الاسم *</label>
                  <input v-model.trim="form.name" class="form-input" required maxlength="150" />
                </div>
                <div class="form-group">
                  <label>الكود</label>
                  <input
                    v-model.trim="form.code"
                    class="form-input"
                    dir="ltr"
                    maxlength="20"
                    placeholder="يُولَّد تلقائياً"
                  />
                </div>
                <div class="form-group">
                  <label>مخزن المزرعة</label>
                  <select v-model="form.warehouseId" class="form-select">
                    <option value="">—</option>
                    <option v-for="w in warehouses" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                  <small class="doc-hint">تُصرف منه المدخلات ويدخله الحصاد</small>
                </div>
                <div class="form-group">
                  <label>الملكية</label>
                  <select v-model="form.ownership" class="form-select">
                    <option v-for="(label, key) in OWNERSHIP" :key="key" :value="key">
                      {{ label }}
                    </option>
                  </select>
                </div>
                <div v-if="form.ownership === 'leased'" class="form-group">
                  <label>نهاية الإيجار</label>
                  <input v-model="form.leaseEndsOn" type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label>تكلفة ساعة العامل</label>
                  <StbNumberInput
                    v-model.number="form.laborHourCost"
                    class="form-input"
                    min="0"
                    :step="moneyStep()"
                  />
                  <small class="doc-hint">لتوزيع العمالة على تكلفة الكيلو (اختياري)</small>
                </div>
                <div class="form-group">
                  <label>العنوان</label>
                  <input v-model.trim="form.address" class="form-input" maxlength="250" />
                </div>
                <div class="form-group">
                  <label>المساحة (م²)</label>
                  <StbNumberInput
                    v-model.number="form.areaM2"
                    class="form-input"
                    min="0"
                    step="any"
                    :placeholder="form.boundary.length >= 3 ? 'من الحدود' : ''"
                  />
                  <small v-if="form.boundary.length >= 3" class="doc-hint">
                    من الحدود المرسومة: {{ formatArea(ringAreaM2(form.boundary)) }}
                  </small>
                </div>
                <div class="form-group doc-grid__full">
                  <label>حدود المزرعة على الخريطة</label>
                  <div class="farm-form-map">
                    <FarmMap
                      v-model:ring="form.boundary"
                      :drawing="true"
                      :legend="false"
                      :center="center"
                    />
                  </div>
                </div>
                <div class="form-group doc-grid__full">
                  <label>ملاحظات</label>
                  <input v-model.trim="form.notes" class="form-input" maxlength="2000" />
                </div>
              </div>
              <label class="checkbox-label">
                <input v-model="form.isActive" type="checkbox" />
                <span>نشطة</span>
              </label>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeModal">إلغاء</button>
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

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف المزرعة"
      :message="`حذف '${deleteTarget?.name}'؟ المزرعة التي عليها زراعات أو عمل مسجّل توقف بدل حذفها.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Map as MapIcon, Pencil, Plus, Trash2, X } from "lucide-vue-next";
import FarmMap from "~/components/farms/FarmMap.vue";
import { useFarmsStore } from "@/stores/farms";
import { useInventoryStore } from "@/stores/inventory";
import { useToast } from "@/composables/useToast";
import { OWNERSHIP, PEST, formatArea, ringAreaM2 } from "@/utils/farms";
import type { Farm, FarmDashboard, FarmOwnership, GeoRing } from "@/types/farms";

definePageMeta({ middleware: "auth" });

const store = useFarmsStore();
const inventory = useInventoryStore();
const toast = useToast();
const loading = ref(true);
const dash = ref<FarmDashboard | null>(null);

const warehouses = computed(() => inventory.warehouses.filter((w) => w.isActive));
const infested = computed(
  () => (dash.value?.plants.byStatus.infested ?? 0) + (dash.value?.plants.byStatus.diseased ?? 0),
);
const harvestValue = computed(() =>
  (dash.value?.harvest ?? []).reduce((sum, h) => sum + h.value, 0),
);

const emptyForm = () => ({
  name: "",
  code: "",
  warehouseId: warehouses.value.find((w) => w.type === "main")?.id ?? "",
  ownership: "owned" as FarmOwnership,
  leaseEndsOn: "",
  address: "",
  laborHourCost: "" as number | "",
  areaM2: "" as number | "",
  boundary: [] as GeoRing,
  notes: "",
  isActive: true,
});
const form = reactive(emptyForm());
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<Farm | null>(null);
const center = computed<[number, number] | null>(() =>
  editing.value?.latitude && editing.value.longitude
    ? [editing.value.latitude, editing.value.longitude]
    : null,
);

const openForm = (farm?: Farm) => {
  Object.assign(form, emptyForm());
  if (farm) {
    Object.assign(form, {
      name: farm.name,
      code: farm.code,
      warehouseId: farm.warehouseId ?? "",
      ownership: farm.ownership,
      leaseEndsOn: farm.leaseEndsOn ?? "",
      address: farm.address ?? "",
      laborHourCost: farm.laborHourCost ?? "",
      areaM2: farm.boundary?.length ? "" : (farm.areaM2 ?? ""),
      boundary: farm.boundary ? [...farm.boundary] : [],
      notes: farm.notes ?? "",
      isActive: farm.isActive,
    });
  }
  editing.value = farm ?? null;
  showModal.value = true;
};
const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const submit = async () => {
  submitting.value = true;
  try {
    const boundary = form.boundary.length >= 3 ? form.boundary : null;
    const [lng, lat] = boundary
      ? [
          boundary.reduce((s, p) => s + p[0], 0) / boundary.length,
          boundary.reduce((s, p) => s + p[1], 0) / boundary.length,
        ]
      : [null, null];
    await store.saveFarm(
      {
        name: form.name,
        code: form.code || undefined,
        warehouseId: form.warehouseId || null,
        ownership: form.ownership,
        leaseEndsOn: form.ownership === "leased" && form.leaseEndsOn ? form.leaseEndsOn : null,
        address: form.address || null,
        laborHourCost: form.laborHourCost === "" ? null : Number(form.laborHourCost),
        boundary,
        areaM2: boundary ? undefined : form.areaM2 === "" ? null : Number(form.areaM2),
        latitude: lat === null ? undefined : Math.round(lat * 1e6) / 1e6,
        longitude: lng === null ? undefined : Math.round(lng * 1e6) / 1e6,
        notes: form.notes || null,
        isActive: form.isActive,
      },
      editing.value?.id,
    );
    toast.success("تم الحفظ");
    showModal.value = false;
    void loadDashboard();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ المزرعة"));
  } finally {
    submitting.value = false;
  }
};

const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Farm | null>(null);
const askDelete = (farm: Farm) => {
  deleteTarget.value = farm;
  showConfirm.value = true;
};
const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeFarm(deleteTarget.value.id);
    toast.success("تم الحذف");
    showConfirm.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  } finally {
    deleting.value = false;
  }
};

const loadDashboard = async () => {
  try {
    dash.value = await store.dashboard();
  } catch {
    dash.value = null;
  }
};

onMounted(async () => {
  try {
    await Promise.all([store.fetchFarms(), inventory.fetchWarehouses(), loadDashboard()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل المزارع"));
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.farm-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-4;
}

.farm-card {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-4;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $space-2;

    h3 {
      margin: 0 0 2px;
      font-size: $font-size-lg;
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: $space-2;

    div {
      display: flex;
      flex-direction: column;
      padding: $space-2;
      border-radius: $radius-md;
      background: $stb-surface-2;
    }

    span {
      font-size: $font-size-xs;
      color: $stb-text-secondary;
    }

    strong {
      font-variant-numeric: tabular-nums;
    }

    .is-danger strong {
      color: $stb-danger;
    }
  }

  &__actions {
    display: flex;
    gap: $space-2;
    margin-top: auto;
  }
}
</style>
