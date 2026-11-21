<!-- pages/dashboard/manufacturing/orders/[id].vue — أمر إنتاج: التنفيذ خطوة بخطوة وتكلفته -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>
          أمر إنتاج {{ order?.number }}
          <span v-if="order" :class="['badge', `doc-status--${PRODUCTION_STATUS[order.status].tone}`]">
            {{ PRODUCTION_STATUS[order.status].label }}
          </span>
          <span v-if="order?.late" class="badge doc-status--cancelled">متأخر</span>
        </h1>
        <p v-if="order">
          {{ order.product?.name }} — {{ formatNumber(order.plannedQuantity) }} {{ unit }}
          <template v-if="order.reference"> · {{ order.reference }}</template>
        </p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/dashboard/manufacturing" class="btn btn--ghost"><ArrowRight :size="16" /> الأوامر</NuxtLink>
        <template v-if="order">
          <button v-if="order.status === 'draft'" v-can="'plan_production'" class="btn btn--primary" :disabled="busy" @click="run(() => store.release(order!.id), 'أُطلق الأمر للتنفيذ')">
            <Play :size="16" /> إطلاق للتنفيذ
          </button>
          <template v-if="active">
            <button v-can="'execute_production'" class="btn btn--ghost" @click="openIssue">
              <PackageMinus :size="16" /> صرف خامات
            </button>
            <button v-can="'execute_production'" class="btn btn--ghost" @click="openReturn">
              <Undo2 :size="16" /> ردّ خامات
            </button>
            <button v-can="'execute_production'" class="btn btn--primary" @click="openOutput(false)">
              <PackagePlus :size="16" /> استلام إنتاج
            </button>
            <button v-can="'execute_production'" class="btn btn--success" @click="openOutput(true)">
              <CircleCheck :size="16" /> إكمال الأمر
            </button>
          </template>
          <button
            v-if="['draft', 'released', 'in_progress'].includes(order.status)"
            v-can="'plan_production'"
            class="btn btn--danger"
            @click="showCancel = true"
          >
            إلغاء
          </button>
        </template>
      </div>
    </div>

    <div v-if="!order" class="empty-state"><div class="spinner spinner--lg" /></div>
    <template v-else>
      <!-- ─── الأرقام ─── -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-card__label">الإنجاز</span>
          <strong>{{ formatNumber(order.producedQuantity) }} / {{ formatNumber(order.plannedQuantity) }}</strong>
          <div class="progress"><span :style="{ width: `${order.progress}%` }" /></div>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">المرفوض</span>
          <strong :class="{ 'doc-num--out': order.scrapQuantity > 0 }">{{ formatNumber(order.scrapQuantity) }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">التكلفة المخططة</span>
          <strong>{{ formatCurrency(plannedTotal) }}</strong>
          <small>{{ formatCurrency(order.plannedQuantity ? plannedTotal / order.plannedQuantity : 0) }} للوحدة</small>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">{{ order.status === "completed" ? "التكلفة الفعلية" : "التكلفة حتى الآن" }}</span>
          <strong>{{ formatCurrency(actualTotal) }}</strong>
          <small v-if="order.status === 'completed'">{{ formatCurrency(order.unitCost) }} للوحدة الجيدة</small>
          <small v-else>خامات {{ formatCurrency(order.costToDate?.material ?? 0) }} + وقت {{ formatCurrency((order.costToDate?.labor ?? 0) + (order.costToDate?.overhead ?? 0)) }}</small>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">المخازن</span>
          <strong class="small">{{ order.materialsWarehouse?.name }} ← {{ order.warehouse?.name }}</strong>
          <small>دفعة الناتج: {{ order.outputLotNumber || order.number }}</small>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">المواعيد</span>
          <strong class="small">{{ order.plannedStartDate ? formatDate(order.plannedStartDate) : "—" }} ← {{ order.plannedEndDate ? formatDate(order.plannedEndDate) : "—" }}</strong>
          <small v-if="order.startedAt">بدأ {{ formatDateTime(order.startedAt) }}</small>
        </div>
      </div>

      <!-- ─── الخامات ─── -->
      <section class="card section">
        <h3 class="section__title"><Boxes :size="18" /> الخامات</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr><th>الخامة</th><th>المخطط</th><th>المصروف</th><th>المردود</th><th>الصافي</th><th>التكلفة</th></tr>
            </thead>
            <tbody>
              <tr v-for="m in order.materials" :key="m.id">
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ m.product?.name }}</span>
                    <span class="doc-cell__sub">{{ m.product?.sku }}<template v-if="m.operationSequence"> · خطوة {{ m.operationSequence }}</template></span>
                  </div>
                </td>
                <td class="doc-num">{{ formatNumber(m.plannedQuantity) }} {{ m.product?.baseUnit?.name }}</td>
                <td class="doc-num">{{ formatNumber(m.issuedQuantity) }}</td>
                <td class="doc-num">{{ formatNumber(m.returnedQuantity) }}</td>
                <td class="doc-num" :class="net(m) > m.plannedQuantity + 1e-9 ? 'doc-num--out' : 'doc-num--strong'">
                  {{ formatNumber(net(m)) }}
                </td>
                <td class="doc-money">{{ formatCurrency(m.cost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ─── الخطوات ─── -->
      <section v-if="order.operations?.length" class="card section">
        <h3 class="section__title"><Cog :size="18" /> خطوات التصنيع</h3>
        <div class="operations">
          <div v-for="op in order.operations" :key="op.id" class="operation">
            <div class="operation__head">
              <div>
                <strong>{{ op.sequence }} · {{ op.name }}</strong>
                <span class="doc-cell__sub"> — {{ op.workCenter?.name }}</span>
              </div>
              <span :class="['badge', `doc-status--${OPERATION_STATUS[op.status].tone}`]">{{ OPERATION_STATUS[op.status].label }}</span>
            </div>
            <div class="operation__nums">
              <span>تجهيز {{ formatMinutes(op.actualSetupMinutes) }} / {{ formatMinutes(op.plannedSetupMinutes) }}</span>
              <span>تشغيل {{ formatMinutes(op.actualRunMinutes) }} / {{ formatMinutes(op.plannedRunMinutes) }}</span>
              <span :class="{ 'doc-num--out': op.downtimeMinutes > 0 }">توقف {{ formatMinutes(op.downtimeMinutes) }}</span>
              <span>أنجز {{ formatNumber(op.quantityDone) }}<template v-if="op.quantityScrapped"> · رُفض {{ formatNumber(op.quantityScrapped) }}</template></span>
            </div>
            <p v-if="op.instructions" class="operation__note">{{ op.instructions }}</p>
            <div v-if="active && op.status !== 'done'" v-can="'execute_production'" class="operation__actions">
              <template v-if="openWork(op.id)">
                <span class="live"><span class="live__dot" /> {{ TIME_KIND_LABELS[openWork(op.id)!.kind] }} منذ {{ since(openWork(op.id)!.startedAt) }}</span>
                <button class="btn btn--sm btn--primary" @click="openStop(openWork(op.id)!)">إيقاف وتسجيل الإنجاز</button>
              </template>
              <template v-else>
                <button class="btn btn--sm btn--ghost" :disabled="busy" @click="start(op.id, 'setup')"><Wrench :size="14" /> بدء التجهيز</button>
                <button class="btn btn--sm btn--primary" :disabled="busy" @click="start(op.id, 'run')"><Play :size="14" /> بدء التشغيل</button>
              </template>
              <template v-if="openDowntime(op.id)">
                <span class="live live--down"><span class="live__dot" /> توقف: {{ DOWNTIME_REASONS[openDowntime(op.id)!.downtimeReason!] }} منذ {{ since(openDowntime(op.id)!.startedAt) }}</span>
                <button class="btn btn--sm btn--danger" :disabled="busy" @click="stop(openDowntime(op.id)!.id, {})">إنهاء التوقف</button>
              </template>
              <button v-else class="btn btn--sm btn--ghost" @click="openDown(op.id)"><CirclePause :size="14" /> تسجيل توقف</button>
              <button class="btn btn--sm btn--ghost" @click="openManual(op.id)"><Clock :size="14" /> وقت يدوي</button>
              <button class="btn btn--sm btn--ghost" :disabled="busy" @click="run(() => store.finishOperation(order!.id, op.id), 'انتهت الخطوة')">
                <CircleCheck :size="14" /> إنهاء الخطوة
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ─── المنتجات الثانوية ─── -->
      <section v-if="order.byproducts?.length" class="card section">
        <h3 class="section__title">منتجات ثانوية</h3>
        <div v-for="b in order.byproducts" :key="b.id" class="byproduct">
          <span>{{ b.product?.name }}</span>
          <span class="doc-num">{{ formatNumber(b.receivedQuantity) }} / {{ formatNumber(b.plannedQuantity) }}</span>
          <span class="doc-money">{{ formatCurrency(b.value) }}</span>
        </div>
      </section>

      <!-- ─── التكلفة النهائية ─── -->
      <section v-if="order.status === 'completed'" class="card section">
        <h3 class="section__title"><Calculator :size="18" /> التكلفة الفعلية مقابل المخططة</h3>
        <div class="doc-totals doc-totals--box">
          <div><span>الخامات</span><span>{{ formatCurrency(order.materialCost) }} <small>(مخطط {{ formatCurrency(order.plannedMaterialCost) }})</small></span></div>
          <div><span>العمالة والتشغيل</span><span>{{ formatCurrency(order.laborCost) }} <small>(مخطط {{ formatCurrency(order.plannedLaborCost) }})</small></span></div>
          <div><span>غير مباشرة</span><span>{{ formatCurrency(order.overheadCost) }} <small>(مخطط {{ formatCurrency(order.plannedOverheadCost) }})</small></span></div>
          <div v-if="order.byproductValue"><span>منتجات ثانوية</span><span>-{{ formatCurrency(order.byproductValue) }}</span></div>
          <div v-if="order.varianceValue"><span>فروقات الإنتاج</span><span class="doc-num--out">{{ formatCurrency(order.varianceValue) }}</span></div>
          <div class="is-grand"><span>دخل المخزون</span><span>{{ formatCurrency(order.receivedValue) }}</span></div>
        </div>
      </section>

      <!-- ─── السجل ─── -->
      <section class="card section">
        <h3 class="section__title"><History :size="18" /> سجل الأمر</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>الوقت</th><th>الحدث</th><th>التفاصيل</th><th>القيمة</th></tr></thead>
            <tbody>
              <tr v-for="row in history" :key="row.key">
                <td class="doc-num">{{ formatDateTime(row.at) }}</td>
                <td>{{ row.label }}</td>
                <td>{{ row.details }}</td>
                <td class="doc-money">{{ row.value !== null ? formatCurrency(row.value) : "" }}</td>
              </tr>
              <tr v-if="!history.length"><td colspan="4" class="doc-lines__empty">لا أحداث بعد</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ══ صرف الخامات ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="issueRows" class="modal-overlay" @click.self="issueRows = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3><PackageMinus :size="20" class="doc-modal__icon" /> {{ issueMode === "issue" ? "صرف خامات" : "ردّ خامات للمخزن" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="issueRows = null"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitIssue">
              <div class="doc-note">
                <Info :size="16" />
                <span v-if="issueMode === 'issue'">الكمية المقترحة = المتبقي من المخطط. الصنف المتتبع يُصرف من الأقرب انتهاءً إلا إن اخترت دفعة.</span>
                <span v-else>يعود بتكلفة صرفه وإلى دفعاته نفسها.</span>
              </div>
              <div class="doc-lines" style="--doc-cols: 2fr 1fr 1.4fr">
                <div class="doc-lines__head"><span>الخامة</span><span>الكمية</span><span>{{ issueMode === "issue" ? "الدفعة" : "" }}</span></div>
                <div v-for="row in issueRows" :key="row.productId" class="doc-lines__row">
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ row.name }}</span>
                    <span class="doc-cell__sub">{{ issueMode === "issue" ? "المتبقي" : "صافي المصروف" }} {{ formatNumber(row.max) }}</span>
                  </div>
                  <StbNumberInput v-model.number="row.quantity" class="form-input" min="0" step="any" />
                  <div>
                    <select v-if="issueMode === 'issue' && row.lots.length" v-model="row.lotId" class="form-select">
                      <option value="">الأقرب انتهاءً</option>
                      <option v-for="l in row.lots" :key="l.lotId" :value="l.lotId">
                        {{ l.lotNumber }} ({{ formatNumber(l.quantity) }}){{ l.expiryDate ? ` — ${formatDate(l.expiryDate)}` : "" }}{{ l.expired ? " منتهية" : "" }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>ملاحظة</label>
                <input v-model.trim="issueNote" class="form-input" maxlength="500" />
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="issueRows = null">إلغاء</button>
                <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': busy }" :disabled="busy">تنفيذ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ الاستلام / الإكمال ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="outputForm" class="modal-overlay" @click.self="outputForm = null">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3><PackagePlus :size="20" class="doc-modal__icon" /> {{ outputForm.final ? "إكمال الأمر" : "استلام إنتاج جزئي" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="outputForm = null"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitOutput">
              <div v-if="outputForm.final" class="doc-note">
                <Info :size="16" />
                <span>الاستلام الأخير: تُغلق الخطوات والوقت المفتوح، وتُحسب التكلفة الفعلية كاملة ويحملها هذا الاستلام. لا تغيير على الأمر بعده.</span>
              </div>
              <div class="doc-grid">
                <div class="form-group">
                  <label>الكمية الجيدة {{ outputForm.final ? "" : "*" }}</label>
                  <StbNumberInput v-model.number="outputForm.quantity" class="form-input" min="0" step="any" :required="!outputForm.final" />
                </div>
                <div class="form-group">
                  <label>المرفوض</label>
                  <StbNumberInput v-model.number="outputForm.scrapQuantity" class="form-input" min="0" step="any" />
                </div>
                <div v-if="Number(outputForm.scrapQuantity) > 0" class="form-group doc-grid__full">
                  <label>سبب الرفض *</label>
                  <select v-model="outputForm.scrapReason" class="form-select" required>
                    <option v-for="(label, key) in SCRAP_REASONS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>رقم الدفعة</label>
                  <input v-model.trim="outputForm.lotNumber" class="form-input" dir="ltr" :placeholder="order?.outputLotNumber || order?.number" />
                </div>
                <div class="form-group">
                  <label>تاريخ الانتهاء</label>
                  <StbDateInput v-model="outputForm.expiryDate" class="form-input" title="فارغ = من مدة الصلاحية" />
                </div>
              </div>
              <template v-if="outputForm.final && order?.byproducts?.length">
                <h4 class="doc-section__title">المنتجات الثانوية الفعلية</h4>
                <div v-for="b in outputForm.byproducts" :key="b.productId" class="byproduct">
                  <span>{{ b.name }}</span>
                  <StbNumberInput v-model.number="b.quantity" class="form-input" min="0" step="any" />
                </div>
              </template>
              <div class="form-group">
                <label>ملاحظة</label>
                <input v-model.trim="outputForm.note" class="form-input" maxlength="500" />
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="outputForm = null">إلغاء</button>
                <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': busy }" :disabled="busy">
                  {{ outputForm.final ? "إكمال واعتماد التكلفة" : "استلام" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ الوقت: إيقاف / توقف / يدوي ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="timeForm" class="modal-overlay" @click.self="timeForm = null">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3><Clock :size="20" class="doc-modal__icon" /> {{ TIME_TITLES[timeForm.mode] }}</h3>
              <button class="btn btn--icon btn--ghost" @click="timeForm = null"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submitTime">
              <div class="doc-grid">
                <div v-if="timeForm.mode === 'manual'" class="form-group">
                  <label>النوع</label>
                  <select v-model="timeForm.kind" class="form-select">
                    <option v-for="(label, key) in TIME_KIND_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div v-if="timeForm.mode === 'manual'" class="form-group">
                  <label>الدقائق *</label>
                  <StbNumberInput v-model.number="timeForm.minutes" class="form-input" min="0.01" step="any" required />
                </div>
                <div v-if="timeForm.mode === 'down' || (timeForm.mode === 'manual' && timeForm.kind === 'downtime')" class="form-group doc-grid__full">
                  <label>سبب التوقف *</label>
                  <select v-model="timeForm.downtimeReason" class="form-select" required>
                    <option v-for="(label, key) in DOWNTIME_REASONS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <template v-if="timeForm.mode !== 'down' && timeForm.kind !== 'downtime'">
                  <div class="form-group">
                    <label>أُنجز (جيد)</label>
                    <StbNumberInput v-model.number="timeForm.quantity" class="form-input" min="0" step="any" />
                  </div>
                  <div class="form-group">
                    <label>رُفض</label>
                    <StbNumberInput v-model.number="timeForm.scrapQuantity" class="form-input" min="0" step="any" />
                  </div>
                  <div v-if="Number(timeForm.scrapQuantity) > 0" class="form-group doc-grid__full">
                    <label>سبب الرفض *</label>
                    <select v-model="timeForm.scrapReason" class="form-select" required>
                      <option v-for="(label, key) in SCRAP_REASONS" :key="key" :value="key">{{ label }}</option>
                    </select>
                  </div>
                </template>
                <div v-if="timeForm.mode !== 'stop'" class="form-group doc-grid__full">
                  <label>العامل</label>
                  <input v-model.trim="timeForm.operatorName" class="form-input" maxlength="150" placeholder="اختياري" />
                </div>
                <div class="form-group doc-grid__full">
                  <label>ملاحظة</label>
                  <input v-model.trim="timeForm.note" class="form-input" maxlength="500" />
                </div>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="timeForm = null">إلغاء</button>
                <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': busy }" :disabled="busy">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showCancel"
      title="إلغاء أمر الإنتاج"
      message="الأمر الذي صُرفت له خامات لا يُلغى إلا بعد ردّها. متأكد؟"
      confirm-text="إلغاء الأمر"
      :loading="busy"
      @confirm="cancelOrder"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  ArrowRight,
  Boxes,
  Calculator,
  CircleCheck,
  CirclePause,
  Clock,
  Cog,
  History,
  Info,
  PackageMinus,
  PackagePlus,
  Play,
  Undo2,
  Wrench,
  X,
} from "lucide-vue-next";
import { useManufacturingStore } from "@/stores/manufacturing";
import { useToast } from "@/composables/useToast";
import {
  DOWNTIME_REASONS,
  OPERATION_STATUS,
  PRODUCTION_STATUS,
  SCRAP_REASONS,
  TIME_KIND_LABELS,
  formatMinutes,
} from "@/utils/manufacturing";
import type {
  AvailableLot,
  DowntimeReason,
  ProductionMaterial,
  ProductionOrder,
  ProductionTimeLog,
  ScrapReason,
  TimeLogKind,
} from "@/types/manufacturing";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const store = useManufacturingStore();
const toast = useToast();
const order = ref<ProductionOrder | null>(null);
const busy = ref(false);
const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval> | null = null;

const id = computed(() => String(route.params.id));
const unit = computed(() => order.value?.product?.baseUnit?.name ?? "");
const active = computed(() =>
  ["released", "in_progress"].includes(order.value?.status ?? ""),
);
const plannedTotal = computed(() =>
  order.value
    ? order.value.plannedMaterialCost + order.value.plannedLaborCost + order.value.plannedOverheadCost
    : 0,
);
const actualTotal = computed(() =>
  !order.value
    ? 0
    : order.value.status === "completed"
      ? order.value.materialCost + order.value.laborCost + order.value.overheadCost - order.value.byproductValue
      : (order.value.costToDate?.total ?? 0),
);
const net = (m: ProductionMaterial) => m.issuedQuantity - m.returnedQuantity;

const load = async () => {
  try {
    order.value = await store.getOrder(id.value);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الأمر"));
  }
};

const run = async (action: () => Promise<ProductionOrder>, message: string) => {
  busy.value = true;
  try {
    order.value = await action();
    toast.success(message);
    return true;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تنفيذ العملية"));
    return false;
  } finally {
    busy.value = false;
  }
};

// ─── الوقت ───
const openLogs = computed(() => (order.value?.timeLogs ?? []).filter((l) => !l.endedAt));
const openWork = (operationId: string) =>
  openLogs.value.find((l) => l.operationId === operationId && l.kind !== "downtime");
const openDowntime = (operationId: string) =>
  openLogs.value.find((l) => l.operationId === operationId && l.kind === "downtime");
const since = (at: string) => formatMinutes((now.value - new Date(at).getTime()) / 60000);

const start = (operationId: string, kind: TimeLogKind) =>
  run(() => store.startTime(id.value, { operationId, kind }), kind === "setup" ? "بدأ التجهيز" : "بدأ التشغيل");
const stop = (logId: string, body: Parameters<typeof store.stopTime>[2]) =>
  run(() => store.stopTime(id.value, logId, body), "سُجّل الوقت");

const TIME_TITLES = { stop: "إيقاف وتسجيل الإنجاز", down: "تسجيل توقف", manual: "تسجيل وقت يدوي" };
interface TimeForm {
  mode: "stop" | "down" | "manual";
  operationId: string;
  logId?: string;
  kind: TimeLogKind;
  minutes: number | "";
  downtimeReason: DowntimeReason;
  quantity: number | "";
  scrapQuantity: number | "";
  scrapReason: ScrapReason;
  operatorName: string;
  note: string;
}
const timeForm = ref<TimeForm | null>(null);
const baseTime = (operationId: string, mode: TimeForm["mode"], kind: TimeLogKind): TimeForm => ({
  mode,
  operationId,
  kind,
  minutes: "",
  downtimeReason: "breakdown",
  quantity: "",
  scrapQuantity: "",
  scrapReason: "defect",
  operatorName: "",
  note: "",
});
const openStop = (log: ProductionTimeLog) => {
  timeForm.value = { ...baseTime(log.operationId, "stop", log.kind), logId: log.id };
};
const openDown = (operationId: string) => (timeForm.value = baseTime(operationId, "down", "downtime"));
const openManual = (operationId: string) => (timeForm.value = baseTime(operationId, "manual", "run"));

const submitTime = async () => {
  const f = timeForm.value!;
  const produced = {
    quantity: Number(f.quantity) || undefined,
    scrapQuantity: Number(f.scrapQuantity) || undefined,
    scrapReason: Number(f.scrapQuantity) > 0 ? f.scrapReason : undefined,
    note: f.note || undefined,
  };
  const ok =
    f.mode === "stop"
      ? await stop(f.logId!, produced)
      : f.mode === "down"
        ? await run(
            () =>
              store.startTime(id.value, {
                operationId: f.operationId,
                kind: "downtime",
                downtimeReason: f.downtimeReason,
                operatorName: f.operatorName || undefined,
                note: f.note || undefined,
              }),
            "بدأ تسجيل التوقف",
          )
        : await run(
            () =>
              store.manualTime(id.value, {
                operationId: f.operationId,
                kind: f.kind,
                minutes: Number(f.minutes),
                downtimeReason: f.kind === "downtime" ? f.downtimeReason : undefined,
                operatorName: f.operatorName || undefined,
                ...(f.kind === "downtime" ? { note: f.note || undefined } : produced),
              }),
            "سُجّل الوقت",
          );
  if (ok) timeForm.value = null;
};

// ─── الصرف والردّ ───
interface IssueRow {
  productId: string;
  name: string;
  max: number;
  quantity: number | "";
  lotId: string;
  lots: AvailableLot[];
}
const issueRows = ref<IssueRow[] | null>(null);
const issueMode = ref<"issue" | "return">("issue");
const issueNote = ref("");

const openIssue = async () => {
  if (!order.value) return;
  issueMode.value = "issue";
  issueNote.value = "";
  const rows = (order.value.materials ?? []).map((m) => {
    const remaining = Math.max(m.plannedQuantity - net(m), 0);
    return {
      productId: m.productId,
      name: m.product?.name ?? "",
      max: remaining,
      quantity: Number(remaining.toFixed(4)) as number | "",
      lotId: "",
      lots: [] as AvailableLot[],
    };
  });
  issueRows.value = rows;
  // دفعات الأصناف المتتبعة (للاختيار اليدوي)
  for (const row of rows) {
    const material = order.value.materials?.find((m) => m.productId === row.productId);
    if (!(material?.product as { trackLots?: boolean } | undefined)?.trackLots) continue;
    store
      .availableLots(row.productId, order.value.materialsWarehouseId)
      .then((lots) => (row.lots = lots))
      .catch(() => {});
  }
};

const openReturn = () => {
  if (!order.value) return;
  issueMode.value = "return";
  issueNote.value = "";
  issueRows.value = (order.value.materials ?? [])
    .filter((m) => net(m) > 0)
    .map((m) => ({
      productId: m.productId,
      name: m.product?.name ?? "",
      max: net(m),
      quantity: "",
      lotId: "",
      lots: [],
    }));
  if (!issueRows.value.length) {
    issueRows.value = null;
    toast.error("لا خامات مصروفة لردّها");
  }
};

const submitIssue = async () => {
  const lines = (issueRows.value ?? [])
    .filter((r) => Number(r.quantity) > 0)
    .map((r) => ({
      productId: r.productId,
      quantity: Number(r.quantity),
      ...(r.lotId ? { lotId: r.lotId } : {}),
    }));
  if (!lines.length) return toast.error("أدخل كمية واحدة على الأقل");
  const ok =
    issueMode.value === "issue"
      ? await run(() => store.issue(id.value, lines, issueNote.value || undefined), "صُرفت الخامات")
      : await run(
          () =>
            store.returnMaterials(
              id.value,
              lines.map(({ productId, quantity }) => ({ productId, quantity })),
              issueNote.value || undefined,
            ),
          "رُدّت الخامات",
        );
  if (ok) issueRows.value = null;
};

// ─── الاستلام ───
const outputForm = ref<{
  final: boolean;
  quantity: number | "";
  scrapQuantity: number | "";
  scrapReason: ScrapReason;
  lotNumber: string;
  expiryDate: string;
  note: string;
  byproducts: { productId: string; name: string; quantity: number | "" }[];
} | null>(null);

const openOutput = (final: boolean) => {
  if (!order.value) return;
  const remaining = Math.max(order.value.plannedQuantity - order.value.producedQuantity, 0);
  outputForm.value = {
    final,
    quantity: final ? Number(remaining.toFixed(4)) : "",
    scrapQuantity: "",
    scrapReason: "defect",
    lotNumber: "",
    expiryDate: order.value.outputExpiryDate ?? "",
    note: "",
    byproducts: (order.value.byproducts ?? []).map((b) => ({
      productId: b.productId,
      name: b.product?.name ?? "",
      quantity: Math.max(b.plannedQuantity - b.receivedQuantity, 0),
    })),
  };
};

const submitOutput = async () => {
  const f = outputForm.value!;
  const ok = await run(
    () =>
      store.output(id.value, {
        quantity: Number(f.quantity) || 0,
        scrapQuantity: Number(f.scrapQuantity) || undefined,
        scrapReason: Number(f.scrapQuantity) > 0 ? f.scrapReason : undefined,
        lotNumber: f.lotNumber || undefined,
        expiryDate: f.expiryDate || undefined,
        final: f.final,
        byproducts: f.final
          ? f.byproducts.map((b) => ({ productId: b.productId, quantity: Number(b.quantity) || 0 }))
          : undefined,
        note: f.note || undefined,
      }),
    f.final ? "اكتمل الأمر وحُسبت تكلفته الفعلية" : "استُلم الإنتاج",
  );
  if (ok) outputForm.value = null;
};

const showCancel = ref(false);
const cancelOrder = async () => {
  if (await run(() => store.cancel(id.value), "أُلغي الأمر")) showCancel.value = false;
};

// ─── السجل: الصرف والاستلام والوقت بترتيب زمني ───
const history = computed(() => {
  if (!order.value) return [];
  const opName = (operationId: string) =>
    order.value?.operations?.find((o) => o.id === operationId)?.name ?? "";
  const tx = (order.value.transactions ?? []).map((t) => ({
    key: t.id,
    at: t.occurredAt,
    label: { issue: "صرف خامات", return: "ردّ خامات", output: "استلام إنتاج" }[t.type],
    details:
      t.type === "output"
        ? `جيد ${formatNumber(t.quantity)}${t.scrapQuantity ? ` · مرفوض ${formatNumber(t.scrapQuantity)} (${SCRAP_REASONS[t.scrapReason ?? "other"]})` : ""}`
        : (t.note ?? ""),
    value: t.value as number | null,
  }));
  const logs = (order.value.timeLogs ?? []).map((l) => ({
    key: l.id,
    at: l.startedAt,
    label: `${TIME_KIND_LABELS[l.kind]} — ${opName(l.operationId)}`,
    details: [
      l.endedAt ? formatMinutes(l.minutes) : "جارٍ الآن",
      l.downtimeReason ? DOWNTIME_REASONS[l.downtimeReason] : "",
      l.quantity ? `أنجز ${formatNumber(l.quantity)}` : "",
      l.operatorName ?? "",
    ]
      .filter(Boolean)
      .join(" · "),
    value: null as number | null,
  }));
  return [...tx, ...logs].sort((a, b) => b.at.localeCompare(a.at));
});

onMounted(() => {
  load();
  ticker = setInterval(() => (now.value = Date.now()), 30_000);
});
onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker);
});
</script>

<style lang="scss" scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: $space-3;
  margin-bottom: $space-4;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  padding: $space-3 $space-4;
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-md;

  strong {
    font-size: $font-size-lg;

    &.small {
      font-size: $font-size-sm;
    }
  }

  small,
  .stat-card__label {
    color: $stb-text-muted;
    font-size: $font-size-xs;
  }
}

.progress {
  height: 6px;
  background: $stb-border;
  border-radius: 3px;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    background: $stb-success;
  }
}

.section {
  margin-bottom: $space-4;
  padding: $space-4;

  &__title {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-bottom: $space-3;
    font-size: $font-size-base;
  }
}

.operations {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.operation {
  padding: $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $space-2;
  }

  &__nums {
    display: flex;
    flex-wrap: wrap;
    gap: $space-4;
    margin-top: $space-2;
    font-size: $font-size-sm;
    color: $stb-text-secondary;
  }

  &__note {
    margin-top: $space-2;
    font-size: $font-size-sm;
    white-space: pre-line;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-2;
    margin-top: $space-3;
  }
}

.live {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  font-size: $font-size-sm;
  color: $stb-success;

  &--down {
    color: $stb-danger;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 1.2s infinite;
  }
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}

.byproduct {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: $space-2;
  align-items: center;
  padding: $space-1 0;
}
</style>
