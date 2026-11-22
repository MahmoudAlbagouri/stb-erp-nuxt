<!-- pages/dashboard/farms/harvests.vue — الحصاد: يدخل المخزن بدفعة، بوزنه وجودته ومرفوضه وقيمته -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الحصاد</h1>
        <p>كل جني بوزنه الصافي والقائم، جودته، المرفوض وسببه — يدخل المخزن بدفعة كود المزرعة وتاريخه</p>
      </div>
      <div class="page-header__actions">
        <button v-can="'record_farm_work'" class="btn btn--primary" :disabled="!scope.farmId.value" @click="openForm">
          <Plus :size="18" /> <span>تسجيل حصاد</span>
        </button>
      </div>
    </div>

    <div class="card doc-filters">
      <select v-model="scope.farmId.value" class="form-select" @change="onFarm">
        <option v-for="f in scope.store.farms" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
      <select v-model="filters.unitId" class="form-select" @change="list.load(1)">
        <option value="">كل الوحدات</option>
        <option v-for="o in scope.unitOptions.value" :key="o.id" :value="o.id">{{ o.label }}</option>
      </select>
      <input v-model="filters.from" type="date" class="form-input" @change="list.load(1)" />
      <input v-model="filters.to" type="date" class="form-input" @change="list.load(1)" />
      <select v-model="filters.status" class="form-select" @change="list.load(1)">
        <option value="recorded">المسجّل</option>
        <option value="voided">الملغى</option>
        <option value="">الكل</option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <Wheat :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا حصاد في هذه الفترة</div>
      </div>
    </div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الحصاد</th>
              <th>من</th>
              <th>المنتج</th>
              <th>الصافي</th>
              <th>الجودة</th>
              <th>المرفوض</th>
              <th>القيمة</th>
              <th>الدفعة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in list.rows.value" :key="h.id" :class="{ 'is-voided': h.status === 'voided' }">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ h.number }}</span>
                  <span class="doc-cell__sub">{{ formatDateTime(h.harvestedAt) }}</span>
                </div>
              </td>
              <td>
                {{ h.plant ? h.plant.tag : (h.unit?.name ?? "—") }}
                <span v-if="h.planting" class="doc-cell__sub"> · {{ h.planting.crop?.name }}</span>
                <span v-if="h.phiViolation" class="farm-chip farm-chip--danger" title="جُني داخل فترة أمان مبيد">فترة أمان!</span>
              </td>
              <td>{{ h.product?.name }}</td>
              <td class="doc-num">
                {{ formatNumber(h.quantity) }} {{ h.product?.baseUnit?.name }}
                <span v-if="h.containers" class="doc-cell__sub">{{ h.containers }} {{ h.containerLabel ?? "" }}</span>
              </td>
              <td>{{ h.grade ? GRADE[h.grade] : "—" }}</td>
              <td class="doc-num">
                <template v-if="h.rejectQuantity">{{ formatNumber(h.rejectQuantity) }} <span class="doc-cell__sub">{{ h.rejectReason ? REJECT_REASON[h.rejectReason] : "" }}</span></template>
                <template v-else>—</template>
              </td>
              <td class="doc-money">{{ formatCurrency(h.value) }}</td>
              <td><span class="doc-code" dir="ltr">{{ h.lotNumber }}</span></td>
              <td>
                <button v-if="h.status === 'recorded'" v-can="'record_farm_work'" class="btn btn--sm btn--ghost" @click="askVoid(h)">إلغاء</button>
                <span v-else class="badge badge--inactive">ملغى</span>
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
      label="حصاد"
      @change="list.load"
    />

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3><Wheat :size="20" class="doc-modal__icon" /> تسجيل حصاد</h3>
              <button class="btn btn--icon btn--ghost" @click="showForm = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submit">
              <div class="doc-grid">
                <div class="form-group doc-grid__full">
                  <label>الزراعة *</label>
                  <select v-model="form.plantingId" class="form-select" required @change="form.plantTag = ''">
                    <option value="" disabled>اختر</option>
                    <option v-for="p in plantings" :key="p.id" :value="p.id">
                      {{ p.crop?.name }}{{ p.variety ? ` — ${p.variety.name}` : "" }} ({{ p.unit?.name }})
                    </option>
                  </select>
                </div>
                <div v-if="selectedPlanting?.trackingMode === 'individual'" class="form-group">
                  <label>نخلة بعينها (الوسم)</label>
                  <input v-model.trim="form.plantTag" class="form-input" dir="ltr" list="farm-plant-tags" placeholder="اختياري" @focus="loadTags" />
                  <datalist id="farm-plant-tags">
                    <option v-for="p in tags" :key="p.id" :value="p.tag" />
                  </datalist>
                </div>
                <div class="form-group">
                  <label>من وحدة</label>
                  <select v-model="form.unitId" class="form-select">
                    <option value="">وحدة الزراعة</option>
                    <option v-for="o in scope.unitOptions.value" :key="o.id" :value="o.id">{{ o.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>وقت الجني</label>
                  <input v-model="form.harvestedAt" type="datetime-local" class="form-input" />
                </div>
                <div class="form-group">
                  <label>الصافي الداخل للمخزن *</label>
                  <StbNumberInput v-model.number="form.quantity" class="form-input" min="0" step="any" required />
                </div>
                <div class="form-group">
                  <label>القائم قبل الفرز</label>
                  <StbNumberInput v-model.number="form.grossQuantity" class="form-input" min="0" step="any" />
                </div>
                <div class="form-group">
                  <label>العدد (عذوق/صناديق)</label>
                  <div class="qty-unit">
                    <StbNumberInput v-model.number="form.containers" class="form-input" min="0" />
                    <input v-model.trim="form.containerLabel" class="form-input" maxlength="30" placeholder="عذق" />
                  </div>
                </div>
                <div class="form-group">
                  <label>الجودة</label>
                  <select v-model="form.grade" class="form-select">
                    <option value="">—</option>
                    <option v-for="(label, key) in GRADE" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>المرفوض</label>
                  <StbNumberInput v-model.number="form.rejectQuantity" class="form-input" min="0" step="any" />
                </div>
                <div v-if="Number(form.rejectQuantity) > 0" class="form-group">
                  <label>سبب الرفض</label>
                  <select v-model="form.rejectReason" class="form-select">
                    <option value="">—</option>
                    <option v-for="(label, key) in REJECT_REASON" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>قيمة الوحدة</label>
                  <StbNumberInput v-model.number="form.unitCost" class="form-input" min="0" :step="moneyStep()" placeholder="المعيارية للصنف" />
                </div>
                <div class="form-group">
                  <label>العمال / الساعات</label>
                  <div class="qty-unit">
                    <StbNumberInput v-model.number="form.workerCount" class="form-input" min="0" placeholder="عدد" />
                    <StbNumberInput v-model.number="form.laborHours" class="form-input" min="0" step="any" placeholder="ساعات" />
                  </div>
                </div>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showForm = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="saving" :class="{ 'btn--loading': saving }">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showVoid"
      title="إلغاء الحصاد"
      message="يخرج من دفعته ويُعكس قيده (إن بقي في المخزن)."
      confirm-text="إلغاء الحصاد"
      :loading="saving"
      @confirm="doVoid"
    >
      <input v-model.trim="voidReason" class="form-input" placeholder="السبب *" maxlength="200" />
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Plus, Wheat, X } from "lucide-vue-next";
import { useFarmsStore } from "@/stores/farms";
import { useFarmScope } from "@/composables/useFarmScope";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { GRADE, REJECT_REASON } from "@/utils/farms";
import type {
  FarmHarvest,
  FarmPlant,
  HarvestGrade,
  HarvestRejectReason,
  Planting,
} from "@/types/farms";

definePageMeta({ middleware: "auth" });

const store = useFarmsStore();
const scope = useFarmScope();
const toast = useToast();
const saving = ref(false);

const yearStart = `${new Date().getFullYear()}-01-01`;
const filters = reactive({ unitId: "", from: yearStart, to: "", status: "recorded" });
const list = usePagedList((page) =>
  store.fetchHarvests({
    farmId: scope.farmId.value || undefined,
    unitId: filters.unitId || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    status: filters.status || undefined,
    page,
  }),
);
const plantings = ref<Planting[]>([]);
const onFarm = async () => {
  filters.unitId = "";
  await Promise.all([list.load(1), loadPlantings()]);
};
const loadPlantings = async () => {
  if (!scope.farmId.value) return;
  plantings.value = (
    await store.fetchPlantings({ farmId: scope.farmId.value, status: "active", limit: 200 })
  ).data;
};

const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const emptyForm = () => ({
  plantingId: "",
  plantTag: "",
  unitId: "",
  harvestedAt: localNow(),
  quantity: "" as number | "",
  grossQuantity: "" as number | "",
  containers: "" as number | "",
  containerLabel: "",
  grade: "" as HarvestGrade | "",
  rejectQuantity: "" as number | "",
  rejectReason: "" as HarvestRejectReason | "",
  unitCost: "" as number | "",
  workerCount: "" as number | "",
  laborHours: "" as number | "",
});
const form = reactive(emptyForm());
const showForm = ref(false);
const selectedPlanting = computed(() => plantings.value.find((p) => p.id === form.plantingId));
const tags = ref<FarmPlant[]>([]);
const loadTags = async () => {
  if (!form.plantingId) return;
  tags.value = (
    await store.fetchPlants({ plantingId: form.plantingId, status: "live", limit: 200 })
  ).data;
};
const openForm = () => {
  Object.assign(form, emptyForm());
  showForm.value = true;
};
const optional = (v: number | "") => (v === "" ? null : Number(v));
const submit = async () => {
  saving.value = true;
  try {
    let plantId: string | null = null;
    if (form.plantTag) {
      const found =
        tags.value.find((p) => p.tag === form.plantTag) ??
        (await store.fetchPlants({ plantingId: form.plantingId, search: form.plantTag, limit: 5 })).data.find(
          (p) => p.tag === form.plantTag,
        );
      if (!found) throw new Error(`لا نخلة بالوسم ${form.plantTag} في هذه الزراعة`);
      plantId = found.id;
    }
    const harvest = await store.createHarvest({
      farmId: scope.farmId.value,
      plantingId: form.plantingId,
      plantId,
      unitId: form.unitId || null,
      harvestedAt: form.harvestedAt ? new Date(form.harvestedAt).toISOString() : undefined,
      quantity: Number(form.quantity) || 0,
      grossQuantity: optional(form.grossQuantity),
      containers: optional(form.containers),
      containerLabel: form.containerLabel || null,
      grade: form.grade || null,
      rejectQuantity: optional(form.rejectQuantity),
      rejectReason: form.rejectReason || null,
      unitCost: optional(form.unitCost),
      workerCount: optional(form.workerCount),
      laborHours: optional(form.laborHours),
    });
    toast.success(`سُجّل ${harvest.number} في الدفعة ${harvest.lotNumber}`);
    if (harvest.phiViolation) toast.warning("جُني داخل فترة أمان مبيد على هذه الوحدة");
    showForm.value = false;
    await list.load(1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تسجيل الحصاد"));
  } finally {
    saving.value = false;
  }
};

const showVoid = ref(false);
const voidTarget = ref<FarmHarvest | null>(null);
const voidReason = ref("");
const askVoid = (h: FarmHarvest) => {
  voidTarget.value = h;
  voidReason.value = "";
  showVoid.value = true;
};
const doVoid = async () => {
  if (!voidTarget.value || !voidReason.value) {
    toast.warning("اكتب السبب");
    return;
  }
  saving.value = true;
  try {
    await store.voidHarvest(voidTarget.value.id, voidReason.value);
    toast.success("أُلغي الحصاد");
    showVoid.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الإلغاء"));
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    await scope.init();
    await Promise.all([list.load(1), loadPlantings()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحميل"));
  }
});
</script>

<style lang="scss" scoped>
.qty-unit {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-2;
}

.is-voided td {
  opacity: 0.5;
  text-decoration: line-through;
}
</style>
