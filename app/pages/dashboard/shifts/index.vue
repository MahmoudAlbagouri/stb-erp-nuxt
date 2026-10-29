<!-- pages/dashboard/shifts/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>اوقات العمل (الدوامات)</h1>
        <p>تحديد أوقات الدوام وفترات السماحية لكل وقت دوام</p>
      </div>
      <div class="page-header__actions">
        <button v-can="'create_shift'" class="btn btn--primary" @click="openCreateModal">
          <Plus :size="18" />
          <span>إضافة وقد دوام جديد</span>
        </button>
      </div>
    </div>

    <!-- ══ Loading ══════════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.shifts.length" class="card empty-card">
      <div class="empty-state">
        <Clock :size="40" class="empty-icon" />
        <div class="empty-state__title">لا توجد اوقات دوام مسجلة بعد</div>
        <button v-can="'create_shift'" class="btn btn--primary mt-4" @click="openCreateModal">
          <Plus :size="16" />
          إضافة وقت دوام جديد
        </button>
      </div>
    </div>

    <!-- ══ Shifts Table ═════════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>اسم اوقات الدوام</th>
              <th>وقت البداية</th>
              <th>وقت النهاية</th>
              <th>النوع</th>
              <th>فترة السماحية</th>
              <th>أيام الراحة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shift in store.shifts" :key="shift.id">
              <td class="shift-name-cell">
                <Clock :size="14" class="inline-icon" />
                {{ shift.name }}
              </td>
              <td dir="ltr">{{ shift.startTime }}</td>
              <td dir="ltr">{{ shift.endTime }}</td>
              <td>
                <span
                  :class="[
                    'badge',
                    isOvernight(shift) ? 'badge--inactive' : 'badge--active',
                  ]"
                >
                  {{ isOvernight(shift) ? "🌙 ليلي" : "☀️ نهاري" }}
                </span>
              </td>
              <td>{{ shift.gracePeriod }} دقيقة</td>
              <td>
                {{
                  shift.offDays == null
                    ? "أيام راحة الشركة"
                    : shift.offDays.length
                      ? weekdaysText(shift.offDays)
                      : "تعمل كل الأسبوع"
                }}
              </td>
              <td>
                <button
                  v-can="'update_shift'"
                  class="btn btn--sm btn--ghost"
                  @click="openEditModal(shift)"
                >
                  <Pencil :size="14" />
                  تعديل
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ Create/Edit Modal ════════════════════════════════════════════════ -->
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
                <Clock :size="20" class="modal-icon" />
                {{ isEdit ? "تعديل اوقات الدوام" : "إضافة وقت دوام جديد" }}
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
              <div class="form-group">
                <label>اسم اوقات الدوام *</label>
                <input
                  v-model="form.name"
                  class="form-input"
                  required
                  placeholder="مثال: اوقات الدوام الصباحي"
                />
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label>وقت البداية *</label>
                  <StbDateInput
                    v-model="form.startTime"
                    type="time"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>وقت النهاية *</label>
                  <StbDateInput
                    v-model="form.endTime"
                    type="time"
                    class="form-input"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label>فترة السماحية (بالدقائق) *</label>
                <StbNumberInput
                  v-model.number="form.gracePeriod"
                  min="0"
                  class="form-input"
                  required
                  placeholder="30"
                />
                <small class="form-hint">
                  عدد الدقائق المسموح بها قبل احتساب الموظف "متأخر" أو "منصرف
                  مبكرًا".
                </small>
              </div>

              <div class="form-group">
                <label>أيام الراحة</label>
                <select v-model="offDaysMode" class="form-select">
                  <option value="company">أيام راحة الشركة (من إعدادات الحضور)</option>
                  <option value="custom">أيام خاصة بهذه الوردية</option>
                </select>
                <div v-if="offDaysMode === 'custom'" class="days">
                  <label v-for="d in WEEKDAYS" :key="d.value" class="checkbox-label day">
                    <input v-model="form.offDays" type="checkbox" :value="d.value" />
                    {{ d.label }}
                  </label>
                </div>
                <small class="form-hint">
                  لا يُحسب فيها غياب، والعمل فيها إضافي كله. بلا أي يوم = الوردية
                  تعمل كل الأسبوع (حراسة مثلاً).
                </small>
              </div>

              <!-- تنبيه للوقت دوام الليلي -->
              <div v-if="isOvernightForm" class="info-note">
                <Info :size="15" />
                <span>
                  هذا وقت دوام ليلي (وقت النهاية قبل وقت البداية) — النظام
                  هيتعامل معاه تلقائيًا كوردية تمتد لليوم التالي.
                </span>
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
                  <span v-if="submitting" class="spinner spinner--sm" />
                  <span v-else>{{ isEdit ? "حفظ التعديلات" : "إضافة" }}</span>
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
import { useShiftsStore, type Shift } from "@/stores/shifts";
import { useToast } from "@/composables/useToast";
import { Plus, Pencil, X, Clock, Info } from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useShiftsStore();
const toast = useToast();

const showModal = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const isEdit = computed(() => !!editingId.value);

const form = reactive({
  name: "",
  startTime: "",
  endTime: "",
  gracePeriod: 30,
  offDays: [] as number[],
});
/** company = أيام راحة الشركة (offDays: null) */
const offDaysMode = ref<"company" | "custom">("company");

// ✅ نفس منطق اكتشاف اوقات الدوام الليلي المستخدم في الباك اند (endTime <= startTime)
const isOvernight = (shift: Shift) => shift.endTime <= shift.startTime;
const isOvernightForm = computed(
  () => !!form.startTime && !!form.endTime && form.endTime <= form.startTime,
);

const resetForm = () => {
  form.name = "";
  form.startTime = "";
  form.endTime = "";
  form.gracePeriod = 30;
  form.offDays = [];
  offDaysMode.value = "company";
  editingId.value = null;
};

const openCreateModal = () => {
  resetForm();
  showModal.value = true;
};

const openEditModal = (shift: Shift) => {
  editingId.value = shift.id;
  form.name = shift.name;
  form.startTime = shift.startTime;
  form.endTime = shift.endTime;
  form.gracePeriod = shift.gracePeriod;
  form.offDays = [...(shift.offDays ?? [])];
  offDaysMode.value = shift.offDays == null ? "company" : "custom";
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (offDaysMode.value === "custom" && form.offDays.length === 7) {
      toast.error("لا بد من يوم عمل واحد على الأقل في الأسبوع");
      return;
    }
    const payload = {
      ...form,
      offDays: offDaysMode.value === "custom" ? form.offDays : null,
    };
    if (isEdit.value && editingId.value) {
      await store.update(editingId.value, payload);
      toast.success("تم تحديث اوقات الدوام بنجاح");
    } else {
      await store.create(payload);
      toast.success("تم إضافة اوقات الدوام بنجاح");
    }
    showModal.value = false;
    resetForm();
  } catch (e) {
    toast.error(getErrorMessage(e, "فشل في حفظ اوقات الدوام"));
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  store.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.days {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-top: $space-2;
}
.day {
  padding: $space-1 $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
}

.page-header__actions {
  display: flex;
  gap: $space-2;
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

.shift-name-cell {
  @include flex(row, center, flex-start, $space-2);
  font-weight: 600;
  color: $stb-text-primary;
}
.inline-icon {
  flex-shrink: 0;
  color: $stb-accent;
}

.modal-md {
  max-width: 480px;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $stb-text-secondary;
  }
}
.form-hint {
  color: $stb-text-muted;
  font-size: $font-size-xs;
  margin-top: 4px;
  display: block;
}
.info-note {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-3;
  background: rgba($stb-accent, 0.06);
  border: 1px solid rgba($stb-accent, 0.2);
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $stb-text-secondary;

  svg {
    flex-shrink: 0;
    color: $stb-accent;
    margin-top: 1px;
  }
}
.mt-4 {
  margin-top: $space-4 !important;
}
</style>
