<!-- pages/contracts/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة العقود</h1>
        <p>متابعة عقود الموظفين وتفاصيلها</p>
      </div>
      <div class="page-header__actions">
        <!-- ✅ أزرار التصدير الجماعي -->
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

        <button class="btn btn--primary" @click="openCreateModal">
          <Plus :size="18" />
          <span>إضافة عقد جديد</span>
        </button>
      </div>
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
          <Plus :size="16" /> إضافة عقد
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
              <th>مدة العقد</th>
              <th>التأمين</th>
              <th>التذكرة</th>
              <th>فترة التجربة</th>
              <th>المرفقات</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contract in contractList" :key="contract.id">
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
                <span
                  v-if="contract.contractDurationYears"
                  class="badge badge--neutral"
                  >{{ contract.contractDurationYears }} سنة</span
                >
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span
                  v-if="
                    contract.medicalInsurance &&
                    contract.medicalInsurance !== 'بدون'
                  "
                  class="badge badge--success"
                  >{{ contract.medicalInsurance }}</span
                >
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span
                  v-if="contract.ticketType && contract.ticketType !== 'بدون'"
                  class="badge badge--info"
                  >{{ contract.ticketType }}</span
                >
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span
                  v-if="
                    contract.probationPeriod &&
                    contract.probationPeriod !== 'بدون'
                  "
                  class="badge badge--warning"
                  >{{ contract.probationPeriod }}</span
                >
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <div
                  v-if="
                    contract.attachmentPaths &&
                    contract.attachmentPaths.length > 0
                  "
                  class="attachments-cell"
                >
                  <button
                    class="btn btn--sm btn--ghost attachments-btn"
                    @click="openAttachmentsViewer(contract)"
                    title="عرض المرفقات"
                  >
                    <Paperclip :size="14" /><span>{{
                      contract.attachmentPaths.length
                    }}</span>
                  </button>
                </div>
                <span v-else class="text-muted">-</span>
              </td>

              <!-- ✅ خانة الإجراءات مع قائمة التصدير المنسدلة -->
              <td>
                <div class="actions-cell">
                  <div class="export-dropdown" ref="exportDropdownRef">
                    <button
                      class="btn btn--ghost btn--sm export-btn"
                      @click="toggleExportMenu(contract.id)"
                    >
                      <Download :size="14" />
                    </button>
                    <Transition name="fade">
                      <div
                        v-if="activeExportMenu === contract.id"
                        class="dropdown-menu"
                      >
                        <button @click="downloadContract(contract.id, 'pdf')">
                          <FileText :size="14" /> ملف PDF
                        </button>
                        <button @click="downloadContract(contract.id, 'excel')">
                          <FileSpreadsheet :size="14" /> ملف Excel
                        </button>
                      </div>
                    </Transition>
                  </div>

                  <button
                    class="btn btn--danger btn--sm"
                    @click="confirmDelete(contract)"
                    title="حذف العقد"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═ Create Contract Modal ════════════════════════════════════════════ -->
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
                <FileSignature :size="20" class="modal-icon" /> إضافة عقد جديد
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
                <div class="form-group full-width">
                  <label>الموظف *</label>
                  <select
                    v-model="form.employeeId"
                    class="form-select"
                    required
                    @change="onEmployeeChange"
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
                <div class="form-group">
                  <label>مدة العقد (بالسنوات)</label>
                  <input
                    v-model.number="form.contractDurationYears"
                    type="number"
                    class="form-input"
                    min="1"
                  />
                </div>
                <div class="form-group">
                  <label>تاريخ بداية العقد *</label>
                  <input
                    v-model="form.startDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>تاريخ نهاية العقد (اختياري)</label>
                  <input
                    v-model="form.endDate"
                    type="date"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>التأمين الطبي</label>
                  <select v-model="form.medicalInsurance" class="form-select">
                    <option value="بدون">بدون</option>
                    <option value="فردي">فردي</option>
                    <option value="عائلي">عائلي</option>
                  </select>
                </div>
                <div
                  v-if="selectedEmployeeNationality === 'non_saudi'"
                  class="form-group"
                >
                  <label class="form-label required">الجنسية</label>
                  <select
                    v-model="form.nationality"
                    class="form-select"
                    required
                  >
                    <option value="" disabled>اختر الجنسية...</option>
                    <option
                      v-for="nat in NATIONALITIES"
                      :key="nat"
                      :value="nat"
                    >
                      {{ nat }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>تذكرة طيران</label>
                  <select v-model="form.ticketType" class="form-select">
                    <option value="بدون">بدون</option>
                    <option value="ذهاب فقط">ذهاب فقط</option>
                    <option value="ذهاب وعودة">ذهاب وعودة</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>فترة التجربة</label>
                  <select v-model="form.probationPeriod" class="form-select">
                    <option value="بدون">بدون</option>
                    <option value="3 شهور">3 شهور</option>
                    <option value="6 شهور">6 شهور</option>
                  </select>
                </div>
                <div class="form-group full-width">
                  <label>مرفقات العقد</label>
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
                  <span v-if="submitting" class="spinner spinner--sm" /><span
                    v-else
                    >حفظ العقد</span
                  >
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Attachments Viewer Modal ═══════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showAttachmentsModal"
          class="modal-overlay"
          @click.self="showAttachmentsModal = false"
        >
          <div class="modal modal-md attachments-modal">
            <div class="modal__header">
              <h3><Paperclip :size="20" class="modal-icon" /> مرفقات العقد</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showAttachmentsModal = false"
                aria-label="إغلاق"
              >
                <X :size="20" />
              </button>
            </div>
            <div class="modal__body attachments-grid">
              <div
                v-for="(url, index) in currentContractAttachments"
                :key="index"
                class="attachment-item"
              >
                <div v-if="isImage(url)" class="img-preview">
                  <img :src="url" alt="مرفق" />
                  <div class="overlay-actions">
                    <a
                      :href="url"
                      target="_blank"
                      class="btn btn--sm btn--primary"
                      ><ExternalLink :size="14" /> فتح</a
                    >
                    <a :href="url" download class="btn btn--sm btn--outline"
                      ><Download :size="14" /> تحميل</a
                    >
                  </div>
                </div>
                <div v-else class="file-preview">
                  <FileText :size="32" class="file-icon" />
                  <span class="file-name">{{ getFileName(url) }}</span>
                  <div class="file-actions">
                    <a
                      :href="url"
                      target="_blank"
                      class="btn btn--sm btn--primary"
                      ><ExternalLink :size="14" /> فتح</a
                    >
                  </div>
                </div>
              </div>
            </div>
            <div class="modal__footer">
              <button
                class="btn btn--ghost"
                @click="showAttachmentsModal = false"
              >
                إغلاق
              </button>
            </div>
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
import {
  Plus,
  FileSignature,
  Trash2,
  X,
  Paperclip,
  ExternalLink,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-vue-next";
import StbUploader from "@/components/global/StbUploader.vue";

definePageMeta({ middleware: "auth" });

const NATIONALITIES = [
  "مصري",
  "يمني",
  "سوداني",
  "باكستاني",
  "هندي",
  "بنغلاديشي",
  "فلبيني",
  "إندونيسي",
  "نيبالي",
  "سريلانكي",
  "أردني",
  "سوري",
  "لبناني",
  "أخرى",
];

type ContractWithExtras = Contract & {
  attachmentPaths?: string[];
  contractDurationYears?: number;
  ticketType?: string;
  probationPeriod?: string;
  medicalInsurance?: string;
  nationality?: string;
};

const store = useContractsStore();
const employeesStore = useEmployeesStore();
const toast = useToast();
const contractList = computed<ContractWithExtras[]>(
  () => store.contracts as ContractWithExtras[],
);

// ─── State ──────────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Contract | null>(null);
const showAttachmentsModal = ref(false);
const currentContractAttachments = ref<string[]>([]);
const tempAttachments = ref<string[]>([]);
const selectedEmployeeNationality = ref<string>("");

// ✅ حالة التصدير
const exporting = ref<"excel" | "pdf" | null>(null);
const activeExportMenu = ref<string | null>(null);

interface ExtendedCreatePayload extends CreateContractPayload {
  attachmentPaths?: string[];
  contractDurationYears?: number;
  medicalInsurance?: string;
  nationality?: string;
}

const EMPTY_FORM: ExtendedCreatePayload = {
  employeeId: "",
  contractType: "دائم",
  startDate: new Date().toISOString().split("T")[0] as string,
  endDate: "",
  annualLeaveDays: 30,
  contractDurationYears: 1,
  ticketType: "بدون",
  probationPeriod: "بدون",
  medicalInsurance: "بدون",
  nationality: "",
  notes: "",
  attachmentPaths: [],
};
const form = reactive<ExtendedCreatePayload>({ ...EMPTY_FORM });

const uploaderModelValue = computed(() =>
  tempAttachments.value.length > 0
    ? tempAttachments.value.join(",")
    : undefined,
);
const handleUploaderUpdate = (val: string) => {
  if (!val) {
    tempAttachments.value = [];
  } else {
    tempAttachments.value = val.split(",").filter(Boolean);
  }
};

const onEmployeeChange = () => {
  const emp = employeesStore.employees.find((e) => e.id === form.employeeId);
  if (emp) {
    selectedEmployeeNationality.value = emp.nationalityType;
    if (emp.nationalityType !== "non_saudi") form.nationality = "";
  } else {
    selectedEmployeeNationality.value = "";
    form.nationality = "";
  }
};

// ── Actions ───────────────────────────────────────────────────────────────
const openCreateModal = () => {
  Object.assign(form, EMPTY_FORM);
  tempAttachments.value = [];
  selectedEmployeeNationality.value = "";
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    form.attachmentPaths = tempAttachments.value;
    const payload = { ...form };
    if (payload.nationality === "") delete payload.nationality;
    await store.create(payload);
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

const openAttachmentsViewer = (contract: Contract) => {
  if (contract.attachmentPaths) {
    currentContractAttachments.value = contract.attachmentPaths;
    showAttachmentsModal.value = true;
  }
};
const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
const getFileName = (url: string) => url.split("/").pop() || "ملف";
const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA");
};

// ✅ منطق التصدير
const handleExport = async (type: "excel" | "pdf") => {
  exporting.value = type;
  try {
    await store.exportData(type);
    toast.success(`تم تصدير تقرير العقود بصيغة ${type.toUpperCase()} بنجاح`);
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  } finally {
    exporting.value = null;
  }
};

const toggleExportMenu = (id: string) => {
  activeExportMenu.value = activeExportMenu.value === id ? null : id;
};

const downloadContract = async (id: string, type: "excel" | "pdf") => {
  try {
    await store.exportSingle(id, type);
    toast.success(`تم تصدير ملف العقد بصيغة ${type.toUpperCase()} بنجاح`);
    activeExportMenu.value = null;
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  }
};

// إغلاق القوائم عند النقر خارجها
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

// ✅ تنسيق خلية الإجراءات والقائمة المنسدلة
.actions-cell {
  display: flex;
  gap: $space-1;
  align-items: center;
  justify-content: flex-end;
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

.attachments-cell {
  display: flex;
  justify-content: center;
}
.attachments-btn {
  gap: 6px;
  font-weight: 500;
  &:hover {
    background-color: rgba($stb-primary, 0.1);
    color: $stb-primary;
  }
}
.attachments-modal {
  max-width: 800px;
}
.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: $space-4;
  padding: $space-4;
}
.attachment-item {
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  overflow: hidden;
  transition: transform 0.2s;
  background: $stb-surface;
  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-md;
    border-color: $stb-border-light;
  }
}
.img-preview {
  position: relative;
  height: 150px;
  background: #f8f9fa;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .overlay-actions {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba($stb-dark, 0.85);
    padding: $space-2;
    display: flex;
    justify-content: space-around;
    opacity: 0;
    transition: opacity 0.2s;
    a {
      color: white !important;
      &:hover {
        color: $stb-accent !important;
      }
    }
  }
  &:hover .overlay-actions {
    opacity: 1;
  }
}
.file-preview {
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: $space-3;
  background: $stb-surface-2;
  .file-icon {
    color: $stb-text-muted;
  }
  .file-name {
    font-size: $font-size-xs;
    text-align: center;
    word-break: break-all;
    color: $stb-text-secondary;
    padding: 0 $space-2;
  }
  .file-actions {
    margin-top: auto;
  }
}
</style>
