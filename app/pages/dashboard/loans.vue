<!-- pages/loans/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة القروض</h1>
        <p>متابعة طلبات القروض طويلة الأجل ومواعيد السداد</p>
      </div>
      <div class="page-header__actions">
        <button
          class="btn btn--outline"
          @click="handleExport('excel')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
          <FileSpreadsheet v-else :size="18" /><span>Excel</span>
        </button>
        <button
          class="btn btn--outline"
          @click="handleExport('pdf')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
          <FileText v-else :size="18" /><span>PDF</span>
        </button>
        <button class="btn btn--primary" @click="openCreateModal">
          <Plus :size="16" /> طلب قرض جديد
        </button>
      </div>
    </div>

    <!-- ══ Stats Bar ════════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <Landmark :size="13" /><span
          >إجمالي القروض: <strong>{{ store.loans.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--success">
        <Banknote :size="13" /><span
          >المعتمدة:
          <strong>{{ formatCurrency(totalApprovedAmount) }}</strong></span
        >
      </div>
      <div class="stat-pill">
        <Clock :size="13" /><span
          >آخر تحديث: <strong>{{ todayLabel }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Loading State ═══════════════════════════════════════════════════ -->
    <div v-if="store.loading || employeesStore.loading" class="loading-grid">
      <div v-for="i in 4" :key="i" class="loan-card loan-card--skeleton">
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line-sm"></div>
      </div>
    </div>

    <!-- ═ Empty State ════════════════════════════════════════════════════ -->
    <div v-else-if="!store.loans.length" class="empty-wrapper">
      <div class="empty-state">
        <div class="empty-state__illustration"><Landmark :size="32" /></div>
        <div class="empty-state__title">لا توجد طلبات قروض</div>
        <div class="empty-state__text">ابدأ بتقديم طلب قرض جديد للموظفين</div>
        <button class="btn btn--primary mt-4" @click="openCreateModal">
          <Plus :size="15" /> طلب قرض
        </button>
      </div>
    </div>

    <!-- ══ Loans Grid (Cards) ═════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div v-for="loan in store.loans" :key="loan.id" class="loan-card">
        <div class="loan-card__header">
          <div class="loan-icon"><Landmark :size="22" /></div>
          <div class="loan-card__meta">
            <h3>{{ getEmployeeName(loan.employeeId) }}</h3>
            <span class="loan-card__sub"
              >{{ loan.employee?.employeeCode }} •
              {{ loan.employee?.jobTitle || "-" }}</span
            >
          </div>
          <div class="loan-amounts">
            <span class="total">{{ formatCurrency(loan.totalAmount) }}</span>
            <span class="monthly"
              >/{{ formatCurrency(loan.monthlyInstallment) }}</span
            >
          </div>
        </div>

        <div class="loan-card__body">
          <!-- ✅ شريط تقدم يعتمد على paidInstallments الفعلي -->
          <div class="installment-progress">
            <div class="progress-label">
              <span>الأقساط المسددة</span>
              <span class="progress-text"
                >{{ getPaidCount(loan) }} / {{ loan.installmentsCount }}</span
              >
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: getProgressPct(loan) + '%' }"
                :class="{ 'is-complete': isCompleted(loan) }"
              ></div>
            </div>
          </div>

          <div class="loan-stat">
            <span class="label"><CalendarDays :size="12" /> بداية السداد</span
            ><span class="value">{{ formatDate(loan.startDate) }}</span>
          </div>
          <div class="loan-stat" v-if="loan.reason">
            <span class="label"><FileText :size="12" /> السبب</span
            ><span class="value value--muted">{{
              truncateText(loan.reason, 40)
            }}</span>
          </div>

          <div class="status-badge-wrapper">
            <span :class="`badge badge--${loan.status}`">{{
              getStatusLabel(loan.status)
            }}</span>
          </div>
        </div>

        <div class="loan-card__footer">
          <div class="export-dropdown">
            <button
              class="btn btn--ghost btn--sm export-btn"
              @click="toggleExportMenu(loan.id)"
              title="تصدير التقرير"
            >
              <Download :size="14" />
            </button>
            <Transition name="fade">
              <div v-if="activeExportMenu === loan.id" class="dropdown-menu">
                <button @click="downloadLoan(loan.id, 'pdf')">
                  <FileText :size="14" /> ملف PDF
                </button>
                <button @click="downloadLoan(loan.id, 'excel')">
                  <FileSpreadsheet :size="14" /> ملف Excel
                </button>
              </div>
            </Transition>
          </div>

          <div class="action-buttons" v-if="loan.status === 'pending'">
            <button
              class="btn btn--success-outline btn--sm"
              @click="triggerApprove(loan)"
              title="موافقة"
            >
              <Check :size="13" />
            </button>
            <button
              class="btn btn--danger-outline btn--sm"
              @click="triggerReject(loan)"
              title="رفض"
            >
              <X :size="13" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═ Create Loan Modal ════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal modal--md">
            <div class="modal__header">
              <h3><Landmark :size="20" class="modal-icon" /> طلب قرض جديد</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                <X :size="18" />
              </button>
            </div>
            <form @submit.prevent="handleSubmit" class="modal-form">
              <div class="grid-2">
                <div class="form-group">
                  <label>مبلغ القرض الإجمالي *</label
                  ><input
                    v-model.number="form.totalAmount"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    required
                    min="500"
                    step="100"
                  />
                </div>
                <div class="form-group">
                  <label>مدة السداد (شهور) *</label
                  ><input
                    v-model.number="form.installmentsCount"
                    type="number"
                    class="form-input"
                    placeholder="مثال: 12"
                    required
                    min="2"
                    max="60"
                  />
                </div>
              </div>

              <div class="alert-calc" v-if="calculatedMonthly > 0">
                <Info :size="14" /><span
                  >سيتم خصم
                  <strong>{{ formatCurrency(calculatedMonthly) }}</strong>
                  شهرياً لمدة {{ form.installmentsCount }} أشهر</span
                >
              </div>

              <div class="form-group">
                <label>تاريخ بداية الخصم *</label
                ><input
                  v-model="form.startDate"
                  type="date"
                  class="form-input"
                  required
                /><small class="form-hint"
                  >سيتم بدء خصم أول قسط من راتب هذا التاريخ</small
                >
              </div>
              <div class="form-group">
                <label>سبب القرض</label
                ><textarea
                  v-model="form.reason"
                  rows="3"
                  class="form-input"
                  placeholder="اكتب سبب الطلب هنا..."
                ></textarea>
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="submitting"
                >
                  <span v-if="submitting" class="spinner spinner--sm" /><span
                    v-else
                    >إرسال الطلب</span
                  >
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showApproveConfirm"
      title="تأكيد الموافقة على القرض"
      :message="`هل أنت متأكد من اعتماد قرض بقيمة ${formatCurrency(currentLoanTarget?.totalAmount || 0)} للموظف ${getEmployeeName(currentLoanTarget?.employeeId || '')}؟`"
      confirm-text="اعتماد القرض"
      :loading="actionLoading"
      @confirm="executeApprove"
    />
    <ConfirmDialog
      v-model="showRejectConfirm"
      title="تأكيد رفض القرض"
      :message="`هل أنت متأكد من رفض طلب قرض الموظف ${getEmployeeName(currentLoanTarget?.employeeId || '')}؟ لا يمكن التراجع عن هذا الإجراء.`"
      confirm-text="رفض الطلب"
      :loading="actionLoading"
      @confirm="executeReject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useLoansStore } from "@/stores/loans";
import { useEmployeesStore } from "@/stores/employees";
import { useToast } from "../../composables/useToast";
import ConfirmDialog from "@/components/global/ConfirmDialog.vue";
import {
  Plus,
  Hourglass,
  Banknote,
  Landmark,
  Check,
  X,
  CalendarDays,
  Clock,
  FileText,
  Info,
  FileSpreadsheet,
  Download,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useLoansStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

const showModal = ref(false);
const submitting = ref(false);
const showApproveConfirm = ref(false);
const showRejectConfirm = ref(false);
const actionLoading = ref(false);
const currentLoanTarget = ref<any | null>(null);

const exporting = ref<"excel" | "pdf" | null>(null);
const activeExportMenu = ref<string | null>(null);

const EMPTY_FORM = {
  totalAmount: 500,
  installmentsCount: 2,
  reason: "",
  startDate: "",
};
const form = reactive({ ...EMPTY_FORM });

const pendingCount = computed(
  () => store.loans.filter((l) => l.status === "pending").length,
);
const totalApprovedAmount = computed(() =>
  store.loans
    .filter((l) => l.status === "approved" || l.status === "completed")
    .reduce((sum, l) => sum + Number(l.totalAmount), 0),
);
const calculatedMonthly = computed(() =>
  form.totalAmount && form.installmentsCount
    ? Number((form.totalAmount / form.installmentsCount).toFixed(2))
    : 0,
);
const todayLabel = new Date().toLocaleDateString("ar-SA");

const openCreateModal = () => {
  Object.assign(form, EMPTY_FORM);
  const nextMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1,
  );
  form.startDate = nextMonth.toISOString().slice(0, 10);
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    await store.createMyLoan(form);
    toast.success("تم تقديم طلب القرض بنجاح");
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الإرسال");
  } finally {
    submitting.value = false;
  }
};

const triggerApprove = (loan: any) => {
  currentLoanTarget.value = loan;
  showApproveConfirm.value = true;
};
const executeApprove = async () => {
  if (!currentLoanTarget.value) return;
  actionLoading.value = true;
  try {
    await store.updateStatus(currentLoanTarget.value.id, "approved");
    toast.success("تمت الموافقة على القرض");
    showApproveConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    actionLoading.value = false;
  }
};
const triggerReject = (loan: any) => {
  currentLoanTarget.value = loan;
  showRejectConfirm.value = true;
};
const executeReject = async () => {
  if (!currentLoanTarget.value) return;
  actionLoading.value = true;
  try {
    await store.updateStatus(currentLoanTarget.value.id, "rejected");
    toast.success("تم رفض طلب القرض");
    showRejectConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    actionLoading.value = false;
  }
};

const getEmployeeName = (id: string) =>
  employeesStore.employees.find((e) => e.id === id)?.fullName || "-";
const getStatusLabel = (status: string) =>
  ({
    pending: "قيد الانتظار",
    approved: "معتمد",
    rejected: "مرفوض",
    completed: "تم السداد",
  })[status] || status;
const formatDate = (d: string | undefined) =>
  d ? new Date(d).toLocaleDateString("ar-SA") : "-";
const formatCurrency = (val: number | string) =>
  Number(val).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ر.س";
const truncateText = (text: string, limit: number) =>
  text?.length > limit ? text.substring(0, limit) + "..." : text || "-";

// ✅ دوال حساب التقدم بناءً على الحقل الفعلي paidInstallments
const getPaidCount = (loan: any) => loan.paidInstallments || 0;
const getProgressPct = (loan: any) =>
  Math.min(
    100,
    Math.round((getPaidCount(loan) / loan.installmentsCount) * 100),
  );
const isCompleted = (loan: any) =>
  getPaidCount(loan) >= loan.installmentsCount || loan.status === "completed";

const handleExport = async (type: "excel" | "pdf") => {
  exporting.value = type;
  try {
    await store.exportData(type);
    toast.success(`تم تصدير التقرير بصيغة ${type.toUpperCase()}`);
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    exporting.value = null;
  }
};
const toggleExportMenu = (id: string) => {
  activeExportMenu.value = activeExportMenu.value === id ? null : id;
};
const downloadLoan = async (id: string, type: "excel" | "pdf") => {
  try {
    await store.exportSingle(id, type);
    toast.success(`تم تصدير الملف بصيغة ${type.toUpperCase()}`);
    activeExportMenu.value = null;
  } catch (e: any) {
    toast.error(e.message);
  }
};

onMounted(() => {
  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest(".export-dropdown"))
      activeExportMenu.value = null;
  });
  store.fetchAll();
  if (employeesStore.employees.length === 0) employeesStore.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.page-header__actions {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
  align-items: center;
}
.stats-bar {
  display: flex;
  gap: $space-3;
  flex-wrap: wrap;
  margin-bottom: $space-5;
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
  &--success {
    border-color: rgba($stb-success, 0.3);
    strong {
      color: $stb-success;
    }
  }
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: $space-4;
}
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

.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: $space-4;
}

.loan-card {
  @include glass-card;
  padding: 0;
  display: flex;
  flex-direction: column;
  transition: all $transition-base;
  overflow: hidden;
  position: relative;
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, $stb-accent, #60a5fa);
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
  &__body {
    display: flex;
    flex-direction: column;
    padding: $space-4 $space-5;
    gap: $space-3;
    flex: 1;
  }
  &__footer {
    @include flex(row, center, space-between);
    padding: $space-3 $space-5;
    border-top: 1px solid rgba($stb-border, 0.5);
    background: rgba($stb-dark, 0.3);
  }
  &--skeleton {
    @include flex(row, center, flex-start, $space-3);
    padding: $space-5;
    pointer-events: none;
    min-height: 80px;
  }
}

.loan-icon {
  width: 46px;
  height: 46px;
  border-radius: $radius-lg;
  background: rgba($stb-accent, 0.1);
  border: 1px solid rgba($stb-accent, 0.2);
  color: $stb-accent;
  @include flex(row, center, center);
  flex-shrink: 0;
}
.loan-amounts {
  text-align: left;
  white-space: nowrap;
  .total {
    display: block;
    font-size: $font-size-lg;
    font-weight: 800;
    color: $stb-accent;
  }
  .monthly {
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
}

.installment-progress {
  background: $stb-surface;
  padding: $space-3;
  border-radius: $radius-md;
  border: 1px solid $stb-border;
  .progress-label {
    @include flex(row, space-between, center);
    margin-bottom: $space-2;
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
  .progress-text {
    font-weight: 700;
    color: $stb-text-primary;
  }
  .progress-track {
    height: 6px;
    background: $stb-surface-3;
    border-radius: $radius-full;
    overflow: hidden;
    .progress-fill {
      height: 100%;
      background: $stb-accent;
      transition: width 0.5s ease;
      border-radius: $radius-full;
      &.is-complete {
        background: $stb-success;
      }
    }
  }
}

.loan-stat {
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
    &--muted {
      color: $stb-text-muted;
      font-weight: 400;
    }
  }
}
.status-badge-wrapper {
  margin-top: auto;
  padding-top: $space-2;
}

.alert-calc {
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

.mt-4 {
  margin-top: $space-4 !important;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-3;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-5;
}
.form-hint {
  color: $stb-text-muted;
  font-size: $font-size-xs;
  margin-top: 4px;
  display: block;
}

.export-dropdown {
  position: relative;
  display: inline-block;
}
.export-btn {
  color: $stb-text-muted;
  &:hover {
    color: $stb-accent;
    background: rgba($stb-accent, 0.1);
  }
}
.dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: $space-2;
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  z-index: 10;
  min-width: 140px;
  overflow: hidden;
  button {
    display: flex;
    align-items: center;
    gap: $space-2;
    width: 100%;
    padding: $space-2 $space-3;
    border: none;
    background: transparent;
    color: $stb-text-primary;
    font-size: $font-size-xs;
    cursor: pointer;
    transition: all $transition-fast;
    &:hover {
      background: rgba($stb-accent, 0.08);
      color: $stb-accent;
    }
    svg {
      color: $stb-text-muted;
    }
  }
}
.action-buttons {
  display: flex;
  gap: $space-2;
}
</style>
