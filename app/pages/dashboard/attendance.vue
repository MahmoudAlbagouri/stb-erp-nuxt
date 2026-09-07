<!-- pages/dashboard/attendance/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>نظام البصمة والحضور</h1>
        <p>إدارة أجهزة البصمة ومتابعة سجلات الدخول والخروج والإجازات</p>
      </div>
    </div>

    <!-- ══ Tabs Navigation ══════════════════════════════════════════════════ -->
    <div class="tabs-nav">
      <button
        :class="['tab-btn', { active: activeTab === 'devices' }]"
        @click="activeTab = 'devices'"
      >
        <Fingerprint :size="18" />
        الأجهزة المسجلة
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'logs' }]"
        @click="activeTab = 'logs'"
      >
        <ClipboardList :size="18" />
        سجل الحضور والانصراف
      </button>
    </div>

    <!-- ══ Tab Content: Devices ═════════════════════════════════════════════ -->
    <div v-if="activeTab === 'devices'" class="tab-content">
      <div class="action-bar">
        <button class="btn btn--primary" @click="openDeviceModal">
          <Plus :size="18" />
          إضافة جهاز جديد
        </button>
      </div>

      <div v-if="store.loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>

      <div v-else-if="!store.devices.length" class="card empty-card">
        <div class="empty-state">
          <WifiOff :size="40" class="empty-icon" />
          <div class="empty-state__title">لا توجد أجهزة مسجلة</div>
          <button class="btn btn--primary mt-4" @click="openDeviceModal">
            <Plus :size="16" />
            إضافة جهاز
          </button>
        </div>
      </div>

      <div v-else class="grid-3">
        <div v-for="dev in store.devices" :key="dev.id" class="device-card">
          <div class="device-card__header">
            <div class="device-card__icon">
              <Fingerprint :size="28" />
            </div>
            <span
              :class="[
                'badge',
                dev.status === 'online' ? 'badge--active' : 'badge--inactive',
              ]"
            >
              {{ dev.status === "online" ? "متصل" : "غير متصل" }}
            </span>
          </div>
          <div class="device-card__body">
            <h3>{{ dev.alias || dev.serialNumber }}</h3>
            <p class="text-sm text-muted">
              <MapPin :size="12" class="inline-icon" />
              {{ dev.location || "غير محدد الموقع" }}
            </p>
            <div class="divider"></div>
            <div class="device-details">
              <span
                >SN: <b>{{ dev.serialNumber }}</b></span
              >
              <span
                >Model: <b>{{ dev.model || "-" }}</b></span
              >
            </div>
          </div>
          <div class="device-card__footer">
            <button
              class="btn btn--sm btn--ghost"
              @click="openPushUserModal(dev)"
            >
              <UserPlus :size="14" />
              ربط موظف
            </button>
            <button
              class="btn btn--sm btn--danger"
              @click="confirmDeleteDevice(dev.id)"
            >
              <Trash2 :size="14" />
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Tab Content: Logs ════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'logs'" class="tab-content">
      <!-- ✅ شريط الفلاتر -->
      <div class="card filters-card">
        <div class="filters-grid">
          <div class="form-group">
            <label>من تاريخ</label>
            <input v-model="filters.from" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label>إلى تاريخ</label>
            <input v-model="filters.to" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label>نوع البصمة</label>
            <select v-model="filters.punchType" class="form-select">
              <option value="">الكل</option>
              <option value="check_in">حضور</option>
              <option value="check_out">انصراف</option>
              <option value="leave">إجازة</option>
            </select>
          </div>
          <div class="form-group">
            <label>الموظف</label>
            <select v-model="filters.employeeId" class="form-select">
              <option value="">كل الموظفين</option>
              <option
                v-for="emp in employeesStore.employees"
                :key="emp.id"
                :value="emp.id"
              >
                {{ emp.fullName }}
              </option>
            </select>
          </div>
        </div>
        <div class="filters-actions">
          <button class="btn btn--ghost" @click="applyFilters">
            <Search :size="16" />
            بحث
          </button>
          <button class="btn btn--ghost" @click="resetFilters">
            <RefreshCw :size="16" />
            إعادة تعيين
          </button>
          <div class="filters-actions__spacer" />
          <button
            class="btn btn--outline"
            :disabled="exporting === 'excel'"
            @click="handleExport('excel')"
          >
            <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
            <FileSpreadsheet v-else :size="16" />
            Excel
          </button>
          <button
            class="btn btn--outline"
            :disabled="exporting === 'pdf'"
            @click="handleExport('pdf')"
          >
            <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
            <FileText v-else :size="16" />
            PDF
          </button>
          <button class="btn btn--primary" @click="openManualLogModal">
            <Plus :size="16" />
            تسجيل بصمة يدوية
          </button>
        </div>
      </div>

      <div v-if="store.loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>

      <div v-else-if="!store.logs.length" class="card empty-card">
        <div class="empty-state">
          <ClipboardX :size="40" class="empty-icon" />
          <div class="empty-state__title">لا توجد سجلات في الفترة المحددة</div>
        </div>
      </div>

      <div v-else class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>وقت البصمة</th>
                <th>النوع</th>
                <th>ساعات العمل</th>
                <th>إضافي</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in store.logs" :key="log.id">
                <td>
                  <div class="employee-cell">
                    <span class="employee-name">
                      {{ log.employee?.fullName || "غير معروف" }}
                    </span>
                    <span class="employee-pin"
                      >PIN: {{ log.deviceUserId }}</span
                    >
                  </div>
                </td>
                <td>{{ formatDateTime(log.punchTime) }}</td>
                <td>
                  <span :class="`badge ${punchBadgeClass(log.punchType)}`">
                    {{ punchTypeLabel(log.punchType) }}
                  </span>
                  <div
                    v-if="log.punchType === 'leave' && log.leaveReason"
                    class="leave-reason"
                  >
                    {{ log.leaveReason }}
                  </div>
                </td>
                <td>
                  {{ log.workHours != null ? `${log.workHours} س` : "—" }}
                </td>
                <td>
                  <span
                    v-if="log.overtimeHours && log.overtimeHours > 0"
                    class="overtime-value"
                  >
                    {{ log.overtimeHours }} س
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <div class="status-badges">
                    <span
                      v-if="log.isManualEntry"
                      class="mini-tag mini-tag--manual"
                      >يدوي</span
                    >
                    <span
                      v-if="log.isEdited"
                      class="mini-tag mini-tag--edited"
                      :title="`عدّلها: ${log.editedByName || '-'}`"
                    >
                      معدّلة
                    </span>
                  </div>
                </td>
                <td>
                  <button
                    v-if="canEditLog(log)"
                    class="btn btn--sm btn--ghost"
                    @click="openEditLogModal(log)"
                  >
                    <Pencil :size="14" />
                    تعديل
                  </button>
                  <span v-else class="text-muted-sm">
                    {{ log.isEdited ? "تم التعديل" : "انتهت مهلة التعديل" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ Add Device Modal ═════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDeviceModal"
          class="modal-overlay"
          @click.self="showDeviceModal = false"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                <Fingerprint :size="20" class="modal-icon" />
                إضافة جهاز بصمة
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showDeviceModal = false"
                aria-label="إغلاق"
              >
                <X :size="20" />
              </button>
            </div>
            <form @submit.prevent="handleAddDevice" class="modal-form">
              <div class="form-group">
                <label>الرقم التسلسلي (Serial Number) *</label>
                <input
                  v-model="deviceForm.serialNumber"
                  class="form-input"
                  required
                  placeholder="مثال: JHG3255001088"
                />
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label>اسم الجهاز (Alias)</label>
                  <input
                    v-model="deviceForm.alias"
                    class="form-input"
                    placeholder="بوابة المدخل"
                  />
                </div>
                <div class="form-group">
                  <label>الموديل</label>
                  <input
                    v-model="deviceForm.model"
                    class="form-input"
                    placeholder="MB10"
                  />
                </div>
              </div>
              <div class="form-group">
                <label>الموقع</label>
                <input
                  v-model="deviceForm.location"
                  class="form-input"
                  placeholder="مبنى أ - الدور الأرضي"
                />
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showDeviceModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="submitting"
                >
                  <span v-if="submitting" class="spinner spinner--sm" />
                  <span v-else>حفظ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Push User Modal ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPushModal"
          class="modal-overlay"
          @click.self="showPushModal = false"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                <UserPlus :size="20" class="modal-icon" />
                ربط موظف بالجهاز
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showPushModal = false"
                aria-label="إغلاق"
              >
                <X :size="20" />
              </button>
            </div>

            <div v-if="targetDevice" class="device-info-banner">
              <Fingerprint :size="16" />
              <span>
                جاري الربط مع الجهاز:
                <b>{{ targetDevice.alias || targetDevice.serialNumber }}</b>
              </span>
            </div>

            <form @submit.prevent="handlePushUser" class="modal-form">
              <div class="form-group">
                <label>اختر الموظف *</label>
                <select
                  v-model="selectedEmployeeId"
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
                <small class="form-hint">
                  سيتم استخدام رقم الموظف (PIN) واسمه المسجلين في النظام
                  تلقائياً.
                </small>
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showPushModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--accent"
                  :disabled="submitting || !selectedEmployeeId"
                >
                  <span v-if="submitting" class="spinner spinner--sm" />
                  <span v-else>إرسال البيانات للجهاز</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Manual Log Modal (إضافة بصمة/إجازة يدوية) ═══════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showManualLogModal"
          class="modal-overlay"
          @click.self="showManualLogModal = false"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                <Plus :size="20" class="modal-icon" />
                تسجيل بصمة يدوية
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showManualLogModal = false"
                aria-label="إغلاق"
              >
                <X :size="20" />
              </button>
            </div>
            <form @submit.prevent="handleCreateManualLog" class="modal-form">
              <div class="form-group">
                <label>الموظف *</label>
                <select
                  v-model="manualLogForm.employeeId"
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

              <div class="form-group">
                <label>نوع البصمة *</label>
                <select
                  v-model="manualLogForm.punchType"
                  class="form-select"
                  required
                >
                  <option value="check_in">حضور</option>
                  <option value="check_out">انصراف</option>
                  <option value="leave">إجازة</option>
                </select>
              </div>

              <div class="form-group">
                <label>التاريخ والوقت *</label>
                <input
                  v-model="manualLogForm.punchTime"
                  type="datetime-local"
                  class="form-input"
                  :max="nowLocalDatetime"
                  required
                />
                <small class="form-hint">
                  لا يمكن اختيار تاريخ يتجاوز 24 ساعة من الآن.
                </small>
              </div>

              <div
                v-if="manualLogForm.punchType === 'leave'"
                class="form-group"
              >
                <label>سبب الإجازة *</label>
                <textarea
                  v-model="manualLogForm.leaveReason"
                  class="form-textarea"
                  rows="3"
                  required
                  placeholder="مثال: إجازة مرضية / إجازة سنوية..."
                ></textarea>
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showManualLogModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="submitting"
                >
                  <span v-if="submitting" class="spinner spinner--sm" />
                  <span v-else>حفظ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Edit Log Modal (تعديل بصمة — مرة واحدة خلال 24 ساعة) ══════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEditLogModal"
          class="modal-overlay"
          @click.self="showEditLogModal = false"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                <Pencil :size="20" class="modal-icon" />
                تعديل بصمة
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showEditLogModal = false"
                aria-label="إغلاق"
              >
                <X :size="20" />
              </button>
            </div>

            <div class="info-note">
              <Info :size="15" />
              <span>
                يمكن تعديل هذه البصمة مرة واحدة فقط، ولن تتمكن من تعديلها مرة
                أخرى بعد الحفظ.
              </span>
            </div>

            <form @submit.prevent="handleUpdateLog" class="modal-form">
              <div class="form-group">
                <label>نوع البصمة</label>
                <select v-model="editLogForm.punchType" class="form-select">
                  <option value="check_in">حضور</option>
                  <option value="check_out">انصراف</option>
                  <option value="leave">إجازة</option>
                </select>
              </div>

              <div class="form-group">
                <label>التاريخ والوقت *</label>
                <input
                  v-model="editLogForm.punchTime"
                  type="datetime-local"
                  class="form-input"
                  required
                />
              </div>

              <div v-if="editLogForm.punchType === 'leave'" class="form-group">
                <label>سبب الإجازة *</label>
                <textarea
                  v-model="editLogForm.leaveReason"
                  class="form-textarea"
                  rows="3"
                  required
                ></textarea>
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showEditLogModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="submitting"
                >
                  <span v-if="submitting" class="spinner spinner--sm" />
                  <span v-else>حفظ التعديل</span>
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
import {
  useAttendanceStore,
  type AttendanceLog,
  type PunchType,
} from "@/stores/attendance";
import { useEmployeesStore } from "@/stores/employees";
import { useToast } from "../../composables/useToast";
import type { CreateDevicePayload, BiometricDevice } from "@/types";

import {
  Fingerprint,
  ClipboardList,
  Plus,
  WifiOff,
  MapPin,
  UserPlus,
  Trash2,
  Search,
  RefreshCw,
  ClipboardX,
  X,
  Pencil,
  FileSpreadsheet,
  FileText,
  Info,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useAttendanceStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

// ─── State ──────────────────────────────────────────────────────────────────
const activeTab = ref<"devices" | "logs">("devices");
const submitting = ref(false);
const exporting = ref<"excel" | "pdf" | null>(null);

// Device Form
const showDeviceModal = ref(false);
const deviceForm = reactive<CreateDevicePayload>({
  serialNumber: "",
  alias: "",
  model: "",
  location: "",
});

// Push User Form
const showPushModal = ref(false);
const targetDeviceId = ref<string>("");
const selectedEmployeeId = ref<string>("");

// ✅ فلاتر السجلات
const filters = reactive({
  from: "",
  to: "",
  punchType: "" as PunchType | "",
  employeeId: "",
});

const activeFilters = computed(() => ({
  from: filters.from || undefined,
  to: filters.to || undefined,
  punchType: (filters.punchType || undefined) as PunchType | undefined,
  employeeId: filters.employeeId || undefined,
}));

// ✅ إضافة بصمة يدوية
const showManualLogModal = ref(false);
const manualLogForm = reactive({
  employeeId: "",
  punchType: "check_in" as PunchType,
  punchTime: "",
  leaveReason: "",
});

// ✅ تعديل بصمة
const showEditLogModal = ref(false);
const editingLogId = ref<string>("");
const editLogForm = reactive({
  punchType: "check_in" as PunchType,
  punchTime: "",
  leaveReason: "",
});

// وقت الآن بصيغة datetime-local، لضبط الحد الأقصى في input
const nowLocalDatetime = computed(() => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
});

const targetDevice = computed(() =>
  store.devices.find((d) => d.id === targetDeviceId.value),
);

// ─── Devices Actions (بدون تغيير) ──────────────────────────────────────────
const openDeviceModal = () => {
  Object.assign(deviceForm, {
    serialNumber: "",
    alias: "",
    model: "",
    location: "",
  });
  showDeviceModal.value = true;
};

const handleAddDevice = async () => {
  submitting.value = true;
  try {
    await store.createDevice(deviceForm);
    toast.success("تم إضافة الجهاز بنجاح");
    showDeviceModal.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
};

const confirmDeleteDevice = async (id: string) => {
  if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟")) return;
  try {
    await store.deleteDevice(id);
    toast.success("تم حذف الجهاز");
  } catch (e: any) {
    toast.error(e.message);
  }
};

const openPushUserModal = (dev: BiometricDevice) => {
  targetDeviceId.value = dev.id;
  selectedEmployeeId.value = "";
  showPushModal.value = true;
};

const handlePushUser = async () => {
  if (!selectedEmployeeId.value) return;
  submitting.value = true;
  try {
    await store.pushUserToDevice(
      targetDeviceId.value,
      selectedEmployeeId.value,
    );
    toast.success("تم إرسال أمر ربط الموظف بالجهاز بنجاح");
    showPushModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في إرسال البيانات");
  } finally {
    submitting.value = false;
  }
};

// ─── Logs: فلترة وتحميل ──────────────────────────────────────────────────
const loadLogs = () => {
  store.fetchLogs(activeFilters.value);
};

const applyFilters = () => loadLogs();

const resetFilters = () => {
  filters.from = "";
  filters.to = "";
  filters.punchType = "";
  filters.employeeId = "";
  loadLogs();
};

// ─── Logs: التصدير ──────────────────────────────────────────────────────
const handleExport = async (type: "excel" | "pdf") => {
  exporting.value = type;
  try {
    await store.exportLogs(activeFilters.value, type);
    toast.success(`تم تصدير ${type === "excel" ? "Excel" : "PDF"} بنجاح`);
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  } finally {
    exporting.value = null;
  }
};

// ─── Logs: إضافة بصمة يدوية ─────────────────────────────────────────────
const openManualLogModal = () => {
  manualLogForm.employeeId = "";
  manualLogForm.punchType = "check_in";
  manualLogForm.punchTime = nowLocalDatetime.value;
  manualLogForm.leaveReason = "";
  showManualLogModal.value = true;
};

const handleCreateManualLog = async () => {
  if (
    manualLogForm.punchType === "leave" &&
    !manualLogForm.leaveReason.trim()
  ) {
    toast.error("سبب الإجازة مطلوب");
    return;
  }
  submitting.value = true;
  try {
    await store.createManualLog({
      employeeId: manualLogForm.employeeId,
      punchType: manualLogForm.punchType,
      punchTime: new Date(manualLogForm.punchTime).toISOString(),
      leaveReason:
        manualLogForm.punchType === "leave"
          ? manualLogForm.leaveReason
          : undefined,
    });
    toast.success("تم تسجيل البصمة بنجاح");
    showManualLogModal.value = false;
    loadLogs();
  } catch (e: any) {
    toast.error(e.message || "فشل في تسجيل البصمة");
  } finally {
    submitting.value = false;
  }
};

// ─── Logs: تعديل بصمة (مرة واحدة خلال 24 ساعة) ─────────────────────────
const canEditLog = (log: AttendanceLog): boolean => {
  if (log.isEdited) return false;
  const referenceTime = new Date(
    log.originalPunchTime || log.punchTime,
  ).getTime();
  const hoursSince = (Date.now() - referenceTime) / (1000 * 60 * 60);
  return hoursSince <= 24;
};

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const openEditLogModal = (log: AttendanceLog) => {
  editingLogId.value = log.id;
  editLogForm.punchType = log.punchType;
  editLogForm.punchTime = toDatetimeLocal(log.punchTime);
  editLogForm.leaveReason = log.leaveReason || "";
  showEditLogModal.value = true;
};

const handleUpdateLog = async () => {
  if (editLogForm.punchType === "leave" && !editLogForm.leaveReason.trim()) {
    toast.error("سبب الإجازة مطلوب");
    return;
  }
  submitting.value = true;
  try {
    await store.updateLog(editingLogId.value, {
      punchTime: new Date(editLogForm.punchTime).toISOString(),
      punchType: editLogForm.punchType,
      leaveReason:
        editLogForm.punchType === "leave" ? editLogForm.leaveReason : undefined,
    });
    toast.success("تم تعديل البصمة بنجاح");
    showEditLogModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في تعديل البصمة");
  } finally {
    submitting.value = false;
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("ar-SA");
};

const punchTypeLabel = (type: PunchType) => {
  const map: Record<string, string> = {
    check_in: "حضور",
    check_out: "انصراف",
    break_out: "خروج استراحة",
    break_in: "عودة استراحة",
    overtime_in: "بداية إضافي",
    overtime_out: "نهاية إضافي",
    leave: "إجازة",
  };
  return map[type] || type;
};

const punchBadgeClass = (type: PunchType) => {
  if (type === "check_in") return "badge--active";
  if (type === "leave") return "badge--inactive";
  return "badge--terminated";
};

// ─── Init ──────────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchDevices();
  loadLogs();
  if (employeesStore.employees.length === 0) {
    employeesStore.fetchAll();
  }
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.tabs-nav {
  display: flex;
  gap: $space-4;
  margin-bottom: $space-6;
  border-bottom: 1px solid $stb-border;
}

.tab-btn {
  @include flex(row, center, center, $space-2);
  padding: $space-3 $space-6;
  background: transparent;
  border: none;
  color: $stb-text-secondary;
  font-family: $font-family;
  font-size: $font-size-base;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: all $transition-fast;

  &.active {
    color: $stb-accent;
    &::after {
      content: "";
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100%;
      height: 2px;
      background: $stb-accent;
    }
  }

  &:hover:not(.active) {
    color: $stb-text-primary;
  }
}

.action-bar {
  @include flex(row, center, space-between);
  margin-bottom: $space-4;
  flex-wrap: wrap;
  gap: $space-3;
}

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

.device-card {
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
    @include flex(row, center, space-between);
  }

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: $radius-lg;
    background: rgba($stb-accent, 0.12);
    color: $stb-accent;
    @include flex(row, center, center);
    flex-shrink: 0;
  }

  &__body {
    h3 {
      font-size: $font-size-lg;
      margin-bottom: $space-1;
      @include truncate;
    }
    p {
      @include flex(row, center, flex-start, $space-1);
    }
  }

  &__footer {
    @include flex(row, center, flex-end, $space-2);
    margin-top: auto;
  }
}

.inline-icon {
  flex-shrink: 0;
}

.device-details {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  font-size: $font-size-xs;
  color: $stb-text-secondary;
}

// ══ Filters ══════════════════════════════════════════════════════════════
.filters-card {
  padding: $space-4 $space-5;
  margin-bottom: $space-4;
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-3;

  @include respond-to("md") {
    grid-template-columns: 1fr 1fr;
  }
}

.filters-actions {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;

  &__spacer {
    flex: 1;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  label {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $stb-text-secondary;
  }
}

// ══ Table ════════════════════════════════════════════════════════════════
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
.employee-pin {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.leave-reason {
  margin-top: 2px;
  font-size: $font-size-xs;
  color: $stb-text-muted;
  max-width: 180px;
  white-space: normal;
}

.overtime-value {
  color: $stb-warning;
  font-weight: 700;
}

.status-badges {
  display: flex;
  gap: $space-1;
  flex-wrap: wrap;
}

.mini-tag {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: $radius-sm;
  font-weight: 700;
  white-space: nowrap;

  &--manual {
    background: rgba($stb-info, 0.12);
    color: $stb-info;
  }
  &--edited {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
    cursor: help;
  }
}

.text-muted-sm {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

// ══ Modals (شارك مع الأنماط العامة) ══════════════════════════════════════
.modal-md {
  max-width: 560px;
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
.device-info-banner {
  @include flex(row, center, flex-start, $space-2);
  background: rgba($stb-accent, 0.05);
  border: 1px solid rgba($stb-accent, 0.2);
  border-radius: $radius-md;
  padding: $space-3 $space-4;
  margin-bottom: $space-4;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  b {
    color: $stb-text-primary;
  }
}
.form-hint {
  color: $stb-text-muted;
  font-size: $font-size-xs;
  margin-top: 4px;
  display: block;
}
.form-textarea {
  width: 100%;
  background: $stb-surface-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  padding: $space-3;
  color: $stb-text-primary;
  font-size: $font-size-sm;
  resize: vertical;
  font-family: inherit;
}
.info-note {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-3 $space-4;
  margin: 0 $space-5;
  margin-top: $space-2;
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
