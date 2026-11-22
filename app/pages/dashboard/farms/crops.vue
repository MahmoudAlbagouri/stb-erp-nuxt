<!-- pages/dashboard/farms/crops.vue — المحاصيل وأصنافها وتقويمها الزراعي -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>المحاصيل والتقويم</h1>
        <p>
          كل محصول بأصنافه: منتج حصاده في المخزن، تكلفته المعيارية، وإنتاجيته
          المتوقعة — وتقويمه الذي يخطط العمليات تلقائياً
        </p>
      </div>
      <div class="page-header__actions">
        <button v-can="'manage_farms'" class="btn btn--primary" @click="openCrop()">
          <Plus :size="18" /> <span>محصول</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!store.crops.length" class="card">
      <div class="empty-state">
        <Leaf :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا محاصيل بعد</div>
        <div class="empty-state__text">أضف النخيل (نخلة نخلة)، أو أشجاراً بالعدد، أو محاصيل بالمساحة</div>
      </div>
    </div>
    <div v-else class="farm-split">
      <div class="crop-list">
        <button
          v-for="c in store.crops"
          :key="c.id"
          class="card crop-item"
          :class="{ 'is-active': c.id === selectedId }"
          @click="selectCrop(c.id)"
        >
          <strong>{{ c.name }}</strong>
          <span class="doc-cell__sub">
            {{ CROP_CATEGORY[c.category] }} · {{ c.lifecycle === "perennial" ? "معمّر" : "حولي" }} ·
            {{ c.varieties?.length ?? 0 }} صنف
          </span>
        </button>
      </div>

      <div v-if="crop" class="card farm-panel">
        <div class="crop-head">
          <h3>{{ crop.name }}</h3>
          <div class="doc-actions">
            <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openCrop(crop)"><Pencil :size="14" /> تعديل</button>
            <button v-can="'manage_farms'" class="btn btn--sm btn--danger btn--icon" @click="removeCrop"><Trash2 :size="14" /></button>
          </div>
        </div>
        <dl>
          <dt>الفئة</dt><dd>{{ CROP_CATEGORY[crop.category] }}</dd>
          <dt>المتابعة</dt><dd>{{ TRACKING[crop.defaultTrackingMode] }}</dd>
          <dt>منتج الحصاد</dt><dd>{{ crop.harvestProduct?.name ?? "—" }}</dd>
        </dl>

        <div class="crop-section">
          <div class="crop-section__head">
            <strong>الأصناف</strong>
            <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openVariety()"><Plus :size="14" /> صنف</button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>منتج الحصاد</th>
                <th>التكلفة المعيارية</th>
                <th>المتوقع</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-if="!crop.varieties?.length"><td colspan="5" class="doc-hint">لا أصناف</td></tr>
              <tr v-for="v in crop.varieties" :key="v.id">
                <td><strong>{{ v.name }}</strong></td>
                <td>{{ v.harvestProduct?.name ?? "منتج المحصول" }}</td>
                <td class="doc-money">{{ v.standardCost === null ? "—" : formatCurrency(v.standardCost) }}</td>
                <td>
                  <template v-if="v.expectedYieldPerPlant">{{ formatNumber(v.expectedYieldPerPlant) }} للنبتة</template>
                  <template v-if="v.expectedYieldPerHectare">{{ formatNumber(v.expectedYieldPerHectare) }} للهكتار</template>
                  <span v-if="v.daysToHarvest" class="doc-cell__sub"> · {{ v.daysToHarvest }} يوم للحصاد</span>
                </td>
                <td>
                  <div class="doc-actions">
                    <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openVariety(v)"><Pencil :size="14" /></button>
                    <button v-can="'manage_farms'" class="btn btn--sm btn--danger btn--icon" @click="removeVariety(v)"><Trash2 :size="14" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="crop-section">
          <div class="crop-section__head">
            <strong>التقويم الزراعي</strong>
            <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openStep()"><Plus :size="14" /> خطوة</button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>العملية</th>
                <th>الموعد</th>
                <th>التكرار</th>
                <th>الصنف</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-if="!steps.length"><td colspan="5" class="doc-hint">لا خطوات — أضف التلقيح في مارس، أو الري بعد الزرع بأيام...</td></tr>
              <tr v-for="s in steps" :key="s.id">
                <td>{{ OPERATION_TYPE[s.operationType] }} — {{ s.title }}</td>
                <td>
                  <template v-if="s.anchor === 'planting'">بعد الزرع بـ {{ s.dayOffset }} يوم</template>
                  <template v-else>{{ s.day }} {{ MONTHS[(s.month ?? 1) - 1] }} كل سنة</template>
                </td>
                <td>{{ s.repeatEveryDays ? `كل ${s.repeatEveryDays} يوم × ${s.repeatCount ?? 1}` : "مرة" }}</td>
                <td>{{ s.variety?.name ?? "الكل" }}</td>
                <td>
                  <div class="doc-actions">
                    <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openStep(s)"><Pencil :size="14" /></button>
                    <button v-can="'manage_farms'" class="btn btn--sm btn--danger btn--icon" @click="removeStep(s.id)"><Trash2 :size="14" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ محصول ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCrop" class="modal-overlay" @click.self="showCrop = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>{{ cropForm.id ? "تعديل محصول" : "محصول جديد" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="showCrop = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitCrop">
              <div class="doc-grid">
                <div class="form-group">
                  <label>الاسم *</label>
                  <input v-model.trim="cropForm.name" class="form-input" required maxlength="120" />
                </div>
                <div class="form-group">
                  <label>الفئة *</label>
                  <select v-model="cropForm.category" class="form-select" @change="onCategory">
                    <option v-for="(label, key) in CROP_CATEGORY" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>دورة الحياة</label>
                  <select v-model="cropForm.lifecycle" class="form-select">
                    <option value="perennial">معمّر (يُحصد كل موسم)</option>
                    <option value="annual">حولي (دورة تنتهي بحصادها)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>المتابعة</label>
                  <select v-model="cropForm.defaultTrackingMode" class="form-select">
                    <option v-for="(label, key) in TRACKING" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group doc-grid__full">
                  <label>منتج الحصاد (صنف مخزني)</label>
                  <div v-if="cropForm.product" class="picked-product">
                    {{ cropForm.product.name }}
                    <button type="button" class="btn btn--sm btn--ghost" @click="cropForm.product = null"><X :size="14" /></button>
                  </div>
                  <CatalogProductPicker v-else :types="['stocked']" placeholder="ابحث عن منتج الحصاد..." @pick="(p: Product) => (cropForm.product = p)" />
                </div>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showCrop = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="saving">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ صنف ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showVariety" class="modal-overlay" @click.self="showVariety = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>{{ varietyForm.id ? "تعديل صنف" : "صنف جديد" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="showVariety = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitVariety">
              <div class="doc-grid">
                <div class="form-group">
                  <label>الاسم *</label>
                  <input v-model.trim="varietyForm.name" class="form-input" required maxlength="120" placeholder="سكري، برحي، خلاص..." />
                </div>
                <div class="form-group">
                  <label>التكلفة المعيارية للوحدة</label>
                  <StbNumberInput v-model.number="varietyForm.standardCost" class="form-input" min="0" :step="moneyStep()" />
                  <small class="doc-hint">بها يدخل الحصاد المخزن إن لم تُكتب قيمته</small>
                </div>
                <div v-if="crop?.lifecycle === 'perennial'" class="form-group">
                  <label>المتوقع للنبتة في الموسم</label>
                  <StbNumberInput v-model.number="varietyForm.expectedYieldPerPlant" class="form-input" min="0" step="any" />
                </div>
                <div v-if="crop?.lifecycle === 'perennial'" class="form-group">
                  <label>سنوات حتى الإثمار</label>
                  <StbNumberInput v-model.number="varietyForm.yearsToBearing" class="form-input" min="0" max="50" />
                </div>
                <div v-if="crop?.lifecycle === 'annual'" class="form-group">
                  <label>المتوقع للهكتار في الدورة</label>
                  <StbNumberInput v-model.number="varietyForm.expectedYieldPerHectare" class="form-input" min="0" step="any" />
                </div>
                <div v-if="crop?.lifecycle === 'annual'" class="form-group">
                  <label>أيام من الزرع للحصاد</label>
                  <StbNumberInput v-model.number="varietyForm.daysToHarvest" class="form-input" min="1" />
                </div>
                <div class="form-group doc-grid__full">
                  <label>منتج حصاد خاص بالصنف</label>
                  <div v-if="varietyForm.product" class="picked-product">
                    {{ varietyForm.product.name }}
                    <button type="button" class="btn btn--sm btn--ghost" @click="varietyForm.product = null"><X :size="14" /></button>
                  </div>
                  <CatalogProductPicker v-else :types="['stocked']" placeholder="فارغ = منتج المحصول" @pick="(p: Product) => (varietyForm.product = p)" />
                </div>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showVariety = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="saving">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ خطوة تقويم ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showStep" class="modal-overlay" @click.self="showStep = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>{{ stepForm.id ? "تعديل خطوة" : "خطوة في التقويم" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="showStep = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitStep">
              <div class="doc-grid">
                <div class="form-group">
                  <label>العملية *</label>
                  <select v-model="stepForm.operationType" class="form-select">
                    <option v-for="(label, key) in OPERATION_TYPE" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>العنوان *</label>
                  <input v-model.trim="stepForm.title" class="form-input" required maxlength="150" />
                </div>
                <div class="form-group">
                  <label>الموعد</label>
                  <select v-model="stepForm.anchor" class="form-select">
                    <option value="yearly">في يوم من كل سنة</option>
                    <option value="planting">بعد الزرع بأيام</option>
                  </select>
                </div>
                <div v-if="stepForm.anchor === 'planting'" class="form-group">
                  <label>بعد الزرع بـ (يوم)</label>
                  <StbNumberInput v-model.number="stepForm.dayOffset" class="form-input" min="0" required />
                </div>
                <template v-else>
                  <div class="form-group">
                    <label>الشهر</label>
                    <select v-model.number="stepForm.month" class="form-select">
                      <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>اليوم</label>
                    <StbNumberInput v-model.number="stepForm.day" class="form-input" min="1" max="31" required />
                  </div>
                </template>
                <div class="form-group">
                  <label>تتكرر كل (يوم)</label>
                  <StbNumberInput v-model.number="stepForm.repeatEveryDays" class="form-input" min="1" placeholder="مرة واحدة" />
                </div>
                <div v-if="stepForm.repeatEveryDays" class="form-group">
                  <label>عدد المرات</label>
                  <StbNumberInput v-model.number="stepForm.repeatCount" class="form-input" min="1" max="200" />
                </div>
                <div class="form-group">
                  <label>للصنف</label>
                  <select v-model="stepForm.varietyId" class="form-select">
                    <option value="">كل الأصناف</option>
                    <option v-for="v in crop?.varieties" :key="v.id" :value="v.id">{{ v.name }}</option>
                  </select>
                </div>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showStep = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="saving">حفظ</button>
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
import { Leaf, Pencil, Plus, Trash2, X } from "lucide-vue-next";
import { useFarmsStore } from "@/stores/farms";
import { useToast } from "@/composables/useToast";
import { CROP_CATEGORY, OPERATION_TYPE, TRACKING } from "@/utils/farms";
import type { Product } from "@/types/catalog";
import type {
  CalendarStep,
  Crop,
  CropCategory,
  CropLifecycle,
  CropVariety,
  FarmOperationType,
  ProductRef,
  TrackingMode,
} from "@/types/farms";

definePageMeta({ middleware: "auth" });

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const DEFAULTS: Record<CropCategory, { lifecycle: CropLifecycle; tracking: TrackingMode }> = {
  palm: { lifecycle: "perennial", tracking: "individual" },
  fruit_tree: { lifecycle: "perennial", tracking: "count" },
  ornamental: { lifecycle: "perennial", tracking: "count" },
  field_crop: { lifecycle: "annual", tracking: "area" },
  vegetable: { lifecycle: "annual", tracking: "area" },
  forage: { lifecycle: "annual", tracking: "area" },
  greenhouse: { lifecycle: "annual", tracking: "area" },
  other: { lifecycle: "annual", tracking: "area" },
};

const store = useFarmsStore();
const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const selectedId = ref<string>("");
const crop = computed(() => store.crops.find((c) => c.id === selectedId.value) ?? null);
const steps = ref<CalendarStep[]>([]);

const selectCrop = async (id: string) => {
  selectedId.value = id;
  try {
    steps.value = await store.fetchCalendar(id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل التقويم"));
  }
};

const run = async (work: () => Promise<unknown>, done: string) => {
  saving.value = true;
  try {
    await work();
    toast.success(done);
    return true;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
    return false;
  } finally {
    saving.value = false;
  }
};

// ─── المحصول ───
const cropForm = reactive({
  id: "",
  name: "",
  category: "palm" as CropCategory,
  lifecycle: "perennial" as CropLifecycle,
  defaultTrackingMode: "individual" as TrackingMode,
  product: null as ProductRef | null,
});
const showCrop = ref(false);
const openCrop = (c?: Crop) => {
  Object.assign(cropForm, {
    id: c?.id ?? "",
    name: c?.name ?? "",
    category: c?.category ?? "palm",
    lifecycle: c?.lifecycle ?? "perennial",
    defaultTrackingMode: c?.defaultTrackingMode ?? "individual",
    product: c?.harvestProduct ?? null,
  });
  showCrop.value = true;
};
const onCategory = () => {
  cropForm.lifecycle = DEFAULTS[cropForm.category].lifecycle;
  cropForm.defaultTrackingMode = DEFAULTS[cropForm.category].tracking;
};
const submitCrop = async () => {
  const ok = await run(async () => {
    const saved = await store.saveCrop(
      {
        name: cropForm.name,
        category: cropForm.category,
        lifecycle: cropForm.lifecycle,
        defaultTrackingMode: cropForm.defaultTrackingMode,
        harvestProductId: cropForm.product?.id ?? null,
      },
      cropForm.id || undefined,
    );
    await selectCrop(saved.id);
  }, "تم الحفظ");
  if (ok) showCrop.value = false;
};
const removeCrop = async () => {
  if (!crop.value || !confirm(`حذف "${crop.value.name}"؟ المحصول المزروع يوقف بدل حذفه.`)) return;
  if (await run(() => store.removeCrop(crop.value!.id), "تم الحذف")) {
    selectedId.value = store.crops[0]?.id ?? "";
  }
};

// ─── الصنف ───
const varietyForm = reactive({
  id: "",
  name: "",
  standardCost: "" as number | "",
  expectedYieldPerPlant: "" as number | "",
  expectedYieldPerHectare: "" as number | "",
  daysToHarvest: "" as number | "",
  yearsToBearing: "" as number | "",
  product: null as ProductRef | null,
});
const showVariety = ref(false);
const openVariety = (v?: CropVariety) => {
  Object.assign(varietyForm, {
    id: v?.id ?? "",
    name: v?.name ?? "",
    standardCost: v?.standardCost ?? "",
    expectedYieldPerPlant: v?.expectedYieldPerPlant ?? "",
    expectedYieldPerHectare: v?.expectedYieldPerHectare ?? "",
    daysToHarvest: v?.daysToHarvest ?? "",
    yearsToBearing: v?.yearsToBearing ?? "",
    product: v?.harvestProduct ?? null,
  });
  showVariety.value = true;
};
const optional = (v: number | "") => (v === "" ? null : Number(v));
const submitVariety = async () => {
  if (!crop.value) return;
  const ok = await run(
    () =>
      store.saveVariety(
        crop.value!.id,
        {
          name: varietyForm.name,
          standardCost: optional(varietyForm.standardCost),
          expectedYieldPerPlant: optional(varietyForm.expectedYieldPerPlant),
          expectedYieldPerHectare: optional(varietyForm.expectedYieldPerHectare),
          daysToHarvest: optional(varietyForm.daysToHarvest),
          yearsToBearing: optional(varietyForm.yearsToBearing),
          harvestProductId: varietyForm.product?.id ?? null,
        },
        varietyForm.id || undefined,
      ),
    "تم الحفظ",
  );
  if (ok) showVariety.value = false;
};
const removeVariety = async (v: CropVariety) => {
  if (!crop.value || !confirm(`حذف الصنف "${v.name}"؟`)) return;
  await run(() => store.removeVariety(crop.value!.id, v.id), "تم الحذف");
};

// ─── التقويم ───
const stepForm = reactive({
  id: "",
  operationType: "pollination" as FarmOperationType,
  title: "",
  anchor: "yearly" as "yearly" | "planting",
  dayOffset: "" as number | "",
  month: 3,
  day: 1 as number | "",
  repeatEveryDays: "" as number | "",
  repeatCount: "" as number | "",
  varietyId: "",
});
const showStep = ref(false);
const openStep = (s?: CalendarStep) => {
  Object.assign(stepForm, {
    id: s?.id ?? "",
    operationType: s?.operationType ?? "pollination",
    title: s?.title ?? "",
    anchor: s?.anchor ?? (crop.value?.lifecycle === "annual" ? "planting" : "yearly"),
    dayOffset: s?.dayOffset ?? "",
    month: s?.month ?? 3,
    day: s?.day ?? 1,
    repeatEveryDays: s?.repeatEveryDays ?? "",
    repeatCount: s?.repeatCount ?? "",
    varietyId: s?.varietyId ?? "",
  });
  showStep.value = true;
};
const submitStep = async () => {
  if (!crop.value) return;
  const ok = await run(async () => {
    await store.saveStep(
      crop.value!.id,
      {
        operationType: stepForm.operationType,
        title: stepForm.title,
        anchor: stepForm.anchor,
        dayOffset: stepForm.anchor === "planting" ? optional(stepForm.dayOffset) : null,
        month: stepForm.anchor === "yearly" ? stepForm.month : null,
        day: stepForm.anchor === "yearly" ? optional(stepForm.day) : null,
        repeatEveryDays: optional(stepForm.repeatEveryDays),
        repeatCount: stepForm.repeatEveryDays ? optional(stepForm.repeatCount) : null,
        varietyId: stepForm.varietyId || null,
      },
      stepForm.id || undefined,
    );
    steps.value = await store.fetchCalendar(crop.value!.id);
  }, "تم الحفظ");
  if (ok) showStep.value = false;
};
const removeStep = async (id: string) => {
  if (!crop.value || !confirm("حذف الخطوة؟ ما خُطّط منها يبقى.")) return;
  if (await run(() => store.removeStep(crop.value!.id, id), "تم الحذف")) {
    steps.value = await store.fetchCalendar(crop.value.id);
  }
};

onMounted(async () => {
  try {
    await store.fetchCrops();
    if (store.crops[0]) await selectCrop(store.crops[0].id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحميل"));
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.crop-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  order: 2;
}

.crop-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: $space-3;
  text-align: start;
  font: inherit;
  color: inherit;
  cursor: pointer;

  &.is-active {
    border-color: $stb-primary;
  }
}

.crop-head,
.crop-section__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.crop-section {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.picked-product {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-2 $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
}
</style>
