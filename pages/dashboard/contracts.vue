<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة العقود</h1>
        <p>متابعة عقود الموظفين وتفاصيلها</p>
      </div>
      <button class="btn btn--primary" @click="openCreateModal">
        <span>+</span> إضافة عقد جديد
      </button>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.contracts.length" class="card">
      <div class="empty-state">
        <div class="empty-state__icon">📝</div>
        <div class="empty-state__title">لا توجد عقود مسجلة</div>
        <div class="empty-state__text">
          ابدأ بإضافة عقد للموظفين الجدد أو الحاليين
        </div>
        <button
          class="btn btn--primary"
          style="margin-top: 1rem"
          @click="openCreateModal"
        >
          إضافة عقد
        </button>
      </div>
    </div>

    <!-- ══ Contracts Table ══════════════════════════════════════════════════ -->
    <div v-else class="card" style="padding: 0; overflow: hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th>الموظف</th>
            <th>نوع العقد</th>
            <th>تاريخ بداية العقد</th>
            <th>تاريخ نهاية العقد</th>
            <th>الإجازة السنوية</th>
            <th>ملاحظات</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="contract in store.contracts" :key="contract.id">
            <td>
              <div style="font-weight: 600; color: var(--stb-text-primary)">
                {{ contract.employee?.fullName || "غير معروف" }}
              </div>
              <div style="font-size: 0.75rem; color: var(--stb-text-muted)">
                {{ contract.employee?.jobTitle || "-" }}
              </div>
            </td>
            <td>
              <span class="badge badge--system">{{
                contract.contractType
              }}</span>
            </td>
            <td>{{ formatDate(contract.startDate) }}</td>
            <td>
              {{ contract.endDate ? formatDate(contract.endDate) : "مفتوح" }}
            </td>
            <td>{{ contract.annualLeaveDays }} يوم</td>
            <td>
              <span
                v-if="contract.notes"
                style="font-size: 0.8rem; color: var(--stb-text-secondary)"
              >
                {{ contract.notes.substring(0, 30)
                }}{{ contract.notes.length > 30 ? "..." : "" }}
              </span>
              <span v-else>-</span>
            </td>
            <td>
              <button
                class="btn btn--sm btn--danger"
                style="padding: 2px 8px; font-size: 0.7rem"
                @click="confirmDelete(contract)"
              >
                حذف
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ Create Contract Modal ════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>إضافة عقد جديد</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                ✕
              </button>
            </div>

            <form @submit.prevent="handleSubmit">
              <div class="grid-2">
                <!-- اختيار الموظف -->
                <div class="form-group" style="grid-column: span 2">
                  <label>الموظف *</label>
                  <select
                    v-model="form.employeeId"
                    class="form-select"
                    required
                  >
                    <option value="" disabled>اختر الموظف...</option>
                    <option
                      v-for="emp in employeesStore.employees"
                      :key="emp.id"
                      :value="emp.id"
                    >
                      {{ emp.fullName }} ({{ emp.employeeCode }})
                    </option>
                  </select>
                </div>

                <!-- نوع العقد -->
                <div class="form-group">
                  <label>نوع العقد *</label>
                  <select
                    v-model="form.contractType"
                    class="form-select"
                    required
                  >
                    <option value="دائم">دائم</option>
                    <option value="جزئي">جزئي</option>
                    <option value="مرن">مرن</option>
                    <option value="عن بعد">عن بعد</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <!-- أيام الإجازة -->
                <div class="form-group">
                  <label>أيام الإجازة السنوية *</label>
                  <input
                    v-model.number="form.annualLeaveDays"
                    type="number"
                    class="form-input"
                    required
                    min="0"
                  />
                </div>

                <!-- تاريخ البداية -->
                <div class="form-group">
                  <label>تاريخ بداية العقد *</label>
                  <input
                    v-model="form.startDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>

                <!-- تاريخ النهاية -->
                <div class="form-group">
                  <label>تاريخ نهاية العقد (اختياري)</label>
                  <input
                    v-model="form.endDate"
                    type="date"
                    class="form-input"
                  />
                </div>

                <!-- ملاحظات -->
                <div class="form-group" style="grid-column: span 2">
                  <label>ملاحظات</label>
                  <textarea
                    v-model="form.notes"
                    class="form-input"
                    rows="3"
                    placeholder="أي تفاصيل إضافية..."
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
                  <span v-else>حفظ العقد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Confirm Delete ═══════════════════════════════════════════════════ -->
    <ConfirmDialog
      v-model="showConfirm"
      title="حذف العقد"
      :message="`هل أنت متأكد من حذف عقد الموظف '${deleteTarget?.employee?.fullName}'؟ لا يمكن التراجع عن هذا الإجراء.`"
      confirm-text="حذف نهائي"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useContractsStore } from "../../stores/contracts";
import { useEmployeesStore } from "../../stores/employees";
import { useToast } from "../../composables/useToast";
import type { Contract, CreateContractPayload } from "../../types";

definePageMeta({ middleware: "auth" });

const store = useContractsStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

// ─── State ──────────────────────────────────────────────────────────────────

const showModal = ref(false);
const submitting = ref(false);
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Contract | null>(null);

const EMPTY_FORM: CreateContractPayload = {
  employeeId: "",
  contractType: "دائم",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  annualLeaveDays: 30,
  notes: "",
};

const form = reactive({ ...EMPTY_FORM });

// ─── Actions ────────────────────────────────────────────────────────────────

const openCreateModal = () => {
  Object.assign(form, EMPTY_FORM);
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    await store.create(form);
    toast.success("تم إضافة العقد بنجاح");
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الحفظ");
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (contract: Contract) => {
  deleteTarget.value = contract;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم حذف العقد");
    showConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    deleting.value = false;
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA");
};

// ─── Init ───────────────────────────────────────────────────────────────────

onMounted(() => {
  store.fetchAll();
  // نتأكد من تحميل الموظفين لظهورهم في القائمة المنسدلة
  if (employeesStore.employees.length === 0) {
    employeesStore.fetchAll();
  }
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;
</style>
