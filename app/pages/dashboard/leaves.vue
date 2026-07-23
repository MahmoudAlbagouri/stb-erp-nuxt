<!-- pages/leaves/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>طلبات الإجازات</h1>
        <p>تقديم ومتابعة طلبات الإجازات الخاصة بي</p>
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
          <Plus :size="18" /><span>طلب إجازة جديد</span>
        </button>
      </div>
    </div>

    <!-- ══ Stats Cards ═════════════════════════════════════════════════════ -->
    <div class="grid-3 stats-row">
      <div class="stat-card stat-pending">
        <div class="stat-card__icon"><Hourglass :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ pendingCount }}</div>
          <div class="stat-card__label">طلباتي المعلقة</div>
        </div>
      </div>
      <div class="stat-card stat-approved">
        <div class="stat-card__icon"><CheckCircle2 :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ approvedCount }}</div>
          <div class="stat-card__label">تمت الموافقة</div>
        </div>
      </div>
      <div class="stat-card stat-rejected">
        <div class="stat-card__icon"><XCircle :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ rejectedCount }}</div>
          <div class="stat-card__label">مرفوضة</div>
        </div>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!--  Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.requests.length" class="card empty-card">
      <div class="empty-state">
        <CalendarDays :size="40" class="empty-icon" />
        <div class="empty-state__title">لا توجد طلبات إجازات</div>
        <div class="empty-state__text">ابدأ بتقديم طلب إجازة جديد</div>
        <button class="btn btn--primary mt-4" @click="openCreateModal">
          <Plus :size="16" /> طلب إجازة
        </button>
      </div>
    </div>

    <!-- ═ Requests Table ═══════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>من تاريخ</th>
              <th>إلى تاريخ</th>
              <th>عدد الأيام</th>
              <th>النوع</th>
              <th>السبب</th>
              <th>الحالة</th>
              <th>تاريخ الطلب</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in store.requests" :key="req.id">
              <td class="font-medium">{{ getEmployeeName(req) }}</td>
              <td>{{ formatDate(req.startDate) }}</td>
              <td>{{ formatDate(req.endDate) }}</td>
              <td>{{ calculateDays(req.startDate, req.endDate) }} يوم</td>
              <td>
                <span class="badge badge--neutral">{{
                  getTypeLabel(req.type)
                }}</span>
              </td>
              <td>{{ req.reason || "-" }}</td>
              <td>
                <span :class="`badge badge--${req.status}`">{{
                  getStatusLabel(req.status)
                }}</span>
              </td>
              <td>{{ formatDate(req.createdAt) }}</td>
              <td>
                <div class="actions-cell">
                  <!-- ✅ قائمة التصدير المنسدلة -->
                  <div class="export-dropdown">
                    <button
                      class="btn btn--ghost btn--sm export-btn"
                      @click="toggleExportMenu(req.id)"
                    >
                      <Download :size="14" />
                    </button>
                    <Transition name="fade">
                      <div
                        v-if="activeExportMenu === req.id"
                        class="dropdown-menu"
                      >
                        <button @click="downloadLeave(req.id, 'pdf')">
                          <FileText :size="14" /> ملف PDF
                        </button>
                        <button @click="downloadLeave(req.id, 'excel')">
                          <FileSpreadsheet :size="14" /> ملف Excel
                        </button>
                      </div>
                    </Transition>
                  </div>

                  <div v-if="req.status === 'pending'" class="approval-actions">
                    <button
                      class="btn btn--success btn--sm"
                      @click="triggerApprove(req)"
                      title="موافقة"
                    >
                      <Check :size="14" />
                    </button>
                    <button
                      class="btn btn--danger btn--sm"
                      @click="triggerReject(req)"
                      title="رفض"
                    >
                      <X :size="14" />
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═ Create Leave Modal ═══════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateModal"
          class="modal-overlay"
          @click.self="showCreateModal = false"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                <CalendarPlus :size="20" class="modal-icon" /> طلب إجازة جديد
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showCreateModal = false"
                aria-label="إغلاق"
              >
                <X :size="20" />
              </button>
            </div>
            <form @submit.prevent="handleCreateLeave" class="modal-form">
              <div class="grid-2">
                <div class="form-group">
                  <label>تاريخ البداية *</label
                  ><input
                    v-model="createForm.startDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>تاريخ النهاية *</label
                  ><input
                    v-model="createForm.endDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group full-width">
                  <label>نوع الإجازة *</label
                  ><select
                    v-model="createForm.type"
                    class="form-select"
                    required
                  >
                    <option
                      v-for="opt in leaveTypeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="form-group full-width">
                  <label>سبب الإجازة</label
                  ><textarea
                    v-model="createForm.reason"
                    class="form-input textarea-resize"
                    rows="3"
                    placeholder="اكتب سبب الإجازة هنا..."
                  ></textarea>
                </div>
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showCreateModal = false"
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
      title="تأكيد الموافقة"
      :message="`هل أنت متأكد من الموافقة على إجازة ${currentActionTarget?.employee?.fullName || ''}؟`"
      confirm-text="موافقة"
      :loading="actionLoading"
      @confirm="executeApprove"
    />
    <ConfirmDialog
      v-model="showRejectConfirm"
      title="تأكيد الرفض"
      :message="`هل أنت متأكد من رفض إجازة ${currentActionTarget?.employee?.fullName || ''}؟ لا يمكن التراجع عن هذا الإجراء.`"
      confirm-text="رفض"
      :loading="actionLoading"
      @confirm="executeReject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useLeavesStore } from "@/stores/leaves";
import { useToast } from "../../composables/useToast";
import type { CreateLeavePayload, LeaveRequest } from "@/types";
import ConfirmDialog from "@/components/global/ConfirmDialog.vue";
import {
  Plus,
  Hourglass,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Check,
  X,
  CalendarPlus,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useLeavesStore();
const toast = useToast();

const showCreateModal = ref(false);
const submitting = ref(false);
const showApproveConfirm = ref(false);
const showRejectConfirm = ref(false);
const actionLoading = ref(false);
const currentActionTarget = ref<LeaveRequest | null>(null);

// ✅ حالة التصدير
const exporting = ref<"excel" | "pdf" | null>(null);
const activeExportMenu = ref<string | null>(null);

const leaveTypeOptions: { value: CreateLeavePayload["type"]; label: string }[] =
  [
    { value: "annual", label: "سنوية" },
    { value: "unpaid", label: "بدون راتب" },
    { value: "other", label: "أخرى" },
  ];

const createForm = reactive<CreateLeavePayload>({
  startDate: "",
  endDate: "",
  type: "annual",
  reason: "",
});

const pendingCount = computed(
  () => store.requests.filter((r) => r.status === "pending").length,
);
const approvedCount = computed(
  () => store.requests.filter((r) => r.status === "approved").length,
);
const rejectedCount = computed(
  () => store.requests.filter((r) => r.status === "rejected").length,
);

const getEmployeeName = (req: any) =>
  req.employee?.fullName || req.employeeName || "-";
const getStatusLabel = (status: string) =>
  ({ pending: "قيد الانتظار", approved: "موافق عليه", rejected: "مرفوض" })[
    status
  ] || status;
const getTypeLabel = (type?: string) =>
  ({ annual: "سنوية", unpaid: "بدون راتب", other: "أخرى" })[type || ""] || "-";
const formatDate = (dateStr: string) =>
  dateStr ? new Date(dateStr).toLocaleDateString("ar-SA") : "-";
const calculateDays = (start: string, end: string) =>
  start && end
    ? Math.ceil(
        Math.abs(new Date(end).getTime() - new Date(start).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1
    : 0;

const openCreateModal = () => {
  Object.assign(createForm, {
    startDate: "",
    endDate: "",
    type: "annual",
    reason: "",
  });
  showCreateModal.value = true;
};

const handleCreateLeave = async () => {
  submitting.value = true;
  try {
    await store.createMyLeave(createForm);
    toast.success("تم إرسال طلب الإجازة بنجاح");
    showCreateModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الإرسال");
  } finally {
    submitting.value = false;
  }
};

const triggerApprove = (req: LeaveRequest) => {
  currentActionTarget.value = req;
  showApproveConfirm.value = true;
};
const executeApprove = async () => {
  if (!currentActionTarget.value) return;
  actionLoading.value = true;
  try {
    await store.updateStatus(currentActionTarget.value.id, "approved");
    toast.success("تمت الموافقة على الإجازة بنجاح");
    showApproveConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في تنفيذ الموافقة");
  } finally {
    actionLoading.value = false;
  }
};
const triggerReject = (req: LeaveRequest) => {
  currentActionTarget.value = req;
  showRejectConfirm.value = true;
};
const executeReject = async () => {
  if (!currentActionTarget.value) return;
  actionLoading.value = true;
  try {
    await store.updateStatus(currentActionTarget.value.id, "rejected");
    toast.success("تم رفض الإجازة");
    showRejectConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في تنفيذ الرفض");
  } finally {
    actionLoading.value = false;
  }
};

// ✅ منطق التصدير
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
const downloadLeave = async (id: string, type: "excel" | "pdf") => {
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
  &.stat-rejected .stat-card__icon {
    background: rgba($stb-danger, 0.12);
    color: $stb-danger;
  }
}
.empty-card .empty-state {
  padding: $space-10 $space-4;
}
.empty-icon {
  color: $stb-text-muted;
  opacity: 0.4;
  margin-bottom: $space-3;
}
.table-card {
  padding: 0;
  overflow: hidden;
}
.table-responsive {
  overflow-x: auto;
  @include scrollbar;
}
.actions-cell {
  @include flex(row, center, flex-start, $space-2);
}
.approval-actions {
  display: flex;
  gap: $space-1;
}

// ✅ تنسيق قائمة التصدير
.export-dropdown {
  position: relative;
  display: inline-block;
}
.export-btn {
  color: $stb-accent;
  &:hover {
    background: rgba($stb-accent, 0.1);
    color: $stb-accent;
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

.modal-md {
  max-width: 560px;
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
.mt-4 {
  margin-top: $space-4 !important;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
.data-table td div {
  line-height: 1.4;
}
.font-medium {
  font-weight: 600;
}
</style>
