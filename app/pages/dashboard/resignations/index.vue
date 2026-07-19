<template>
  <div class="page-container">
    <!-- ═ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة طلبات الاستقالة</h1>
        <p>تقديم ومتابعة والبت في طلبات استقالة الموظفين</p>
      </div>
      <button v-if="!isManager" class="btn btn--primary" @click="openModal()">
        <FilePlus :size="16" /> تقديم طلب استقالة
      </button>
    </div>

    <!-- ══ Stats Bar ════════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <FileText :size="13" />
        <span
          >إجمالي الطلبات: <strong>{{ store.requests.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--warning">
        <Clock :size="13" />
        <span
          >طلبات معلقة: <strong>{{ pendingCount }}</strong></span
        >
      </div>
      <div class="stat-pill">
        <CalendarDays :size="13" />
        <span
          >آخر تحديث: <strong>{{ todayLabel }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Filters ════════════════════════════════════════════════════════ -->
    <div class="card filters-card" v-if="isManager">
      <div class="filters-row">
        <select v-model="filterStatus" class="form-select status-select">
          <option value="">كل الحالات</option>
          <option v-for="(label, key) in StatusLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
        <div class="spacer"></div>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="loading-grid">
      <div v-for="i in 4" :key="i" class="res-card res-card--skeleton">
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line-sm"></div>
      </div>
    </div>

    <!--  Empty State ═════════════════════════════════════════════════════ -->
    <div v-else-if="!filteredRequests.length" class="empty-wrapper">
      <div class="empty-state">
        <div class="empty-state__illustration"><FilePlus :size="32" /></div>
        <div class="empty-state__title">لا توجد طلبات استقالة</div>
        <div class="empty-state__text">
          {{
            isManager
              ? "لا توجد طلبات مطابقة للفلتر"
              : "لم تقم بتقديم أي طلب استقالة حتى الآن"
          }}
        </div>
        <button
          v-if="!isManager"
          class="btn btn--primary mt-4"
          @click="openModal()"
        >
          <Plus :size="15" /> تقديم طلب
        </button>
      </div>
    </div>

    <!-- ═ Requests Grid ═══════════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div v-for="req in filteredRequests" :key="req.id" class="res-card">
        <div class="res-card__header">
          <div class="res-icon"><UserX :size="22" /></div>
          <div class="res-card__meta">
            <h3>{{ req.employee?.fullName || "—" }}</h3>
            <span class="res-card__sub"
              >{{ req.employee?.employeeCode }} •
              {{ formatDate(req.requestDate) }}</span
            >
          </div>
          <span :class="['status-badge', `badge--${req.status}`]">{{
            getStatusLabel(req.status)
          }}</span>
        </div>

        <div class="res-card__body">
          <div class="res-stat">
            <span class="label"
              ><CalendarRange :size="12" /> آخر يوم عمل مقترح</span
            >
            <span class="value">{{ formatDate(req.lastWorkingDay) }}</span>
          </div>
          <div class="res-stat">
            <span class="label"><FileText :size="12" /> سبب الاستقالة</span>
            <span class="value value--muted">{{
              truncateText(req.reason, 50)
            }}</span>
          </div>
          <div class="res-stat" v-if="req.managerNotes">
            <span class="label"
              ><MessageSquare :size="12" /> ملاحظات المدير</span
            >
            <span class="value value--muted">{{
              truncateText(req.managerNotes, 50)
            }}</span>
          </div>
          <div class="res-stat" v-if="req.decisionDate">
            <span class="label"><Clock :size="12" /> تاريخ القرار</span>
            <span class="value">{{ formatDateTime(req.decisionDate) }}</span>
          </div>
        </div>

        <div class="res-card__footer">
          <!-- أزرار الموظف -->
          <template v-if="!isManager && req.status === 'pending'">
            <button
              class="btn btn--danger-outline btn--sm"
              @click="confirmCancel(req.id)"
            >
              <XCircle :size="13" /> إلغاء طلبي
            </button>
          </template>

          <!-- أزرار المدير -->
          <template v-if="isManager && req.status === 'pending'">
            <button
              class="btn btn--success-outline btn--sm"
              @click="openDecisionModal(req, 'approved')"
            >
              <CheckCircle :size="13" /> موافقة
            </button>
            <button
              class="btn btn--danger-outline btn--sm"
              @click="openDecisionModal(req, 'rejected')"
            >
              <XCircle :size="13" /> رفض
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- ══ Create Request Modal ════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateModal"
          class="modal-overlay"
          @click.self="closeModals"
        >
          <div class="modal modal--md">
            <div class="modal__header">
              <h3>تقديم طلب استقالة جديد</h3>
              <button class="btn btn--icon btn--ghost" @click="closeModals">
                <X :size="18" />
              </button>
            </div>
            <form @submit.prevent="handleCreate" class="modal-form">
              <!-- ✅ حقل تاريخ مخصص وخفيف باستخدام @vueuse/core -->
              <div class="form-group">
                <label>آخر يوم عمل مقترح *</label>
                <div class="date-input-wrapper">
                  <input
                    v-model="createForm.lastWorkingDay"
                    type="date"
                    class="form-input date-input"
                    required
                    :min="todayStr"
                  />
                  <Calendar :size="18" class="date-icon" />
                </div>
              </div>

              <div class="form-group">
                <label>سبب الاستقالة *</label>
                <textarea
                  v-model="createForm.reason"
                  rows="4"
                  class="form-input"
                  placeholder="يرجى توضيح سبب الاستقالة بالتفصيل..."
                  required
                ></textarea>
              </div>
              <div class="alert-info">
                <Info :size="14" />
                <span
                  >سيتم إرسال طلبك للمدير المباشر للموافقة أو الرفض. يمكنك إلغاء
                  الطلب طالما أنه لا يزال معلقاً.</span
                >
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="closeModals"
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

    <!-- ═ Decision Modal (For Manager) ════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDecisionModal"
          class="modal-overlay"
          @click.self="closeModals"
        >
          <div class="modal modal--md">
            <div class="modal__header">
              <h3>
                {{
                  decisionType === "approved"
                    ? "موافقة على الاستقالة"
                    : "رفض الاستقالة"
                }}
              </h3>
              <button class="btn btn--icon btn--ghost" @click="closeModals">
                <X :size="18" />
              </button>
            </div>
            <form @submit.prevent="handleDecision" class="modal-form">
              <div
                class="alert-info"
                :class="{ 'alert-danger': decisionType === 'rejected' }"
              >
                <AlertTriangle v-if="decisionType === 'rejected'" :size="14" />
                <CheckCircle v-else :size="14" />
                <span>{{
                  decisionType === "approved"
                    ? "ستتم الموافقة على الطلب وإنشاء سجل نهاية الخدمة تلقائياً."
                    : "سيتم رفض الطلب ولن يتم اتخاذ أي إجراء إضافي."
                }}</span>
              </div>
              <div class="form-group">
                <label>ملاحظات للموظف (اختياري)</label>
                <textarea
                  v-model="decisionForm.notes"
                  rows="3"
                  class="form-input"
                  placeholder="أضف ملاحظاتك هنا..."
                ></textarea>
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="closeModals"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  :class="
                    decisionType === 'approved'
                      ? 'btn btn--success'
                      : 'btn btn--danger'
                  "
                  :disabled="submitting"
                >
                  <span v-if="submitting" class="spinner spinner--sm" />
                  <span v-else>{{
                    decisionType === "approved"
                      ? "تأكيد الموافقة"
                      : "تأكيد الرفض"
                  }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showCancelConfirm"
      title="إلغاء طلب الاستقالة"
      message="هل أنت متأكد من إلغاء طلب الاستقالة؟ لا يمكن التراجع عن هذا الإجراء."
      confirm-text="نعم، إلغاء"
      @confirm="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
// ✅ استيراد دوال التاريخ الخفيفة من @vueuse/core
import { useDateFormat, useNow } from "@vueuse/core";

import { useResignationStore, ResignationStatus } from "@/stores/resignations";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";
import {
  Plus,
  X,
  FilePlus,
  UserX,
  CalendarRange,
  FileText,
  MessageSquare,
  Clock,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar, // ✅ أيقونة التقويم
} from "lucide-vue-next";
import ConfirmDialog from "@/components/global/ConfirmDialog.vue";

definePageMeta({ middleware: "auth" });

const store = useResignationStore();
const auth = useAuthStore();
const toast = useToast();

// تحديد هل المستخدم مدير أم موظف عادي
const isManager = computed(
  () => auth.user?.isSystemAdmin || auth.user?.isSuperAdmin,
);

const showCreateModal = ref(false);
const showDecisionModal = ref(false);
const showCancelConfirm = ref(false);
const submitting = ref(false);
const filterStatus = ref("");
const currentRequestId = ref<string | null>(null);
const decisionType = ref<"approved" | "rejected">("approved");

// ✅ استخدام String للتاريخ لتوافق أفضل مع input type="date"
const createForm = reactive({
  lastWorkingDay: "",
  reason: "",
});

const decisionForm = reactive({ notes: "" });

// ✅ الحصول على تاريخ اليوم بصيغة YYYY-MM-DD للحقل
const now = useNow();
const todayStr = useDateFormat(now, "YYYY-MM-DD");
const todayLabel = useDateFormat(now, "D MMMM YYYY", { locales: "ar-SA" });

const StatusLabels: Record<string, string> = {
  pending: "معلق",
  approved: "موافق عليه",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

const filteredRequests = computed(() => {
  let reqs = store.requests;
  if (!isManager.value && auth.user?.userId) {
    reqs = reqs.filter((r) => r.employeeId === auth.user!.userId);
  }
  if (filterStatus.value) {
    reqs = reqs.filter((r) => r.status === filterStatus.value);
  }
  return reqs;
});

const pendingCount = computed(
  () =>
    store.requests.filter((r) => r.status === ResignationStatus.PENDING).length,
);

const openModal = () => {
  createForm.lastWorkingDay = "";
  createForm.reason = "";
  showCreateModal.value = true;
};

const openDecisionModal = (req: any, type: "approved" | "rejected") => {
  currentRequestId.value = req.id;
  decisionType.value = type;
  decisionForm.notes = "";
  showDecisionModal.value = true;
};

const confirmCancel = (id: string) => {
  currentRequestId.value = id;
  showCancelConfirm.value = true;
};

const closeModals = () => {
  showCreateModal.value = false;
  showDecisionModal.value = false;
  showCancelConfirm.value = false;
};

const handleCreate = async () => {
  if (!createForm.lastWorkingDay) {
    toast.error("يرجى اختيار تاريخ آخر يوم عمل");
    return;
  }

  submitting.value = true;
  try {
    // إرسال التاريخ كما هو لأنه بالفعل بصيغة ISO من input type="date"
    await store.create(createForm);
    toast.success("تم تقديم طلب الاستقالة بنجاح");
    closeModals();
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
};

const handleDecision = async () => {
  submitting.value = true;
  try {
    await store.makeDecision(
      currentRequestId.value!,
      decisionType.value === "approved"
        ? ResignationStatus.APPROVED
        : ResignationStatus.REJECTED,
      decisionForm.notes,
    );
    toast.success(
      decisionType.value === "approved"
        ? "تمت الموافقة على الطلب"
        : "تم رفض الطلب",
    );
    closeModals();
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
};

const handleCancel = async () => {
  try {
    await store.cancelMyRequest();
    toast.success("تم إلغاء طلب الاستقالة بنجاح");
  } catch (e: any) {
    toast.error(e.message);
  }
};

const getStatusLabel = (status: string) => StatusLabels[status] || status;
const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");
const formatDateTime = (d: string) => new Date(d).toLocaleString("ar-SA");
const truncateText = (text: string, len: number) =>
  text.length > len ? text.slice(0, len) + "..." : text;

watch(filterStatus, () =>
  store.fetchAll((filterStatus.value as ResignationStatus) || undefined),
);

onMounted(() => {
  store.fetchAll();
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
  &--warning {
    border-color: rgba($stb-warning, 0.3);
    strong {
      color: $stb-warning;
    }
  }
}

.filters-card {
  padding: $space-3 $space-4;
  margin-bottom: $space-4;
  .filters-row {
    @include flex(row, center, flex-start, $space-3);
  }
  .status-select {
    width: 180px;
  }
  .spacer {
    flex: 1;
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

.res-card {
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

.res-icon {
  width: 46px;
  height: 46px;
  border-radius: $radius-lg;
  background: rgba($stb-danger, 0.1);
  border: 1px solid rgba($stb-danger, 0.2);
  color: $stb-danger;
  @include flex(row, center, center);
  flex-shrink: 0;
}

.status-badge {
  font-size: 0.7rem;
  padding: 3px 10px;
  border-radius: $radius-full;
  font-weight: 600;
  white-space: nowrap;
  &.badge--pending {
    background: rgba($stb-warning, 0.15);
    color: $stb-warning;
  }
  &.badge--approved {
    background: rgba($stb-success, 0.15);
    color: $stb-success;
  }
  &.badge--rejected {
    background: rgba($stb-danger, 0.15);
    color: $stb-danger;
  }
  &.badge--cancelled {
    background: rgba($stb-text-muted, 0.15);
    color: $stb-text-muted;
  }
}

.res-stat {
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
    margin-top: 1px;
  }
  &.alert-danger {
    background: rgba($stb-danger, 0.05);
    border-color: rgba($stb-danger, 0.15);
    color: $stb-danger;
    svg {
      color: $stb-danger;
    }
  }
}

.btn--success {
  background: $stb-success;
  color: #fff;
  &:hover:not(:disabled) {
    background: red;
  }
}
.btn--success-outline {
  background: transparent;
  color: $stb-success;
  border: 1px solid rgba($stb-success, 0.3);
  &:hover:not(:disabled) {
    background: rgba($stb-success, 0.08);
    border-color: $stb-success;
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
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-5;
}

/* ✅ تنسيقات حقل التاريخ المخصص والخفيف */
.date-input-wrapper {
  position: relative;
  width: 100%;

  .date-input {
    width: 100%;
    padding: $space-3 $space-4;
    padding-left: $space-10; /* مساحة للأيقونة */
    background: $stb-surface;
    border: 1px solid $stb-border;
    border-radius: $radius-md;
    color: $stb-text-primary;
    font-family: $font-family;
    font-size: $font-size-sm;
    transition: all $transition-base;
    outline: none;
    direction: rtl;
    text-align: right;

    &::placeholder {
      color: $stb-text-muted;
    }

    &:focus {
      border-color: $stb-accent;
      box-shadow: 0 0 0 3px rgba($stb-accent, 0.1);
    }

    /* إصلاح أيقونة التقويم الافتراضية للمتصفح */
    &::-webkit-calendar-picker-indicator {
      opacity: 0;
      position: absolute;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
  }

  .date-icon {
    position: absolute;
    left: $space-3;
    top: 50%;
    transform: translateY(-50%);
    color: $stb-accent;
    pointer-events: none;
    opacity: 0.8;
  }
}
</style>
