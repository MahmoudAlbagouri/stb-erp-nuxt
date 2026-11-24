<!--
  pages/field.vue — الشاشة الميدانية: يسجّل المشرف من جواله في الأرض ما حدث
  فعلاً — ري، تسميد، رش، تلقيح، حصاد بالوزن، فحص آفة، حالة نخلة — بلا إنترنت.

  المزرعة تُنزَّل مرة وهو متصل (field/db.ts)، وكل ما يُسجَّل يُحفظ على الجهاز
  فوراً ويُرفع بترتيبه متى وُجد اتصال (POST /farm-field/sync). كل عملية بمعرّف
  من الجهاز فإعادة رفعها لا تكررها، والمرفوضة تبقى بسببها حتى تُعاد أو تُحذف.
-->
<template>
  <div class="field" dir="rtl">
    <header class="field__header">
      <div>
        <small>الشاشة الميدانية</small>
        <select v-model="farmId" class="field__farm" @change="openFarm">
          <option v-if="!farms.length" value="">—</option>
          <option v-for="f in farms" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
      </div>
      <div class="field__header-actions">
        <button
          v-if="boot"
          type="button"
          class="field__icon-btn field__icon-btn--primary"
          aria-label="مسح لوحة نخلة"
          @click="scanner = 'single'"
        >
          <QrCode :size="22" />
        </button>
        <NuxtLink to="/dashboard/farms" class="field__icon-btn" aria-label="لوحة المزارع">
          <ArrowRight :size="20" />
        </NuxtLink>
      </div>
    </header>

    <!-- ══ الماسح: نخلة واحدة، أو نخيل متتالية لعملية ══ -->
    <QrScanner
      v-if="scanner"
      :continuous="scanner === 'multi'"
      :title="scanner === 'multi' ? `نخيل العملية (${tagList.length})` : 'مسح لوحة نخلة أو ملصق حصاد'"
      @code="onScan"
      @close="scanner = null"
    />

    <!-- ══ النخلة الممسوحة: ماذا تسجّل لها ══ -->
    <section v-if="scannedPlant" class="field__card field__scanned">
      <div class="field__scanned-head">
        <div>
          <strong dir="ltr">{{ scannedPlant.tag }}</strong>
          <small>
            {{ unitLabel(scannedPlant.unitId) }} · {{ plantingOf(scannedPlant.plantingId) }}
            <template v-if="scannedPlant.sex === 'male'"> · فحل</template>
          </small>
        </div>
        <span class="field__status-chip" :class="`is-${scannedPlant.status}`">
          {{ PLANT_STATUS[scannedPlant.status as PlantStatus]?.label ?? scannedPlant.status }}
        </span>
      </div>
      <div class="field__quick">
        <button type="button" @click="actOnPlant('harvest')"><Wheat :size="18" /> جني منها</button>
        <button type="button" @click="actOnPlant('pest')"><Bug :size="18" /> فحص آفة</button>
        <button type="button" @click="actOnPlant('plant')"><TreePalm :size="18" /> حالتها</button>
        <button type="button" @click="actOnPlant('operation')"><ClipboardList :size="18" /> لعملية</button>
      </div>
      <button type="button" class="field__btn field__btn--ghost field__btn--sm" @click="scannedPlant = null">إغلاق</button>
    </section>

    <!-- ══ ملصق حصاد ممسوح ══ -->
    <section v-if="scannedHarvest" class="field__card field__scanned">
      <div class="field__scanned-head">
        <div>
          <strong>{{ scannedHarvest.number }}</strong>
          <small>{{ scannedHarvest.product?.name }} — {{ scannedHarvest.quantity }} {{ scannedHarvest.product?.baseUnit?.name }}</small>
          <small dir="ltr">الدفعة {{ scannedHarvest.lotNumber }}</small>
          <small>{{ new Date(scannedHarvest.harvestedAt).toLocaleString("ar") }} · {{ scannedHarvest.plant?.tag ?? scannedHarvest.unit?.name ?? "" }}</small>
        </div>
        <span class="field__status-chip" :class="scannedHarvest.status === 'voided' ? 'is-dead' : 'is-healthy'">
          {{ scannedHarvest.status === "voided" ? "ملغى" : "مسجّل" }}
        </span>
      </div>
      <button type="button" class="field__btn field__btn--ghost field__btn--sm" @click="scannedHarvest = null">إغلاق</button>
    </section>

    <button type="button" class="field__status" :class="`is-${status.tone}`" @click="syncNow">
      <WifiOff v-if="status.tone === 'offline'" :size="16" />
      <CloudUpload v-else-if="status.tone === 'pending'" :size="16" />
      <Wifi v-else :size="16" />
      <span>{{ status.text }}</span>
    </button>
    <p v-if="notice" class="field__notice"><AlertTriangle :size="16" /> {{ notice }}</p>

    <div v-if="!boot" class="field__empty">
      <Tractor :size="52" />
      <p v-if="loading">جارٍ التحميل…</p>
      <p v-else>افتح الشاشة مرة وأنت متصل لتنزيل المزرعة، وبعدها تعمل بلا إنترنت.</p>
    </div>

    <template v-else>
      <nav class="field__tabs">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          :class="{ 'is-active': tab === t.id }"
          @click="setTab(t.id)"
        >
          <component :is="t.icon" :size="20" />
          <span>{{ t.label }}</span>
          <b v-if="t.id === 'planned' && plannedOpen.length">{{ plannedOpen.length }}</b>
        </button>
      </nav>

      <!-- ══ عملية (أو إتمام مخططة) ══ -->
      <form v-if="tab === 'operation'" class="field__card" @submit.prevent="saveOperation">
        <h2>
          {{ completing ? `تنفيذ ${completing.number}: ${OPERATION_TYPE[completing.type as FarmOperationType]}` : "عملية زراعية" }}
        </h2>
        <template v-if="!completing">
          <div class="field__chips">
            <button
              v-for="t in COMMON_TYPES"
              :key="t"
              type="button"
              :class="{ 'is-active': op.type === t }"
              @click="op.type = t"
            >
              {{ OPERATION_TYPE[t] }}
            </button>
            <select v-model="op.type" class="field__input field__more">
              <option v-for="(label, key) in OPERATION_TYPE" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <label>الوحدة</label>
          <select v-model="op.unitId" class="field__input">
            <option value="">المزرعة كلها</option>
            <option v-for="u in unitChoices" :key="u.id" :value="u.id">{{ u.label }}</option>
          </select>
          <label>الزراعة</label>
          <select v-model="op.plantingId" class="field__input">
            <option value="">—</option>
            <option v-for="p in plantingsIn(op.unitId)" :key="p.id" :value="p.id">{{ plantingLabel(p) }}</option>
          </select>
        </template>

        <template v-if="op.type === 'irrigation'">
          <div class="field__row">
            <div>
              <label>المياه م³</label>
              <input v-model.number="op.waterM3" type="number" inputmode="decimal" min="0" step="any" class="field__input" />
            </div>
            <div>
              <label>المدة (دقيقة)</label>
              <input v-model.number="op.durationMinutes" type="number" inputmode="numeric" min="0" class="field__input" />
            </div>
          </div>
          <select v-if="waterSources.length" v-model="op.waterSourceId" class="field__input">
            <option value="">مصدر المياه</option>
            <option v-for="w in waterSources" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </template>

        <label>المدخلات (من مخزن المزرعة)</label>
        <div v-for="(line, i) in op.inputs" :key="i" class="field__line">
          <span>{{ productName(line.productId) }}</span>
          <input v-model.number="line.quantity" type="number" inputmode="decimal" min="0" step="any" placeholder="الكمية" class="field__input" />
          <input
            v-if="op.type === 'spraying'"
            v-model.number="line.phiDays"
            type="number"
            inputmode="numeric"
            min="0"
            placeholder="أمان (يوم)"
            class="field__input"
          />
          <button type="button" class="field__x" @click="op.inputs.splice(i, 1)"><X :size="16" /></button>
        </div>
        <input
          v-model="productQuery"
          class="field__input"
          list="field-products"
          placeholder="ابحث عن سماد، مبيد، بذور..."
          @change="addProduct"
        />
        <datalist id="field-products">
          <option v-for="p in boot.data.products" :key="p.id" :value="`${p.name} · ${p.sku}`" />
        </datalist>

        <div class="field__row">
          <div>
            <label>عدد العمال</label>
            <input v-model.number="op.workerCount" type="number" inputmode="numeric" min="0" class="field__input" />
          </div>
          <div>
            <label>مجموع الساعات</label>
            <input v-model.number="op.laborHours" type="number" inputmode="decimal" min="0" step="any" class="field__input" />
          </div>
        </div>
        <div class="field__row">
          <div>
            <label>كمية العملية</label>
            <input v-model.number="op.quantity" type="number" inputmode="decimal" min="0" step="any" class="field__input" />
          </div>
          <div>
            <label>وحدتها</label>
            <input v-model.trim="op.quantityUnit" class="field__input" placeholder="عذق، فسيلة..." />
          </div>
        </div>
        <label>نخيل بعينها ({{ tagList.length }})</label>
        <div class="field__tags">
          <input v-model.trim="op.tags" class="field__input" dir="ltr" placeholder="A-B1-R3-07, A-B1-R3-08" />
          <button type="button" class="field__btn field__btn--sm" @click="scanner = 'multi'">
            <QrCode :size="18" /> مسح
          </button>
        </div>
        <label>ملاحظات</label>
        <input v-model.trim="op.notes" class="field__input" />
        <div class="field__actions">
          <button v-if="completing" type="button" class="field__btn field__btn--ghost" @click="cancelCompleting">إلغاء</button>
          <button type="submit" class="field__btn">حفظ</button>
        </div>
      </form>

      <!-- ══ حصاد ══ -->
      <form v-else-if="tab === 'harvest'" class="field__card" @submit.prevent="saveHarvest">
        <h2>حصاد</h2>
        <label>الزراعة *</label>
        <select v-model="hv.plantingId" class="field__input" required>
          <option value="" disabled>اختر</option>
          <option v-for="p in activePlantings" :key="p.id" :value="p.id">{{ plantingLabel(p) }}</option>
        </select>
        <label>نخلة بعينها (الوسم)</label>
        <input v-model.trim="hv.tag" class="field__input" dir="ltr" list="field-tags" placeholder="اختياري" />
        <label>الصافي (كجم أو وحدة المنتج) *</label>
        <input v-model.number="hv.quantity" type="number" inputmode="decimal" min="0" step="any" class="field__input field__input--big" required />
        <div class="field__row">
          <div>
            <label>القائم</label>
            <input v-model.number="hv.grossQuantity" type="number" inputmode="decimal" min="0" step="any" class="field__input" />
          </div>
          <div>
            <label>عذوق/صناديق</label>
            <input v-model.number="hv.containers" type="number" inputmode="numeric" min="0" class="field__input" />
          </div>
        </div>
        <label>الجودة</label>
        <div class="field__chips">
          <button
            v-for="(label, key) in GRADE"
            :key="key"
            type="button"
            :class="{ 'is-active': hv.grade === key }"
            @click="hv.grade = hv.grade === key ? '' : key"
          >
            {{ label }}
          </button>
        </div>
        <div class="field__row">
          <div>
            <label>المرفوض</label>
            <input v-model.number="hv.rejectQuantity" type="number" inputmode="decimal" min="0" step="any" class="field__input" />
          </div>
          <div>
            <label>سببه</label>
            <select v-model="hv.rejectReason" class="field__input">
              <option value="">—</option>
              <option v-for="(label, key) in REJECT_REASON" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
        </div>
        <div class="field__row">
          <div>
            <label>عدد العمال</label>
            <input v-model.number="hv.workerCount" type="number" inputmode="numeric" min="0" class="field__input" />
          </div>
          <div>
            <label>الساعات</label>
            <input v-model.number="hv.laborHours" type="number" inputmode="decimal" min="0" step="any" class="field__input" />
          </div>
        </div>
        <div class="field__actions"><button type="submit" class="field__btn">حفظ الحصاد</button></div>
      </form>

      <!-- ══ آفة ══ -->
      <form v-else-if="tab === 'pest'" class="field__card" @submit.prevent="saveInspection">
        <h2>فحص آفة</h2>
        <label>الآفة / المرض *</label>
        <select v-model="ins.pest" class="field__input" required>
          <option v-for="(label, key) in PEST" :key="key" :value="key">{{ label }}</option>
        </select>
        <label>الشدة</label>
        <div class="field__chips field__severity">
          <button
            v-for="(label, n) in SEVERITY"
            :key="n"
            type="button"
            :class="[{ 'is-active': ins.severity === n }, `sev-${n}`]"
            @click="ins.severity = n"
          >
            {{ label }}
          </button>
        </div>
        <label>نخلة بعينها (الوسم)</label>
        <input v-model.trim="ins.tag" class="field__input" dir="ltr" list="field-tags" placeholder="أو اختر الوحدة" />
        <select v-if="!ins.tag" v-model="ins.unitId" class="field__input">
          <option value="">المزرعة</option>
          <option v-for="u in unitChoices" :key="u.id" :value="u.id">{{ u.label }}</option>
        </select>
        <div class="field__row">
          <div>
            <label>المصاب</label>
            <input v-model.number="ins.affectedCount" type="number" inputmode="numeric" min="0" class="field__input" />
          </div>
          <div>
            <label>من المفحوص</label>
            <input v-model.number="ins.sampledCount" type="number" inputmode="numeric" min="0" class="field__input" />
          </div>
        </div>
        <label>ملاحظات</label>
        <input v-model.trim="ins.notes" class="field__input" />
        <div class="field__actions"><button type="submit" class="field__btn">حفظ الفحص</button></div>
      </form>

      <!-- ══ حالة نخلة ══ -->
      <form v-else-if="tab === 'plant'" class="field__card" @submit.prevent="savePlantStatus">
        <h2>حالة نخلة</h2>
        <label>الوسم *</label>
        <input v-model.trim="ps.tag" class="field__input field__input--big" dir="ltr" list="field-tags" required />
        <p v-if="psPlant" class="field__hint">
          الحالة الآن: <b>{{ PLANT_STATUS[psPlant.status as PlantStatus]?.label ?? psPlant.status }}</b>
        </p>
        <p v-else-if="ps.tag" class="field__hint field__hint--warn">لا نخلة بهذا الوسم في المزرعة</p>
        <label>الحالة الجديدة</label>
        <div class="field__chips">
          <button
            v-for="(s, key) in PLANT_STATUS"
            :key="key"
            type="button"
            :class="{ 'is-active': ps.status === key }"
            @click="ps.status = key"
          >
            {{ s.label }}
          </button>
        </div>
        <template v-if="ps.status === 'dead' || ps.status === 'removed'">
          <label>السبب *</label>
          <select v-model="ps.removalReason" class="field__input" required>
            <option value="" disabled>اختر</option>
            <option v-for="(label, key) in REMOVAL_REASON" :key="key" :value="key">{{ label }}</option>
          </select>
        </template>
        <label>ملاحظة</label>
        <input v-model.trim="ps.reason" class="field__input" maxlength="200" />
        <div class="field__actions"><button type="submit" class="field__btn" :disabled="!psPlant">حفظ</button></div>
      </form>

      <!-- ══ المخطط ══ -->
      <section v-else-if="tab === 'planned'" class="field__card">
        <h2>المخطط حتى أسبوعين</h2>
        <p v-if="!plannedOpen.length" class="field__hint">لا عمليات مخططة</p>
        <div v-for="o in plannedOpen" :key="o.id" class="field__planned" :class="{ 'is-late': o.plannedDate < boot.data.today }">
          <div>
            <strong>{{ OPERATION_TYPE[o.type as FarmOperationType] }}<template v-if="o.title"> — {{ o.title }}</template></strong>
            <small>{{ o.plannedDate }} · {{ unitLabel(o.unitId) }}</small>
          </div>
          <button type="button" class="field__btn field__btn--sm" @click="startCompleting(o)">نُفّذت</button>
        </div>
      </section>

      <datalist id="field-tags">
        <option v-for="p in boot.data.plants" :key="p.id" :value="p.tag" />
      </datalist>

      <!-- ══ الطابور ══ -->
      <section v-if="queue.length" class="field__card">
        <h2>على هذا الجهاز ({{ queue.length }})</h2>
        <div v-for="q in queue" :key="q.id" class="field__queued" :class="{ 'is-error': q.error }">
          <div>
            <strong>{{ q.label }}</strong>
            <small>{{ new Date(q.occurredAt).toLocaleString("ar") }}</small>
            <small v-if="q.error" class="field__error">رفضه السيرفر: {{ q.error }}</small>
          </div>
          <div v-if="q.error" class="field__queued-actions">
            <button type="button" class="field__btn field__btn--sm" @click="retry(q)">إعادة</button>
            <button type="button" class="field__btn field__btn--sm field__btn--ghost" @click="drop(q)">حذف</button>
          </div>
        </div>
      </section>

      <button type="button" class="field__refresh" :disabled="refreshing" @click="refresh(true)">
        <RefreshCw :size="14" /> تحديث بيانات المزرعة
        <small v-if="boot">(آخر تنزيل {{ new Date(boot.fetchedAt).toLocaleString("ar") }})</small>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  CalendarCheck,
  ClipboardList,
  CloudUpload,
  QrCode,
  RefreshCw,
  TreePalm,
  Tractor,
  Wheat,
  Wifi,
  WifiOff,
  X,
} from "lucide-vue-next";
import QrScanner from "~/components/farms/QrScanner.vue";
import { parseFarmCode, type FarmCode } from "@/utils/farm-codes";
import { NetworkError } from "@/composables/useConnection";
import { useToast } from "@/composables/useToast";
import { useAuthStore } from "@/stores/auth";
import { useFarmsStore } from "@/stores/farms";
import { fieldDb, type FieldBoot, type FieldOpType, type FieldQueued } from "@/field/db";
import {
  GRADE,
  OPERATION_TYPE,
  PEST,
  PLANT_STATUS,
  REJECT_REASON,
  REMOVAL_REASON,
  SEVERITY,
  UNIT_KIND,
} from "@/utils/farms";
import type {
  FarmHarvest,
  FarmOperationType,
  FarmUnitKind,
  HarvestGrade,
  HarvestRejectReason,
  PestType,
  PlantRemovalReason,
  PlantStatus,
} from "@/types/farms";

definePageMeta({ middleware: "auth", layout: false });
useHead({ title: "الشاشة الميدانية" });

const POLL_MS = 30_000;
const SYNC_BATCH = 200;
/** بيانات أقدم من هذا تُحدَّث عند الفتح (إن وُجد اتصال) */
const BOOT_MAX_AGE_MS = 3 * 60 * 60 * 1000;
const FARM_KEY = "stb-field-farm";
const SUPERVISOR_KEY = "stb-field-supervisor";

const TABS = [
  { id: "operation", label: "عملية", icon: ClipboardList },
  { id: "harvest", label: "حصاد", icon: Wheat },
  { id: "pest", label: "آفة", icon: Bug },
  { id: "plant", label: "نخلة", icon: TreePalm },
  { id: "planned", label: "المخطط", icon: CalendarCheck },
] as const;
type Tab = (typeof TABS)[number]["id"];
const COMMON_TYPES: FarmOperationType[] = [
  "irrigation",
  "fertilization",
  "spraying",
  "pollination",
  "pruning",
  "frond_removal",
];

const store = useFarmsStore();
const auth = useAuthStore();
const toast = useToast();
const owner = computed(() => `${auth.tenantId ?? ""}:${auth.userId ?? ""}`);

const farmId = ref("");
const farms = ref<{ id: string; name: string }[]>([]);
const boot = ref<FieldBoot | null>(null);
const queue = ref<FieldQueued[]>([]);
const loading = ref(true);
const refreshing = ref(false);
const online = ref<boolean | null>(null);
const notice = ref("");
const tab = ref<Tab>("operation");

const status = computed(() => {
  const waiting = queue.value.filter((q) => !q.error).length;
  if (online.value === false) {
    return {
      tone: "offline",
      text: ["بلا إنترنت — يُحفظ على الجوال", waiting ? `${waiting} عملية تُرفع عند عودة الاتصال` : ""]
        .filter(Boolean)
        .join(" · "),
    };
  }
  if (waiting) return { tone: "pending", text: `بانتظار الرفع: ${waiting} عملية…` };
  if (online.value === null) return { tone: "pending", text: "جارٍ الاتصال…" };
  return { tone: "online", text: "متصل — كل شيء مرفوع" };
});

// ─── بيانات المزرعة ───
const units = computed(() => boot.value?.data.units ?? []);
const unitChoices = computed(() =>
  units.value.map((u) => ({
    id: u.id,
    label: `${"— ".repeat(Math.max(0, u.depth - 1))}${UNIT_KIND[u.kind as FarmUnitKind] ?? ""} ${u.name}${u.code ? ` (${u.code})` : ""}`,
  })),
);
const unitLabel = (id: string | null) =>
  id ? (units.value.find((u) => u.id === id)?.name ?? "") : "المزرعة كلها";
const activePlantings = computed(() =>
  (boot.value?.data.plantings ?? []).filter((p) => p.status === "active"),
);
const plantingLabel = (p: { cropName: string; varietyName: string | null; unitId: string }) =>
  `${p.cropName}${p.varietyName ? ` — ${p.varietyName}` : ""} (${unitLabel(p.unitId)})`;
/** زراعات الوحدة وما تحتها وما فوقها */
const plantingsIn = (unitId: string) => {
  if (!unitId) return activePlantings.value;
  const unit = units.value.find((u) => u.id === unitId);
  if (!unit) return activePlantings.value;
  return activePlantings.value.filter((p) => {
    const pu = units.value.find((u) => u.id === p.unitId);
    return !!pu && (pu.path === unit.path || pu.path.startsWith(`${unit.path}/`) || unit.path.startsWith(`${pu.path}/`));
  });
};
const waterSources = computed(() => boot.value?.data.waterSources ?? []);
const productName = (id: string) =>
  boot.value?.data.products.find((p) => p.id === id)?.name ?? "";
const plantByTag = (tag: string) => {
  const wanted = tag.trim().toLowerCase();
  return boot.value?.data.plants.find((p) => p.tag.toLowerCase() === wanted) ?? null;
};
const queuedCompletions = computed(
  () => new Set(queue.value.filter((q) => q.type === "operation_complete").map((q) => q.payload.operationId)),
);
const plannedOpen = computed(() =>
  (boot.value?.data.plannedOperations ?? []).filter((o) => !queuedCompletions.value.has(o.id)),
);

// ─── الحفظ على الجهاز ───
const supervisor = () => {
  try {
    return localStorage.getItem(SUPERVISOR_KEY) || null;
  } catch {
    return null;
  }
};
const enqueue = async (type: FieldOpType, payload: Record<string, unknown>, label: string) => {
  const op: FieldQueued = {
    id: crypto.randomUUID(),
    owner: owner.value,
    farmId: farmId.value,
    type,
    occurredAt: new Date().toISOString(),
    payload: clean(payload),
    label,
    createdAt: Date.now(),
  };
  queue.value = [...queue.value, op];
  try {
    await fieldDb.enqueue(op);
  } catch (error) {
    toast.error(getErrorMessage(error, "تعذر الحفظ على الجوال"));
    return;
  }
  toast.success(online.value === false ? "حُفظ على الجوال — يُرفع عند عودة الاتصال" : "حُفظ");
  void sync();
};
/** الحقول الفارغة لا تُرسل */
const clean = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && !v.length),
    ),
  );
const num = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));

// ─── العملية ───
const emptyOp = () => ({
  type: "irrigation" as FarmOperationType,
  unitId: "",
  plantingId: "",
  waterM3: "" as number | "",
  durationMinutes: "" as number | "",
  waterSourceId: "",
  inputs: [] as { productId: string; quantity: number | ""; phiDays: number | "" }[],
  workerCount: "" as number | "",
  laborHours: "" as number | "",
  quantity: "" as number | "",
  quantityUnit: "",
  tags: "",
  notes: "",
});
const op = reactive(emptyOp());
const completing = ref<{ id: string; number: string; type: string } | null>(null);
const productQuery = ref("");
const addProduct = () => {
  const product = boot.value?.data.products.find(
    (p) => `${p.name} · ${p.sku}` === productQuery.value,
  );
  if (product && !op.inputs.some((l) => l.productId === product.id)) {
    op.inputs.push({ productId: product.id, quantity: "", phiDays: "" });
  }
  productQuery.value = "";
};
const startCompleting = (o: { id: string; number: string; type: string; unitId: string | null; plantingId: string | null }) => {
  Object.assign(op, emptyOp(), { type: o.type as FarmOperationType });
  completing.value = o;
  tab.value = "operation";
};
const cancelCompleting = () => {
  completing.value = null;
  Object.assign(op, emptyOp());
};
const saveOperation = async () => {
  const tags = op.tags.split(/[,،\s]+/).map((t) => t.trim()).filter(Boolean);
  const missing = tags.filter((t) => !plantByTag(t));
  if (missing.length) {
    toast.error(`وسوم غير موجودة: ${missing.join("، ")}`);
    return;
  }
  const actuals = {
    waterM3: op.type === "irrigation" ? num(op.waterM3) : undefined,
    durationMinutes: num(op.durationMinutes),
    waterSourceId: op.type === "irrigation" ? op.waterSourceId : undefined,
    inputs: op.inputs
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity), phiDays: num(l.phiDays) })),
    workerCount: num(op.workerCount),
    laborHours: num(op.laborHours),
    quantity: num(op.quantity),
    quantityUnit: op.quantityUnit,
    plantIds: tags.map((t) => plantByTag(t)!.id),
    supervisorName: supervisor(),
    notes: op.notes,
  };
  const label = `${OPERATION_TYPE[op.type]}${op.waterM3 ? ` ${op.waterM3} م³` : ""} — ${
    completing.value ? completing.value.number : unitLabel(op.unitId || null)
  }`;
  if (completing.value) {
    await enqueue("operation_complete", { operationId: completing.value.id, ...actuals }, label);
    completing.value = null;
  } else {
    await enqueue(
      "operation",
      { farmId: farmId.value, unitId: op.unitId, plantingId: op.plantingId, type: op.type, ...actuals },
      label,
    );
  }
  const keep = { type: op.type, unitId: op.unitId, plantingId: op.plantingId };
  Object.assign(op, emptyOp(), keep);
};

// ─── الحصاد ───
const emptyHarvest = () => ({
  plantingId: "",
  tag: "",
  quantity: "" as number | "",
  grossQuantity: "" as number | "",
  containers: "" as number | "",
  grade: "" as HarvestGrade | "",
  rejectQuantity: "" as number | "",
  rejectReason: "" as HarvestRejectReason | "",
  workerCount: "" as number | "",
  laborHours: "" as number | "",
});
const hv = reactive(emptyHarvest());
const saveHarvest = async () => {
  const plant = hv.tag ? plantByTag(hv.tag) : null;
  if (hv.tag && !plant) {
    toast.error(`لا نخلة بالوسم ${hv.tag}`);
    return;
  }
  if (plant && plant.plantingId !== hv.plantingId) {
    toast.error(`النخلة ${hv.tag} ليست في هذه الزراعة`);
    return;
  }
  const planting = activePlantings.value.find((p) => p.id === hv.plantingId);
  await enqueue(
    "harvest",
    {
      farmId: farmId.value,
      plantingId: hv.plantingId,
      plantId: plant?.id,
      quantity: Number(hv.quantity) || 0,
      grossQuantity: num(hv.grossQuantity),
      containers: num(hv.containers),
      grade: hv.grade,
      rejectQuantity: num(hv.rejectQuantity),
      rejectReason: hv.rejectReason,
      workerCount: num(hv.workerCount),
      laborHours: num(hv.laborHours),
      supervisorName: supervisor(),
    },
    `حصاد ${hv.quantity} — ${plant?.tag ?? planting?.cropName ?? ""}`,
  );
  const keep = { plantingId: hv.plantingId };
  Object.assign(hv, emptyHarvest(), keep);
};

// ─── الآفة ───
const emptyInspection = () => ({
  pest: "red_palm_weevil" as PestType,
  severity: 2,
  tag: "",
  unitId: "",
  affectedCount: "" as number | "",
  sampledCount: "" as number | "",
  notes: "",
});
const ins = reactive(emptyInspection());
const saveInspection = async () => {
  const plant = ins.tag ? plantByTag(ins.tag) : null;
  if (ins.tag && !plant) {
    toast.error(`لا نخلة بالوسم ${ins.tag}`);
    return;
  }
  await enqueue(
    "inspection",
    {
      farmId: farmId.value,
      plantId: plant?.id,
      unitId: plant ? undefined : ins.unitId,
      pest: ins.pest,
      severity: ins.severity,
      affectedCount: num(ins.affectedCount),
      sampledCount: num(ins.sampledCount),
      inspectorName: supervisor(),
      notes: ins.notes,
    },
    `${PEST[ins.pest]} (${SEVERITY[ins.severity]}) — ${plant?.tag ?? unitLabel(ins.unitId || null)}`,
  );
  if (plant && ins.severity > 0) plant.status = ins.pest === "nutrient_deficiency" ? "weak" : "infested";
  Object.assign(ins, emptyInspection(), { pest: ins.pest });
};

// ─── حالة نخلة ───
const ps = reactive({
  tag: "",
  status: "healthy" as PlantStatus,
  removalReason: "" as PlantRemovalReason | "",
  reason: "",
});
const psPlant = computed(() => (ps.tag ? plantByTag(ps.tag) : null));
const savePlantStatus = async () => {
  const plant = psPlant.value;
  if (!plant) return;
  await enqueue(
    "plant_status",
    {
      plantId: plant.id,
      status: ps.status,
      removalReason: ["dead", "removed"].includes(ps.status) ? ps.removalReason : undefined,
      reason: ps.reason,
    },
    `${plant.tag}: ${PLANT_STATUS[ps.status].label}`,
  );
  plant.status = ps.status;
  Object.assign(ps, { tag: "", status: "healthy", removalReason: "", reason: "" });
};

const setTab = (t: Tab) => {
  tab.value = t;
  if (t !== "operation") completing.value = null;
};

// ─── المسح (لوحات النخيل وملصقات الحصاد) ───
type BootPlant = FieldBoot["data"]["plants"][number];
const route = useRoute();
const router = useRouter();
const scanner = ref<null | "single" | "multi">(null);
const scannedPlant = ref<BootPlant | null>(null);
const scannedHarvest = ref<FarmHarvest | null>(null);
const tagList = computed(() => op.tags.split(/[,،\s]+/).map((t) => t.trim()).filter(Boolean));
const plantingOf = (id: string) => {
  const p = boot.value?.data.plantings.find((x) => x.id === id);
  return p ? `${p.cropName}${p.varietyName ? ` — ${p.varietyName}` : ""}` : "";
};
const plantOfCode = (code: FarmCode): BootPlant | null =>
  code.kind === "plant"
    ? (boot.value?.data.plants.find((p) => p.id === code.id) ?? null)
    : code.kind === "tag"
      ? plantByTag(code.tag)
      : null;
const addTag = (tag: string) => {
  if (!tagList.value.includes(tag)) op.tags = [...tagList.value, tag].join(", ");
};

/** ما قرأه الماسح: في المسح المتتالي يُضاف للعملية، وإلا تُفتح النخلة أو الحصاد */
const onScan = async (text: string) => {
  const code = parseFarmCode(text);
  if (!code) {
    toast.error("رمز لا يخص المزارع");
    return;
  }
  if (scanner.value === "multi") {
    const plant = plantOfCode(code);
    if (!plant) {
      toast.warning("نخلة ليست في بيانات هذه المزرعة على الجوال");
      return;
    }
    addTag(plant.tag);
    return;
  }
  scanner.value = null;
  await openCode(code);
};

const openCode = async (code: FarmCode) => {
  scannedPlant.value = null;
  scannedHarvest.value = null;
  if (code.kind === "harvest") {
    try {
      scannedHarvest.value = await store.getHarvest(code.id);
      online.value = true;
    } catch (error) {
      if (error instanceof NetworkError) {
        online.value = false;
        toast.info("ملصق حصاد — تفاصيله تحتاج اتصالاً");
      } else toast.error(getErrorMessage(error, "الحصاد غير موجود"));
    }
    return;
  }
  let plant = plantOfCode(code);
  // نخلة مزرعة أخرى: متصلاً نعرف مزرعتها وننزّلها
  if (!plant && code.kind === "plant" && online.value !== false) {
    try {
      const remote = await store.getPlant(code.id);
      if (remote.farmId !== farmId.value) {
        farmId.value = remote.farmId;
        await openFarm();
        plant = plantOfCode(code);
      }
    } catch (error) {
      if (error instanceof NetworkError) online.value = false;
    }
  }
  if (!plant) {
    toast.error(
      code.kind === "tag"
        ? `لا نخلة بالوسم ${code.tag} في هذه المزرعة`
        : "النخلة ليست في بيانات هذا الجوال — حدّث بيانات المزرعة وأنت متصل",
    );
    return;
  }
  scannedPlant.value = plant;
};

/** من بطاقة النخلة إلى النموذج المناسب معبّأً بها */
const actOnPlant = (target: "harvest" | "pest" | "plant" | "operation") => {
  const plant = scannedPlant.value;
  if (!plant) return;
  if (target === "harvest") {
    Object.assign(hv, emptyHarvest(), { plantingId: plant.plantingId, tag: plant.tag });
  } else if (target === "pest") {
    Object.assign(ins, emptyInspection(), { tag: plant.tag });
  } else if (target === "plant") {
    Object.assign(ps, { tag: plant.tag, status: plant.status as PlantStatus, removalReason: "", reason: "" });
  } else {
    completing.value = null;
    addTag(plant.tag);
  }
  tab.value = target;
  scannedPlant.value = null;
};

/** فُتحت الشاشة من رابط لوحة (كاميرا الجوال): ?plant= أو ?harvest= */
const openFromLink = async () => {
  const code = parseFarmCode(
    typeof route.query.plant === "string"
      ? `${window.location.origin}/field?plant=${route.query.plant}`
      : typeof route.query.harvest === "string"
        ? `${window.location.origin}/field?harvest=${route.query.harvest}`
        : "",
  );
  if (!code) return;
  await router.replace({ query: {} });
  await openCode(code);
};

// ─── الرفع والتنزيل ───
const runSync = async () => {
  const batch = queue.value.filter((q) => !q.error).slice(0, SYNC_BATCH);
  if (!batch.length) return;
  try {
    const { results } = await store.fieldSync(
      batch.map((q) => ({ id: q.id, type: q.type, occurredAt: q.occurredAt, payload: q.payload })),
    );
    const byId = new Map(results.map((r) => [r.id, r]));
    const accepted: string[] = [];
    const refused: FieldQueued[] = [];
    for (const q of batch) {
      const result = byId.get(q.id);
      if (!result) continue;
      if (result.status === "error") refused.push({ ...q, error: result.message || "رُفض" });
      else accepted.push(q.id);
    }
    await fieldDb.settle(accepted, refused);
    online.value = true;
    notice.value = "";
    if (refused.length) toast.warning(`رفض السيرفر ${refused.length} عملية — راجعها في الطابور`);
    if (accepted.length) void refresh(false);
  } catch (error) {
    if (error instanceof NetworkError) online.value = false;
    else notice.value = getErrorMessage(error, "تعذر الرفع");
  } finally {
    queue.value = await fieldDb.queueOf(owner.value).catch(() => queue.value);
  }
};
let syncing: Promise<void> | null = null;
const sync = () =>
  (syncing ??= runSync().finally(() => {
    syncing = null;
  }));
const syncNow = async () => {
  await sync();
  if (online.value !== false) await refresh(false);
};

/** تنزيل المزرعة (force: زر التحديث) */
const refresh = async (force: boolean) => {
  if (!farmId.value) return;
  if (!force && boot.value && Date.now() - boot.value.fetchedAt < BOOT_MAX_AGE_MS && boot.value.farmId === farmId.value) {
    // حديثة بما يكفي — لكن بعد رفع ناجح نحدّث المخطط والنخيل
    if (!queue.value.length) return;
  }
  refreshing.value = true;
  try {
    const data = await store.fieldBootstrap(farmId.value);
    farms.value = data.farms;
    boot.value = { key: `${owner.value}:${farmId.value}`, owner: owner.value, farmId: farmId.value, fetchedAt: Date.now(), data };
    await fieldDb.putBoot(boot.value);
    online.value = true;
    if (force) toast.success("حُدّثت بيانات المزرعة");
  } catch (error) {
    if (error instanceof NetworkError) online.value = false;
    else if (force) toast.error(getErrorMessage(error, "تعذر التحديث"));
  } finally {
    refreshing.value = false;
  }
};

const openFarm = async () => {
  try {
    localStorage.setItem(FARM_KEY, farmId.value);
  } catch {
    // لا شيء
  }
  boot.value = await fieldDb.getBoot(owner.value, farmId.value).catch(() => null);
  if (boot.value) farms.value = boot.value.data.farms;
  await refresh(!boot.value);
};

let poller: ReturnType<typeof setInterval> | null = null;
const onOnline = () => void sync();

onMounted(async () => {
  registerOfflineShell();
  try {
    queue.value = await fieldDb.queueOf(owner.value);
  } catch (error) {
    notice.value = getErrorMessage(error, "تعذر فتح قاعدة بيانات الجوال");
  }
  let saved = "";
  try {
    saved = localStorage.getItem(FARM_KEY) ?? "";
  } catch {
    // لا شيء
  }
  if (saved) {
    farmId.value = saved;
    boot.value = await fieldDb.getBoot(owner.value, saved).catch(() => null);
    if (boot.value) farms.value = boot.value.data.farms;
  }
  if (!farmId.value) {
    // أول فتح: أول مزرعة يراها المستخدم
    try {
      const list = await store.fetchFarms();
      farms.value = list.filter((f) => f.isActive);
      farmId.value = farms.value[0]?.id ?? "";
      online.value = true;
    } catch (error) {
      if (error instanceof NetworkError) online.value = false;
    }
  }
  await refresh(false);
  await sync();
  loading.value = false;
  await openFromLink();
  poller = setInterval(() => {
    if (document.visibilityState === "visible") void sync();
  }, POLL_MS);
  window.addEventListener("online", onOnline);
});

onBeforeUnmount(() => {
  if (poller) clearInterval(poller);
  window.removeEventListener("online", onOnline);
});

const retry = async (q: FieldQueued) => {
  const fixed = { ...q, error: undefined };
  await fieldDb.enqueue(fixed);
  queue.value = queue.value.map((x) => (x.id === q.id ? fixed : x));
  void sync();
};
const drop = async (q: FieldQueued) => {
  if (!confirm(`حذف "${q.label}" من الجوال؟ لن يُرفع.`)) return;
  await fieldDb.remove([q.id]);
  queue.value = queue.value.filter((x) => x.id !== q.id);
};
</script>

<style lang="scss">
.field {
  min-height: 100vh;
  min-height: 100dvh;
  max-width: 640px;
  margin: 0 auto;
  padding: 16px 16px 48px;
  color: var(--stb-text-primary);
  background: var(--stb-dark);
  font-family: "Cairo", sans-serif;

  h2 {
    margin: 0 0 8px;
    font-size: 1.1rem;
    color: var(--stb-text-primary);
  }

  label {
    display: block;
    margin: 10px 0 4px;
    font-size: 0.85rem;
    color: var(--stb-text-secondary);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    small {
      color: var(--stb-text-muted);
    }
  }

  &__farm {
    display: block;
    margin-top: 2px;
    padding: 4px 8px;
    font: inherit;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--stb-text-primary);
    background: transparent;
    border: 0;
  }

  &__icon-btn {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--stb-border);
    border-radius: 12px;
    color: var(--stb-text-primary);
    background: var(--stb-surface);
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    margin-bottom: 10px;
    padding: 8px 12px;
    border: 1px solid transparent;
    border-radius: 10px;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    text-align: start;
    cursor: pointer;

    &.is-online {
      color: var(--stb-success);
      background: color-mix(in srgb, var(--stb-success) 10%, transparent);
    }
    &.is-pending {
      color: var(--stb-warning);
      background: color-mix(in srgb, var(--stb-warning) 10%, transparent);
    }
    &.is-offline {
      color: var(--stb-danger);
      background: color-mix(in srgb, var(--stb-danger) 10%, transparent);
    }
  }

  &__notice {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--stb-warning);
    font-size: 0.85rem;
  }

  &__empty {
    display: grid;
    place-items: center;
    gap: 12px;
    padding: 48px 16px;
    color: var(--stb-text-muted);
    text-align: center;
  }

  &__tabs {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-bottom: 12px;

    button {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 4px;
      border: 1px solid var(--stb-border);
      border-radius: 12px;
      background: var(--stb-surface);
      color: var(--stb-text-secondary);
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;

      &.is-active {
        border-color: var(--stb-primary);
        color: var(--stb-text-primary);
        background: color-mix(in srgb, var(--stb-primary) 18%, var(--stb-surface));
      }

      b {
        position: absolute;
        top: 4px;
        left: 6px;
        min-width: 18px;
        padding: 0 4px;
        border-radius: 9px;
        background: var(--stb-warning-soft);
        color: var(--stb-warning);
        font-size: 0.7rem;
      }
    }
  }

  &__card {
    margin-bottom: 12px;
    padding: 14px;
    border: 1px solid var(--stb-border);
    border-radius: 14px;
    background: var(--stb-surface);
  }

  &__input {
    width: 100%;
    min-height: 46px;
    padding: 8px 12px;
    border: 1px solid var(--stb-border);
    border-radius: 10px;
    background: var(--stb-dark);
    color: var(--stb-text-primary);
    font: inherit;
    font-size: 1rem;

    &--big {
      min-height: 56px;
      font-size: 1.3rem;
      font-weight: 600;
    }
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    button {
      min-height: 40px;
      padding: 6px 12px;
      border: 1px solid var(--stb-border);
      border-radius: 999px;
      background: var(--stb-dark);
      color: var(--stb-text-secondary);
      font: inherit;
      cursor: pointer;

      &.is-active {
        border-color: var(--stb-primary);
        background: var(--stb-primary);
        color: #fff;
      }
    }
  }

  &__severity {
    .sev-3.is-active,
    .sev-4.is-active {
      border-color: var(--stb-danger);
      background: var(--stb-danger);
    }
  }

  &__more {
    width: auto;
    min-height: 40px;
  }

  &__line {
    display: grid;
    grid-template-columns: 1fr 90px 90px 32px;
    gap: 6px;
    align-items: center;
    margin-bottom: 6px;
    font-size: 0.9rem;
  }

  &__x {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: color-mix(in srgb, var(--stb-danger) 15%, transparent);
    color: var(--stb-danger);
    cursor: pointer;
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }

  &__btn {
    flex: 1;
    min-height: 50px;
    border: 0;
    border-radius: 12px;
    background: var(--stb-primary);
    color: #fff;
    font: inherit;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
    }
    &--ghost {
      background: transparent;
      border: 1px solid var(--stb-border);
      color: var(--stb-text-primary);
    }
    &--sm {
      flex: none;
      min-height: 38px;
      padding: 0 14px;
      font-size: 0.9rem;
    }
  }

  &__hint {
    margin: 6px 0;
    font-size: 0.85rem;
    color: var(--stb-text-secondary);

    &--warn {
      color: var(--stb-warning);
    }
  }

  &__planned,
  &__queued {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--stb-border);

    div:first-child {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    small {
      color: var(--stb-text-muted);
    }
  }

  &__planned.is-late small {
    color: var(--stb-danger);
  }

  &__queued.is-error strong {
    color: var(--stb-danger);
  }

  &__queued-actions {
    display: flex;
    gap: 6px;
  }

  &__error {
    color: var(--stb-danger) !important;
  }

  &__header-actions {
    display: flex;
    gap: 8px;
  }

  &__icon-btn--primary {
    border-color: var(--stb-primary);
    background: var(--stb-primary);
    color: #fff;
    cursor: pointer;
  }

  &__scanned {
    border-color: var(--stb-primary);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__scanned-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    strong {
      font-family: "Consolas", "Courier New", monospace;
      font-size: 1.3rem;
    }
    small {
      color: var(--stb-text-secondary);
    }
  }

  &__status-chip {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    color: var(--stb-success);
    background: color-mix(in srgb, var(--stb-success) 15%, transparent);

    &.is-infested,
    &.is-diseased,
    &.is-dead,
    &.is-removed {
      color: var(--stb-danger);
      background: color-mix(in srgb, var(--stb-danger) 15%, transparent);
    }
    &.is-weak {
      color: var(--stb-warning);
      background: color-mix(in srgb, var(--stb-warning) 15%, transparent);
    }
  }

  &__quick {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 52px;
      border: 1px solid var(--stb-border);
      border-radius: 12px;
      background: var(--stb-dark);
      color: var(--stb-text-primary);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
  }

  &__tags {
    display: flex;
    gap: 8px;
    align-items: center;

    .field__btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }

  &__refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    width: 100%;
    padding: 10px;
    border: 0;
    background: transparent;
    color: var(--stb-text-secondary);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }
}
</style>
