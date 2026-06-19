<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة الرواتب</h1>
        <p>تعيين وتحديث هياكل الرواتب والبدلات للموظفين</p>
      </div>
      <button class="btn btn--primary" @click="openCreateModal">
        <span>+</span> تعيين راتب جديد
      </button>
    </div>

    <!-- ══ Stats Cards ══════════════════════════════════════════════════════ -->
    <div class="grid-3" style="margin-bottom: 2rem">
      <div class="stat-card">
        <div
          class="stat-card__icon"
          style="background: rgba(16, 185, 129, 0.1); color: #10b981"
        >
          💰
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ totalPayroll }}</div>
          <div class="stat-card__label">إجمالي كشوف المرتبات</div>
        </div>
      </div>
      <div class="stat-card">
        <div
          class="stat-card__icon"
          style="background: rgba(59, 130, 246, 0.1); color: #3b82f6"
        >
          👥
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.salaries.length }}</div>
          <div class="stat-card__label">عدد الموظفين المسجلين</div>
        </div>
      </div>
      <div class="stat-card">
        <div
          class="stat-card__icon"
          style="background: rgba(245, 158, 11, 0.1); color: #f59e0b"
        >
          📈
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ avgSalary }}</div>
          <div class="stat-card__label">متوسط الراتب</div>
        </div>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading || employeesStore.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.salaries.length" class="card">
      <div class="empty-state">
        <div class="empty-state__icon">💵</div>
        <div class="empty-state__title">لا توجد بيانات رواتب</div>
        <div class="empty-state__text">قم بتعيين الرواتب للموظفين للبدء</div>
        <button
          class="btn btn--primary"
          style="margin-top: 1rem"
          @click="openCreateModal"
        >
          تعيين راتب
        </button>
      </div>
    </div>

    <!-- ══ Salaries Table ═══════════════════════════════════════════════════ -->
    <div v-else class="card" style="padding: 0; overflow: hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th>الموظف</th>
            <th>الراتب الأساسي</th>
            <th>بدل السكن</th>
            <th>بدل النقل</th>
            <th>بدلات أخرى</th>
            <th>إجمالي الراتب</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sal in store.salaries" :key="sal.id">
            <td>
              <div style="font-weight: 600; color: var(--stb-text-primary)">
                {{ getEmployeeName(sal.employeeId) }}
              </div>
              <div style="font-size: 0.75rem; color: var(--stb-text-muted)">
                {{ sal.employee?.jobTitle || "-" }}
              </div>
            </td>
            <td>{{ formatCurrency(sal.basicSalary) }}</td>
            <td>{{ formatCurrency(sal.housingAllowance) }}</td>
            <td>{{ formatCurrency(sal.transportAllowance) }}</td>
            <td>{{ formatCurrency(sal.otherAllowances) }}</td>
            <td style="font-weight: bold; color: var(--stb-success)">
              {{ formatCurrency(sal.totalSalary) }}
            </td>
            <td>
              <button
                class="btn btn--sm btn--ghost"
                style="
                  border-color: var(--stb-accent);
                  color: var(--stb-accent);
                "
                @click="openEditModal(sal)"
              >
                تعديل
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ Salary Modal (Create & Edit) ═════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>{{ isEditing ? "تعديل هيكل الراتب" : "تعيين راتب جديد" }}</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                ✕
              </button>
            </div>

            <form @submit.prevent="handleSubmit">
              <div class="grid-2">
                <!-- اختيار الموظف (يظهر فقط عند الإنشاء) -->
                <div
                  v-if="!isEditing"
                  class="form-group"
                  style="grid-column: span 2"
                >
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

                <!-- الراتب الأساسي -->
                <div class="form-group">
                  <label>الراتب الأساسي *</label>
                  <input
                    v-model.number="form.basicSalary"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    required
                    min="0"
                    step="100"
                  />
                </div>

                <!-- بدل السكن -->
                <div class="form-group">
                  <label>بدل السكن</label>
                  <input
                    v-model.number="form.housingAllowance"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    min="0"
                    step="50"
                  />
                </div>

                <!-- بدل النقل -->
                <div class="form-group">
                  <label>بدل النقل</label>
                  <input
                    v-model.number="form.transportAllowance"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    min="0"
                    step="50"
                  />
                </div>

                <!-- بدلات أخرى -->
                <div class="form-group">
                  <label>بدلات أخرى</label>
                  <input
                    v-model.number="form.otherAllowances"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    min="0"
                    step="50"
                  />
                </div>

                <!-- ملخص سريع -->
                <div
                  class="card"
                  style="
                    grid-column: span 2;
                    padding: 1rem;
                    background: rgba(16, 185, 129, 0.05);
                    border-color: rgba(16, 185, 129, 0.2);
                  "
                >
                  <div
                    style="
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    "
                  >
                    <span
                      style="
                        font-size: 0.9rem;
                        color: var(--stb-text-secondary);
                      "
                      >إجمالي الراتب:</span
                    >
                    <span
                      style="
                        font-weight: bold;
                        color: var(--stb-success);
                        font-size: 1.2rem;
                      "
                    >
                      {{ formatCurrency(calculateTotal) }}
                    </span>
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
                  <span v-if="submitting" class="spinner" />
                  <span v-else>{{
                    isEditing ? "حفظ التغييرات" : "تعيين الراتب"
                  }}</span>
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
import { useSalariesStore } from "../../stores/salaries";
import { useEmployeesStore } from "../../stores/employees";
import { useToast } from "../../composables/useToast";
import type {
  CreateSalaryPayload,
  UpdateSalaryPayload,
  Salary,
} from "../../types";

definePageMeta({ middleware: "auth" });

const store = useSalariesStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

// ─── State ──────────────────────────────────────────────────────────────────

const showModal = ref(false);
const submitting = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const EMPTY_FORM: CreateSalaryPayload = {
  employeeId: "",
  basicSalary: 0,
  housingAllowance: 0,
  transportAllowance: 0,
  otherAllowances: 0,
};

const form = reactive({ ...EMPTY_FORM });

// ─── Computed ───────────────────────────────────────────────────────────────

// حساب الإجمالي تلقائياً
const calculateTotal = computed(() => {
  return (
    (form.basicSalary || 0) +
    (form.housingAllowance || 0) +
    (form.transportAllowance || 0) +
    (form.otherAllowances || 0)
  );
});

// إحصائيات
const totalPayroll = computed(() => {
  return store.salaries
    .reduce((sum, s) => sum + Number(s.totalSalary), 0)
    .toLocaleString("ar-SA");
});

const avgSalary = computed(() => {
  if (!store.salaries.length) return 0;
  const total = store.salaries.reduce(
    (sum, s) => sum + Number(s.totalSalary),
    0,
  );
  return Math.round(total / store.salaries.length).toLocaleString("ar-SA");
});

// تصفية الموظفين الذين ليس لديهم راتب مسجل (للإنشاء الجديد)
const availableEmployees = computed(() => {
  const salaryIds = new Set(store.salaries.map((s) => s.employeeId));
  return employeesStore.employees.filter((emp) => !salaryIds.has(emp.id));
});

// ─── Actions ───────────────────────────────────────────────────────────────

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
      // وضع التعديل
      const payload: UpdateSalaryPayload = {
        basicSalary: form.basicSalary,
        housingAllowance: form.housingAllowance,
        transportAllowance: form.transportAllowance,
        otherAllowances: form.otherAllowances,
      };
      await store.update(editingId.value, payload);
      toast.success("تم تحديث الراتب بنجاح");
    } else {
      // وضع الإنشاء
      if (!form.employeeId) {
        toast.error("يرجى اختيار الموظف");
        return;
      }
      await store.create(form as CreateSalaryPayload);
      toast.success("تم تعيين الراتب بنجاح");
    }
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الحفظ");
  } finally {
    submitting.value = false;
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const getEmployeeName = (id: string) => {
  const emp = employeesStore.employees.find((e) => e.id === id);
  return emp ? emp.fullName : "غير محدد";
};

const formatCurrency = (val: number | string) => {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
  }).format(Number(val));
};

// ─── Init ──────────────────────────────────────────────────────────────────

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
</style>
