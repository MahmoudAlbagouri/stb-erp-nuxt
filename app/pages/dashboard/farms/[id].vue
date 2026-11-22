<!-- pages/dashboard/farms/[id].vue — المزرعة: الخريطة بحالة كل وحدة، شجرة التقسيم،
     مصادر المياه، والطقس -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>{{ farm?.name ?? "المزرعة" }}</h1>
        <p v-if="farm">
          {{ farm.code }} · {{ formatArea(farm.areaM2) }} · {{ OWNERSHIP[farm.ownership] }}
          <template v-if="farm.warehouse"> · مخزن {{ farm.warehouse.name }}</template>
        </p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/dashboard/farms" class="btn btn--ghost">
          <ArrowRight :size="16" /> المزارع
        </NuxtLink>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="doc-tab"
        :class="{ 'is-active': tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="loading" class="empty-state"><div class="spinner spinner--lg" /></div>

    <!-- ══ الخريطة ══ -->
    <div v-else-if="tab === 'map'" class="farm-split">
      <div class="card map-card">
        <FarmMap
          :farm-boundary="farm?.boundary"
          :center="farmCenter"
          :shapes="shapes"
          :selected-id="selected?.id"
          :drawing="drawing"
          :ring="drawRing"
          @update:ring="(r) => (drawRing = r)"
          @select="select"
        />
      </div>
      <div class="card farm-panel">
        <template v-if="drawing && selected">
          <h3>حدود {{ selected.name }}</h3>
          <p class="doc-hint">
            انقر على الخريطة حول الوحدة. المساحة:
            {{ formatArea(drawRing.length >= 3 ? ringAreaM2(drawRing) : null) }}
          </p>
          <div class="doc-actions">
            <button class="btn btn--ghost" @click="drawing = false">إلغاء</button>
            <button
              class="btn btn--primary"
              :disabled="drawRing.length < 3 || saving"
              :class="{ 'btn--loading': saving }"
              @click="saveBoundary"
            >
              حفظ الحدود
            </button>
          </div>
        </template>
        <template v-else-if="selected && selectedMap">
          <h3>{{ UNIT_KIND[selected.kind] }}: {{ selected.name }}</h3>
          <div class="farm-chips">
            <span v-if="selectedMap.openInspections" class="farm-chip farm-chip--danger">
              {{ selectedMap.openInspections }} إصابة مفتوحة (أشدها {{ SEVERITY[selectedMap.maxSeverity] }})
            </span>
            <span v-if="selectedMap.irrigationDue" class="farm-chip farm-chip--warn">محتاج ري</span>
            <span v-if="selectedMap.harvestAllowedAt" class="farm-chip farm-chip--warn">
              لا يُحصد قبل {{ formatDate(selectedMap.harvestAllowedAt) }}
            </span>
            <span v-if="selectedMap.harvestReady" class="farm-chip">قارب الحصاد</span>
          </div>
          <dl>
            <dt>الكود</dt>
            <dd>{{ selected.code || "—" }}</dd>
            <dt>المساحة</dt>
            <dd>{{ formatArea(selected.areaM2) }}</dd>
            <dt>التربة</dt>
            <dd>{{ selected.soilType ? SOIL[selected.soilType] : "—" }}</dd>
            <dt>الري</dt>
            <dd>
              {{ selected.irrigationMethod ? IRRIGATION[selected.irrigationMethod] : "—" }}
              <template v-if="selectedMap.irrigationIntervalDays">
                · كل {{ selectedMap.irrigationIntervalDays }} يوم
              </template>
            </dd>
            <dt>آخر ري</dt>
            <dd>{{ selectedMap.lastIrrigationAt ? formatDateTime(selectedMap.lastIrrigationAt) : "—" }}</dd>
            <dt>نخيل/أشجار</dt>
            <dd>
              {{ formatNumber(selectedMap.livePlants) }}
              <template v-if="selectedMap.infestedPlants">
                ({{ selectedMap.infestedPlants }} مصابة)
              </template>
            </dd>
          </dl>
          <div v-if="selectedMap.plantings.length" class="farm-plantings">
            <strong>الزراعات</strong>
            <NuxtLink
              v-for="p in selectedMap.plantings"
              :key="p.id"
              :to="`/dashboard/farms/plantings?open=${p.id}`"
              class="farm-chip"
            >
              {{ p.cropName }}{{ p.varietyName ? ` — ${p.varietyName}` : "" }} ·
              {{ formatNumber(p.plantCount) }}
            </NuxtLink>
          </div>
          <div class="doc-actions">
            <button v-can="'manage_farms'" class="btn btn--sm btn--primary" @click="startDrawing">
              <PenLine :size="14" /> {{ selected.boundary ? "تعديل الحدود" : "ارسم الحدود" }}
            </button>
            <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openUnitForm(undefined, selected.id)">
              <Plus :size="14" /> وحدة داخلها
            </button>
            <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openUnitForm(selected)">
              <Pencil :size="14" /> تعديل
            </button>
          </div>
        </template>
        <template v-else>
          <h3>الوحدات</h3>
          <p class="doc-hint">
            اختر وحدة من الخريطة أو القائمة. الوحدات بلا حدود مرسومة:
          </p>
          <div class="farm-chips">
            <button
              v-for="u in unitsWithoutBoundary"
              :key="u.id"
              class="farm-chip"
              @click="select(u.id)"
            >
              {{ u.name }}
            </button>
            <span v-if="!unitsWithoutBoundary.length" class="doc-hint">كلها مرسومة</span>
          </div>
        </template>
      </div>
    </div>

    <!-- ══ التقسيم ══ -->
    <template v-else-if="tab === 'units'">
      <div class="doc-actions units-actions">
        <button v-can="'manage_farms'" class="btn btn--primary" @click="openUnitForm()">
          <Plus :size="16" /> وحدة
        </button>
        <button v-can="'manage_farms'" class="btn btn--ghost" @click="openBulk()">
          <Rows3 :size="16" /> وحدات متتالية (صفوف...)
        </button>
      </div>
      <div v-if="!units.length" class="card">
        <div class="empty-state">
          <Layers :size="44" class="empty-state__icon" />
          <div class="empty-state__title">لم تُقسَّم المزرعة بعد</div>
          <div class="empty-state__text">
            ابدأ بالقطاعات، ثم الأحواش داخلها، ثم الصفوف — أو حقول وصوب
          </div>
        </div>
      </div>
      <div v-else class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الوحدة</th>
                <th>المساحة</th>
                <th>التربة / الري</th>
                <th>الجور</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in units" :key="u.id">
                <td>
                  <span class="farm-tree-name" :style="{ paddingInlineStart: `${(u.depth - 1) * 20}px` }">
                    <span class="farm-chip">{{ UNIT_KIND[u.kind] }}</span>
                    <strong>{{ u.name }}</strong>
                    <span v-if="u.code" class="doc-cell__sub">{{ u.code }}</span>
                    <MapPinned v-if="u.boundary" :size="14" title="مرسومة على الخريطة" />
                  </span>
                </td>
                <td class="doc-num">{{ formatArea(u.areaM2) }}</td>
                <td>
                  {{ u.soilType ? SOIL[u.soilType] : "—" }} /
                  {{ u.irrigationMethod ? IRRIGATION[u.irrigationMethod] : "—" }}
                  <span v-if="u.irrigationIntervalDays" class="doc-cell__sub">
                    كل {{ u.irrigationIntervalDays }} يوم
                  </span>
                </td>
                <td class="doc-num">{{ u.plannedPositions ?? "—" }}</td>
                <td>
                  <span :class="['badge', u.isActive ? 'badge--active' : 'badge--inactive']">
                    {{ u.isActive ? "نشطة" : "موقوفة" }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" title="وحدة داخلها" @click="openUnitForm(undefined, u.id)">
                      <Plus :size="14" />
                    </button>
                    <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" title="وحدات متتالية داخلها" @click="openBulk(u.id)">
                      <Rows3 :size="14" />
                    </button>
                    <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openUnitForm(u)">
                      <Pencil :size="14" />
                    </button>
                    <button v-can="'manage_farms'" class="btn btn--sm btn--danger btn--icon" @click="removeUnit(u)">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ المياه ══ -->
    <template v-else-if="tab === 'water'">
      <div class="doc-actions units-actions">
        <button v-can="'manage_farms'" class="btn btn--primary" @click="openWater()">
          <Plus :size="16" /> مصدر مياه
        </button>
      </div>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>المصدر</th>
                <th>النوع</th>
                <th>الطاقة م³/ساعة</th>
                <th>العمق</th>
                <th>الملوحة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-if="!waterSources.length">
                <td colspan="6" class="doc-hint">لا مصادر مسجّلة</td>
              </tr>
              <tr v-for="w in waterSources" :key="w.id">
                <td><strong>{{ w.name }}</strong></td>
                <td>{{ WATER_SOURCE[w.kind] }}</td>
                <td class="doc-num">{{ w.capacityM3PerHour ?? "—" }}</td>
                <td class="doc-num">{{ w.depthM ? `${w.depthM} م` : "—" }}</td>
                <td class="doc-num">{{ w.salinityPpm ? `${formatNumber(w.salinityPpm)} ppm` : "—" }}</td>
                <td>
                  <div class="doc-actions">
                    <button v-can="'manage_farms'" class="btn btn--sm btn--ghost" @click="openWater(w)">
                      <Pencil :size="14" />
                    </button>
                    <button v-can="'manage_farms'" class="btn btn--sm btn--danger btn--icon" @click="removeWater(w.id)">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ الطقس ══ -->
    <template v-else-if="tab === 'weather'">
      <form v-can="'record_farm_work'" class="card doc-filters doc-filters--even" @submit.prevent="saveWeather">
        <input v-model="weatherForm.date" type="date" class="form-input" required />
        <StbNumberInput v-model.number="weatherForm.tempMin" class="form-input" step="any" placeholder="الصغرى °" />
        <StbNumberInput v-model.number="weatherForm.tempMax" class="form-input" step="any" placeholder="العظمى °" />
        <StbNumberInput v-model.number="weatherForm.rainMm" class="form-input" min="0" step="any" placeholder="مطر مم" />
        <StbNumberInput v-model.number="weatherForm.humidity" class="form-input" min="0" max="100" placeholder="رطوبة %" />
        <StbNumberInput v-model.number="weatherForm.windKmh" class="form-input" min="0" step="any" placeholder="رياح كم/س" />
        <label class="checkbox-label"><input v-model="weatherForm.frost" type="checkbox" /> صقيع</label>
        <label class="checkbox-label"><input v-model="weatherForm.dustStorm" type="checkbox" /> غبار</label>
        <button class="btn btn--primary" :disabled="saving">حفظ اليوم</button>
      </form>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>اليوم</th>
                <th>الحرارة</th>
                <th>مطر</th>
                <th>رطوبة</th>
                <th>رياح</th>
                <th>ظواهر</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-if="!weather.length">
                <td colspan="7" class="doc-hint">لا سجلات — الطقس يفسّر تذبذب الإنتاج فسجّله يومياً</td>
              </tr>
              <tr v-for="w in weather" :key="w.id">
                <td>{{ formatDate(w.date) }}</td>
                <td class="doc-num">{{ w.tempMin ?? "—" }} / {{ w.tempMax ?? "—" }}</td>
                <td class="doc-num">{{ w.rainMm ?? "—" }}</td>
                <td class="doc-num">{{ w.humidity ?? "—" }}</td>
                <td class="doc-num">{{ w.windKmh ?? "—" }}</td>
                <td>
                  <span v-if="w.frost" class="farm-chip farm-chip--warn">صقيع</span>
                  <span v-if="w.dustStorm" class="farm-chip farm-chip--warn">غبار</span>
                </td>
                <td>
                  <button v-can="'record_farm_work'" class="btn btn--sm btn--danger btn--icon" @click="removeWeather(w.id)">
                    <Trash2 :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ نموذج وحدة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showUnit" class="modal-overlay" @click.self="showUnit = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>{{ editingUnit ? `تعديل ${editingUnit.name}` : "وحدة جديدة" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="showUnit = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitUnit">
              <div class="doc-grid">
                <div class="form-group">
                  <label>النوع *</label>
                  <select v-model="unitForm.kind" class="form-select" required>
                    <option v-for="(label, key) in UNIT_KIND" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>داخل</label>
                  <select v-model="unitForm.parentId" class="form-select">
                    <option value="">المزرعة مباشرة</option>
                    <option
                      v-for="o in unitOptions.filter((o) => o.id !== editingUnit?.id)"
                      :key="o.id"
                      :value="o.id"
                    >
                      {{ o.label }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>الاسم *</label>
                  <input v-model.trim="unitForm.name" class="form-input" required maxlength="120" />
                </div>
                <div class="form-group">
                  <label>الكود (يدخل في وسم النخلة)</label>
                  <input v-model.trim="unitForm.code" class="form-input" dir="ltr" maxlength="20" placeholder="A، B3، R12" />
                </div>
                <div class="form-group">
                  <label>التربة</label>
                  <select v-model="unitForm.soilType" class="form-select">
                    <option value="">—</option>
                    <option v-for="(label, key) in SOIL" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>طريقة الري</label>
                  <select v-model="unitForm.irrigationMethod" class="form-select">
                    <option value="">—</option>
                    <option v-for="(label, key) in IRRIGATION" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>تُروى كل (يوم)</label>
                  <StbNumberInput v-model.number="unitForm.irrigationIntervalDays" class="form-input" min="1" max="365" placeholder="من الأب" />
                </div>
                <div class="form-group">
                  <label>عدد الجور المخطط</label>
                  <StbNumberInput v-model.number="unitForm.plannedPositions" class="form-input" min="0" />
                </div>
                <div class="form-group">
                  <label>المساحة (م²)</label>
                  <StbNumberInput v-model.number="unitForm.areaM2" class="form-input" min="0" step="any" placeholder="من الحدود إن رُسمت" />
                </div>
                <div class="form-group">
                  <label>مصدر المياه</label>
                  <select v-model="unitForm.waterSourceId" class="form-select">
                    <option value="">—</option>
                    <option v-for="w in waterSources" :key="w.id" :value="w.id">{{ w.name }}</option>
                  </select>
                </div>
              </div>
              <label class="checkbox-label">
                <input v-model="unitForm.isActive" type="checkbox" /> <span>نشطة</span>
              </label>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showUnit = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="saving" :class="{ 'btn--loading': saving }">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ وحدات متتالية ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showBulk" class="modal-overlay" @click.self="showBulk = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>وحدات متتالية</h3>
              <button class="btn btn--icon btn--ghost" @click="showBulk = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitBulk">
              <div class="doc-grid">
                <div class="form-group">
                  <label>داخل</label>
                  <select v-model="bulkForm.parentId" class="form-select">
                    <option value="">المزرعة مباشرة</option>
                    <option v-for="o in unitOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>النوع</label>
                  <select v-model="bulkForm.kind" class="form-select">
                    <option v-for="(label, key) in UNIT_KIND" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>العدد *</label>
                  <StbNumberInput v-model.number="bulkForm.count" class="form-input" min="1" max="500" required />
                </div>
                <div class="form-group">
                  <label>يبدأ من</label>
                  <StbNumberInput v-model.number="bulkForm.startNumber" class="form-input" min="0" />
                </div>
                <div class="form-group">
                  <label>بادئة الاسم *</label>
                  <input v-model.trim="bulkForm.namePrefix" class="form-input" required maxlength="100" />
                </div>
                <div class="form-group">
                  <label>بادئة الكود</label>
                  <input v-model.trim="bulkForm.codePrefix" class="form-input" dir="ltr" maxlength="10" placeholder="R ← R1، R2..." />
                </div>
                <div class="form-group">
                  <label>الجور في كل واحدة</label>
                  <StbNumberInput v-model.number="bulkForm.plannedPositions" class="form-input" min="0" />
                </div>
                <div class="form-group">
                  <label>طريقة الري</label>
                  <select v-model="bulkForm.irrigationMethod" class="form-select">
                    <option value="">—</option>
                    <option v-for="(label, key) in IRRIGATION" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
              </div>
              <p class="doc-hint">
                مثال: {{ bulkForm.namePrefix || "صف" }} {{ bulkForm.startNumber || 1 }} …
                {{ bulkForm.namePrefix || "صف" }} {{ (Number(bulkForm.startNumber) || 1) + (Number(bulkForm.count) || 1) - 1 }}
              </p>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showBulk = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="saving" :class="{ 'btn--loading': saving }">إضافة</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ مصدر مياه ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showWater" class="modal-overlay" @click.self="showWater = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>{{ waterForm.id ? "تعديل مصدر مياه" : "مصدر مياه" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="showWater = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitWater">
              <div class="doc-grid">
                <div class="form-group">
                  <label>الاسم *</label>
                  <input v-model.trim="waterForm.name" class="form-input" required maxlength="120" />
                </div>
                <div class="form-group">
                  <label>النوع</label>
                  <select v-model="waterForm.kind" class="form-select">
                    <option v-for="(label, key) in WATER_SOURCE" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>الطاقة (م³/ساعة)</label>
                  <StbNumberInput v-model.number="waterForm.capacityM3PerHour" class="form-input" min="0" step="any" />
                </div>
                <div class="form-group">
                  <label>العمق (م)</label>
                  <StbNumberInput v-model.number="waterForm.depthM" class="form-input" min="0" step="any" />
                </div>
                <div class="form-group">
                  <label>الملوحة (ppm)</label>
                  <StbNumberInput v-model.number="waterForm.salinityPpm" class="form-input" min="0" />
                </div>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showWater = false">إلغاء</button>
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
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  ArrowRight,
  Layers,
  MapPinned,
  PenLine,
  Pencil,
  Plus,
  Rows3,
  Trash2,
  X,
} from "lucide-vue-next";
import FarmMap, { type MapShape } from "~/components/farms/FarmMap.vue";
import { useFarmsStore } from "@/stores/farms";
import { useToast } from "@/composables/useToast";
import {
  IRRIGATION,
  OWNERSHIP,
  SEVERITY,
  SOIL,
  UNIT_KIND,
  WATER_SOURCE,
  formatArea,
  ringAreaM2,
  unitOptionLabel,
} from "@/utils/farms";
import type {
  Farm,
  FarmMapUnit,
  FarmUnit,
  FarmUnitKind,
  FarmWaterSource,
  GeoRing,
  IrrigationMethod,
  SoilType,
  WaterSourceKind,
  WeatherLog,
} from "@/types/farms";

definePageMeta({ middleware: "auth" });

const TABS = [
  { id: "map", label: "الخريطة" },
  { id: "units", label: "التقسيم" },
  { id: "water", label: "مصادر المياه" },
  { id: "weather", label: "الطقس" },
] as const;

const route = useRoute();
const store = useFarmsStore();
const toast = useToast();
const farmId = computed(() => String(route.params.id));
const tab = ref<(typeof TABS)[number]["id"]>("map");
const loading = ref(true);
const saving = ref(false);

const farm = ref<Farm | null>(null);
const units = ref<FarmUnit[]>([]);
const mapUnits = ref<FarmMapUnit[]>([]);
const waterSources = ref<FarmWaterSource[]>([]);
const weather = ref<WeatherLog[]>([]);

const unitOptions = computed(() =>
  units.value.map((u) => ({ id: u.id, label: unitOptionLabel(u) })),
);
const farmCenter = computed<[number, number] | null>(() =>
  farm.value?.latitude && farm.value.longitude
    ? [farm.value.latitude, farm.value.longitude]
    : null,
);

/** لون الوحدة بأهم ما فيها: إصابة ← ري ← فترة أمان ← حصاد ← سليم ← فارغة */
const statusColor = (u: FarmMapUnit) =>
  u.openInspections || u.infestedPlants
    ? "#ef4444"
    : u.irrigationDue
      ? "#f59e0b"
      : u.harvestAllowedAt
        ? "#a855f7"
        : u.harvestReady
          ? "#eab308"
          : u.plantings.length || u.livePlants
            ? "#22c55e"
            : "#94a3b8";
const shapes = computed<MapShape[]>(() =>
  mapUnits.value.map((u) => ({
    id: u.id,
    name: u.name,
    code: u.code,
    depth: u.depth,
    boundary: u.boundary,
    color: statusColor(u),
    info: [
      u.livePlants ? `${u.livePlants} نخلة/شجرة` : "",
      u.openInspections ? `${u.openInspections} إصابة` : "",
      u.irrigationDue ? "محتاج ري" : "",
    ]
      .filter(Boolean)
      .join(" · "),
  })),
);

const selectedId = ref<string | null>(null);
const selected = computed(() => units.value.find((u) => u.id === selectedId.value) ?? null);
const selectedMap = computed(
  () => mapUnits.value.find((u) => u.id === selectedId.value) ?? null,
);
const unitsWithoutBoundary = computed(() => units.value.filter((u) => !u.boundary));
const select = (id: string) => {
  selectedId.value = id;
  drawing.value = false;
};

// ─── رسم الحدود ───
const drawing = ref(false);
const drawRing = ref<GeoRing>([]);
const startDrawing = () => {
  drawRing.value = selected.value?.boundary ? [...selected.value.boundary] : [];
  drawing.value = true;
};
const saveBoundary = async () => {
  if (!selected.value) return;
  saving.value = true;
  try {
    await store.saveUnit(farmId.value, { boundary: drawRing.value }, selected.value.id);
    toast.success("حُفظت الحدود");
    drawing.value = false;
    await loadAll();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الحدود"));
  } finally {
    saving.value = false;
  }
};

// ─── نموذج الوحدة ───
const emptyUnit = () => ({
  kind: "sector" as FarmUnitKind,
  parentId: "",
  name: "",
  code: "",
  soilType: "" as SoilType | "",
  irrigationMethod: "" as IrrigationMethod | "",
  irrigationIntervalDays: "" as number | "",
  plannedPositions: "" as number | "",
  areaM2: "" as number | "",
  waterSourceId: "",
  isActive: true,
});
const unitForm = reactive(emptyUnit());
const showUnit = ref(false);
const editingUnit = ref<FarmUnit | null>(null);
const CHILD_KIND: Partial<Record<FarmUnitKind, FarmUnitKind>> = {
  sector: "block",
  block: "row",
  field: "bed",
  greenhouse: "bed",
};
const openUnitForm = (unit?: FarmUnit, parentId?: string) => {
  Object.assign(unitForm, emptyUnit());
  if (unit) {
    Object.assign(unitForm, {
      kind: unit.kind,
      parentId: unit.parentId ?? "",
      name: unit.name,
      code: unit.code ?? "",
      soilType: unit.soilType ?? "",
      irrigationMethod: unit.irrigationMethod ?? "",
      irrigationIntervalDays: unit.irrigationIntervalDays ?? "",
      plannedPositions: unit.plannedPositions ?? "",
      areaM2: unit.boundary ? "" : (unit.areaM2 ?? ""),
      waterSourceId: unit.waterSourceId ?? "",
      isActive: unit.isActive,
    });
  } else if (parentId) {
    const parent = units.value.find((u) => u.id === parentId);
    unitForm.parentId = parentId;
    unitForm.kind = (parent && CHILD_KIND[parent.kind]) ?? "row";
  }
  editingUnit.value = unit ?? null;
  showUnit.value = true;
};
const optional = (v: number | "") => (v === "" ? null : Number(v));
const submitUnit = async () => {
  saving.value = true;
  try {
    await store.saveUnit(
      farmId.value,
      {
        kind: unitForm.kind,
        parentId: unitForm.parentId || null,
        name: unitForm.name,
        code: unitForm.code || null,
        soilType: unitForm.soilType || null,
        irrigationMethod: unitForm.irrigationMethod || null,
        irrigationIntervalDays: optional(unitForm.irrigationIntervalDays),
        plannedPositions: optional(unitForm.plannedPositions),
        ...(unitForm.areaM2 !== "" ? { areaM2: Number(unitForm.areaM2) } : {}),
        waterSourceId: unitForm.waterSourceId || null,
        isActive: unitForm.isActive,
      },
      editingUnit.value?.id,
    );
    toast.success("تم الحفظ");
    showUnit.value = false;
    await loadAll();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الوحدة"));
  } finally {
    saving.value = false;
  }
};
const removeUnit = async (unit: FarmUnit) => {
  if (!confirm(`حذف "${unit.name}"؟ الوحدة المستعملة توقف بدل حذفها.`)) return;
  try {
    await store.removeUnit(farmId.value, unit.id);
    toast.success("تم الحذف");
    await loadAll();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  }
};

// ─── وحدات متتالية ───
const bulkForm = reactive({
  parentId: "",
  kind: "row" as FarmUnitKind,
  count: 10 as number | "",
  startNumber: 1 as number | "",
  namePrefix: "صف",
  codePrefix: "R",
  plannedPositions: "" as number | "",
  irrigationMethod: "" as IrrigationMethod | "",
});
const showBulk = ref(false);
const openBulk = (parentId?: string) => {
  bulkForm.parentId = parentId ?? "";
  const parent = units.value.find((u) => u.id === parentId);
  bulkForm.kind = (parent && CHILD_KIND[parent.kind]) ?? "row";
  showBulk.value = true;
};
const submitBulk = async () => {
  saving.value = true;
  try {
    const created = await store.bulkUnits(farmId.value, {
      parentId: bulkForm.parentId || null,
      kind: bulkForm.kind,
      count: Number(bulkForm.count) || 1,
      startNumber: Number(bulkForm.startNumber) || 1,
      namePrefix: bulkForm.namePrefix,
      codePrefix: bulkForm.codePrefix || undefined,
      plannedPositions: optional(bulkForm.plannedPositions),
      irrigationMethod: bulkForm.irrigationMethod || null,
    });
    toast.success(`أُضيفت ${created.length} وحدة`);
    showBulk.value = false;
    await loadAll();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذرت الإضافة"));
  } finally {
    saving.value = false;
  }
};

// ─── مصادر المياه ───
const waterForm = reactive({
  id: "",
  name: "",
  kind: "well" as WaterSourceKind,
  capacityM3PerHour: "" as number | "",
  depthM: "" as number | "",
  salinityPpm: "" as number | "",
});
const showWater = ref(false);
const openWater = (w?: FarmWaterSource) => {
  Object.assign(waterForm, {
    id: w?.id ?? "",
    name: w?.name ?? "",
    kind: w?.kind ?? "well",
    capacityM3PerHour: w?.capacityM3PerHour ?? "",
    depthM: w?.depthM ?? "",
    salinityPpm: w?.salinityPpm ?? "",
  });
  showWater.value = true;
};
const submitWater = async () => {
  saving.value = true;
  try {
    await store.saveWaterSource(
      farmId.value,
      {
        name: waterForm.name,
        kind: waterForm.kind,
        capacityM3PerHour: optional(waterForm.capacityM3PerHour),
        depthM: optional(waterForm.depthM),
        salinityPpm: optional(waterForm.salinityPpm),
      },
      waterForm.id || undefined,
    );
    showWater.value = false;
    waterSources.value = await store.fetchWaterSources(farmId.value);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    saving.value = false;
  }
};
const removeWater = async (id: string) => {
  if (!confirm("حذف مصدر المياه؟")) return;
  try {
    await store.removeWaterSource(farmId.value, id);
    waterSources.value = await store.fetchWaterSources(farmId.value);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  }
};

// ─── الطقس ───
const today = () => new Date().toISOString().slice(0, 10);
const weatherForm = reactive({
  date: today(),
  tempMin: "" as number | "",
  tempMax: "" as number | "",
  rainMm: "" as number | "",
  humidity: "" as number | "",
  windKmh: "" as number | "",
  frost: false,
  dustStorm: false,
});
const saveWeather = async () => {
  saving.value = true;
  try {
    await store.saveWeather(farmId.value, {
      date: weatherForm.date,
      tempMin: optional(weatherForm.tempMin),
      tempMax: optional(weatherForm.tempMax),
      rainMm: optional(weatherForm.rainMm),
      humidity: optional(weatherForm.humidity),
      windKmh: optional(weatherForm.windKmh),
      frost: weatherForm.frost,
      dustStorm: weatherForm.dustStorm,
    });
    toast.success("حُفظ طقس اليوم");
    weather.value = await store.fetchWeather(farmId.value);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    saving.value = false;
  }
};
const removeWeather = async (id: string) => {
  try {
    await store.removeWeather(farmId.value, id);
    weather.value = await store.fetchWeather(farmId.value);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  }
};

const loadAll = async () => {
  const [map, list] = await Promise.all([
    store.fetchMap(farmId.value),
    store.fetchUnits(farmId.value),
  ]);
  farm.value = map.farm;
  mapUnits.value = map.units;
  units.value = list;
};

watch(tab, async (t) => {
  try {
    if (t === "weather" && !weather.value.length) {
      weather.value = await store.fetchWeather(farmId.value);
    }
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحميل"));
  }
});

onMounted(async () => {
  try {
    await loadAll();
    waterSources.value = await store.fetchWaterSources(farmId.value);
    if (!units.value.length) tab.value = "units";
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل المزرعة"));
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
@use "@/assets/scss/mixins" as *;

.map-card {
  height: 620px;
  padding: 0;
  overflow: hidden;

  @include respond-to("sm") {
    height: 420px;
  }
}

.units-actions {
  margin-bottom: $space-3;
}

.farm-plantings {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  align-items: center;
}
</style>
