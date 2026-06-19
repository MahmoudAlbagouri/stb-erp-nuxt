<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>نظام البصمة والحضور</h1>
        <p>إدارة أجهزة البصمة ومتابعة سجلات الدخول والخروج</p>
      </div>
    </div>

    <!-- ══ Tabs Navigation ══════════════════════════════════════════════════ -->
    <div class="tabs-nav">
      <button
        :class="['tab-btn', { active: activeTab === 'devices' }]"
        @click="activeTab = 'devices'"
      >
        📟 الأجهزة المسجلة
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'logs' }]"
        @click="activeTab = 'logs'"
      >
        📋 سجل الحضور والانصراف
      </button>
    </div>

    <!-- ══ Tab Content: Devices ═════════════════════════════════════════════ -->
    <div v-if="activeTab === 'devices'" class="tab-content">
      <div class="action-bar">
        <button class="btn btn--primary" @click="openDeviceModal">
          <span>+</span> إضافة جهاز جديد
        </button>
      </div>

      <div v-if="store.loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>

      <div v-else-if="!store.devices.length" class="card">
        <div class="empty-state">
          <div class="empty-state__icon">📟</div>
          <div class="empty-state__title">لا توجد أجهزة مسجلة</div>
          <button
            class="btn btn--primary"
            style="margin-top: 1rem"
            @click="openDeviceModal"
          >
            إضافة جهاز
          </button>
        </div>
      </div>

      <div v-else class="grid-3">
        <div v-for="dev in store.devices" :key="dev.id" class="device-card">
          <div class="device-card__header">
            <div class="device-card__icon">📟</div>
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
              👤 ربط موظف
            </button>
            <button
              class="btn btn--sm btn--danger"
              @click="confirmDeleteDevice(dev.id)"
            >
              🗑 حذف
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Tab Content: Logs ════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'logs'" class="tab-content">
      <div class="action-bar">
        <div class="filters-row">
          <input
            v-model="dateFrom"
            type="date"
            class="form-input"
            style="width: auto"
          />
          <span>إلى</span>
          <input
            v-model="dateTo"
            type="date"
            class="form-input"
            style="width: auto"
          />
          <button class="btn btn--ghost" @click="loadLogs">🔍 بحث</button>
        </div>
        <button class="btn btn--accent" @click="loadLogs">
          🔄 تحديث السجلات
        </button>
      </div>

      <div v-if="store.loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>

      <div v-else-if="!store.logs.length" class="card">
        <div class="empty-state">
          <div class="empty-state__icon">📋</div>
          <div class="empty-state__title">لا توجد سجلات في الفترة المحددة</div>
        </div>
      </div>

      <div v-else class="card" style="padding: 0; overflow: hidden">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الجهاز</th>
              <th>وقت البصمة</th>
              <th>النوع</th>
              <th>طريقة التحقق</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in store.logs" :key="log.id">
              <td>
                <div style="font-weight: 600">
                  {{ log.employee?.fullName || "غير معروف" }}
                </div>
                <div style="font-size: 0.75rem; color: var(--stb-text-muted)">
                  PIN: {{ log.deviceUserId }}
                </div>
              </td>
              <td>
                <div style="font-size: 0.85rem">
                  {{ log.device?.alias || log.deviceSn }}
                </div>
                <div style="font-size: 0.75rem; color: var(--stb-text-muted)">
                  {{ log.device?.location }}
                </div>
              </td>
              <td>{{ formatDateTime(log.punchTime) }}</td>
              <td>
                <span
                  :class="`badge badge--${log.punchType === 'check_in' ? 'active' : 'terminated'}`"
                >
                  {{ log.punchType === "check_in" ? "دخول" : "خروج" }}
                </span>
              </td>
              <td>{{ getVerifyLabel(log.verifyMode) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ Modals ═══════════════════════════════════════════════════════════ -->

    <!-- Add Device Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDeviceModal"
          class="modal-overlay"
          @click.self="showDeviceModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>إضافة جهاز بصمة</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showDeviceModal = false"
              >
                ✕
              </button>
            </div>
            <form @submit.prevent="handleAddDevice">
              <div class="form-group">
                <label>الرقم التسلسلي (Serial Number) *</label>
                <input
                  v-model="deviceForm.serialNumber"
                  class="form-input"
                  required
                  placeholder="مثال: JHG3255001088"
                />
              </div>
              <div class="grid-2" style="margin-top: 1rem">
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
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Push User Modal (المعدل لاختيار الموظف) -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPushModal"
          class="modal-overlay"
          @click.self="showPushModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>ربط موظف بالجهاز</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showPushModal = false"
              >
                ✕
              </button>
            </div>

            <div
              v-if="targetDevice"
              class="card"
              style="
                margin-bottom: 1rem;
                background: rgba(0, 170, 255, 0.05);
                border-color: rgba(0, 170, 255, 0.2);
              "
            >
              <div style="font-size: 0.9rem">
                جاري الربط مع الجهاز:
                <b>{{ targetDevice.alias || targetDevice.serialNumber }}</b>
              </div>
            </div>

            <form @submit.prevent="handlePushUser">
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
                <p
                  style="
                    font-size: 0.75rem;
                    color: var(--stb-text-muted);
                    margin-top: 0.5rem;
                  "
                >
                  سيتم استخدام رقم الموظف (PIN) واسمه المسجلين في النظام
                  تلقائياً.
                </p>
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
                  <span v-if="submitting" class="spinner" />
                  <span v-else>إرسال البيانات للجهاز</span>
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
import { useAttendanceStore } from "../../stores/attendance";
import { useEmployeesStore } from "../../stores/employees";
import { useToast } from "../../composables/useToast";
import type { CreateDevicePayload, BiometricDevice } from "../../types";

definePageMeta({ middleware: "auth" });

const store = useAttendanceStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

// ─── State ──────────────────────────────────────────────────────────────────

const activeTab = ref<"devices" | "logs">("devices");
const submitting = ref(false);

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

// Logs Filters
const dateFrom = ref("");
const dateTo = ref("");

// Computed for Target Device Info
const targetDevice = computed(() =>
  store.devices.find((d) => d.id === targetDeviceId.value),
);

// ─── Actions ───────────────────────────────────────────────────────────────

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
    // استدعاء الدالة بالمعرفات فقط
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

const loadLogs = () => {
  store.fetchLogs({
    from: dateFrom.value || undefined,
    to: dateTo.value || undefined,
  });
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("ar-SA");
};

const getVerifyLabel = (mode: string) => {
  const map: Record<string, string> = {
    fingerprint: "بصمة إصبع",
    card: "بطاقة",
    password: "كلمة مرور",
    face: "تعرف وجه",
  };
  return map[mode] || mode;
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
}

.action-bar {
  @include flex(row, center, space-between);
  margin-bottom: $space-4;
  flex-wrap: wrap;
  gap: $space-3;
}

.filters-row {
  @include flex(row, center, flex-start, $space-2);
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
    font-size: 1.5rem;
  }

  &__body {
    h3 {
      font-size: $font-size-lg;
      margin-bottom: $space-1;
    }
  }

  &__footer {
    @include flex(row, center, flex-end, $space-2);
    margin-top: auto;
  }
}

.device-details {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  font-size: $font-size-xs;
  color: $stb-text-secondary;
}
</style>
