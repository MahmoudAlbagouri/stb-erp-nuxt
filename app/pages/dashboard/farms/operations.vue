<!-- pages/dashboard/farms/operations.vue — العمليات الزراعية: المخطط والمتأخر، والمنفّذ بمدخلاته وعماله ومياهه -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>العمليات الزراعية</h1>
        <p>
          ري، تسميد، رش، تلقيح، تقليم... مخططة لموعدها أو منفّذة بما حدث فعلاً:
          المدخلات تخرج من المخزن بتكلفتها
        </p>
      </div>
      <div class="page-header__actions">
        <button v-can="'manage_farms'" class="btn btn--ghost" :disabled="!scope.farmId.value || saving" @click="generate">
          <CalendarPlus :size="18" /> <span>خطة السنة</span>
        </button>
        <button v-can="'record_farm_work'" class="btn btn--primary" :disabled="!scope.farmId.value" @click="openForm()">
          <Plus :size="18" /> <span>عملية</span>
        </button>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="t in TABS"
        :key="t.value"
        class="doc-tab"
        :class="{ 'is-active': filters.tab === t.value }"
        @click="setTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>
    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input v-model="filters.search" class="form-input" placeholder="رقم، عنوان، وحدة، مشرف..." @input="onSearch" />
      </div>
      <select v-model="scope.farmId.value" class="form-select" @change="onFarm">
        <option v-for="f in scope.store.farms" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
      <select v-model="filters.unitId" class="form-select" @change="list.load(1)">
        <option value="">كل الوحدات</option>
        <option v-for="o in scope.unitOptions.value" :key="o.id" :value="o.id">{{ o.label }}</option>
      </select>
      <select v-model="filters.type" class="form-select" @change="list.load(1)">
        <option value="">كل الأنواع</option>
        <option v-for="(label, key) in OPERATION_TYPE" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <ClipboardList :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا عمليات هنا</div>
      </div>
    </div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>العملية</th>
              <th>على</th>
              <th>الموعد / التنفيذ</th>
              <th>المدخلات</th>
              <th>العمالة</th>
              <th>المياه</th>
              <th>الحالة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in list.rows.value" :key="o.id">
              <td class="is-clickable" @click="openDetail(o.id)">
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ OPERATION_TYPE[o.type] }}<template v-if="o.title"> — {{ o.title }}</template></span>
                  <span class="doc-cell__sub">{{ o.number }}<template v-if="o.supervisorName"> · {{ o.supervisorName }}</template></span>
                </div>
              </td>
              <td>
                {{ o.unit?.name ?? "المزرعة كلها" }}
                <span v-if="o.planting" class="doc-cell__sub"> · {{ o.planting.crop?.name }}</span>
                <span v-if="o.plantsCovered" class="doc-cell__sub"> · {{ formatNumber(o.plantsCovered) }} نبتة</span>
              </td>
              <td>
                <template v-if="o.performedAt">{{ formatDateTime(o.performedAt) }}</template>
                <template v-else-if="o.plannedDate">
                  <span :class="{ 'is-late': o.status === 'planned' && o.plannedDate < today }">{{ formatDate(o.plannedDate) }}</span>
                </template>
              </td>
              <td class="doc-money">{{ o.inputCost ? formatCurrency(o.inputCost) : "—" }}</td>
              <td class="doc-num">
                <template v-if="o.laborHours">{{ formatNumber(o.laborHours) }} س</template>
                <template v-else>—</template>
              </td>
              <td class="doc-num">{{ o.waterM3 ? `${formatNumber(o.waterM3)} م³` : "—" }}</td>
              <td>
                <span :class="['badge', FARM_OPERATION_STATUS[o.status].badge]">{{ FARM_OPERATION_STATUS[o.status].label }}</span>
                <span v-if="o.harvestAllowedAt && o.harvestAllowedAt > today" class="farm-chip farm-chip--warn">
                  لا يُحصد قبل {{ formatDate(o.harvestAllowedAt) }}
                </span>
              </td>
              <td>
                <div class="doc-actions">
                  <button v-if="o.status === 'planned'" v-can="'record_farm_work'" class="btn btn--sm btn--primary" @click="openForm(o)">
                    <Check :size="14" /> نُفّذت
                  </button>
                  <button v-if="o.status !== 'cancelled'" v-can="'record_farm_work'" class="btn btn--sm btn--ghost" @click="askCancel(o)">
                    {{ o.status === "done" ? "إبطال" : "إلغاء" }}
                  </button>
                </div>
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
      label="عملية"
      @change="list.load"
    />

    <!-- ══ عملية جديدة / إتمام مخططة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
          <div class="modal doc-modal doc-modal--lg">
            <div class="modal__header">
              <h3>
                <ClipboardList :size="20" class="doc-modal__icon" />
                {{ completing ? `تنفيذ ${completing.number}` : "عملية زراعية" }}
              </h3>
              <button class="btn btn--icon btn--ghost" @click="showForm = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submit">
              <div class="doc-grid">
                <template v-if="!completing">
                  <div class="form-group">
                    <label>النوع *</label>
                    <select v-model="form.type" class="form-select" required>
                      <option v-for="(label, key) in OPERATION_TYPE" :key="key" :value="key">{{ label }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>العنوان</label>
                    <input v-model.trim="form.title" class="form-input" maxlength="150" />
                  </div>
                  <div class="form-group">
                    <label>الحالة</label>
                    <select v-model="form.status" class="form-select">
                      <option value="done">نُفّذت</option>
                      <option value="planned">مخططة لموعد</option>
                    </select>
                  </div>
                  <div v-if="form.status === 'planned'" class="form-group">
                    <label>الموعد *</label>
                    <input v-model="form.plannedDate" type="date" class="form-input" required />
                  </div>
                  <div class="form-group">
                    <label>الوحدة (وما تحتها)</label>
                    <select v-model="form.unitId" class="form-select" @change="form.plantIds = []">
                      <option value="">المزرعة كلها</option>
                      <option v-for="o in scope.unitOptions.value" :key="o.id" :value="o.id">{{ o.label }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>الزراعة</label>
                    <select v-model="form.plantingId" class="form-select" @change="form.plantIds = []">
                      <option value="">—</option>
                      <option v-for="p in plantings" :key="p.id" :value="p.id">
                        {{ p.crop?.name }}{{ p.variety ? ` — ${p.variety.name}` : "" }} ({{ p.unit?.name }})
                      </option>
                    </select>
                  </div>
                </template>

                <template v-if="isDone">
                  <div class="form-group">
                    <label>وقت التنفيذ</label>
                    <input v-model="form.performedAt" type="datetime-local" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label>المدة (دقيقة)</label>
                    <StbNumberInput v-model.number="form.durationMinutes" class="form-input" min="0" />
                  </div>
                  <template v-if="form.type === 'irrigation'">
                    <div class="form-group">
                      <label>المياه (م³)</label>
                      <StbNumberInput v-model.number="form.waterM3" class="form-input" min="0" step="any" />
                    </div>
                    <div class="form-group">
                      <label>المصدر</label>
                      <select v-model="form.waterSourceId" class="form-select">
                        <option value="">—</option>
                        <option v-for="w in waterSources" :key="w.id" :value="w.id">{{ w.name }}</option>
                      </select>
                    </div>
                  </template>
                  <div class="form-group">
                    <label>كمية العملية</label>
                    <div class="qty-unit">
                      <StbNumberInput v-model.number="form.quantity" class="form-input" min="0" step="any" />
                      <input v-model.trim="form.quantityUnit" class="form-input" maxlength="30" placeholder="عذق، فسيلة..." />
                    </div>
                  </div>
                  <div v-if="form.type === 'spraying'" class="form-group">
                    <label>الآفة المستهدفة</label>
                    <select v-model="form.targetPest" class="form-select">
                      <option value="">—</option>
                      <option v-for="(label, key) in PEST" :key="key" :value="key">{{ label }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>المشرف</label>
                    <input v-model.trim="form.supervisorName" class="form-input" maxlength="120" />
                  </div>
                </template>
              </div>

              <!-- المدخلات -->
              <div v-if="isDone" class="doc-section">
                <strong>المدخلات من المخزن</strong>
                <div v-for="(line, i) in form.inputs" :key="i" class="farm-lines__row">
                  <span>{{ line.name }}</span>
                  <StbNumberInput v-model.number="line.quantity" class="form-input" min="0.0001" step="any" placeholder="الكمية" required />
                  <StbNumberInput
                    v-if="form.type === 'spraying'"
                    v-model.number="line.phiDays"
                    class="form-input"
                    min="0"
                    max="365"
                    placeholder="فترة الأمان (يوم)"
                  />
                  <span v-else />
                  <button type="button" class="btn btn--sm btn--danger btn--icon" @click="form.inputs.splice(i, 1)">
                    <Trash2 :size="14" />
                  </button>
                </div>
                <CatalogProductPicker
                  :types="['stocked']"
                  :exclude="form.inputs.map((l) => l.productId)"
                  placeholder="أضف مدخلاً: سماد، مبيد، بذور..."
                  @pick="(p: Product) => form.inputs.push({ productId: p.id, name: p.name, quantity: '', phiDays: '' })"
                />
              </div>

              <!-- العمال -->
              <div v-if="isDone" class="doc-section">
                <strong>العمال</strong>
                <div v-for="(w, i) in form.workers" :key="i" class="farm-lines__row">
                  <input v-model.trim="w.name" class="form-input" maxlength="150" placeholder="الاسم" />
                  <StbNumberInput v-model.number="w.hours" class="form-input" min="0" max="24" step="any" placeholder="ساعات" />
                  <span />
                  <button type="button" class="btn btn--sm btn--danger btn--icon" @click="form.workers.splice(i, 1)">
                    <Trash2 :size="14" />
                  </button>
                </div>
                <div class="doc-actions">
                  <button type="button" class="btn btn--sm btn--ghost" @click="form.workers.push({ name: '', hours: '' })">
                    <Plus :size="14" /> عامل
                  </button>
                  <span class="doc-hint">أو العدد فقط:</span>
                  <StbNumberInput v-model.number="form.workerCount" class="form-input worker-count" min="0" placeholder="عدد" />
                </div>
              </div>

              <!-- نخيل بعينها -->
              <div v-if="targetsAvailable" class="doc-section">
                <label class="checkbox-label">
                  <input v-model="pickPlants" type="checkbox" @change="loadPlants" />
                  <span>على نخيل/أشجار بعينها ({{ form.plantIds.length }})</span>
                </label>
                <template v-if="pickPlants">
                  <input v-model.trim="plantSearch" class="form-input" dir="ltr" placeholder="بحث بالوسم" />
                  <div class="plant-picks">
                    <label v-for="p in filteredPlants" :key="p.id" class="farm-chip">
                      <input v-model="form.plantIds" type="checkbox" :value="p.id" /> {{ p.tag }}
                    </label>
                  </div>
                </template>
              </div>

              <div class="form-group">
                <label>ملاحظات</label>
                <input v-model.trim="form.notes" class="form-input" maxlength="2000" />
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

    <!-- ══ تفاصيل ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="detail" class="modal-overlay" @click.self="detail = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>{{ detail.number }} · {{ OPERATION_TYPE[detail.type] }}</h3>
              <button class="btn btn--icon btn--ghost" @click="detail = null"><X :size="20" /></button>
            </div>
            <div class="doc-form">
              <dl class="op-facts">
                <dt>على</dt><dd>{{ detail.unit?.name ?? "المزرعة كلها" }}<template v-if="detail.planting"> · {{ detail.planting.number }}</template></dd>
                <dt>الحالة</dt><dd>{{ FARM_OPERATION_STATUS[detail.status].label }}<template v-if="detail.cancelReason"> — {{ detail.cancelReason }}</template></dd>
                <dt>التنفيذ</dt><dd>{{ detail.performedAt ? formatDateTime(detail.performedAt) : "—" }}<template v-if="detail.durationMinutes"> · {{ detail.durationMinutes }} دقيقة</template></dd>
                <dt>شملت</dt><dd>{{ detail.plantsCovered ? `${formatNumber(detail.plantsCovered)} نبتة` : "—" }} · {{ formatArea(detail.areaCoveredM2) }}</dd>
                <dt>العمالة</dt><dd>{{ detail.laborHours ?? "—" }} ساعة · {{ formatCurrency(detail.laborCost) }}</dd>
                <dt>المدخلات</dt><dd>{{ formatCurrency(detail.inputCost) }}</dd>
                <template v-if="detail.waterM3"><dt>المياه</dt><dd>{{ detail.waterM3 }} م³ {{ detail.waterSource?.name ?? "" }}</dd></template>
                <template v-if="detail.harvestAllowedAt"><dt>لا يُحصد قبل</dt><dd>{{ formatDate(detail.harvestAllowedAt) }}</dd></template>
              </dl>
              <table v-if="detail.inputs?.length" class="data-table">
                <thead><tr><th>المدخل</th><th>الكمية</th><th>التكلفة</th><th>الأمان</th></tr></thead>
                <tbody>
                  <tr v-for="i in detail.inputs" :key="i.id">
                    <td>{{ i.product?.name }}</td>
                    <td class="doc-num">{{ formatNumber(i.quantity) }} {{ i.product?.baseUnit?.name }}</td>
                    <td class="doc-money">{{ formatCurrency(i.totalCost) }}</td>
                    <td class="doc-num">{{ i.phiDays ? `${i.phiDays} يوم` : "—" }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="detail.workers?.length" class="farm-chips">
                <span v-for="w in detail.workers" :key="w.id" class="farm-chip">{{ w.name }}<template v-if="w.hours"> · {{ w.hours }} س</template></span>
              </div>
              <div v-if="detail.plants?.length" class="farm-chips">
                <span v-for="p in detail.plants" :key="p.id" class="farm-chip" dir="ltr">{{ p.tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showCancel"
      :title="cancelTarget?.status === 'done' ? 'إبطال العملية' : 'إلغاء العملية'"
      :message="cancelTarget?.status === 'done' ? 'تعود مدخلاتها للمخزن ويُعكس قيدها. سجّلها من جديد إن كانت خاطئة.' : 'إلغاء العملية المخططة؟'"
      confirm-text="تأكيد"
      :loading="saving"
      @confirm="doCancel"
    >
      <input v-model.trim="cancelReason" class="form-input" placeholder="السبب *" maxlength="200" />
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  CalendarPlus,
  Check,
  ClipboardList,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-vue-next";
import { useFarmsStore } from "@/stores/farms";
import { useFarmScope } from "@/composables/useFarmScope";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { FARM_OPERATION_STATUS, OPERATION_TYPE, PEST, formatArea } from "@/utils/farms";
import type { Product } from "@/types/catalog";
import type {
  FarmOperation,
  FarmOperationType,
  FarmPlant,
  FarmWaterSource,
  OperationActuals,
  Planting,
} from "@/types/farms";

definePageMeta({ middleware: "auth" });

const TABS = [
  { value: "overdue", label: "متأخرة" },
  { value: "upcoming", label: "خلال 7 أيام" },
  { value: "planned", label: "كل المخطط" },
  { value: "done", label: "المنفّذة" },
  { value: "cancelled", label: "الملغاة" },
  { value: "", label: "الكل" },
] as const;

const store = useFarmsStore();
const scope = useFarmScope();
const toast = useToast();
const route = useRoute();
const saving = ref(false);
const today = new Date().toISOString().slice(0, 10);

const filters = reactive({
  tab: "done" as string,
  search: "",
  unitId: "",
  type: "",
  plantingId: typeof route.query.plantingId === "string" ? route.query.plantingId : "",
});
const list = usePagedList((page) =>
  store.fetchOperations({
    farmId: scope.farmId.value || undefined,
    unitId: filters.unitId || undefined,
    plantingId: filters.plantingId || undefined,
    type: filters.type || undefined,
    status: ["planned", "done", "cancelled"].includes(filters.tab) ? filters.tab : undefined,
    due: ["overdue", "upcoming"].includes(filters.tab) ? filters.tab : undefined,
    search: filters.search || undefined,
    page,
  }),
);
const setTab = (tab: string) => {
  filters.tab = tab;
  void list.load(1);
};
let timer: ReturnType<typeof setTimeout> | undefined;
const onSearch = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => list.load(1), 300);
};
const plantings = ref<Planting[]>([]);
const waterSources = ref<FarmWaterSource[]>([]);
const loadFarmData = async () => {
  if (!scope.farmId.value) return;
  const [p, w] = await Promise.all([
    store.fetchPlantings({ farmId: scope.farmId.value, status: "open", limit: 200 }),
    store.fetchWaterSources(scope.farmId.value),
  ]);
  plantings.value = p.data;
  waterSources.value = w;
};
const onFarm = async () => {
  filters.unitId = "";
  await Promise.all([list.load(1), loadFarmData()]);
};

const generate = async () => {
  saving.value = true;
  try {
    const { created, plantings: count } = await store.generateFarmPlan(scope.farmId.value);
    toast.success(
      created ? `خُطّطت ${created} عملية لـ ${count} زراعة من التقويم` : "خطة السنة موجودة من قبل",
    );
    setTab("upcoming");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التخطيط"));
  } finally {
    saving.value = false;
  }
};

// ─── النموذج ───
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const emptyForm = () => ({
  type: "irrigation" as FarmOperationType,
  title: "",
  status: "done" as "done" | "planned",
  plannedDate: today,
  unitId: "",
  plantingId: filters.plantingId,
  performedAt: localNow(),
  durationMinutes: "" as number | "",
  waterM3: "" as number | "",
  waterSourceId: "",
  quantity: "" as number | "",
  quantityUnit: "",
  targetPest: "",
  supervisorName: "",
  workerCount: "" as number | "",
  inputs: [] as { productId: string; name: string; quantity: number | ""; phiDays: number | "" }[],
  workers: [] as { name: string; hours: number | "" }[],
  plantIds: [] as string[],
  notes: "",
});
const form = reactive(emptyForm());
const showForm = ref(false);
const completing = ref<FarmOperation | null>(null);
const isDone = computed(() => !!completing.value || form.status === "done");

const openForm = (planned?: FarmOperation) => {
  Object.assign(form, emptyForm());
  completing.value = planned ?? null;
  if (planned) {
    form.type = planned.type;
    form.unitId = planned.unitId ?? "";
    form.plantingId = planned.plantingId ?? "";
  }
  pickPlants.value = false;
  showForm.value = true;
};

// ─── نخيل بعينها ───
const pickPlants = ref(false);
const plantChoices = ref<FarmPlant[]>([]);
const plantSearch = ref("");
const targetsAvailable = computed(() => {
  const planting = plantings.value.find((p) => p.id === form.plantingId);
  return planting?.trackingMode === "individual" || (!!form.unitId && !form.plantingId);
});
const filteredPlants = computed(() =>
  plantChoices.value
    .filter((p) => !plantSearch.value || p.tag.toLowerCase().includes(plantSearch.value.toLowerCase()))
    .slice(0, 300),
);
const loadPlants = async () => {
  if (!pickPlants.value) return;
  const res = await store.fetchPlants({
    farmId: scope.farmId.value,
    plantingId: form.plantingId || undefined,
    unitId: form.unitId || undefined,
    status: "live",
    limit: 200,
  });
  plantChoices.value = res.data;
};

const optional = (v: number | "") => (v === "" ? null : Number(v));
const actuals = (): OperationActuals => ({
  performedAt: form.performedAt ? new Date(form.performedAt).toISOString() : undefined,
  durationMinutes: optional(form.durationMinutes),
  waterM3: optional(form.waterM3),
  waterSourceId: form.waterSourceId || null,
  quantity: optional(form.quantity),
  quantityUnit: form.quantityUnit || null,
  targetPest: form.targetPest || null,
  supervisorName: form.supervisorName || null,
  workerCount: optional(form.workerCount),
  workers: form.workers
    .filter((w) => w.name)
    .map((w) => ({ name: w.name, hours: optional(w.hours) })),
  inputs: form.inputs
    .filter((l) => Number(l.quantity) > 0)
    .map((l) => ({
      productId: l.productId,
      quantity: Number(l.quantity),
      phiDays: optional(l.phiDays),
    })),
  plantIds: pickPlants.value && form.plantIds.length ? form.plantIds : undefined,
  notes: form.notes || null,
});

const submit = async () => {
  saving.value = true;
  try {
    if (completing.value) {
      await store.completeOperation(completing.value.id, actuals());
      toast.success("سُجّل التنفيذ");
    } else {
      const base = {
        farmId: scope.farmId.value,
        unitId: form.unitId || null,
        plantingId: form.plantingId || null,
        type: form.type,
        title: form.title || null,
        status: form.status,
      };
      await store.createOperation(
        form.status === "planned"
          ? {
              ...base,
              plannedDate: form.plannedDate,
              plantIds: pickPlants.value && form.plantIds.length ? form.plantIds : undefined,
              notes: form.notes || null,
            }
          : { ...base, ...actuals() },
      );
      toast.success("سُجّلت العملية");
    }
    showForm.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    saving.value = false;
  }
};

// ─── التفاصيل والإلغاء ───
const detail = ref<FarmOperation | null>(null);
const openDetail = async (id: string) => {
  try {
    detail.value = await store.getOperation(id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الفتح"));
  }
};
const showCancel = ref(false);
const cancelTarget = ref<FarmOperation | null>(null);
const cancelReason = ref("");
const askCancel = (o: FarmOperation) => {
  cancelTarget.value = o;
  cancelReason.value = "";
  showCancel.value = true;
};
const doCancel = async () => {
  if (!cancelTarget.value || !cancelReason.value) {
    toast.warning("اكتب السبب");
    return;
  }
  saving.value = true;
  try {
    await store.cancelOperation(cancelTarget.value.id, cancelReason.value);
    toast.success(cancelTarget.value.status === "done" ? "أُبطلت وعادت مدخلاتها" : "أُلغيت");
    showCancel.value = false;
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
    await Promise.all([list.load(1), loadFarmData()]);
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

.worker-count {
  width: 100px;
}

.plant-picks {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  max-height: 200px;
  overflow-y: auto;
}

.is-late {
  color: $stb-danger;
  font-weight: 600;
}

.op-facts {
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

.doc-section {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-bottom: $space-3;
}
</style>
