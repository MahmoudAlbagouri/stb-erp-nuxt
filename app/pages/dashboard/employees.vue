<!-- pages/employees/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>الموظفون</h1>
        <p>إدارة بيانات موظفي الشركة والهويات</p>
      </div>
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

        <button class="btn btn--primary" @click="showOnboarding = true">
          <UserPlus :size="18" />
          <span>تأهيل موظف</span>
        </button>
      </div>
    </div>

    <!-- ══ Stats Bar ═══════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <Users :size="14" />
        <span
          >الإجمالي: <strong>{{ store.employees.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--active">
        <span class="dot dot--active"></span>
        <span
          >نشط: <strong>{{ countByStatus("active") }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--inactive">
        <span class="dot dot--inactive"></span>
        <span
          >غير نشط: <strong>{{ countByStatus("inactive") }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--terminated">
        <span class="dot dot--terminated"></span>
        <span
          >منتهي: <strong>{{ countByStatus("terminated") }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Filters ═════════════════════════════════════════════════════════ -->
    <div class="card filters-card">
      <div class="filters-row">
        <div class="search-bar">
          <Search class="search-bar__icon" :size="18" />
          <input
            v-model="search"
            type="text"
            placeholder="بحث بالاسم، الرقم الوظيفي أو الهوية..."
          />
          <button v-if="search" class="search-clear" @click="search = ''">
            <X :size="14" />
          </button>
        </div>
        <select v-model="statusFilter" class="form-select status-select">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="terminated">منتهي الخدمة</option>
        </select>
        <select v-model="nationalityFilter" class="form-select status-select">
          <option value="">كل الجنسيات</option>
          <option value="saudi">سعودي</option>
          <option value="non_saudi">غير سعودي</option>
          <option value="outside_sponsorship">خارج الكفالة</option>
        </select>
      </div>
    </div>

    <!-- ══ Loading ══════════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="loading-grid">
      <div v-for="i in 6" :key="i" class="emp-card emp-card--skeleton">
        <div class="skeleton skeleton--avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line-sm"></div>
        </div>
      </div>
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!filtered.length" class="empty-wrapper">
      <div class="empty-state">
        <div class="empty-state__illustration">
          <Users :size="48" />
        </div>
        <div class="empty-state__title">
          {{ search || statusFilter ? "لا توجد نتائج" : "لا يوجد موظفون بعد" }}
        </div>
        <div class="empty-state__text">
          {{
            search || statusFilter
              ? "جرب تغيير معايير البحث أو الفلتر"
              : "ابدأ بإضافة أول موظف في شركتك"
          }}
        </div>
        <button
          v-if="!search && !statusFilter"
          class="btn btn--primary mt-4"
          @click="showOnboarding = true"
        >
          <UserPlus :size="16" />
          تأهيل موظف جديد
        </button>
      </div>
    </div>

    <!-- ══ Employee Grid ═════════════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div
        v-for="emp in filtered"
        :key="emp.id"
        class="emp-card"
        @click="openDetail(emp)"
      >
        <div class="emp-card__header">
          <div class="emp-card__avatar" :data-status="emp.status">
            {{ emp.fullName[0] }}
          </div>
          <div class="emp-card__info">
            <h3>{{ emp.fullName }}</h3>
            <span class="emp-card__code">{{ emp.employeeCode }}</span>
          </div>
          <span :class="`badge badge--${emp.status}`">
            {{ empStatusLabel(emp.status) }}
          </span>
        </div>

        <div class="emp-card__body">
          <div
            v-if="emp.jobTitle || emp.department"
            class="emp-detail emp-detail--primary"
          >
            <Briefcase :size="13" class="detail-icon" />
            <span>
              {{ [emp.jobTitle, emp.department].filter(Boolean).join(" — ") }}
            </span>
          </div>

          <div class="emp-detail">
            <Globe :size="13" class="detail-icon" />
            <span>{{ getNationalityLabel(emp.nationalityType) }}</span>
          </div>

          <div v-if="emp.iqamaExpiryDate" class="emp-detail">
            <CalendarDays :size="13" class="detail-icon" />
            <span
              :class="
                isIqamaExpiringSoon(emp.iqamaExpiryDate) ? 'text-warning' : ''
              "
            >
              إقامة حتى {{ formatDate(emp.iqamaExpiryDate) }}
              <span v-if="isIqamaExpiringSoon(emp.iqamaExpiryDate)">⚠️</span>
            </span>
          </div>

          <div v-if="emp.nationalId" class="emp-detail">
            <IdCard :size="13" class="detail-icon" />
            <span dir="ltr">{{ emp.nationalId }}</span>
          </div>

          <div v-if="emp.phone" class="emp-detail">
            <Phone :size="13" class="detail-icon" />
            <span dir="ltr">{{ emp.phone }}</span>
          </div>

          <!-- مؤشرات المستخدم والعقد -->
          <div class="emp-card__badges" @click.stop>
            <span v-if="emp.user" class="mini-badge mini-badge--user">
              <ShieldCheck :size="11" /> مستخدم
            </span>
            <span v-if="emp.contract" class="mini-badge mini-badge--contract">
              <FileText :size="11" /> عقد
            </span>
            <a
              v-if="emp.nationalIdCardPath"
              :href="emp.nationalIdCardPath"
              target="_blank"
              rel="noopener noreferrer"
              class="mini-badge mini-badge--doc"
              title="عرض الهوية"
            >
              <Paperclip :size="11" /> هوية
            </a>
          </div>
        </div>

        <div class="emp-card__footer" @click.stop>
          <button class="btn btn--ghost btn--sm" @click="openEdit(emp)">
            <Pencil :size="14" /> تعديل
          </button>
          <button class="btn btn--danger btn--sm" @click="confirmDelete(emp)">
            <Trash2 :size="14" /> حذف
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Onboarding Modal ══════════════════════════════════════════════════ -->
    <OnboardingModal v-model="showOnboarding" @created="onEmployeeCreated" />

    <!-- ══ Edit Modal (الموظف البسيط — مع ربط المستخدم) ═════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEditModal"
          class="modal-overlay"
          @click.self="showEditModal = false"
        >
          <div class="modal modal-lg">
            <div class="modal__header">
              <h3>تعديل بيانات الموظف</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showEditModal = false"
              >
                <X :size="20" />
              </button>
            </div>

            <form @submit.prevent="handleUpdate" class="modal-form">
              <div class="grid-2">
                <div class="form-group">
                  <label>الاسم الكامل *</label>
                  <input
                    v-model="editForm.fullName"
                    type="text"
                    class="form-input"
                    required
                  />
                </div>

                <div class="form-group">
                  <label>الجنسية *</label>
                  <select
                    v-model="editForm.nationalityType"
                    class="form-select"
                    required
                  >
                    <option value="saudi">🇸🇦 سعودي</option>
                    <option value="non_saudi">🌍 غير سعودي</option>
                    <option value="outside_sponsorship">📄 خارج الكفالة</option>
                  </select>
                </div>

                <div
                  v-if="editForm.nationalityType === 'non_saudi'"
                  class="form-group"
                >
                  <label>تاريخ انتهاء الإقامة *</label>
                  <input
                    v-model="editForm.iqamaExpiryDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>

                <div class="form-group">
                  <label>رقم الهوية</label>
                  <input
                    v-model="editForm.nationalId"
                    type="text"
                    class="form-input"
                    placeholder="1xxxxxxxxx"
                  />
                </div>

                <div class="form-group">
                  <label>المسمى الوظيفي</label>
                  <input
                    v-model="editForm.jobTitle"
                    type="text"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label>القسم</label>
                  <input
                    v-model="editForm.department"
                    type="text"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    v-model="editForm.phone"
                    type="tel"
                    class="form-input"
                    dir="ltr"
                  />
                </div>

                <div class="form-group">
                  <label>الحالة الوظيفية</label>
                  <select v-model="editForm.status" class="form-select">
                    <option value="active">✅ نشط</option>
                    <option value="inactive">⏸ غير نشط</option>
                    <option value="terminated">❌ منتهي الخدمة</option>
                  </select>
                </div>

                <!-- ✅ خانة ربط المستخدم الجديد -->
                <div class="form-group full-width linked-user-section">
                  <label>
                    <LinkIcon :size="14" />
                    ربط بحساب مستخدم موجود
                  </label>

                  <div class="linked-user-controls">
                    <select
                      v-model="editForm.userId"
                      class="form-select"
                      :class="{ 'has-value': editForm.userId }"
                    >
                      <option value="">-- اختر مستخدماً للربط --</option>
                      <option
                        v-for="u in availableUsers"
                        :key="u.id"
                        :value="u.id"
                      >
                        {{ u.username }} ({{ u.email }})
                      </option>
                    </select>

                    <button
                      v-if="editForm.userId"
                      type="button"
                      class="btn btn--danger btn--sm unlink-btn"
                      @click="editForm.userId = null"
                      title="إلغاء الربط"
                    >
                      <Unlink :size="14" />
                    </button>
                  </div>

                  <small class="form-hint">
                    يظهر هنا فقط المستخدمون الذين لا يرتبطون بموظف آخر حالياً.
                  </small>
                </div>

                <div class="form-group full-width">
                  <label>صورة/ملف الهوية</label>
                  <StbUploader
                    v-model="editForm.nationalIdCardPath"
                    endpoint="/media/upload/employee"
                    field-name="files"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    :max-size="5 * 1024 * 1024"
                    idle-title="ارفع صورة الهوية أو ملف PDF"
                    hint="JPG / PNG / PDF — بحد أقصى 5 MB"
                    @error="toast.error"
                  />
                </div>
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showEditModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="updating"
                >
                  <span v-if="updating" class="spinner" />
                  <span v-else>حفظ التغييرات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Confirm Delete ════════════════════════════════════════════════════ -->
    <ConfirmDialog
      v-model="showConfirm"
      title="حذف الموظف"
      :message="`هل تريد حذف الموظف '${deleteTarget?.fullName}'؟ لا يمكن التراجع عن هذا الإجراء.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useEmployeesStore } from "@/stores/employees";
import { useUsersStore } from "@/stores/users"; // ✅ استيراد ستور المستخدمين
import { useToast } from "@/composables/useToast";
import type { Employee, User } from "@/types";
import OnboardingModal from "@/components/employees/OnboardingModal.vue";

import {
  FileSpreadsheet,
  FileText,
  UserPlus,
  Search,
  Users,
  Globe,
  CalendarDays,
  IdCard,
  Briefcase,
  Phone,
  Paperclip,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  Link as LinkIcon, // ✅ أيقونة الربط
  Unlink, // ✅ أيقونة فك الربط
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useEmployeesStore();
const usersStore = useUsersStore(); // ✅ تهيئة ستور المستخدمين
const toast = useToast();

// ─── Onboarding ───────────────────────────────────────────────────────────────
const showOnboarding = ref(false);

const onEmployeeCreated = (result: any) => {
  toast.success(`✅ تم تأهيل الموظف "${result.employee.fullName}" بنجاح`);
};

// ─── Export ──────────────────────────────────────────────────────────────────
const exporting = ref<"excel" | "pdf" | null>(null);

const handleExport = async (type: "excel" | "pdf") => {
  exporting.value = type;
  try {
    await store.exportData(type);
    toast.success(`تم تصدير تقرير ${type === "excel" ? "Excel" : "PDF"} بنجاح`);
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  } finally {
    exporting.value = null;
  }
};

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = ref("");
const statusFilter = ref("");
const nationalityFilter = ref("");

const filtered = computed(() =>
  store.employees.filter((e: Employee) => {
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      e.fullName.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      (e.nationalId && e.nationalId.includes(q)) ||
      (e.jobTitle && e.jobTitle.toLowerCase().includes(q));
    const matchStatus = !statusFilter.value || e.status === statusFilter.value;
    const matchNat =
      !nationalityFilter.value || e.nationalityType === nationalityFilter.value;
    return matchSearch && matchStatus && matchNat;
  }),
);

const countByStatus = (s: string) =>
  store.employees.filter((e: Employee) => e.status === s).length;

// ─── Edit Modal & User Linking ───────────────────────────────────────────────
const showEditModal = ref(false);
const updating = ref(false);
const editingEmployee = ref<Employee | null>(null);

const editForm = reactive({
  fullName: "",
  nationalityType: "" as "saudi" | "non_saudi" | "outside_sponsorship",
  iqamaExpiryDate: "",
  nationalId: "",
  nationalIdCardPath: "",
  phone: "",
  jobTitle: "",
  department: "",
  status: "active" as "active" | "inactive" | "terminated",
  userId: null as string | null, // ✅ حقل تخزين ID المستخدم للربط
});

/**
 * ✅ حساب المستخدمين المتاحين للربط
 * نستبعد المستخدمين المرتبطين بموظفين آخرين لتجنب التضارب
 */
const availableUsers = computed(() => {
  // جلب IDs جميع الموظفين الذين لديهم مستخدم مرتبط حالياً
  const assignedUserIds = new Set(
    store.employees.filter((e) => e.user?.id).map((e) => e.user!.id),
  );

  // إذا كنا نعدل موظفاً لديه مستخدم مرتبط، نستبعده من القائمة المحظورة مؤقتاً
  // لكي لا يختفي المستخدم الحالي من القائمة عند التعديل
  if (editingEmployee.value?.user?.id) {
    assignedUserIds.delete(editingEmployee.value.user.id);
  }

  return usersStore.users.filter((u: User) => !assignedUserIds.has(u.id));
});

const openEdit = async (emp: Employee) => {
  editingEmployee.value = emp;

  // ✅ جلب المستخدمين قبل فتح المودال لضمان تحديث القائمة
  if (usersStore.users.length === 0) {
    await usersStore.fetchAll();
  }

  Object.assign(editForm, {
    fullName: emp.fullName,
    nationalityType: emp.nationalityType,
    iqamaExpiryDate: emp.iqamaExpiryDate
      ? new Date(emp.iqamaExpiryDate).toISOString().split("T")[0]
      : "",
    nationalId: emp.nationalId ?? "",
    nationalIdCardPath: emp.nationalIdCardPath ?? "",
    phone: emp.phone ?? "",
    jobTitle: emp.jobTitle ?? "",
    department: emp.department ?? "",
    status: emp.status,
    userId: emp.user?.id ?? null, // ✅ تعيين المستخدم المرتبط حالياً
  });
  showEditModal.value = true;
};

const handleUpdate = async () => {
  if (!editingEmployee.value) return;
  updating.value = true;
  try {
    const payload: any = {
      fullName: editForm.fullName,
      nationalityType: editForm.nationalityType,
      nationalId: editForm.nationalId || undefined,
      nationalIdCardPath: editForm.nationalIdCardPath || undefined,
      phone: editForm.phone || undefined,
      jobTitle: editForm.jobTitle || undefined,
      department: editForm.department || undefined,
      status: editForm.status,
      userId: editForm.userId || undefined, // ✅ إرسال userId للباك إند
    };

    if (editForm.nationalityType !== "non_saudi") {
      payload.iqamaExpiryDate = null;
    }

    await store.update(editingEmployee.value.id, payload);
    toast.success("تم تحديث بيانات الموظف وربط الحساب بنجاح");
    showEditModal.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    updating.value = false;
  }
};

// ─── Detail ──────────────────────────────────────────────────────────────────
const openDetail = (emp: Employee) => {
  navigateTo(`/employees/${emp.id}`);
};

// ─── Delete ───────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Employee | null>(null);

const confirmDelete = (emp: Employee) => {
  deleteTarget.value = emp;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم حذف الموظف");
    showConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    deleting.value = false;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const empStatusLabel = (s: string) =>
  ({ active: "نشط", inactive: "غير نشط", terminated: "منتهي" })[s] ?? s;

const getNationalityLabel = (type?: string) =>
  ({
    saudi: "🇸🇦 سعودي",
    non_saudi: "🌍 غير سعودي",
    outside_sponsorship: "📄 خارج الكفالة",
  })[type ?? ""] ?? "—";

const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");

const isIqamaExpiringSoon = (date: string) => {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000; // 60 يوم
};

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchAll();
  usersStore.fetchAll(); // ✅ جلب المستخدمين عند تحميل الصفحة
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

// ... (نفس التنسيقات السابقة للكروت والفلاتر) ...

.page-header__actions {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
  @include respond-to("md") {
    width: 100%;
    justify-content: space-between;
  }
}

.stats-bar {
  display: flex;
  gap: $space-3;
  flex-wrap: wrap;
  margin-bottom: $space-4;
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
  &--active {
    border-color: rgba($stb-success, 0.3);
  }
  &--inactive {
    border-color: rgba($stb-warning, 0.3);
  }
  &--terminated {
    border-color: rgba($stb-danger, 0.3);
  }
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  &--active {
    background: $stb-success;
  }
  &--inactive {
    background: $stb-warning;
  }
  &--terminated {
    background: $stb-danger;
  }
}

.filters-card {
  padding: $space-4 $space-5;
  margin-bottom: $space-5;
}
.filters-row {
  @include flex(row, center, flex-start, $space-3);
  width: 100%;
  flex-wrap: wrap;
  @include respond-to("md") {
    flex-direction: column;
    align-items: stretch;
  }
}
.search-bar {
  position: relative;
  flex: 1;
  min-width: 200px;
  .search-bar__icon {
    position: absolute;
    right: $space-3;
    top: 50%;
    transform: translateY(-50%);
    color: $stb-text-muted;
    pointer-events: none;
  }
  input {
    width: 100%;
    padding-right: $space-8;
    padding-left: $space-8;
  }
}
.search-clear {
  position: absolute;
  left: $space-3;
  top: 50%;
  transform: translateY(-50%);
  @include flex(row, center, center);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: $stb-surface-3;
  color: $stb-text-muted;
  cursor: pointer;
  &:hover {
    background: $stb-danger;
    color: white;
  }
}
.status-select {
  width: 150px;
  @include respond-to("md") {
    width: 100%;
  }
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-4;
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
  &--avatar {
    width: 48px;
    height: 48px;
    border-radius: $radius-lg;
    flex-shrink: 0;
  }
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
.skeleton-lines {
  flex: 1;
}
.emp-card--skeleton {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-5;
  pointer-events: none;
  min-height: 80px;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.empty-wrapper {
  @include flex(row, center, center);
  min-height: 320px;
}
.empty-state {
  @include flex(column, center, center, $space-3);
  text-align: center;
  &__illustration {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: $stb-surface-2;
    border: 1px solid $stb-border;
    @include flex(row, center, center);
    color: $stb-text-muted;
    opacity: 0.5;
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-4;
}
.emp-card {
  @include glass-card;
  padding: $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  transition: all $transition-base;
  cursor: pointer;
  &:hover {
    transform: translateY(-2px);
    @include glow-border;
  }
  &__header {
    @include flex(row, center, flex-start, $space-3);
  }
  &__avatar {
    width: 48px;
    height: 48px;
    border-radius: $radius-lg;
    background: $gradient-primary;
    @include flex(row, center, center);
    font-size: $font-size-xl;
    font-weight: 900;
    color: #fff;
    flex-shrink: 0;
    box-shadow: $shadow-glow;
    position: relative;
    &::after {
      content: "";
      position: absolute;
      bottom: -2px;
      left: -2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid $stb-surface;
    }
    &[data-status="active"]::after {
      background: $stb-success;
    }
    &[data-status="inactive"]::after {
      background: $stb-warning;
    }
    &[data-status="terminated"]::after {
      background: $stb-danger;
    }
  }
  &__info {
    flex: 1;
    min-width: 0;
    h3 {
      font-size: $font-size-base;
      font-weight: 700;
      @include truncate;
      margin: 0 0 2px;
    }
  }
  &__code {
    font-size: $font-size-xs;
    color: $stb-accent;
    font-family: monospace;
    letter-spacing: 0.05em;
  }
  &__body {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    flex: 1;
  }
  &__badges {
    @include flex(row, center, flex-start, $space-2);
    flex-wrap: wrap;
    margin-top: $space-1;
  }
  &__footer {
    @include flex(row, center, flex-end, $space-2);
    padding-top: $space-3;
    border-top: 1px solid $stb-border;
    margin-top: auto;
  }
}
.emp-detail {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-xs;
  color: $stb-text-secondary;
  .detail-icon {
    flex-shrink: 0;
    color: $stb-text-muted;
  }
  &--primary {
    font-weight: 600;
    color: $stb-text-primary;
    font-size: $font-size-sm;
  }
}
.text-warning {
  color: $stb-warning !important;
  font-weight: 600;
}
.mini-badge {
  @include flex(row, center, center, 4px);
  font-size: 10px;
  padding: 2px 7px;
  border-radius: $radius-sm;
  font-weight: 600;
  &--user {
    background: rgba($stb-accent, 0.1);
    color: $stb-accent;
  }
  &--contract {
    background: rgba($stb-success, 0.1);
    color: $stb-success;
  }
  &--doc {
    background: rgba($stb-warning, 0.1);
    color: $stb-warning;
  }
}

.modal-lg {
  max-width: 680px;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-5;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}
.full-width {
  grid-column: span 2;
  @include respond-to("md") {
    grid-column: span 1;
  }
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $stb-text-secondary;
    @include flex(row, center, flex-start, $space-2);
    svg {
      flex-shrink: 0;
    }
  }
}
.modal__footer {
  @include flex(row, center, flex-end, $space-3);
  padding-top: $space-4;
  border-top: 1px solid $stb-border;
}
.mt-4 {
  margin-top: $space-4 !important;
}

// ✅ تنسيقات خاصة بخانة ربط المستخدم
.linked-user-section {
  background: rgba($stb-accent, 0.03);
  padding: $space-3;
  border-radius: $radius-md;
  border: 1px dashed $stb-border;

  label {
    margin-bottom: $space-2;
    color: $stb-accent;
  }
}

.linked-user-controls {
  display: flex;
  gap: $space-2;
  align-items: center;

  select {
    flex: 1;
  }

  .unlink-btn {
    flex-shrink: 0;
    height: 38px;
    padding: 0 $space-3;
  }
}

.form-hint {
  font-size: 11px;
  color: $stb-text-muted;
  margin-top: $space-1;
}
</style>
