<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة الخصومات</h1>
        <p>تسجيل الغرامات والاستقطاعات وتتبع دفعاتها الشهرية</p>
      </div>
      <button class="btn btn--primary" @click="openModal()">
        <MinusCircle :size="16" /> تسجيل خصم جديد
      </button>
    </div>

    <!-- ══ Stats Bar ════════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <FileText :size="13" />
        <span
          >إجمالي الخصومات: <strong>{{ store.deductions.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--danger">
        <Banknote :size="13" />
        <span
          >إجمالي المبالغ المستحقة:
          <strong>{{ formatCurrency(totalRemaining) }}</strong></span
        >
      </div>
      <div class="stat-pill">
        <Clock :size="13" />
        <span
          >آخر تحديث: <strong>{{ todayLabel }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="loading-grid">
      <div
        v-for="i in 4"
        :key="i"
        class="deduction-card deduction-card--skeleton"
      >
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line-sm"></div>
      </div>
    </div>

    <!-- ══ Empty State ═════════════════════════════════════════════════════ -->
    <div v-else-if="!store.deductions.length" class="empty-wrapper">
      <div class="empty-state">
        <div class="empty-state__illustration">
          <AlertTriangle :size="32" />
        </div>
        <div class="empty-state__title">لا توجد خصومات مسجلة</div>
        <div class="empty-state__text">
          سجل الغرامات أو الاستقطاعات الإدارية هنا لتظهر تلقائياً في الرواتب
        </div>
        <button class="btn btn--primary mt-4" @click="openModal()">
          <Plus :size="15" /> تسجيل خصم
        </button>
      </div>
    </div>

    <!-- ══ Deductions Grid ══════════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div v-for="d in store.deductions" :key="d.id" class="deduction-card">
        <div class="deduction-card__header">
          <div class="deduction-icon"><AlertTriangle :size="22" /></div>
          <div class="deduction-card__meta">
            <h3>{{ d.employee?.fullName || "—" }}</h3>
            <span class="deduction-card__sub"
              >{{ d.name }} • {{ d.employee?.employeeCode }}</span
            >
          </div>
          <div class="deduction-amounts">
            <span class="total">{{ formatCurrency(d.totalAmount) }}</span>
            <span class="monthly">/{{ formatCurrency(d.monthlyAmount) }}</span>
          </div>
        </div>

        <div class="deduction-card__body">
          <div class="installment-progress">
            <div class="progress-label">
              <span>الدفعات المسددة</span>
              <span class="progress-text"
                >{{ d.paidInstallments }} / {{ d.installmentsCount }}</span
              >
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: getProgressPct(d) + '%' }"
                :class="{ 'is-complete': isCompleted(d) }"
              ></div>
            </div>
          </div>

          <div class="deduction-stat">
            <span class="label"><CalendarDays :size="12" /> تاريخ البدء</span>
            <span class="value">{{ formatDate(d.startDate) }}</span>
          </div>

          <div class="deduction-stat" v-if="d.notes">
            <span class="label"><FileText :size="12" /> ملاحظات</span>
            <span class="value value--muted">{{ truncateNotes(d.notes) }}</span>
          </div>
        </div>

        <div class="deduction-card__footer">
          <button class="btn btn--ghost btn--sm" @click="openModal(d)">
            <Edit :size="13" /> تعديل
          </button>
          <button
            class="btn btn--danger-outline btn--sm"
            @click="confirmDelete(d.id)"
          >
            <Trash2 :size="13" /> حذف
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Create/Edit Modal ════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal modal--md">
            <div class="modal__header">
              <h3>{{ isEditing ? "تعديل الخصم" : "تسجيل خصم جديد" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="closeModal">
                <X :size="18" />
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="modal-form">
              <div class="form-group">
                <label>الموظف *</label>
                <select v-model="form.employeeId" class="form-select" required>
                  <option value="" disabled>اختر موظفاً...</option>
                  <option
                    v-for="emp in employees"
                    :key="emp.id"
                    :value="emp.id"
                  >
                    {{ emp.fullName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>نوع / اسم الخصم *</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-input"
                  placeholder="مثال: غرامة تأخير، استقطاع تأمين..."
                  required
                />
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label>إجمالي المبلغ (ر.س) *</label>
                  <input
                    v-model.number="form.totalAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>عدد الدفعات *</label>
                  <input
                    v-model.number="form.installmentsCount"
                    type="number"
                    min="1"
                    class="form-input"
                    required
                  />
                </div>
              </div>

              <div class="alert-calc" v-if="calculatedMonthly > 0">
                <Info :size="14" />
                <span
                  >سيتم خصم
                  <strong>{{ formatCurrency(calculatedMonthly) }}</strong>
                  شهرياً لمدة {{ form.installmentsCount }} أشهر</span
                >
              </div>

              <div class="form-group">
                <label>تاريخ بداية الخصم *</label>
                <input
                  v-model="form.startDate"
                  type="date"
                  class="form-input"
                  required
                />
              </div>

              <div class="form-group">
                <label>ملاحظات</label>
                <textarea
                  v-model="form.notes"
                  rows="3"
                  class="form-input"
                  placeholder="تفاصيل إضافية..."
                ></textarea>
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="closeModal"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="submitting"
                >
                  <span v-if="submitting" class="spinner spinner--sm" />
                  <span v-else>{{
                    isEditing ? "حفظ التعديلات" : "تسجيل الخصم"
                  }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="حذف الخصم"
      message="هل أنت متأكد؟ سيتم إيقاف الخصم نهائياً ولن يظهر في الرواتب القادمة."
      confirm-text="حذف"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useDeductionStore } from "@/stores/deductions";
import { useEmployeesStore } from "@/stores/employees";
import { useToast } from "@/composables/useToast";
import {
  Plus,
  Edit,
  Trash2,
  X,
  MinusCircle,
  AlertTriangle,
  Banknote,
  CalendarDays,
  FileText,
  Clock,
  Info,
} from "lucide-vue-next";
import ConfirmDialog from "@/components/global/ConfirmDialog.vue";

definePageMeta({ middleware: "auth" });

const store = useDeductionStore();
const employeeStore = useEmployeesStore();
const toast = useToast();

const showModal = ref(false);
const showDeleteConfirm = ref(false);
const submitting = ref(false);
const isEditing = ref(false);
const currentId = ref<string | null>(null);

const form = reactive({
  employeeId: "",
  name: "",
  totalAmount: 0,
  installmentsCount: 1,
  startDate: new Date().toISOString().split("T")[0],
  notes: "",
});

const employees = computed(() =>
  employeeStore.employees.filter((e) => e.status === "active"),
);

const totalRemaining = computed(() =>
  store.deductions.reduce((sum, d) => {
    const remaining = d.installmentsCount - d.paidInstallments;
    return sum + remaining * Number(d.monthlyAmount);
  }, 0),
);

const calculatedMonthly = computed(() => {
  if (!form.totalAmount || !form.installmentsCount) return 0;
  return Number((form.totalAmount / form.installmentsCount).toFixed(2));
});

const todayLabel = new Date().toLocaleDateString("ar-SA");

const openModal = (deduction?: any) => {
  if (deduction) {
    isEditing.value = true;
    currentId.value = deduction.id;
    form.employeeId = deduction.employeeId;
    form.name = deduction.name;
    form.totalAmount = Number(deduction.totalAmount);
    form.installmentsCount = deduction.installmentsCount;
    form.startDate = deduction.startDate.split("T")[0];
    form.notes = deduction.notes || "";
  } else {
    isEditing.value = false;
    currentId.value = null;
    form.employeeId = "";
    form.name = "";
    form.totalAmount = 0;
    form.installmentsCount = 1;
    form.startDate = new Date().toISOString().split("T")[0];
    form.notes = "";
  }
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (isEditing.value) await store.update(currentId.value!, form);
    else await store.create(form);
    toast.success(
      isEditing.value ? "تم تحديث الخصم بنجاح" : "تم تسجيل الخصم بنجاح",
    );
    closeModal();
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (id: string) => {
  currentId.value = id;
  showDeleteConfirm.value = true;
};

const handleDelete = async () => {
  try {
    await store.remove(currentId.value!);
    toast.success("تم حذف الخصم وإيقاف الاستقطاع");
  } catch (e: any) {
    toast.error(e.message);
  }
};

const closeModal = () => (showModal.value = false);

const formatCurrency = (val: number | string) =>
  Number(val).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ر.س";

const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");
const truncateNotes = (notes: string) =>
  notes.length > 40 ? notes.slice(0, 40) + "..." : notes;

const getProgressPct = (d: any) =>
  Math.min(100, Math.round((d.paidInstallments / d.installmentsCount) * 100));
const isCompleted = (d: any) => d.paidInstallments >= d.installmentsCount;

onMounted(() => {
  store.fetchAll();
  employeeStore.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

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
  &--danger {
    border-color: rgba($stb-danger, 0.3);
    strong {
      color: $stb-danger;
    }
  }
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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

.deduction-card {
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
    background: linear-gradient(90deg, $stb-danger, #ff6b6b);
    opacity: 0;
    transition: opacity $transition-base;
  }
  &:hover {
    transform: translateY(-3px);
    border-color: rgba($stb-danger, 0.35);
    box-shadow:
      0 0 16px rgba($stb-danger, 0.12),
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

.deduction-icon {
  width: 46px;
  height: 46px;
  border-radius: $radius-lg;
  background: rgba($stb-danger, 0.1);
  border: 1px solid rgba($stb-danger, 0.2);
  color: $stb-danger;
  @include flex(row, center, center);
  flex-shrink: 0;
}
.deduction-amounts {
  text-align: left;
  white-space: nowrap;
  .total {
    display: block;
    font-size: $font-size-lg;
    font-weight: 800;
    color: $stb-danger;
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
      background: $stb-danger;
      transition: width 0.5s ease;
      border-radius: $radius-full;
      &.is-complete {
        background: $stb-success;
      }
    }
  }
}

.deduction-stat {
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
</style>
