<!-- pages/salaries/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة الأجور</h1>
        <p>تعيين وتحديث هياكل الأجور والبدلات للموظفين</p>
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
          <Plus :size="18" /><span>تعيين الأجر جديد</span>
        </button>
      </div>
    </div>

    <!-- ══ Stats Cards ══════════════════════════════════════════════════════ -->
    <div class="grid-3 stats-row">
      <div class="stat-card stat-total">
        <div class="stat-card__icon"><Banknote :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ totalPayroll }} ر.س</div>
          <div class="stat-card__label">إجمالي الرواتب</div>
        </div>
      </div>
      <div class="stat-card stat-count">
        <div class="stat-card__icon"><Users :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.salaries.length }}</div>
          <div class="stat-card__label">عدد الموظفين المسجلين</div>
        </div>
      </div>
      <div class="stat-card stat-avg">
        <div class="stat-card__icon"><TrendingUp :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ avgSalary }} ر.س</div>
          <div class="stat-card__label">متوسط الأجر</div>
        </div>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading || employeesStore.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ═ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.salaries.length" class="card empty-card">
      <div class="empty-state">
        <Wallet :size="40" class="empty-icon" />
        <div class="empty-state__title">لا توجد بيانات رواتب</div>
        <div class="empty-state__text">قم بتعيين الأجور للموظفين للبدء</div>
        <button class="btn btn--primary mt-4" @click="openCreateModal">
          <Plus :size="16" /> تعيين أجر
        </button>
      </div>
    </div>

    <!-- ══ Salaries Table ═════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الأجر الأساسي</th>
              <th>بدل السكن</th>
              <th>بدل النقل</th>
              <th>بدلات أخرى</th>
              <th>إجمالي الأجر</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sal in store.salaries" :key="sal.id">
              <td>
                <div class="employee-cell">
                  <span class="employee-name">{{
                    getEmployeeName(sal.employeeId)
                  }}</span>
                  <span class="employee-job">{{
                    sal.employee?.jobTitle || "-"
                  }}</span>
                </div>
              </td>
              <td>{{ formatCurrency(sal.basicSalary) }}</td>
              <td>{{ formatCurrency(sal.housingAllowance) }}</td>
              <td>{{ formatCurrency(sal.transportAllowance) }}</td>
              <td>{{ formatCurrency(sal.otherAllowances) }}</td>
              <td class="total-cell">{{ formatCurrency(sal.totalSalary) }}</td>
              <td>
                <div class="actions-cell">
                  <div class="export-dropdown">
                    <button
                      class="btn btn--ghost btn--sm export-btn"
                      @click="toggleExportMenu(sal.id)"
                    >
                      <Download :size="14" />
                    </button>
                    <Transition name="fade">
                      <div
                        v-if="activeExportMenu === sal.id"
                        class="dropdown-menu"
                      >
                        <button @click="downloadSalary(sal.id, 'pdf')">
                          <FileText :size="14" /> ملف PDF
                        </button>
                        <button @click="downloadSalary(sal.id, 'excel')">
                          <FileSpreadsheet :size="14" /> ملف Excel
                        </button>
                      </div>
                    </Transition>
                  </div>
                  <button
                    class="btn btn--accent btn--sm"
                    @click="openEditModal(sal)"
                    title="تعديل الأجر"
                  >
                    <Pencil :size="14" /> تعديل
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═ Salary Modal (Create & Edit) ═════════════════════════════════════ -->
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
                <Wallet :size="20" class="modal-icon" />
                {{ isEditing ? "تعديل هيكل الأجر" : "تعيين أجر جديد" }}
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
                <div v-if="!isEditing" class="form-group full-width">
                  <label>الموظف *</label>
                  <select
                    v-model="form.employeeId"
                    class="form-select"
                    required
                  >
                    <option value="" disabled>اختر الموظف...</option>
                    <option
                      v-for="emp in availableEmployees"
                      :key="emp.id"
                      :value="emp.id"
                    >
                      {{ emp.fullName }} ({{ emp.employeeCode }})
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>الأجر الأساسي *</label
                  ><input
                    v-model.number="form.basicSalary"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    required
                    min="0"
                    step="100"
                  />
                </div>
                <div class="form-group">
                  <label>بدل السكن</label
                  ><input
                    v-model.number="form.housingAllowance"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    min="0"
                    step="50"
                  />
                </div>
                <div class="form-group">
                  <label>بدل النقل</label
                  ><input
                    v-model.number="form.transportAllowance"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    min="0"
                    step="50"
                  />
                </div>
                <div class="form-group">
                  <label>بدلات أخرى</label
                  ><input
                    v-model.number="form.otherAllowances"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    min="0"
                    step="50"
                  />
                </div>
                <div class="summary-card full-width">
                  <div class="summary-content">
                    <span class="summary-label">إجمالي الأجر:</span
                    ><span class="summary-value">{{
                      formatCurrency(calculateTotal)
                    }}</span>
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
                  <span v-if="submitting" class="spinner spinner--sm" /><span
                    v-else
                    >{{ isEditing ? "حفظ التغييرات" : "تعيين الأجر" }}</span
                  >
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
import { ref, reactive, computed, onMounted } from "vue";
import { useSalariesStore } from "@/stores/salaries";
import { useEmployeesStore } from "@/stores/employees";
import { useToast } from "../../composables/useToast";
import type { CreateSalaryPayload, UpdateSalaryPayload, Salary } from "@/types";
import {
  Plus,
  Banknote,
  Users,
  TrendingUp,
  Wallet,
  Pencil,
  X,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useSalariesStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

const showModal = ref(false);
const submitting = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const exporting = ref<"excel" | "pdf" | null>(null);
const activeExportMenu = ref<string | null>(null);

const EMPTY_FORM: CreateSalaryPayload = {
  employeeId: "",
  basicSalary: 0,
  housingAllowance: 0,
  transportAllowance: 0,
  otherAllowances: 0,
};
const form = reactive({ ...EMPTY_FORM });

const calculateTotal = computed(
  () =>
    (Number(form.basicSalary) || 0) +
    (Number(form.housingAllowance) || 0) +
    (Number(form.transportAllowance) || 0) +
    (Number(form.otherAllowances) || 0),
);
const totalPayroll = computed(() =>
  store.salaries
    .reduce((sum, s) => sum + Number(s.totalSalary), 0)
    .toLocaleString("ar-SA"),
);
const avgSalary = computed(() => {
  if (!store.salaries.length) return 0;
  return Math.round(
    store.salaries.reduce((sum, s) => sum + Number(s.totalSalary), 0) /
      store.salaries.length,
  ).toLocaleString("ar-SA");
});
const availableEmployees = computed(() => {
  const ids = new Set(store.salaries.map((s) => s.employeeId));
  return employeesStore.employees.filter((e) => !ids.has(e.id));
});

const openCreateModal = () => {
  isEditing.value = false;
  editingId.value = null;
  Object.assign(form, EMPTY_FORM);
  showModal.value = true;
};
const openEditModal = (salary: Salary) => {
  isEditing.value = true;
  editingId.value = salary.id;
  Object.assign(form, {
    employeeId: salary.employeeId,
    basicSalary: salary.basicSalary,
    housingAllowance: salary.housingAllowance,
    transportAllowance: salary.transportAllowance,
    otherAllowances: salary.otherAllowances,
  });
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, {
        basicSalary: form.basicSalary,
        housingAllowance: form.housingAllowance,
        transportAllowance: form.transportAllowance,
        otherAllowances: form.otherAllowances,
      });
      toast.success("تم تحديث الأجر بنجاح");
    } else {
      if (!form.employeeId) {
        toast.error("يرجى اختيار الموظف");
        return;
      }
      await store.create(form as CreateSalaryPayload);
      toast.success("تم تعيين الأجر بنجاح");
    }
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الحفظ");
  } finally {
    submitting.value = false;
  }
};

const getEmployeeName = (id: string) =>
  employeesStore.employees.find((e) => e.id === id)?.fullName || "غير محدد";
const formatCurrency = (val: any) =>
  new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(Number(val) || 0);

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
const downloadSalary = async (id: string, type: "excel" | "pdf") => {
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
  &.stat-total .stat-card__icon {
    background: rgba($stb-success, 0.12);
    color: $stb-success;
  }
  &.stat-count .stat-card__icon {
    background: rgba($stb-info, 0.12);
    color: $stb-info;
  }
  &.stat-avg .stat-card__icon {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
  }
}
.empty-card .empty-state {
  padding: $space-10 $space-4;
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
.total-cell {
  font-weight: 700;
  color: $stb-success;
  font-size: $font-size-base;
}
.actions-cell {
  display: flex;
  gap: $space-1;
  align-items: center;
  justify-content: flex-start;
}
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
  max-width: 600px;
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
.summary-card {
  background: rgba($stb-success, 0.05);
  border: 1px solid rgba($stb-success, 0.2);
  border-radius: $radius-md;
  padding: $space-4;
}
.summary-content {
  @include flex(row, center, space-between);
  @include respond-to("md") {
    flex-direction: column;
    align-items: flex-start;
    gap: $space-2;
  }
}
.summary-label {
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}
.summary-value {
  font-weight: 800;
  color: $stb-success;
  font-size: $font-size-xl;
}
.mt-4 {
  margin-top: $space-4 !important;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
</style>
