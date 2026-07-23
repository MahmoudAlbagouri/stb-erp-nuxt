<!-- pages/advances/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة السلف</h1>
        <p>متابعة طلبات السلف المالية ومواعيد السداد</p>
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
          <Plus :size="18" /><span>طلب سلفة جديدة</span>
        </button>
      </div>
    </div>

    <!-- ═ Stats Cards ═════════════════════════════════════════════════════ -->
    <div class="grid-3 stats-row">
      <div class="stat-card stat-pending">
        <div class="stat-card__icon"><Hourglass :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ pendingCount }}</div>
          <div class="stat-card__label">طلبات معلقة</div>
        </div>
      </div>
      <div class="stat-card stat-approved">
        <div class="stat-card__icon"><Banknote :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ totalAmount }} ر.س</div>
          <div class="stat-card__label">إجمالي المعتمدة</div>
        </div>
      </div>
      <div class="stat-card stat-total">
        <div class="stat-card__icon"><BarChart3 :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.advances.length }}</div>
          <div class="stat-card__label">إجمالي الطلبات</div>
        </div>
      </div>
    </div>

    <!--  Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading || employeesStore.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ═ Empty State ═════════════════════════════════════════════════════ -->
    <div v-else-if="!store.advances.length" class="card empty-card">
      <div class="empty-state">
        <HandCoins :size="40" class="empty-icon" />
        <div class="empty-state__title">لا توجد طلبات سلف</div>
        <div class="empty-state__text">ابدأ بتقديم طلب سلفة جديد للموظفين</div>
        <button class="btn btn--primary mt-4" @click="openCreateModal">
          <Plus :size="16" /> طلب سلفة
        </button>
      </div>
    </div>

    <!-- ═ Advances Table ══════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>المبلغ</th>
              <th>السبب</th>
              <th>تاريخ السداد</th>
              <th>الحالة</th>
              <th>تاريخ الطلب</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="adv in store.advances" :key="adv.id">
              <td>
                <div class="employee-cell">
                  <span class="employee-name">{{
                    getEmployeeName(adv.employeeId)
                  }}</span
                  ><span class="employee-job">{{
                    adv.employee?.jobTitle || "-"
                  }}</span>
                </div>
              </td>
              <td class="amount-cell">{{ formatCurrency(adv.amount) }}</td>
              <td>
                <span v-if="adv.reason" class="reason-text">{{
                  truncateText(adv.reason, 30)
                }}</span
                ><span v-else class="text-muted">-</span>
              </td>
              <td>
                <span
                  v-if="adv.repaymentDate"
                  class="badge badge--trial date-badge"
                  >{{ formatDate(adv.repaymentDate) }}</span
                ><span v-else class="text-muted text-xs">غير محدد</span>
              </td>
              <td>
                <span :class="`badge badge--${adv.status}`">{{
                  getStatusLabel(adv.status)
                }}</span>
              </td>
              <td>{{ formatDate(adv.createdAt) }}</td>

              <!-- ✅ خانة الإجراءات المعدلة: التصدير دائماً + أزرار الموافقة عند الحاجة -->
              <td>
                <div class="actions-cell">
                  <!-- زر التصدير الفردي يظهر دائماً -->
                  <div class="export-dropdown">
                    <button
                      class="btn btn--ghost btn--sm export-btn"
                      @click="toggleExportMenu(adv.id)"
                      title="تصدير التقرير"
                    >
                      <Download :size="14" />
                    </button>
                    <Transition name="fade">
                      <div
                        v-if="activeExportMenu === adv.id"
                        class="dropdown-menu"
                      >
                        <button @click="downloadAdvance(adv.id, 'pdf')">
                          <FileText :size="14" /> ملف PDF
                        </button>
                        <button @click="downloadAdvance(adv.id, 'excel')">
                          <FileSpreadsheet :size="14" /> ملف Excel
                        </button>
                      </div>
                    </Transition>
                  </div>

                  <!-- أزرار الموافقة والرفض تظهر فقط للسلف المعلقة -->
                  <template v-if="adv.status === 'pending'">
                    <button
                      class="btn btn--success btn--sm"
                      @click="triggerApprove(adv)"
                      title="موافقة"
                    >
                      <Check :size="14" />
                    </button>
                    <button
                      class="btn btn--danger btn--sm"
                      @click="triggerReject(adv)"
                      title="رفض"
                    >
                      <X :size="14" />
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═ Create Advance Modal ═════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                <HandCoins :size="20" class="modal-icon" /> طلب سلفة جديدة
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
                <div class="form-group">
                  <label>مبلغ السلفة *</label
                  ><input
                    v-model.number="form.amount"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    required
                    min="1"
                    step="0.01"
                  />
                </div>
                <div class="form-group">
                  <label>تاريخ السداد المتوقع *</label
                  ><input
                    v-model="form.repaymentDate"
                    type="date"
                    class="form-input"
                    required
                  /><small class="form-hint"
                    >سيتم خصم المبلغ من راتب هذا الشهر</small
                  >
                </div>
                <div class="form-group full-width">
                  <label>سبب السلفة</label
                  ><textarea
                    v-model="form.reason"
                    class="form-input textarea-resize"
                    rows="3"
                    placeholder="اكتب سبب الطلب هنا..."
                  ></textarea>
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
      title="تأكيد الموافقة على السلفة"
      :message="`هل أنت متأكد من اعتماد سلفة بقيمة ${formatCurrency(currentAdvanceTarget?.amount || 0)} للموظف ${getEmployeeName(currentAdvanceTarget?.employeeId || '')}؟`"
      confirm-text="اعتماد السلفة"
      :loading="actionLoading"
      @confirm="executeApprove"
    />
    <ConfirmDialog
      v-model="showRejectConfirm"
      title="تأكيد رفض السلفة"
      :message="`هل أنت متأكد من رفض طلب سلفة الموظف ${getEmployeeName(currentAdvanceTarget?.employeeId || '')}؟ لا يمكن التراجع عن هذا الإجراء.`"
      confirm-text="رفض الطلب"
      :loading="actionLoading"
      @confirm="executeReject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useAdvancesStore } from "@/stores/advances";
import { useEmployeesStore } from "@/stores/employees";
import { useToast } from "../../composables/useToast";
import ConfirmDialog from "@/components/global/ConfirmDialog.vue";
import {
  Plus,
  Hourglass,
  Banknote,
  BarChart3,
  HandCoins,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useAdvancesStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

const showModal = ref(false);
const submitting = ref(false);
const showApproveConfirm = ref(false);
const showRejectConfirm = ref(false);
const actionLoading = ref(false);
const currentAdvanceTarget = ref<any | null>(null);

// ✅ حالة التصدير
const exporting = ref<"excel" | "pdf" | null>(null);
const activeExportMenu = ref<string | null>(null);

const EMPTY_FORM = { amount: 0, reason: "", repaymentDate: "" };
const form = reactive({ ...EMPTY_FORM });

const pendingCount = computed(
  () => store.advances.filter((a) => a.status === "pending").length,
);
const totalAmount = computed(() => {
  return store.advances
    .filter((a) => a.status === "approved" || a.status === "paid")
    .reduce((sum, a) => sum + Number(a.amount), 0)
    .toLocaleString("ar-SA");
});

const openCreateModal = () => {
  Object.assign(form, EMPTY_FORM);
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  form.repaymentDate = String(nextMonth.toISOString().split("T")[0]);
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    await store.createMyAdvance(form);
    toast.success("تم تقديم طلب السلفة بنجاح");
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الإرسال");
  } finally {
    submitting.value = false;
  }
};

const triggerApprove = (adv: any) => {
  currentAdvanceTarget.value = adv;
  showApproveConfirm.value = true;
};
const executeApprove = async () => {
  if (!currentAdvanceTarget.value) return;
  actionLoading.value = true;
  try {
    await store.updateStatus(currentAdvanceTarget.value.id, "approved");
    toast.success("تمت الموافقة على السلفة بنجاح");
    showApproveConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في تنفيذ الموافقة");
  } finally {
    actionLoading.value = false;
  }
};

const triggerReject = (adv: any) => {
  currentAdvanceTarget.value = adv;
  showRejectConfirm.value = true;
};
const executeReject = async () => {
  if (!currentAdvanceTarget.value) return;
  actionLoading.value = true;
  try {
    await store.updateStatus(currentAdvanceTarget.value.id, "rejected");
    toast.success("تم رفض طلب السلفة");
    showRejectConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في تنفيذ الرفض");
  } finally {
    actionLoading.value = false;
  }
};

const getEmployeeName = (id: string) =>
  employeesStore.employees.find((e) => e.id === id)?.fullName || "-";
const getStatusLabel = (status: string) =>
  ({
    pending: "قيد الانتظار",
    approved: "معتمدة",
    rejected: "مرفوضة",
    paid: "مدفوعة",
  })[status] || status;
const formatDate = (dateStr: string | undefined) =>
  dateStr ? new Date(dateStr).toLocaleDateString("ar-SA") : "-";
const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(
    Number(val),
  );
const truncateText = (text: string, limit: number) =>
  text?.length > limit ? text.substring(0, limit) + "..." : text || "-";

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
const downloadAdvance = async (id: string, type: "excel" | "pdf") => {
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
.reason-text {
  font-size: $font-size-xs;
  color: $stb-text-secondary;
}
.date-badge {
  direction: ltr;
  display: inline-flex;
}
.actions-cell {
  @include flex(row, center, flex-start, $space-2);
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
.form-hint {
  color: $stb-text-muted;
  font-size: $font-size-xs;
  margin-top: 4px;
  display: block;
}
.mt-4 {
  margin-top: $space-4 !important;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
</style>
