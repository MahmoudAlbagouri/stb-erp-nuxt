<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة العقود</h1>
        <p>متابعة عقود الموظفين وتفاصيلها</p>
      </div>
      <button class="btn btn--primary" @click="openCreateModal">
        <Plus :size="18" />
        <span>إضافة عقد جديد</span>
      </button>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.contracts.length" class="card empty-card">
      <div class="empty-state">
        <FileSignature :size="40" class="empty-icon" />
        <div class="empty-state__title">لا توجد عقود مسجلة</div>
        <div class="empty-state__text">
          ابدأ بإضافة عقد للموظفين الجدد أو الحاليين
        </div>
        <button class="btn btn--primary mt-4" @click="openCreateModal">
          <Plus :size="16" />
          إضافة عقد
        </button>
      </div>
    </div>

    <!-- ══ Contracts Table ══════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>نوع العقد</th>
              <th>تاريخ البداية</th>
              <th>تاريخ النهاية</th>
              <th>الإجازة السنوية</th>
              <th>ملاحظات</th>
              <th>المرفقات</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contract in store.contracts" :key="contract.id">
              <td>
                <div class="employee-cell">
                  <span class="employee-name">{{
                    contract.employee?.fullName || "غير معروف"
                  }}</span>
                  <span class="employee-job">{{
                    contract.employee?.jobTitle || "-"
                  }}</span>
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
                <span v-if="contract.notes" class="notes-text">
                  {{ truncateText(contract.notes, 30) }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <!-- ✅ تم إصلاح المشكلة هنا باستخدام attachmentPaths -->
                <span
                  v-if="
                    contract.attachmentPaths &&
                    contract.attachmentPaths.length > 0
                  "
                  class="badge badge--outline"
                >
                  <Paperclip :size="12" />
                  {{ contract.attachmentPaths.length }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <button
                  class="btn btn--danger btn--sm"
                  @click="confirmDelete(contract)"
                  title="حذف العقد"
                >
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ Create Contract Modal ════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal modal-lg">
            <div class="modal__header">
              <h3>
                <FileSignature :size="20" class="modal-icon" />
                إضافة عقد جديد
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
                <!-- اختيار الموظف -->
                <div class="form-group full-width">
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

                <!-- ✅ حقل رفع المرفقات (تم إصلاح مشكلة النوع والقيمة الوهمية) -->
                <div class="form-group full-width">
                  <label>مرفقات العقد</label>
                  <!-- نستخدم computed property لتجنب تمرير [] مباشرة -->
                  <StbUploader
                    :model-value="uploaderModelValue"
                    @update:model-value="handleUploaderUpdate"
                    endpoint="/media/upload/contract"
                    field-name="files"
                    accept=".pdf,.doc,.docx,image/*"
                    :max-size="10 * 1024 * 1024"
                    idle-title="ارفع صور أو ملفات PDF للعقد"
                    hint="PDF / Word / Images — بحد أقصى 10 MB"
                    multiple
                    @error="toast.error"
                  />
                </div>

                <!-- ملاحظات -->
                <div class="form-group full-width">
                  <label>ملاحظات</label>
                  <textarea
                    v-model="form.notes"
                    class="form-input textarea-resize"
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
                  <span v-if="submitting" class="spinner spinner--sm" />
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
import { ref, reactive, onMounted, computed } from "vue";
import { useContractsStore } from "@/stores/contracts";
import { useEmployeesStore } from "@/stores/employees";
import { useToast } from "../../composables/useToast";
import type { Contract, CreateContractPayload } from "@/types";

// ✅ استيراد أيقونات Lucide ومكون الرفع
import { Plus, FileSignature, Trash2, X, Paperclip } from "lucide-vue-next";
import StbUploader from "@/components/global/StbUploader.vue";

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

// متغير مؤقت لتخزين روابط المرفقات القادمة من الـ Uploader
const tempAttachments = ref<string[]>([]);

interface ExtendedCreatePayload extends CreateContractPayload {
  attachmentPaths?: string[];
}

const EMPTY_FORM: ExtendedCreatePayload = {
  employeeId: "",
  contractType: "دائم",
  startDate: new Date().toISOString().split("T")[0] as string,
  endDate: "",
  annualLeaveDays: 30,
  notes: "",
  attachmentPaths: [],
};

const form = reactive<ExtendedCreatePayload>({ ...EMPTY_FORM });

// ✅ Computed Property لحل مشكلة النوع والقيمة الوهمية
// يعيد undefined إذا كانت المصفوفة فارغة، مما يمنع ظهور "يوجد ملف مرفق"
const uploaderModelValue = computed(() => {
  return tempAttachments.value.length > 0
    ? tempAttachments.value.join(",")
    : undefined;
});

// دالة للتعامل مع التحديثات القادمة من الـ Uploader
const handleUploaderUpdate = (val: string) => {
  if (!val) {
    tempAttachments.value = [];
  } else {
    // تحويل النص المفصول بفواصل إلى مصفوفة
    tempAttachments.value = val.split(",").filter(Boolean);
  }
};

// ── Actions ───────────────────────────────────────────────────────────────
const openCreateModal = () => {
  Object.assign(form, EMPTY_FORM);
  tempAttachments.value = []; // تصفير المرفقات المؤقتة
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    // تحديث الفورم بالمرفقات قبل الإرسال للتأكد
    form.attachmentPaths = tempAttachments.value;

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

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA");
};

const truncateText = (text: string, limit: number) => {
  if (text.length <= limit) return text;
  return text.substring(0, limit) + "...";
};

// ─── Init ───────────────────────────────────────────────────────────────────
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

.empty-card {
  .empty-state {
    padding: $space-10 $space-4;
  }

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

.notes-text {
  font-size: $font-size-xs;
  color: $stb-text-secondary;
}

.modal-lg {
  max-width: 700px;
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

.mt-4 {
  margin-top: $space-4 !important;
}

.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
</style>
