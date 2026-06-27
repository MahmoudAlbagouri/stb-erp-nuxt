<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة القروض</h1>
        <p>متابعة طلبات القروض طويلة الأجل ومواعيد السداد</p>
      </div>
      <button class="btn btn--primary" @click="openCreateModal">
        <Plus :size="18" />
        <span>طلب قرض جديد</span>
      </button>
    </div>

    <!-- ══ Stats Cards ═════════════════════════════════════════════════════ -->
    <div class="grid-3 stats-row">
      <div class="stat-card stat-pending">
        <div class="stat-card__icon">
          <Hourglass :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ pendingCount }}</div>
          <div class="stat-card__label">طلبات معلقة</div>
        </div>
      </div>

      <div class="stat-card stat-approved">
        <div class="stat-card__icon">
          <Banknote :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ totalApprovedAmount }} ر.س</div>
          <div class="stat-card__label">إجمالي القروض المعتمدة</div>
        </div>
      </div>

      <div class="stat-card stat-total">
        <div class="stat-card__icon">
          <BarChart3 :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.loans.length }}</div>
          <div class="stat-card__label">عدد الطلبات الكلي</div>
        </div>
      </div>
    </div>

    <!-- ══ Loading State ═══════════════════════════════════════════════════ -->
    <div v-if="store.loading || employeesStore.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ═ Empty State ═════════════════════════════════════════════════════ -->
    <div v-else-if="!store.loans.length" class="card empty-card">
      <div class="empty-state">
        <Landmark :size="40" class="empty-icon" />
        <div class="empty-state__title">لا توجد طلبات قروض</div>
        <div class="empty-state__text">ابدأ بتقديم طلب قرض جديد</div>
        <button class="btn btn--primary mt-4" @click="openCreateModal">
          <Plus :size="16" />
          طلب قرض
        </button>
      </div>
    </div>

    <!-- ══ Loans Table ═════════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>مبلغ القرض</th>
              <th>عدد الأقساط</th>
              <th>القسط الشهري</th>
              <th>بداية السداد</th>
              <th>السبب</th>
              <th>الحالة</th>
              <th>تاريخ الطلب</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="loan in store.loans" :key="loan.id">
              <td>
                <div class="employee-cell">
                  <span class="employee-name">{{
                    getEmployeeName(loan.employeeId)
                  }}</span>
                  <span class="employee-job">{{
                    loan.employee?.jobTitle || "-"
                  }}</span>
                </div>
              </td>
              <td class="amount-cell">
                {{ formatCurrency(loan.totalAmount) }}
              </td>
              <td>{{ loan.installmentsCount }} شهر</td>
              <td class="installment-cell">
                {{ formatCurrency(loan.monthlyInstallment) }}
              </td>
              <td>
                <span
                  v-if="loan.startDate"
                  class="badge badge--trial date-badge"
                >
                  {{ formatDate(loan.startDate) }}
                </span>
                <span v-else class="text-muted text-xs">غير محدد</span>
              </td>
              <td>
                <span v-if="loan.reason" class="reason-text">
                  {{ truncateText(loan.reason, 30) }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span :class="`badge badge--${loan.status}`">
                  {{ getStatusLabel(loan.status) }}
                </span>
              </td>
              <td>{{ formatDate(loan.createdAt) }}</td>
              <td>
                <div class="actions-cell" v-if="loan.status === 'pending'">
                  <button
                    class="btn btn--success btn--sm"
                    @click="triggerApprove(loan)"
                    title="موافقة"
                  >
                    <Check :size="14" />
                  </button>
                  <button
                    class="btn btn--danger btn--sm"
                    @click="triggerReject(loan)"
                    title="رفض"
                  >
                    <X :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!--  Create Loan Modal ════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal modal-lg">
            <div class="modal__header">
              <h3>
                <Landmark :size="20" class="modal-icon" />
                طلب قرض جديد
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
                aria-label="إغلاق"
              >
                <X :size="20" />
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="modal-form">
              <div class="grid-2">
                <!-- مبلغ القرض -->
                <div class="form-group">
                  <label>مبلغ القرض الإجمالي *</label>
                  <input
                    v-model.number="form.totalAmount"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    required
                    min="1000"
                    step="100"
                  />
                </div>

                <!-- عدد الأقساط -->
                <div class="form-group">
                  <label>مدة السداد (شهور) *</label>
                  <input
                    v-model.number="form.installmentsCount"
                    type="number"
                    class="form-input"
                    placeholder="مثال: 12"
                    required
                    min="3"
                    max="60"
                  />
                </div>

                <!-- تاريخ بداية السداد -->
                <div class="form-group full-width">
                  <label>تاريخ بداية الخصم *</label>
                  <input
                    v-model="form.startDate"
                    type="date"
                    class="form-input"
                    required
                  />
                  <small class="form-hint">
                    سيتم بدء خصم أول قسط من راتب هذا التاريخ
                  </small>
                </div>

                <!-- السبب -->
                <div class="form-group full-width">
                  <label>سبب القرض</label>
                  <textarea
                    v-model="form.reason"
                    class="form-input textarea-resize"
                    rows="3"
                    placeholder="اكتب سبب الطلب هنا (مثال: قرض سكني، زواج...)"
                  ></textarea>
                </div>

                <!-- ملخص سريع -->
                <div
                  v-if="
                    form.totalAmount && form.installmentsCount && form.startDate
                  "
                  class="summary-card full-width"
                >
                  <div class="summary-content">
                    <div class="summary-item">
                      <span class="summary-label"
                        >قيمة القسط الشهري التقريبية:</span
                      >
                      <span class="summary-value">
                        {{
                          formatCurrency(
                            form.totalAmount / form.installmentsCount,
                          )
                        }}
                      </span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">بداية السداد:</span>
                      <strong class="summary-date">{{
                        formatDate(form.startDate)
                      }}</strong>
                    </div>
                  </div>
                </div>
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
                  <span v-if="submitting" class="spinner spinner--sm" />
                  <span v-else>إرسال الطلب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ✅ Confirm Dialog for Approve -->
    <ConfirmDialog
      v-model="showApproveConfirm"
      title="تأكيد الموافقة على القرض"
      :message="`هل أنت متأكد من اعتماد قرض بقيمة ${formatCurrency(currentLoanTarget?.totalAmount || 0)} للموظف ${getEmployeeName(currentLoanTarget?.employeeId || '')}؟`"
      confirm-text="اعتماد القرض"
      :loading="actionLoading"
      @confirm="executeApprove"
    />

    <!-- ✅ Confirm Dialog for Reject -->
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
import ConfirmDialog from "@/components/global/ConfirmDialog.vue"; // ✅ استيراد مكون التأكيد

// ✅ استيراد أيقونات Lucide
import {
  Plus,
  Hourglass,
  Banknote,
  BarChart3,
  Landmark,
  Check,
  X,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useLoansStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

// ─── State ──────────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);

// ✅ حالات بوباب التأكيد للقروض
const showApproveConfirm = ref(false);
const showRejectConfirm = ref(false);
const actionLoading = ref(false);
const currentLoanTarget = ref<any | null>(null);

const EMPTY_FORM = {
  totalAmount: 0,
  installmentsCount: 12,
  reason: "",
  startDate: "",
};

const form = reactive({ ...EMPTY_FORM });

// ─── Computed Stats ────────────────────────────────────────────────────────
const pendingCount = computed(
  () => store.loans.filter((l) => l.status === "pending").length,
);
const totalApprovedAmount = computed(() => {
  return store.loans
    .filter((l) => l.status === "approved" || l.status === "completed")
    .reduce((sum, l) => sum + Number(l.totalAmount), 0)
    .toLocaleString("ar-SA");
});

// ─── Actions ───────────────────────────────────────────────────────────────
const openCreateModal = () => {
  Object.assign(form, EMPTY_FORM);
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
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

// ✅ دوال إدارة التأكيد بدلاً من alert
const triggerApprove = (loan: any) => {
  currentLoanTarget.value = loan;
  showApproveConfirm.value = true;
};

const executeApprove = async () => {
  if (!currentLoanTarget.value) return;
  actionLoading.value = true;
  try {
    await store.updateStatus(currentLoanTarget.value.id, "approved");
    toast.success("تمت الموافقة على القرض بنجاح");
    showApproveConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في تنفيذ الموافقة");
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
    toast.error(e.message || "فشل في تنفيذ الرفض");
  } finally {
    actionLoading.value = false;
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const getEmployeeName = (id: string) => {
  if (!id) return "-";
  const emp = employeesStore.employees.find((e) => e.id === id);
  return emp ? emp.fullName : "غير محدد";
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    approved: "موافق عليه",
    rejected: "مرفوض",
    completed: "تم السداد",
  };
  return map[status] || status;
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA");
};

const formatCurrency = (val: number | string) => {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
  }).format(Number(val));
};

const truncateText = (text: string, limit: number) => {
  if (!text) return "-";
  if (text.length <= limit) return text;
  return text.substring(0, limit) + "...";
};

// ── Init ──────────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchAll();
  if (employeesStore.employees.length === 0) {
    employeesStore.fetchAll();
  }
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.stats-row {
  margin-bottom: $space-6;
}

.stat-card {
  &.stat-pending .stat-card__icon {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
  }
  &.stat-approved .stat-card__icon {
    background: rgba($stb-success, 0.12);
    color: $stb-success;
  }
  &.stat-total .stat-card__icon {
    background: rgba($stb-info, 0.12);
    color: $stb-info;
  }
}

.empty-card {
  .empty-state {
    padding: $space-10 $space-4;
  }
  .empty-icon {
    color: $stb-text-muted;
    opacity: 0.4;
    margin-bottom: $space-3;
  }
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
  @include scrollbar;
}

.employee-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.employee-name {
  font-weight: 600;
  color: $stb-text-primary;
  font-size: $font-size-sm;
}

.employee-job {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.amount-cell {
  font-weight: 700;
  color: $stb-accent;
  font-size: $font-size-sm;
}

.installment-cell {
  font-weight: 600;
  color: $stb-text-primary;
  font-size: $font-size-sm;
}

.date-badge {
  direction: ltr;
  display: inline-flex;
}

.reason-text {
  font-size: $font-size-xs;
  color: $stb-text-secondary;
}

.actions-cell {
  @include flex(row, center, flex-start, $space-2);
}

.modal-lg {
  max-width: 700px;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.full-width {
  grid-column: span 2;
  @include respond-to("md") {
    grid-column: span 1;
  }
}

.textarea-resize {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  color: $stb-text-muted;
  font-size: $font-size-xs;
  margin-top: 4px;
  display: block;
}

.summary-card {
  background: rgba($stb-accent, 0.05);
  border: 1px solid rgba($stb-accent, 0.2);
  border-radius: $radius-md;
  padding: $space-4;
}

.summary-content {
  @include flex(row, center, space-between);

  @include respond-to("md") {
    flex-direction: column;
    align-items: flex-start;
    gap: $space-3;
  }
}

.summary-item {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}

.summary-value {
  font-weight: 700;
  color: $stb-accent;
  font-size: $font-size-lg;
}

.summary-date {
  color: $stb-text-primary;
}

.mt-4 {
  margin-top: $space-4 !important;
}

.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
</style>
