<template>
  <div class="page-container">
    <!-- ══ Page Header ═════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة السلف</h1>
        <p>متابعة طلبات السلف المالية ومواعيد السداد</p>
      </div>
      <button class="btn btn--primary" @click="openCreateModal">
        <span>+</span> طلب سلفة جديدة
      </button>
    </div>

    <!-- ═ Stats Cards ══════════════════════════════════════════════════════ -->
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
          <div class="stat-card__value">{{ totalAmount }}</div>
          <div class="stat-card__label">إجمالي المبالغ المعتمدة</div>
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
          <div class="stat-card__value">{{ store.advances.length }}</div>
          <div class="stat-card__label">إجمالي الطلبات</div>
        </div>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading || employeesStore.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.advances.length" class="card">
      <div class="empty-state">
        <div class="empty-state__icon">💸</div>
        <div class="empty-state__title">لا توجد طلبات سلف</div>
        <div class="empty-state__text">ابدأ بتقديم طلب سلفة جديد للموظفين</div>
        <button
          class="btn btn--primary"
          style="margin-top: 1rem"
          @click="openCreateModal"
        >
          طلب سلفة
        </button>
      </div>
    </div>

    <!-- ══ Advances Table ═══════════════════════════════════════════════════ -->
    <div v-else class="card" style="padding: 0; overflow: hidden">
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
              <div style="font-weight: 600; color: var(--stb-text-primary)">
                {{ getEmployeeName(adv.employeeId) }}
              </div>
              <div style="font-size: 0.75rem; color: var(--stb-text-muted)">
                {{ adv.employee?.jobTitle || "-" }}
              </div>
            </td>
            <td style="font-weight: bold; color: var(--stb-accent)">
              {{ formatCurrency(adv.amount) }}
            </td>
            <td>
              <span
                v-if="adv.reason"
                style="font-size: 0.8rem; color: var(--stb-text-secondary)"
              >
                {{ adv.reason.substring(0, 30)
                }}{{ adv.reason.length > 30 ? "..." : "" }}
              </span>
              <span v-else>-</span>
            </td>
            <td>
              <span
                v-if="adv.repaymentDate"
                class="badge badge--trial"
                style="direction: ltr"
              >
                {{ formatDate(adv.repaymentDate) }}
              </span>
              <span v-else class="text-muted text-xs">غير محدد</span>
            </td>
            <td>
              <span :class="`badge badge--${adv.status}`">
                {{ getStatusLabel(adv.status) }}
              </span>
            </td>
            <td>{{ formatDate(adv.createdAt) }}</td>
            <td>
              <div style="display: flex; gap: 0.5rem">
                <button
                  v-if="adv.status === 'pending'"
                  class="btn btn--sm btn--primary"
                  style="padding: 2px 8px; font-size: 0.7rem"
                  @click="approveAdvance(adv.id)"
                >
                  موافقة
                </button>
                <button
                  v-if="adv.status === 'pending'"
                  class="btn btn--sm btn--danger"
                  style="padding: 2px 8px; font-size: 0.7rem"
                  @click="rejectAdvance(adv.id)"
                >
                  رفض
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ Create Advance Modal ═════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>طلب سلفة جديدة</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                ✕
              </button>
            </div>

            <form @submit.prevent="handleSubmit">
              <div class="grid-2">
                <!-- المبلغ -->
                <div class="form-group">
                  <label>مبلغ السلفة *</label>
                  <input
                    v-model.number="form.amount"
                    type="number"
                    class="form-input"
                    placeholder="0.00"
                    required
                    min="1"
                    step="0.01"
                  />
                </div>

                <!-- ✅ تاريخ السداد (بدلاً من عدد الأقساط) -->
                <div class="form-group">
                  <label>تاريخ السداد المتوقع *</label>
                  <input
                    v-model="form.repaymentDate"
                    type="date"
                    class="form-input"
                    required
                  />
                  <small
                    style="
                      color: var(--stb-text-muted);
                      font-size: 0.75rem;
                      margin-top: 4px;
                      display: block;
                    "
                  >
                    سيتم خصم المبلغ من راتب هذا الشهر
                  </small>
                </div>

                <!-- السبب -->
                <div class="form-group" style="grid-column: span 2">
                  <label>سبب السلفة</label>
                  <textarea
                    v-model="form.reason"
                    class="form-input"
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
import { useAdvancesStore } from "../../stores/advances";
import { useEmployeesStore } from "../../stores/employees";
import { useToast } from "../../composables/useToast";

definePageMeta({ middleware: "auth" });

const store = useAdvancesStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

// ─── State ──────────────────────────────────────────────────────────────────

const showModal = ref(false);
const submitting = ref(false);

// ✅ تحديث الفورم ليتطابق مع CreateAdvanceDto الجديد
const EMPTY_FORM = {
  amount: 0,
  reason: "",
  repaymentDate: "", // التاريخ بصيغة YYYY-MM-DD
};

const form = reactive({ ...EMPTY_FORM });

// ─── Computed Stats ────────────────────────────────────────────────────────

const pendingCount = computed(
  () => store.advances.filter((a) => a.status === "pending").length,
);
const totalAmount = computed(() => {
  return store.advances
    .filter((a) => a.status === "approved" || a.status === "paid")
    .reduce((sum, a) => sum + Number(a.amount), 0)
    .toLocaleString("ar-SA");
});

// ─── Actions ───────────────────────────────────────────────────────────────

const openCreateModal = () => {
  Object.assign(form, EMPTY_FORM);
  // تعيين تاريخ افتراضي (مثلاً نهاية الشهر الحالي أو الشهر القادم)
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  form.repaymentDate = nextMonth.toISOString().split("T")[0];

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

const approveAdvance = async (id: string) => {
  if (!confirm("هل أنت متأكد من الموافقة على هذه السلفة؟")) return;
  try {
    await store.updateStatus(id, "approved");
    toast.success("تمت الموافقة على السلفة");
  } catch (e: any) {
    toast.error(e.message);
  }
};

const rejectAdvance = async (id: string) => {
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
    paid: "تم الدفع",
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
