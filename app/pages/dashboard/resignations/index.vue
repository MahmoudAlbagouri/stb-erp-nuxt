<!-- pages/resignations/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة طلبات الاستقالة</h1>
        <p>تقديم ومتابعة والبت في طلبات استقالة الموظفين</p>
      </div>

      <!-- ✅ أزرار التصدير والعمليات -->
      <div class="page-header__actions">
        <button
          class="btn btn--outline"
          @click="handleExport('excel')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
          <FileSpreadsheet v-else :size="18" />
          <span>Excel</span>
        </button>

        <button
          class="btn btn--outline"
          @click="handleExport('pdf')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
          <FileText v-else :size="18" />
          <span>PDF</span>
        </button>

        <button class="btn btn--primary" @click="openCreateModal">
          <FilePlus :size="18" />
          <span>تقديم طلب استقالة</span>
        </button>
      </div>
    </div>

    <!-- ══ Stats Cards ═════════════════════════════════════════════════════ -->
    <div class="grid-3 stats-row">
      <div class="stat-card stat-total">
        <div class="stat-card__icon">
          <FileText :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.requests.length }}</div>
          <div class="stat-card__label">إجمالي الطلبات</div>
        </div>
      </div>

      <div class="stat-card stat-count">
        <div class="stat-card__icon">
          <Clock :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ pendingCount }}</div>
          <div class="stat-card__label">طلبات معلقة</div>
        </div>
      </div>

      <div class="stat-card stat-avg">
        <div class="stat-card__icon">
          <CheckCircle :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ approvedCount }}</div>
          <div class="stat-card__label">تمت الموافقة</div>
        </div>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.requests.length" class="card empty-card">
      <div class="empty-state">
        <div class="empty-state__icon">
          <FileSignature :size="48" />
        </div>
        <div class="empty-state__title">لا توجد طلبات استقالة</div>
        <div class="empty-state__text">
          ابدأ بتقديم طلب استقالة جديد أو انتظر وصول طلبات من الموظفين
        </div>
        <button class="btn btn--primary mt-4" @click="openCreateModal">
          <FilePlus :size="16" />
          تقديم طلب جديد
        </button>
      </div>
    </div>

    <!-- ══ Requests Table ══════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>تاريخ التقديم</th>
              <th>آخر يوم عمل</th>
              <th>سبب الاستقالة</th>
              <th>الحالة</th>
              <th>ملاحظات المدير</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in store.requests" :key="req.id">
              <td>
                <div class="employee-cell">
                  <div class="employee-avatar">
                    {{ req.employee?.fullName?.[0] ?? "—" }}
                  </div>
                  <div class="employee-info">
                    <span class="employee-name">{{
                      req.employee?.fullName ?? "—"
                    }}</span>
                    <span class="employee-meta">
                      {{
                        [req.employee?.employeeCode].filter(Boolean).join(" · ")
                      }}
                    </span>
                  </div>
                </div>
              </td>
              <td>{{ formatDate(req.requestDate) }}</td>
              <td>
                <span class="days-badge">
                  <CalendarOff :size="13" />
                  {{ formatDate(req.lastWorkingDay) }}
                </span>
              </td>
              <td class="notes-cell">{{ truncateText(req.reason, 40) }}</td>
              <td>
                <span :class="['badge', `badge--${req.status}`]">
                  {{ getStatusLabel(req.status) }}
                </span>
              </td>
              <td class="notes-cell">{{ req.managerNotes || "—" }}</td>
              <td>
                <div class="actions-cell">
                  <!-- زر الإلغاء -->
                  <button
                    v-if="req.status === 'pending'"
                    class="btn btn--danger-outline btn--sm"
                    @click="confirmCancel(req.id)"
                    title="إلغاء الطلب"
                  >
                    <XCircle :size="14" />
                  </button>

                  <!-- أزرار القرار -->
                  <template v-if="req.status === 'pending'">
                    <button
                      class="btn btn--success-outline btn--sm"
                      @click="openDecisionModal(req, 'approved')"
                      title="موافقة"
                    >
                      <CheckCircle :size="14" />
                    </button>
                    <button
                      class="btn btn--danger-outline btn--sm"
                      @click="openDecisionModal(req, 'rejected')"
                      title="رفض"
                    >
                      <XCircle :size="14" />
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         Modal: تقديم طلب استقالة جديد
    ════════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateModal"
          class="modal-overlay"
          @click.self="closeAll"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                <FilePlus :size="20" class="modal-icon" />
                تقديم طلب استقالة جديد
              </h3>
              <button class="btn btn--icon btn--ghost" @click="closeAll">
                <X :size="20" />
              </button>
            </div>

            <form @submit.prevent="handleCreate" class="modal-form">
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

              <div class="info-banner">
                <Info :size="16" />
                <p>سيتم إرسال طلبك للمدير المباشر للموافقة أو الرفض.</p>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeAll">
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

    <!-- ══════════════════════════════════════════════════════════════════════
         Modal: قرار المدير (موافقة / رفض)
    ════════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDecisionModal"
          class="modal-overlay"
          @click.self="closeAll"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                {{
                  decisionType === "approved"
                    ? "موافقة على الاستقالة"
                    : "رفض الاستقالة"
                }}
              </h3>
              <button class="btn btn--icon btn--ghost" @click="closeAll">
                <X :size="20" />
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
                    ? "ستتم الموافقة على الطلب وإنهاء إجراءاته."
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
                <button type="button" class="btn btn--ghost" @click="closeAll">
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
import { ref, reactive, computed, onMounted } from "vue";
import { useDateFormat, useNow } from "@vueuse/core";

import { useResignationStore, ResignationStatus } from "@/stores/resignations";
import { useToast } from "@/composables/useToast";
import {
  FilePlus,
  FileText,
  Clock,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  FileSignature,
  FileSpreadsheet,
  X,
  CalendarOff,
} from "lucide-vue-next";
import ConfirmDialog from "@/components/global/ConfirmDialog.vue";

definePageMeta({ middleware: "auth" });

const store = useResignationStore();
const toast = useToast();

// ─── Export State ───────────────────────────────────────────────────────────
const exporting = ref<"excel" | "pdf" | null>(null);

const handleExport = async (type: "excel" | "pdf") => {
  exporting.value = type;
  try {
    toast.success(`تم تصدير التقرير بصيغة ${type.toUpperCase()} (محاكاة)`);
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  } finally {
    exporting.value = null;
  }
};

// ─── UI State ────────────────────────────────────────────────────────────────
const showCreateModal = ref(false);
const showDecisionModal = ref(false);
const showCancelConfirm = ref(false);
const submitting = ref(false);
const currentRequestId = ref<string | null>(null);
const decisionType = ref<"approved" | "rejected">("approved");

const createForm = reactive({
  lastWorkingDay: "",
  reason: "",
});
const decisionForm = reactive({ notes: "" });

const now = useNow();
const todayStr = useDateFormat(now, "YYYY-MM-DD");

const StatusLabels: Record<string, string> = {
  pending: "معلق",
  approved: "موافق عليه",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

// ─── Computed ───────────────────────────────────────────────────────────────
const pendingCount = computed(
  () =>
    store.requests.filter((r) => r.status === ResignationStatus.PENDING).length,
);

const approvedCount = computed(
  () =>
    store.requests.filter((r) => r.status === ResignationStatus.APPROVED)
      .length,
);

// ─── Actions ─────────────────────────────────────────────────────────────────
const openCreateModal = () => {
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

const closeAll = () => {
  showCreateModal.value = false;
  showDecisionModal.value = false;
  showCancelConfirm.value = false;
};

const handleCreate = async () => {
  if (!createForm.lastWorkingDay) {
    toast.error("يرجى تعبئة جميع الحقول المطلوبة");
    return;
  }
  submitting.value = true;
  try {
    await store.create(createForm);
    toast.success("تم تقديم طلب الاستقالة بنجاح");
    closeAll();
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
    closeAll();
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

// ── Helpers ─────────────────────────────────────────────────────────────────
const getStatusLabel = (status: string) => StatusLabels[status] || status;
const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");
const truncateText = (text: string, len: number) =>
  text.length > len ? text.slice(0, len) + "..." : text;

onMounted(() => {
  // ✅ استخدام المسار الجديد لجلب طلبات الموظف الحالي
  store.fetchMyRequests();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.page-header__actions {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
}

.stats-row {
  margin-bottom: $space-6;
}
.stat-card {
  &.stat-total .stat-card__icon {
    background: rgba($stb-info, 0.12);
    color: $stb-info;
  }
  &.stat-count .stat-card__icon {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
  }
  &.stat-avg .stat-card__icon {
    background: rgba($stb-success, 0.12);
    color: $stb-success;
  }
}

.empty-card .empty-state {
  padding: $space-16 $space-8;
}
.mt-4 {
  margin-top: $space-4 !important;
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
  @include flex(row, center, flex-start, $space-3);
}
.employee-avatar {
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  background: $gradient-primary;
  @include flex(row, center, center);
  font-weight: 700;
  font-size: $font-size-sm;
  color: #fff;
  flex-shrink: 0;
}
.employee-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.employee-name {
  font-weight: 600;
  color: $stb-text-primary;
  font-size: $font-size-sm;
  @include truncate;
}
.employee-meta {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.days-badge {
  @include flex(row, center, flex-start, $space-1);
  display: inline-flex;
  padding: $space-1 $space-3;
  border-radius: $radius-full;
  background: rgba($stb-accent, 0.1);
  color: $stb-accent;
  font-size: $font-size-xs;
  font-weight: 700;
  border: 1px solid rgba($stb-accent, 0.25);
}

.badge {
  font-size: 0.7rem;
  padding: 3px 10px;
  border-radius: $radius-full;
  font-weight: 600;
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

.notes-cell {
  max-width: 180px;
  @include truncate;
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.actions-cell {
  display: flex;
  gap: $space-1;
  align-items: center;
  justify-content: flex-end;
}

.modal-md {
  max-width: 520px;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-5;
  padding: $space-5;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $stb-text-secondary;
  }
}

.info-banner {
  @include flex(row, flex-start, flex-start, $space-3);
  padding: $space-3 $space-4;
  background: rgba($stb-info, 0.07);
  border: 1px solid rgba($stb-info, 0.2);
  border-radius: $radius-md;
  color: $stb-info;
  font-size: $font-size-xs;
  line-height: 1.7;
  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
  p {
    color: $stb-text-secondary;
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

.date-input-wrapper {
  position: relative;
  width: 100%;
  .date-input {
    width: 100%;
    padding: $space-3 $space-4;
    padding-left: $space-10;
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
    &:focus {
      border-color: $stb-accent;
      box-shadow: 0 0 0 3px rgba($stb-accent, 0.1);
    }
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
