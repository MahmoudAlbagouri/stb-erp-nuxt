<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>طلبات الإجازات</h1>
        <p>تقديم ومتابعة طلبات الإجازات الخاصة بي</p>
      </div>
      <button class="btn btn--primary" @click="openCreateModal">
        <span>+</span> طلب إجازة جديد
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
          <div class="stat-card__label">طلباتي المعلقة</div>
        </div>
      </div>
      <div class="stat-card">
        <div
          class="stat-card__icon"
          style="background: rgba(16, 185, 129, 0.1); color: #10b981"
        >
          ✅
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ approvedCount }}</div>
          <div class="stat-card__label">تمت الموافقة</div>
        </div>
      </div>
      <div class="stat-card">
        <div
          class="stat-card__icon"
          style="background: rgba(239, 68, 68, 0.1); color: #ef4444"
        >
          ❌
        </div>
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

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.requests.length" class="card">
      <div class="empty-state">
        <div class="empty-state__icon">📅</div>
        <div class="empty-state__title">لا توجد طلبات إجازات</div>
        <div class="empty-state__text">ابدأ بتقديم طلب إجازة جديد</div>
        <button
          class="btn btn--primary"
          style="margin-top: 1rem"
          @click="openCreateModal"
        >
          طلب إجازة
        </button>
      </div>
    </div>

    <!-- ══ Requests Table ═══════════════════════════════════════════════════ -->
    <div v-else class="card" style="padding: 0; overflow: hidden">
      <table class="data-table">
        <thead>
          <tr>
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
            <td>{{ formatDate(req.startDate) }}</td>
            <td>{{ formatDate(req.endDate) }}</td>
            <td>{{ calculateDays(req.startDate, req.endDate) }} يوم</td>
            <td>
              <span class="badge badge--neutral">
                {{ getTypeLabel(req.type) }}
              </span>
            </td>
            <td>{{ req.reason || "-" }}</td>
            <td>
              <span :class="`badge badge--${req.status}`">
                {{ getStatusLabel(req.status) }}
              </span>
            </td>
            <td>{{ formatDate(req.createdAt) }}</td>
            <td>
              <div style="display: flex; gap: 0.5rem">
                <!-- تظهر هذه الأزرار للمديرين فقط عادةً -->
                <button
                  v-if="req.status === 'pending'"
                  class="btn btn--sm btn--primary"
                  style="padding: 2px 8px; font-size: 0.7rem"
                  @click="approveLeave(req.id)"
                >
                  موافقة
                </button>
                <button
                  v-if="req.status === 'pending'"
                  class="btn btn--sm btn--danger"
                  style="padding: 2px 8px; font-size: 0.7rem"
                  @click="rejectLeave(req.id)"
                >
                  رفض
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ Create Leave Modal ═══════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateModal"
          class="modal-overlay"
          @click.self="showCreateModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>طلب إجازة جديد</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showCreateModal = false"
              >
                ✕
              </button>
            </div>

            <form @submit.prevent="handleCreateLeave">
              <div class="grid-2">
                <!-- تم حذف حقل اختيار الموظف ليكون الطلب ذاتي -->

                <div class="form-group">
                  <label>تاريخ البداية *</label>
                  <input
                    v-model="createForm.startDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>تاريخ النهاية *</label>
                  <input
                    v-model="createForm.endDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>

                <!-- ✅ حقل نوع الإجازة الجديد (إلزامي في الـ backend) -->
                <div class="form-group" style="grid-column: span 2">
                  <label>نوع الإجازة *</label>
                  <select v-model="createForm.type" class="form-input" required>
                    <option
                      v-for="opt in leaveTypeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>

                <div class="form-group" style="grid-column: span 2">
                  <label>سبب الإجازة</label>
                  <textarea
                    v-model="createForm.reason"
                    class="form-input"
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
import { useLeavesStore } from "../../stores/leaves";
import { useToast } from "../../composables/useToast";
import type { CreateLeavePayload } from "../../types";

definePageMeta({ middleware: "auth" });

const store = useLeavesStore();
const toast = useToast();

// ─── State ──────────────────────────────────────────────────────────────────

const showCreateModal = ref(false);
const submitting = ref(false);

// ✅ خيارات نوع الإجازة (لازم تطابق LeaveType في الـ backend)
const leaveTypeOptions: { value: CreateLeavePayload["type"]; label: string }[] =
  [
    { value: "annual", label: "سنوية" },
    { value: "unpaid", label: "بدون راتب" },
    { value: "other", label: "أخرى" },
  ];

// تم حذف employeeId لأن الطلب سيكون للموظف الحالي تلقائياً
// ✅ إضافة type كحقل إلزامي بقيمة افتراضية "annual"
const createForm = reactive<CreateLeavePayload>({
  startDate: "",
  endDate: "",
  type: "annual",
  reason: "",
});

// ─── Computed Stats ────────────────────────────────────────────────────────

const pendingCount = computed(
  () => store.requests.filter((r) => r.status === "pending").length,
);
const approvedCount = computed(
  () => store.requests.filter((r) => r.status === "approved").length,
);
const rejectedCount = computed(
  () => store.requests.filter((r) => r.status === "rejected").length,
);

// ─── Helpers ───────────────────────────────────────────────────────────────

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    approved: "موافق عليه",
    rejected: "مرفوض",
  };
  return map[status] || status;
};

// ✅ دالة لعرض تسمية نوع الإجازة بالعربي
const getTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    annual: "سنوية",
    unpaid: "بدون راتب",
    other: "أخرى",
  };
  return type ? map[type] || type : "-";
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA");
};

const calculateDays = (start: string, end: string) => {
  if (!start || !end) return 0;
  const diffTime = Math.abs(
    new Date(end).getTime() - new Date(start).getTime(),
  );
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// ─── Actions ───────────────────────────────────────────────────────────────

const openCreateModal = () => {
  // ✅ إعادة ضبط النوع للقيمة الافتراضية "annual" عند فتح الفورم من جديد
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
    // ✅ استخدام دالة my-leaves لتقديم الطلب للموظف الحالي (يشمل النوع الآن)
    await store.createMyLeave(createForm);

    toast.success("تم إرسال طلب الإجازة بنجاح");
    showCreateModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الإرسال");
  } finally {
    submitting.value = false;
  }
};

const approveLeave = async (id: string) => {
  if (!confirm("هل أنت متأكد من الموافقة؟")) return;
  try {
    await store.updateStatus(id, "approved");
    toast.success("تمت الموافقة");
  } catch (e: any) {
    toast.error(e.message);
  }
};

const rejectLeave = async (id: string) => {
  if (!confirm("هل أنت متأكد من الرفض؟")) return;
  try {
    await store.updateStatus(id, "rejected");
    toast.success("تم الرفض");
  } catch (e: any) {
    toast.error(e.message);
  }
};

// ─── Init ──────────────────────────────────────────────────────────────────

onMounted(() => {
  store.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.data-table td div {
  line-height: 1.4;
}
</style>
