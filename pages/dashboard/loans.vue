<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة القروض</h1>
        <p>متابعة طلبات القروض طويلة الأجل والأقساط</p>
      </div>
      <button class="btn btn--primary" @click="openCreateModal">
        <span>+</span> طلب قرض جديد
      </button>
    </div>

    <!-- ══ Stats Cards ══════════════════════════════════════════════════════ -->
    <div class="grid-3" style="margin-bottom: 2rem">
      <div class="stat-card">
        <div
          class="stat-card__icon"
          style="background: rgba(245, 158, 11, 0.1); color: #f59e0b"
        >
          ⏳
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ pendingCount }}</div>
          <div class="stat-card__label">طلبات معلقة</div>
        </div>
      </div>
      <div class="stat-card">
        <div
          class="stat-card__icon"
          style="background: rgba(16, 185, 129, 0.1); color: #10b981"
        >
          💰
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ totalApprovedAmount }}</div>
          <div class="stat-card__label">إجمالي القروض المعتمدة</div>
        </div>
      </div>
      <div class="stat-card">
        <div
          class="stat-card__icon"
          style="background: rgba(59, 130, 246, 0.1); color: #3b82f6"
        >
          📊
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.loans.length }}</div>
          <div class="stat-card__label">عدد الطلبات الكلي</div>
        </div>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading || employeesStore.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.loans.length" class="card">
      <div class="empty-state">
        <div class="empty-state__icon">🏦</div>
        <div class="empty-state__title">لا توجد طلبات قروض</div>
        <div class="empty-state__text">ابدأ بتقديم طلب قرض جديد</div>
        <button
          class="btn btn--primary"
          style="margin-top: 1rem"
          @click="openCreateModal"
        >
          طلب قرض
        </button>
      </div>
    </div>

    <!-- ══ Loans Table ══════════════════════════════════════════════════════ -->
    <div v-else class="card" style="padding: 0; overflow: hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th>الموظف</th>
            <th>مبلغ القرض</th>
            <th>عدد الأقساط</th>
            <th>القسط الشهري</th>
            <th>السبب</th>
            <th>الحالة</th>
            <th>تاريخ الطلب</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loan in store.loans" :key="loan.id">
            <td>
              <div style="font-weight: 600; color: var(--stb-text-primary)">
                {{ getEmployeeName(loan.employeeId) }}
              </div>
              <div style="font-size: 0.75rem; color: var(--stb-text-muted)">
                {{ loan.employee?.jobTitle || "-" }}
              </div>
            </td>
            <td style="font-weight: bold; color: var(--stb-accent)">
              {{ formatCurrency(loan.totalAmount) }}
            </td>
            <td>{{ loan.installmentsCount }} شهر</td>
            <td>{{ formatCurrency(loan.monthlyInstallment) }}</td>
            <td>
              <span
                v-if="loan.reason"
                style="font-size: 0.8rem; color: var(--stb-text-secondary)"
              >
                {{ loan.reason.substring(0, 30)
                }}{{ loan.reason.length > 30 ? "..." : "" }}
              </span>
              <span v-else>-</span>
            </td>
            <td>
              <span :class="`badge badge--${loan.status}`">
                {{ getStatusLabel(loan.status) }}
              </span>
            </td>
            <td>{{ formatDate(loan.createdAt) }}</td>
            <td>
              <div style="display: flex; gap: 0.5rem">
                <!-- ✅ تم إزالة شرط auth.isSuperAdmin لضمان ظهور الأزرار -->
                <template v-if="loan.status === 'pending'">
                  <button
                    class="btn btn--sm btn--primary"
                    style="padding: 2px 8px; font-size: 0.7rem"
                    @click="approveLoan(loan.id)"
                  >
                    موافقة
                  </button>
                  <button
                    class="btn btn--sm btn--danger"
                    style="padding: 2px 8px; font-size: 0.7rem"
                    @click="rejectLoan(loan.id)"
                  >
                    رفض
                  </button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ Create Loan Modal ════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>طلب قرض جديد</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                ✕
              </button>
            </div>

            <form @submit.prevent="handleSubmit">
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

                <!-- السبب -->
                <div class="form-group" style="grid-column: span 2">
                  <label>سبب القرض</label>
                  <textarea
                    v-model="form.reason"
                    class="form-input"
                    rows="3"
                    placeholder="اكتب سبب الطلب هنا (مثال: قرض سكني، زواج...)"
                  ></textarea>
                </div>

                <!-- ملخص سريع -->
                <div
                  v-if="form.totalAmount && form.installmentsCount"
                  class="card"
                  style="
                    grid-column: span 2;
                    padding: 1rem;
                    background: rgba(0, 170, 255, 0.05);
                    border-color: rgba(0, 170, 255, 0.2);
                  "
                >
                  <div
                    style="font-size: 0.9rem; color: var(--stb-text-secondary)"
                  >
                    قيمة القسط الشهري التقريبية:
                    <span
                      style="
                        font-weight: bold;
                        color: var(--stb-accent);
                        font-size: 1.1rem;
                      "
                    >
                      {{
                        formatCurrency(
                          form.totalAmount / form.installmentsCount,
                        )
                      }}
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
                  <span v-else>إرسال الطلب</span>
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
import { useLoansStore } from "../../stores/loans";
import { useEmployeesStore } from "../../stores/employees";
import { useToast } from "../../composables/useToast";
import type { CreateLoanPayload } from "../../types";

definePageMeta({ middleware: "auth" });

const store = useLoansStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

// ─── State ──────────────────────────────────────────────────────────────────

const showModal = ref(false);
const submitting = ref(false);

const EMPTY_FORM: CreateLoanPayload = {
  totalAmount: 0,
  installmentsCount: 12,
  reason: "",
};

const form = reactive({ ...EMPTY_FORM });

// ─── Computed Stats ────────────────────────────────────────────────────────

const pendingCount = computed(
  () => store.loans.filter((l) => l.status === "pending").length,
);
const totalApprovedAmount = computed(() => {
  return store.loans
    .filter((l) => l.status === "approved" || l.status === "paid")
    .reduce((sum, l) => sum + Number(l.totalAmount), 0)
    .toLocaleString("ar-SA");
});

// ─── Actions ───────────────────────────────────────────────────────────────

const openCreateModal = () => {
  Object.assign(form, EMPTY_FORM);
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    // استخدام دالة الموظف الذاتي فقط
    await store.createMyLoan(form);
    toast.success("تم تقديم طلب القرض بنجاح");
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الإرسال");
  } finally {
    submitting.value = false;
  }
};

const approveLoan = async (id: string) => {
  if (!confirm("هل أنت متأكد من الموافقة على هذا القرض؟")) return;
  try {
    await store.updateStatus(id, "approved");
    toast.success("تمت الموافقة على القرض");
  } catch (e: any) {
    toast.error(e.message);
  }
};

const rejectLoan = async (id: string) => {
  if (!confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;
  try {
    await store.updateStatus(id, "rejected");
    toast.success("تم رفض الطلب");
  } catch (e: any) {
    toast.error(e.message);
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const getEmployeeName = (id: string) => {
  const emp = employeesStore.employees.find((e) => e.id === id);
  return emp ? emp.fullName : "غير محدد";
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    approved: "موافق عليه",
    rejected: "مرفوض",
    paid: "تم السداد",
  };
  return map[status] || status;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA");
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
