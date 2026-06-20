<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>الموظفون</h1>
        <p>إدارة بيانات موظفي الشركة والهويات</p>
      </div>
      <div class="page-header__actions">
        <!-- ✅ زر Excel مربوط بالدالة مع حالة التحميل -->
        <button
          class="btn btn--outline"
          @click="handleExport('excel')"
          :disabled="exporting"
        >
          <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
          <span v-else>📊 Excel</span>
        </button>

        <!-- ✅ زر PDF مربوط بالدالة مع حالة التحميل -->
        <button
          class="btn btn--outline"
          @click="handleExport('pdf')"
          :disabled="exporting"
        >
          <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
          <span v-else>📄 PDF</span>
        </button>

        <button class="btn btn--primary" @click="openCreate">
          <span>+</span> إضافة موظف
        </button>
      </div>
    </div>

    <!-- ══ Filters ══════════════════════════════════════════════════════════ -->
    <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.5rem">
      <div class="filters-row">
        <div class="search-bar" style="flex: 1; min-width: 200px">
          <span class="search-bar__icon">🔍</span>
          <input
            v-model="search"
            type="text"
            placeholder="بحث بالاسم، الرقم الوظيفي أو الهوية..."
          />
        </div>
        <select v-model="statusFilter" class="form-select" style="width: 160px">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="terminated">منتهي الخدمة</option>
        </select>
      </div>
    </div>

    <!-- ══ Loading & Empty State ════════════════════════════════════════════ -->
    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!filtered.length" class="card">
      <div class="empty-state">
        <div class="empty-state__icon">👥</div>
        <div class="empty-state__title">لا يوجد موظفون</div>
        <div class="empty-state__text">
          أضف موظفًا جديدًا لبدء إدارة الموارد البشرية
        </div>
        <button
          class="btn btn--primary"
          style="margin-top: 1rem"
          @click="openCreate"
        >
          إضافة موظف
        </button>
      </div>
    </div>

    <!-- ══ Employee Grid ═════════════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div v-for="emp in filtered" :key="emp.id" class="emp-card">
        <div class="emp-card__header">
          <div class="emp-card__avatar">{{ emp.fullName[0] }}</div>
          <div class="emp-card__info">
            <h3>{{ emp.fullName }}</h3>
            <span class="emp-card__code">{{ emp.employeeCode }}</span>
          </div>
          <span :class="`badge badge--${emp.status}`">
            {{ empStatusLabel(emp.status) }}
          </span>
        </div>

        <div class="emp-card__body">
          <div class="emp-detail">
            <span class="emp-detail__icon">🌍</span>
            <span>{{ getNationalityLabel(emp.nationalityType) }}</span>
          </div>

          <div v-if="emp.iqamaExpiryDate" class="emp-detail">
            <span class="emp-detail__icon">🗓️</span>
            <span>الإقامة حتى: {{ formatDate(emp.iqamaExpiryDate) }}</span>
          </div>

          <div v-if="emp.nationalId" class="emp-detail">
            <span class="emp-detail__icon">🆔</span>
            <span>{{ emp.nationalId }}</span>
          </div>
          <div v-if="emp.jobTitle" class="emp-detail">
            <span class="emp-detail__icon">💼</span>
            <span>{{ emp.jobTitle }}</span>
          </div>
          <div v-if="emp.department" class="emp-detail">
            <span class="emp-detail__icon">🏢</span>
            <span>{{ emp.department }}</span>
          </div>
          <div v-if="emp.phone" class="emp-detail">
            <span class="emp-detail__icon">📱</span>
            <span>{{ emp.phone }}</span>
          </div>
          <div v-if="emp.nationalIdCardPath" class="emp-detail">
            <span class="emp-detail__icon"></span>
            <a :href="emp.nationalIdCardPath" target="_blank" class="link-sm">
              عرض الهوية
            </a>
          </div>
        </div>

        <div class="emp-card__footer">
          <button class="btn btn--ghost btn--sm" @click="openEdit(emp)">
            تعديل
          </button>
          <button class="btn btn--danger btn--sm" @click="confirmDelete(emp)">
            حذف
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal ═════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal" style="max-width: 700px">
            <div class="modal__header">
              <h3>
                {{ editing ? "تعديل بيانات الموظف" : "إضافة موظف جديد" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                ✕
              </button>
            </div>

            <form @submit.prevent="handleSubmit">
              <div class="grid-2">
                <div class="form-group">
                  <label>الاسم الكامل *</label>
                  <input
                    v-model="form.fullName"
                    type="text"
                    class="form-input"
                    placeholder="سارة أحمد"
                    required
                  />
                </div>

                <div class="form-group">
                  <label>الرقم الوظيفي (اختياري)</label>
                  <input
                    v-model="form.employeeCode"
                    type="text"
                    class="form-input"
                    placeholder="EMP-001"
                  />
                </div>

                <div class="form-group">
                  <label>نوع الجنسية *</label>
                  <select
                    v-model="form.nationalityType"
                    class="form-select"
                    required
                  >
                    <option value="" disabled>اختر النوع</option>
                    <option value="saudi">سعودي</option>
                    <option value="non_saudi">غير سعودي</option>
                    <option value="outside_sponsorship">خارج الكفالة</option>
                  </select>
                </div>

                <div
                  v-if="form.nationalityType === 'non_saudi'"
                  class="form-group"
                >
                  <label>تاريخ انتهاء الإقامة *</label>
                  <input
                    v-model="form.iqamaExpiryDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>

                <div class="form-group">
                  <label>رقم الهوية / الإقامة</label>
                  <input
                    v-model="form.nationalId"
                    type="text"
                    class="form-input"
                    placeholder="1xxxxxxxxx"
                  />
                </div>

                <div class="form-group">
                  <label>المسمى الوظيفي</label>
                  <input
                    v-model="form.jobTitle"
                    type="text"
                    class="form-input"
                    placeholder="مديرة موارد بشرية"
                  />
                </div>

                <div class="form-group">
                  <label>القسم</label>
                  <input
                    v-model="form.department"
                    type="text"
                    class="form-input"
                    placeholder="الموارد البشرية"
                  />
                </div>

                <div class="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    class="form-input"
                    placeholder="+966500000000"
                  />
                </div>

                <div class="form-group" style="grid-column: span 2">
                  <label>صورة/ملف الهوية</label>
                  <StbUploader
                    v-model="form.nationalIdCardPath"
                    endpoint="/media/upload/employee"
                    field-name="files"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    :max-size="5 * 1024 * 1024"
                    idle-title="ارفع صورة الهوية أو ملف PDF"
                    hint="JPG / PNG / PDF — بحد أقصى 5 MB"
                    @error="toast.error"
                  />
                </div>

                <div class="form-group" style="grid-column: span 2">
                  <label>حساب المستخدم المرتبط (اختياري)</label>
                  <select v-model="form.userId" class="form-select">
                    <option value="">بدون ربط</option>
                    <option
                      v-for="user in usersStore.users"
                      :key="user.id"
                      :value="user.id"
                    >
                      {{ user.username }} — {{ user.email }}
                    </option>
                  </select>
                </div>

                <div v-if="editing" class="form-group">
                  <label>الحالة</label>
                  <select v-model="form.status" class="form-select">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="terminated">منتهي الخدمة</option>
                  </select>
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
                    editing ? "حفظ التغييرات" : "إضافة الموظف"
                  }}</span>
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
      :message="`هل تريد حذف الموظف '${deleteTarget?.fullName}'؟`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useEmployeesStore } from "../../stores/employees";
import { useUsersStore } from "../../stores/users";
import { useToast } from "../../composables/useToast";
import type { Employee } from "../../types";

definePageMeta({ middleware: "auth" });

const store = useEmployeesStore();
const usersStore = useUsersStore();
const toast = useToast();

// ─── Export State ────────────────────────────────────────────────────────────
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

const filtered = computed(() =>
  store.employees.filter((e: Employee) => {
    const q = search.value.toLowerCase();
    return (
      (!q ||
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.nationalId && e.nationalId.includes(q))) &&
      (!statusFilter.value || e.status === statusFilter.value)
    );
  }),
);

// ─── Modal State ───────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<Employee | null>(null);

// ── Form ─────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  fullName: "",
  employeeCode: "",
  nationalityType: "" as "saudi" | "non_saudi" | "outside_sponsorship" | "",
  iqamaExpiryDate: "",
  nationalId: "",
  nationalIdCardPath: "",
  phone: "",
  jobTitle: "",
  department: "",
  userId: "",
  status: "active" as "active" | "inactive" | "terminated",
};

const form = reactive({ ...EMPTY_FORM });

// ─── Open / Close ─────────────────────────────────────────────────────────────
const openCreate = () => {
  editing.value = null;
  Object.assign(form, EMPTY_FORM);
  showModal.value = true;
};

const openEdit = (emp: Employee) => {
  editing.value = emp;
  Object.assign(form, {
    fullName: emp.fullName,
    employeeCode: emp.employeeCode,
    nationalityType: emp.nationalityType,
    iqamaExpiryDate: emp.iqamaExpiryDate
      ? new Date(emp.iqamaExpiryDate).toISOString().split("T")[0]
      : "",
    nationalId: emp.nationalId ?? "",
    nationalIdCardPath: emp.nationalIdCardPath ?? "",
    phone: emp.phone ?? "",
    jobTitle: emp.jobTitle ?? "",
    department: emp.department ?? "",
    userId: emp.user?.id ?? "",
    status: emp.status,
  });
  showModal.value = true;
};

// ─── Submit ───────────────────────────────────────────────────────────────────
const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload: any = {
      fullName: form.fullName,
      employeeCode: form.employeeCode,
      nationalityType: form.nationalityType,
      nationalId: form.nationalId || undefined,
      nationalIdCardPath: form.nationalIdCardPath || undefined,
      phone: form.phone || undefined,
      jobTitle: form.jobTitle || undefined,
      department: form.department || undefined,
      userId: form.userId || undefined,
    };

    if (form.nationalityType === "non_saudi" && form.iqamaExpiryDate) {
      payload.iqamaExpiryDate = form.iqamaExpiryDate;
    } else {
      payload.iqamaExpiryDate = null;
    }

    if (editing.value) {
      await store.update(editing.value.id, { ...payload, status: form.status });
      toast.success("تم تحديث بيانات الموظف");
    } else {
      await store.create(payload);
      toast.success("تم إضافة الموظف بنجاح");
    }

    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
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

const getNationalityLabel = (type?: string) => {
  switch (type) {
    case "saudi":
      return "سعودي";
    case "non_saudi":
      return "غير سعودي";
    case "outside_sponsorship":
      return "خارج الكفالة";
    default:
      return "-";
  }
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchAll();
  usersStore.fetchAll();
});
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.page-header__actions {
  display: flex;
  gap: $space-2;
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
  gap: $space-4;
  transition: all $transition-base;

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
  }

  &__info {
    flex: 1;
    min-width: 0;
    h3 {
      font-size: $font-size-base;
      font-weight: 700;
    }
  }

  &__code {
    font-size: $font-size-xs;
    color: $stb-accent;
    font-family: monospace;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }

  &__footer {
    @include flex(row, center, flex-end, $space-2);
    margin-top: auto;
  }
}

.emp-detail {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-xs;
  color: $stb-text-secondary;

  &__icon {
    flex-shrink: 0;
  }
}

.link-sm {
  color: $stb-accent;
  text-decoration: underline;
  font-size: 0.8rem;
}

.filters-row {
  display: flex;
  gap: $space-3;
  align-items: center;
  flex-wrap: wrap;
}
</style>
