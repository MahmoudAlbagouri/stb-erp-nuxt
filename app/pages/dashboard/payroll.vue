<!-- pages/payroll/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>مسيرات الرواتب</h1>
        <p>إدارة وتوليد وتصدير كشوف الرواتب الشهرية</p>
      </div>
      <div class="page-header__actions">
        <!-- <button
          class="btn btn--outline"
          @click="handleExport('excel')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
          <FileSpreadsheet v-else :size="16" />
          Excel
        </button>
        <button
          class="btn btn--outline"
          @click="handleExport('pdf')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
          <FileText v-else :size="16" />
          PDF
        </button> -->
        <button class="btn btn--primary" @click="showGenerateModal = true">
          <CalendarPlus :size="16" />
          توليد مسير جديد
        </button>
      </div>
    </div>

    <!-- ══ Stats Bar ════════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <FileText :size="13" />
        <span
          >إجمالي المسيرات: <strong>{{ store.payrolls.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--accent">
        <Banknote :size="13" />
        <span
          >آخر صافي:
          <strong>{{ formatCurrency(lastPayrollTotal) }}</strong></span
        >
      </div>
      <div class="stat-pill">
        <Clock :size="13" />
        <span
          >آخر تحديث: <strong>{{ todayLabel }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Summary Cards ════════════════════════════════════════════════════ -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-icon summary-icon--blue">
          <Banknote :size="22" />
        </div>
        <div class="summary-info">
          <div class="summary-value">
            {{ formatCurrency(lastPayrollTotal) }}
          </div>
          <div class="summary-label">
            صافي الرواتب — {{ lastPayrollPeriod }}
          </div>
        </div>
        <span
          v-if="salaryChange !== null"
          :class="[
            'summary-badge',
            salaryChange >= 0 ? 'badge--up' : 'badge--down',
          ]"
        >
          {{ salaryChange >= 0 ? "↑" : "↓" }}
          {{ Math.abs(salaryChange).toFixed(1) }}%
        </span>
      </div>

      <div class="summary-card">
        <div class="summary-icon summary-icon--green">
          <Users :size="22" />
        </div>
        <div class="summary-info">
          <div class="summary-value">{{ lastPayrollEmployees }}</div>
          <div class="summary-label">موظف نشط في المسير</div>
        </div>
        <span class="summary-badge badge--stable">مستقر</span>
      </div>

      <div class="summary-card">
        <div class="summary-icon summary-icon--amber">
          <CircleMinus :size="22" />
        </div>
        <div class="summary-info">
          <div class="summary-value">
            {{ formatCurrency(lastPayrollDeductions) }}
          </div>
          <div class="summary-label">إجمالي الخصومات</div>
        </div>
        <span class="summary-badge badge--warn">يستحق المراجعة</span>
      </div>
    </div>

    <!-- ══ Filters ══════════════════════════════════════════════════════════ -->
    <div class="card filters-card">
      <!-- <div class="filters-row">
        <select v-model.number="filterYear" class="form-select status-select">
          <option value="">كل السنوات</option>
          <option v-for="y in availableYears" :key="y" :value="y">
            {{ y }}
          </option>
        </select>

        <select
          v-if="filterYear"
          v-model.number="filterMonth"
          class="form-select status-select"
        >
          <option value="">كل الشهور</option>
          <option v-for="m in 12" :key="m" :value="m">
            {{ getMonthName(m) }}
          </option>
        </select>

        <div class="spacer"></div>

        <button
          v-if="filteredPayrolls.length > 0"
          class="btn btn--outline"
          @click="handleExport('excel')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
          <FileSpreadsheet v-else :size="15" />
          تصدير Excel
        </button>

        <button
          v-if="filteredPayrolls.length > 0"
          class="btn btn--outline"
          @click="handleExport('pdf')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
          <FileText v-else :size="15" />
          تصدير PDF
        </button>
      </div> -->
    </div>

    <!-- ══ Loading ══════════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="loading-grid">
      <div v-for="i in 4" :key="i" class="payroll-card payroll-card--skeleton">
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line-sm"></div>
      </div>
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!filteredPayrolls.length" class="empty-wrapper">
      <div class="empty-state">
        <div class="empty-state__illustration">
          <FileText :size="32" />
        </div>
        <div class="empty-state__title">لا توجد مسيرات رواتب</div>
        <div class="empty-state__text">
          {{
            filterYear
              ? "لا توجد نتائج للفترة المحددة"
              : "ابدأ بتوليد أول مسير رواتب للشركة"
          }}
        </div>
        <button
          v-if="!filterYear"
          class="btn btn--primary mt-4"
          @click="showGenerateModal = true"
        >
          <CalendarPlus :size="15" />
          توليد مسير جديد
        </button>
      </div>
    </div>

    <!-- ══ Payroll Grid ══════════════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div
        v-for="payroll in filteredPayrolls"
        :key="payroll.id"
        class="payroll-card"
        @click="openDetail(payroll)"
      >
        <!-- Card Header -->
        <div class="payroll-card__header">
          <div class="payroll-icon">
            <CalendarDays :size="22" />
          </div>
          <div class="payroll-card__meta">
            <h3>{{ getMonthName(payroll.month) }} {{ payroll.year }}</h3>
            <span class="payroll-card__sub"
              >تم التوليد: {{ formatDate(payroll.generatedAt) }}</span
            >
          </div>
          <span
            :class="[
              'payroll-badge',
              (payroll as any).status === 'finalized'
                ? 'payroll-badge--final'
                : 'payroll-badge--draft',
            ]"
          >
            <span class="dot"></span>
            {{ (payroll as any).status === "finalized" ? "مُعتمد" : "مسودة" }}
          </span>
        </div>

        <!-- Card Body -->
        <div class="payroll-card__body">
          <div class="payroll-stat">
            <span class="label">
              <Banknote :size="12" />
              إجمالي الصافي
            </span>
            <span class="value value--accent">{{
              formatCurrency(payroll.totalNetSalary)
            }}</span>
          </div>

          <div class="payroll-stat">
            <span class="label">
              <Users :size="12" />
              عدد الموظفين
            </span>
            <span class="value value--success"
              >{{ payroll.items?.length ?? "—" }} موظف</span
            >
          </div>

          <div class="payroll-stat">
            <span class="label">
              <CircleMinus :size="12" />
              إجمالي الخصومات
            </span>
            <span class="value value--danger">{{
              formatCurrency((payroll as any).totalDeductions ?? 0)
            }}</span>
          </div>

          <div class="payroll-stat">
            <span class="label">
              <Clock :size="12" />
              تاريخ الصرف
            </span>
            <span class="value">{{ formatDate(payroll.paymentDate) }}</span>
          </div>

          <!-- Progress bar -->
          <div class="payroll-progress">
            <div
              class="payroll-progress__fill"
              :style="{ width: payrollProgressPct(payroll) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="payroll-card__footer" @click.stop>
          <span class="payroll-card__pct"
            >{{ payrollProgressPct(payroll) }}% من الحد الأقصى</span
          >
          <div class="export-btns">
            <button
              class="btn btn--ghost btn--sm"
              @click="handleExportForItem('excel', payroll)"
            >
              <FileSpreadsheet :size="13" /> Excel
            </button>
            <button
              class="btn btn--accent-outline btn--sm"
              @click="handleExportForItem('pdf', payroll)"
            >
              <FileText :size="13" /> PDF
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Generate Modal ═══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showGenerateModal"
          class="modal-overlay"
          @click.self="showGenerateModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>توليد مسير رواتب جديد</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showGenerateModal = false"
              >
                <X :size="18" />
              </button>
            </div>

            <form @submit.prevent="handleGenerate" class="modal-form">
              <div class="form-group">
                <label>السنة *</label>
                <select
                  v-model.number="genForm.year"
                  class="form-select"
                  required
                >
                  <option
                    v-for="y in [currentYear, currentYear - 1]"
                    :key="y"
                    :value="y"
                  >
                    {{ y }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>الشهر *</label>
                <select
                  v-model.number="genForm.month"
                  class="form-select"
                  required
                >
                  <option v-for="m in 12" :key="m" :value="m">
                    {{ getMonthName(m) }}
                  </option>
                </select>
              </div>

              <div class="alert-info">
                <Info :size="14" />
                <span
                  >سيتم حساب الرواتب بناءً على بيانات الموظفين النشطين والخصومات
                  المستحقة لهذا الشهر فقط.</span
                >
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showGenerateModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="generating"
                >
                  <span v-if="generating" class="spinner" />
                  <span v-else>تأكيد التوليد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { usePayrollStore } from "@/stores/payroll";
import { useToast } from "@/composables/useToast";
import type { Payroll } from "@/stores/payroll";

import {
  CalendarDays,
  CalendarPlus,
  Banknote,
  FileSpreadsheet,
  FileText,
  Users,
  CircleMinus,
  Clock,
  Info,
  X,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = usePayrollStore();
const toast = useToast();

// ─── Filters ─────────────────────────────────────────────────────────────────
const filterYear = ref<number | "">("");
const filterMonth = ref<number | "">("");

const currentYear = new Date().getFullYear();
const availableYears = computed(() => {
  const years = new Set<number>();
  store.payrolls.forEach((p) => years.add(p.year));
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
});

const filteredPayrolls = computed(() =>
  store.payrolls.filter((p) => {
    const matchYear = !filterYear.value || p.year === filterYear.value;
    const matchMonth = !filterMonth.value || p.month === filterMonth.value;
    return matchYear && matchMonth;
  }),
);

// ─── Summary computeds ───────────────────────────────────────────────────────
const lastPayroll = computed(() => store.payrolls[0]);
const lastPayrollTotal = computed(() => lastPayroll.value?.totalNetSalary ?? 0);
const lastPayrollPeriod = computed(() =>
  lastPayroll.value
    ? `${getMonthName(lastPayroll.value.month)} ${lastPayroll.value.year}`
    : "—",
);
const lastPayrollEmployees = computed(
  () => lastPayroll.value?.items?.length ?? "—",
);

const lastPayrollDeductions = computed(
  () => (lastPayroll.value as any)?.totalDeductions ?? 0,
);

const salaryChange = computed(() => {
  if (store.payrolls.length < 2) return null;
  const cur = Number(store.payrolls[0]?.totalNetSalary ?? 0);
  const prev = Number(store.payrolls[1]?.totalNetSalary ?? 0);
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
});

const todayLabel = new Date().toLocaleDateString("ar-SA");

// ─── Progress bar ────────────────────────────────────────────────────────────
const MAX_NET = computed(() => {
  const vals = store.payrolls.map((p) => Number(p.totalNetSalary));
  return Math.max(...vals, 1);
});

const payrollProgressPct = (p: Payroll) =>
  Math.round((Number(p.totalNetSalary) / MAX_NET.value) * 100);

// ─── Export ──────────────────────────────────────────────────────────────────
const exporting = ref<"excel" | "pdf" | null>(null);

const handleExport = async (type: "excel" | "pdf") => {
  if (!filterYear.value) {
    toast.error("يرجى تحديد السنة أولاً للتصدير");
    return;
  }
  exporting.value = type;
  try {
    const targetMonth = filterMonth.value || filteredPayrolls.value[0]?.month;
    if (!targetMonth) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    await store.exportData(type, targetMonth, filterYear.value as number);
    toast.success(`تم تصدير ${type === "excel" ? "Excel" : "PDF"} بنجاح`);
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  } finally {
    exporting.value = null;
  }
};

const handleExportForItem = async (type: "excel" | "pdf", payroll: Payroll) => {
  exporting.value = type;
  try {
    await store.exportData(type, payroll.month, payroll.year);
    toast.success("تم التصدير بنجاح");
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    exporting.value = null;
  }
};

// ─── Generate Modal ──────────────────────────────────────────────────────────
const showGenerateModal = ref(false);
const generating = ref(false);
const genForm = reactive({
  year: currentYear,
  month: new Date().getMonth() + 1,
});

const handleGenerate = async () => {
  generating.value = true;
  try {
    await store.generate(genForm.month, genForm.year);
    toast.success("تم توليد مسير الرواتب بنجاح");
    showGenerateModal.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    generating.value = false;
  }
};

// ─── Detail ──────────────────────────────────────────────────────────────────
const openDetail = (payroll: Payroll) =>
  navigateTo(`/dashboard/payroll/${payroll.id}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getMonthName = (m: number) =>
  [
    "",
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ][m] ?? "";

const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("ar-SA") : "—";

const formatCurrency = (val: string | number) =>
  Number(val).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ر.س";

// ─── Init ────────────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

// ── Stats Bar ──────────────────────────────────────────────────────────────
.stats-bar {
  display: flex;
  gap: $space-3;
  flex-wrap: wrap;
  margin-bottom: $space-4;
}

.stat-pill {
  @include flex(row, center, flex-start, $space-2);
  padding: $space-2 $space-3;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $stb-text-secondary;

  strong {
    color: $stb-text-primary;
    font-weight: 700;
  }

  &--accent {
    border-color: rgba($stb-accent, 0.3);
    strong {
      color: $stb-accent;
    }
  }
}

// ── Summary Cards ──────────────────────────────────────────────────────────
.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-4;
  margin-bottom: $space-5;

  @include respond-to("lg") {
    grid-template-columns: repeat(2, 1fr);
  }
  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}

.summary-card {
  @include glass-card;
  padding: $space-5;
  @include flex(row, center, flex-start, $space-4);
  transition: all $transition-base;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba($stb-accent, 0.25);
    box-shadow:
      0 0 14px rgba($stb-accent, 0.08),
      $shadow-card;
  }
}

.summary-icon {
  width: 46px;
  height: 46px;
  border-radius: $radius-lg;
  @include flex(row, center, center);
  flex-shrink: 0;

  &--blue {
    background: rgba($stb-primary, 0.15);
    color: $stb-accent;
  }
  &--green {
    background: rgba($stb-success, 0.12);
    color: $stb-success;
  }
  &--amber {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
  }
}

.summary-info {
  flex: 1;
  min-width: 0;
}

.summary-value {
  font-size: $font-size-xl;
  font-weight: 800;
  color: $stb-text-primary;
  line-height: 1.2;
}

.summary-label {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  margin-top: $space-1;
}

.summary-badge {
  font-size: 0.688rem;
  font-weight: 600;
  padding: $space-1 $space-2;
  border-radius: $radius-full;
  white-space: nowrap;
  flex-shrink: 0;

  &.badge--up {
    background: rgba($stb-success, 0.12);
    color: $stb-success;
  }
  &.badge--down {
    background: rgba($stb-danger, 0.12);
    color: $stb-danger;
  }
  &.badge--stable {
    background: rgba($stb-accent, 0.1);
    color: $stb-accent;
  }
  &.badge--warn {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
  }
}

// ── Filters Card ───────────────────────────────────────────────────────────
.filters-card {
  padding: $space-4 $space-5;
  margin-bottom: $space-5;
}

.filters-row {
  @include flex(row, center, flex-start, $space-3);
  width: 100%;
  flex-wrap: wrap;

  @include respond-to("md") {
    flex-direction: column;
    align-items: stretch;
  }
}

.status-select {
  width: 150px;
  @include respond-to("md") {
    width: 100%;
  }
}

.spacer {
  flex: 1;
}

// ── Loading ────────────────────────────────────────────────────────────────
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-4;
}

// ── Empty ──────────────────────────────────────────────────────────────────
.empty-wrapper {
  @include flex(row, center, center);
  min-height: 280px;
}

.empty-state {
  @include flex(column, center, center, $space-3);
  text-align: center;

  &__illustration {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: $stb-surface-2;
    border: 1px solid $stb-border;
    @include flex(row, center, center);
    color: $stb-text-muted;
    opacity: 0.55;
    margin-bottom: $space-2;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 700;
    color: $stb-text-secondary;
  }

  &__text {
    font-size: $font-size-sm;
    color: $stb-text-muted;
    max-width: 280px;
  }
}

// ── Payroll Grid ───────────────────────────────────────────────────────────
.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-4;
}

// ── Payroll Card ───────────────────────────────────────────────────────────
.payroll-card {
  @include glass-card;
  padding: 0;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all $transition-base;
  overflow: hidden;
  position: relative;

  // Accent top bar on hover
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: $gradient-accent;
    opacity: 0;
    transition: opacity $transition-base;
  }

  &:hover {
    transform: translateY(-3px);
    border-color: rgba($stb-accent, 0.35);
    box-shadow:
      0 0 16px rgba($stb-accent, 0.12),
      0 8px 24px rgba(0, 0, 0, 0.5);

    &::before {
      opacity: 1;
    }
  }

  // ── Card Header
  &__header {
    @include flex(row, center, flex-start, $space-3);
    padding: $space-5 $space-5 $space-4;
    border-bottom: 1px solid rgba($stb-border, 0.6);
    background: linear-gradient(
      180deg,
      rgba($stb-surface-2, 0.8) 0%,
      transparent 100%
    );
  }

  &__meta {
    flex: 1;
    min-width: 0;

    h3 {
      font-size: $font-size-base;
      font-weight: 700;
      color: $stb-text-primary;
      margin-bottom: 2px;
    }
  }

  &__sub {
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }

  // ── Card Body
  &__body {
    display: flex;
    flex-direction: column;
    padding: $space-4 $space-5;
    gap: 0;
    flex: 1;
  }

  // ── Card Footer
  &__footer {
    @include flex(row, center, space-between);
    padding: $space-3 $space-5;
    border-top: 1px solid rgba($stb-border, 0.5);
    background: rgba($stb-dark, 0.3);
  }

  &__pct {
    font-size: 0.688rem;
    color: $stb-text-muted;
  }

  // Skeleton state
  &--skeleton {
    @include flex(row, center, flex-start, $space-3);
    padding: $space-5;
    pointer-events: none;
    min-height: 80px;
  }
}

// ── Payroll Icon ───────────────────────────────────────────────────────────
.payroll-icon {
  width: 46px;
  height: 46px;
  border-radius: $radius-lg;
  background: rgba($stb-accent, 0.1);
  border: 1px solid rgba($stb-accent, 0.2);
  color: $stb-accent;
  @include flex(row, center, center);
  flex-shrink: 0;
}

// ── Payroll Badge (status) ─────────────────────────────────────────────────
.payroll-badge {
  @include flex(row, center, center, $space-1);
  padding: $space-1 $space-2;
  border-radius: $radius-full;
  font-size: 0.688rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  &--final {
    background: rgba($stb-success, 0.12);
    color: $stb-success;
    border: 1px solid rgba($stb-success, 0.2);
  }

  &--draft {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
    border: 1px solid rgba($stb-warning, 0.2);
  }
}

// ── Payroll Stat Row ───────────────────────────────────────────────────────
.payroll-stat {
  @include flex(row, center, space-between);
  padding: $space-2 + 0.125rem 0;
  border-bottom: 1px solid rgba($stb-border, 0.4);
  font-size: $font-size-xs;

  &:last-of-type {
    border-bottom: none;
  }

  .label {
    @include flex(row, center, flex-start, $space-1);
    color: $stb-text-muted;
  }

  .value {
    font-weight: 600;
    color: $stb-text-primary;

    &--accent {
      color: $stb-accent;
      font-size: $font-size-sm;
    }
    &--success {
      color: $stb-success;
    }
    &--danger {
      color: $stb-danger;
    }
  }
}

// ── Progress Bar ───────────────────────────────────────────────────────────
.payroll-progress {
  height: 3px;
  background: $stb-border;
  border-radius: $radius-full;
  overflow: hidden;
  margin-top: $space-3;

  &__fill {
    height: 100%;
    border-radius: $radius-full;
    background: $gradient-accent;
    transition: width 0.5s ease;
  }
}

// ── Export Buttons ─────────────────────────────────────────────────────────
.export-btns {
  @include flex(row, center, flex-end, $space-2);
}

.btn--accent-outline {
  background: transparent;
  color: $stb-accent;
  border: 1px solid rgba($stb-accent, 0.3);

  &:hover:not(:disabled) {
    background: rgba($stb-accent, 0.08);
    border-color: $stb-accent;
  }
}

// ── Alert Info ─────────────────────────────────────────────────────────────
.alert-info {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-3;
  background: rgba($stb-accent, 0.05);
  border: 1px solid rgba($stb-accent, 0.15);
  border-radius: $radius-md;
  font-size: $font-size-xs;
  color: $stb-text-secondary;

  svg {
    flex-shrink: 0;
    color: $stb-accent;
    margin-top: 1px;
  }
}

// ── Modal Form ─────────────────────────────────────────────────────────────
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-5;
}

// ── Skeleton ───────────────────────────────────────────────────────────────
.skeleton {
  background: linear-gradient(
    90deg,
    $stb-surface-2 25%,
    $stb-surface-3 50%,
    $stb-surface-2 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: $radius-md;

  &--line {
    height: 14px;
    width: 70%;
    margin-bottom: $space-2;
  }
  &--line-sm {
    height: 11px;
    width: 40%;
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────
.mt-4 {
  margin-top: $space-4 !important;
}
.page-header__actions {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;

  @include respond-to("md") {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
