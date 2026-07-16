<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة المكافآت</h1>
        <p>تسجيل وصرف المكافآت التشجيعية والموسمية للموظفين</p>
      </div>
      <button class="btn btn--primary" @click="openModal()">
        <Plus :size="16" /> تسجيل مكافأة جديدة
      </button>
    </div>

    <!-- ══ Stats Bar ════════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <Gift :size="13" />
        <span
          >إجمالي المكافآت: <strong>{{ store.bonuses.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--accent">
        <Banknote :size="13" />
        <span
          >إجمالي المبالغ:
          <strong>{{ formatCurrency(totalAmount) }}</strong></span
        >
      </div>
      <div class="stat-pill">
        <CalendarDays :size="13" />
        <span
          >آخر صرف: <strong>{{ lastPayoutLabel }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="loading-grid">
      <div v-for="i in 4" :key="i" class="bonus-card bonus-card--skeleton">
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line-sm"></div>
      </div>
    </div>

    <!-- ═ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.bonuses.length" class="empty-wrapper">
      <div class="empty-state">
        <div class="empty-state__illustration">
          <Gift :size="32" />
        </div>
        <div class="empty-state__title">لا توجد مكافآت مسجلة</div>
        <div class="empty-state__text">
          ابدأ بتسجيل أول مكافأة تشجيعية لموظفيك
        </div>
        <button class="btn btn--primary mt-4" @click="openModal()">
          <Plus :size="15" /> تسجيل مكافأة
        </button>
      </div>
    </div>

    <!-- ══ Bonuses Grid ═════════════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div v-for="bonus in store.bonuses" :key="bonus.id" class="bonus-card">
        <!-- Card Header -->
        <div class="bonus-card__header">
          <div class="bonus-icon">
            <Gift :size="22" />
          </div>
          <div class="bonus-card__meta">
            <h3>{{ bonus.employee?.fullName || "—" }}</h3>
            <span class="bonus-card__sub">{{
              bonus.employee?.employeeCode || ""
            }}</span>
          </div>
          <span class="bonus-amount">{{ formatCurrency(bonus.amount) }}</span>
        </div>

        <!-- Card Body -->
        <div class="bonus-card__body">
          <div class="bonus-stat">
            <span class="label"><CalendarDays :size="12" /> تاريخ الصرف</span>
            <span class="value">{{ formatDate(bonus.payoutDate) }}</span>
          </div>
          <div class="bonus-stat" v-if="bonus.notes">
            <span class="label"><FileText :size="12" /> ملاحظات</span>
            <span class="value value--muted">{{
              truncateNotes(bonus.notes)
            }}</span>
          </div>
          <div class="bonus-stat">
            <span class="label"><Clock :size="12" /> تاريخ التسجيل</span>
            <span class="value">{{ formatDate(bonus.createdAt) }}</span>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="bonus-card__footer">
          <button class="btn btn--ghost btn--sm" @click="openModal(bonus)">
            <Edit :size="13" /> تعديل
          </button>
          <button
            class="btn btn--danger-outline btn--sm"
            @click="confirmDelete(bonus.id)"
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
              <h3>{{ isEditing ? "تعديل المكافأة" : "تسجيل مكافأة جديدة" }}</h3>
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

              <div class="grid-2">
                <div class="form-group">
                  <label>المبلغ (ر.س) *</label>
                  <input
                    v-model.number="form.amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>تاريخ الصرف *</label>
                  <input
                    v-model="form.payoutDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label>ملاحظات</label>
                <textarea
                  v-model="form.notes"
                  rows="3"
                  class="form-input"
                  placeholder="سبب المكافأة، المناسبة..."
                ></textarea>
              </div>

              <div class="alert-info">
                <Info :size="14" />
                <span
                  >سيتم احتساب هذه المكافأة تلقائياً في مسير رواتب شهر
                  {{ getPayoutMonthLabel() }}</span
                >
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
                    isEditing ? "حفظ التعديلات" : "تسجيل المكافأة"
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
      title="حذف المكافأة"
      message="هل أنت متأكد من حذف هذه المكافأة؟ لا يمكن التراجع عن هذا الإجراء."
      confirm-text="حذف"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useBonusStore } from "@/stores/bonuses";
import { useEmployeesStore } from "@/stores/employees"; // افترض وجوده
import { useToast } from "@/composables/useToast";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Gift,
  Banknote,
  CalendarDays,
  FileText,
  Clock,
  Info,
} from "lucide-vue-next";
import ConfirmDialog from "@/components/global/ConfirmDialog.vue";

definePageMeta({ middleware: "auth" });

const store = useBonusStore();
const employeeStore = useEmployeesStore();
const toast = useToast();

const showModal = ref(false);
const showDeleteConfirm = ref(false);
const submitting = ref(false);
const isEditing = ref(false);
const currentId = ref<string | null>(null);

const form = reactive({
  employeeId: "",
  amount: 0,
  payoutDate: new Date().toISOString().split("T")[0],
  notes: "",
});

const employees = computed(() =>
  employeeStore.employees.filter((e) => e.status === "active"),
);

const totalAmount = computed(() =>
  store.bonuses.reduce((sum, b) => sum + Number(b.amount), 0),
);

const lastPayoutLabel = computed(() => {
  if (!store.bonuses.length) return "—";
  const sorted = [...store.bonuses].sort(
    (a, b) =>
      new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime(),
  );
  return sorted[0] ? formatDate(sorted[0].payoutDate) : "—";
});

const openModal = (bonus?: any) => {
  if (bonus) {
    isEditing.value = true;
    currentId.value = bonus.id;
    form.employeeId = bonus.employeeId;
    form.amount = Number(bonus.amount);
    form.payoutDate = bonus.payoutDate.split("T")[0];
    form.notes = bonus.notes || "";
  } else {
    isEditing.value = false;
    currentId.value = null;
    form.employeeId = "";
    form.amount = 0;
    form.payoutDate = new Date().toISOString().split("T")[0];
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
      isEditing.value ? "تم تحديث المكافأة بنجاح" : "تم تسجيل المكافأة بنجاح",
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
    toast.success("تم حذف المكافأة");
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

const getPayoutMonthLabel = () => {
  const d = new Date(form.payoutDate!);
  const months = [
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
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

onMounted(() => {
  store.fetchAll();
  employeeStore.fetchAll();
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
  &--accent {
    border-color: rgba($stb-accent, 0.3);
    strong {
      color: $stb-accent;
    }
  }
}

// ── Loading & Empty ────────────────────────────────────────────────────────
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

// ── Bonus Grid ─────────────────────────────────────────────────────────────
.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-4;
}

.bonus-card {
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
    gap: 0;
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

.bonus-icon {
  width: 46px;
  height: 46px;
  border-radius: $radius-lg;
  background: rgba($stb-accent, 0.1);
  border: 1px solid rgba($stb-accent, 0.2);
  color: $stb-accent;
  @include flex(row, center, center);
  flex-shrink: 0;
}
.bonus-amount {
  font-size: $font-size-lg;
  font-weight: 800;
  color: $stb-success;
  white-space: nowrap;
}

.bonus-stat {
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

// ─ Skeleton ───────────────────────────────────────────────────────────────
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
