<!-- pages/dashboard/pos/devices.vue — أجهزة الكاشير (نقاط البيع) -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>أجهزة الكاشير</h1>
        <p>كل جهاز مربوط بمخزن فرع يبيع منه، وله كود يبدأ به أرقام فواتيره</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink v-can="'use_pos'" to="/pos" class="btn btn--ghost">
          <Store :size="16" />
          <span>فتح شاشة الكاشير</span>
        </NuxtLink>
        <button
          v-can="'manage_pos_devices'"
          v-quota="'max_pos_devices'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>إضافة جهاز</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !devices.length" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!devices.length" class="card">
      <div class="empty-state">
        <MonitorSmartphone :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد أجهزة كاشير بعد</div>
        <div class="empty-state__text">
          أضف جهازاً لكل نقطة بيع، ثم افتح شاشة الكاشير على ذلك الجهاز واربطه به
        </div>
        <button
          v-can="'manage_pos_devices'"
          v-quota="'max_pos_devices'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> إضافة جهاز
        </button>
      </div>
    </div>

    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الجهاز</th>
              <th>المخزن</th>
              <th>آخر فاتورة</th>
              <th>آخر اتصال</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in devices" :key="d.id">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ d.name }}</span>
                  <span><code class="doc-code">{{ d.code }}</code></span>
                </div>
              </td>
              <td>
                <div class="doc-cell">
                  <span>{{ d.warehouse?.name || "—" }}</span>
                  <span v-if="d.warehouse?.branch" class="doc-cell__sub">
                    {{ d.warehouse.branch.name }}
                  </span>
                </div>
              </td>
              <td>
                <code v-if="d.lastCounter" class="doc-code">
                  {{ d.code }}-{{ String(d.lastCounter).padStart(6, "0") }}
                </code>
                <span v-else>—</span>
              </td>
              <td>
                <span v-if="d.lastSeenAt" class="doc-num">
                  {{ formatDateTime(d.lastSeenAt) }}
                </span>
                <span v-else class="doc-cell__sub">لم يتصل بعد</span>
              </td>
              <td>
                <div class="doc-cell">
                  <span>
                    <span
                      :class="['badge', d.isActive ? 'badge--active' : 'badge--inactive']"
                    >
                      {{ d.isActive ? "نشط" : "موقوف" }}
                    </span>
                  </span>
                  <span class="doc-cell__sub">
                    {{ d.installationId ? "مربوط بشاشة" : "غير مربوط" }}
                  </span>
                  <span v-if="d.hasOpenShift" class="doc-cell__sub">وردية مفتوحة</span>
                </div>
              </td>
              <td>
                <div class="doc-actions">
                  <NuxtLink
                    class="btn btn--sm btn--ghost"
                    :to="{ path: '/dashboard/pos/shifts', query: { deviceId: d.id } }"
                  >
                    <ClipboardList :size="14" /> الورديات
                  </NuxtLink>
                  <button
                    v-if="d.installationId"
                    v-can="'manage_pos_devices'"
                    class="btn btn--sm btn--ghost"
                    title="فكّ ربط الجهاز بشاشته: يُبطل مفتاحها فوراً (لجهاز استُبدل أو سُرق)"
                    @click="askUnbind(d)"
                  >
                    <Unlink :size="14" /> فك الربط
                  </button>
                  <button
                    v-can="'manage_pos_devices'"
                    class="btn btn--sm btn--ghost btn--icon"
                    title="تعديل"
                    @click="openEdit(d)"
                  >
                    <Pencil :size="14" />
                  </button>
                  <button
                    v-can="'manage_pos_devices'"
                    class="btn btn--sm btn--danger btn--icon"
                    title="حذف"
                    @click="askDelete(d)"
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

    <!-- ══ نموذج الجهاز ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <MonitorSmartphone :size="20" class="doc-modal__icon" />
                {{ editing ? "تعديل جهاز كاشير" : "إضافة جهاز كاشير" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeModal"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="handleSubmit">
              <div class="doc-grid">
                <div class="form-group doc-grid__full">
                  <label>اسم الجهاز *</label>
                  <input
                    v-model.trim="form.name"
                    class="form-input"
                    required
                    maxlength="120"
                    placeholder="مثال: كاشير 1 — فرع العليا"
                  />
                </div>
                <div class="form-group">
                  <label>الكود *</label>
                  <input
                    v-model.trim="form.code"
                    class="form-input"
                    dir="ltr"
                    required
                    pattern="[A-Z0-9]{2,10}"
                    maxlength="10"
                    placeholder="POS1"
                    :disabled="!!editing"
                    @input="form.code = form.code.toUpperCase()"
                  />
                  <small class="doc-hint">
                    {{
                      editing
                        ? "لا يُعدَّل: فواتير الجهاز تحمله"
                        : `أرقام فواتيره: ${form.code || "POS1"}-000001`
                    }}
                  </small>
                </div>
                <div class="form-group">
                  <label>يبيع من مخزن *</label>
                  <select v-model="form.warehouseId" class="form-select" required>
                    <option value="" disabled>اختر المخزن...</option>
                    <option v-for="w in activeWarehouses" :key="w.id" :value="w.id">
                      {{ w.branch ? `${w.name} — ${w.branch.name}` : w.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div v-if="selectedWarehouse && !selectedWarehouse.allowNegativeStock" class="doc-note">
                <Info :size="16" />
                <span>
                  هذا المخزن لا يسمح بالرصيد السالب: فاتورة تبيع أكثر من رصيده
                  تُرفض عند الرفع. للكاشير يُفضَّل مخزن فرع يسمح بالسالب.
                </span>
              </div>

              <label class="checkbox-label">
                <input v-model="form.isActive" type="checkbox" />
                <span>نشط (الجهاز الموقوف لا يرفع ولا ينزّل حتى يُفعَّل)</span>
              </label>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeModal">
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting"
                >
                  {{ editing ? "حفظ التعديلات" : "إضافة الجهاز" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showUnbind"
      title="فك ربط الجهاز"
      :message="`فك ربط '${unbindTarget?.name}' يُبطل مفتاح شاشته فوراً ويسمح بربطه بشاشة أخرى. الشاشة الحالية لن ترفع ولن تسحب بعدها — إن لم يكن الجهاز مسروقاً فتأكد أنها رفعت كل مبيعاتها وقفلت ورديتها أولاً.`"
      confirm-text="فك الربط"
      :loading="unbinding"
      @confirm="doUnbind"
    />

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف جهاز الكاشير"
      :message="`هل تريد حذف الجهاز '${deleteTarget?.name}'؟ فواتيره وورديّاته تبقى، وكوده '${deleteTarget?.code}' لا يُستخدم لجهاز آخر.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  ClipboardList,
  Info,
  MonitorSmartphone,
  Pencil,
  Plus,
  Store,
  Trash2,
  Unlink,
  X,
} from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import type { PosDevice } from "@/pos/types";
import { useAccessStore } from "@/stores/access";
import { useInventoryStore } from "@/stores/inventory";
import { usePosAdminStore } from "@/stores/posAdmin";

definePageMeta({ middleware: "auth" });

const store = usePosAdminStore();
const inventory = useInventoryStore();
const accessStore = useAccessStore();
const toast = useToast();

const devices = ref<PosDevice[]>([]);
const loading = ref(false);

const load = async () => {
  loading.value = true;
  try {
    devices.value = await store.fetchDevices();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل أجهزة الكاشير"));
  } finally {
    loading.value = false;
  }
};

const activeWarehouses = computed(() =>
  inventory.warehouses.filter((w) => w.isActive),
);
const selectedWarehouse = computed(() =>
  inventory.warehouses.find((w) => w.id === form.warehouseId),
);

// ─── النموذج ──────────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<PosDevice | null>(null);
const form = reactive({ name: "", code: "", warehouseId: "", isActive: true });

const openCreate = () => {
  Object.assign(form, {
    name: "",
    code: `POS${devices.value.length + 1}`,
    // الافتراضي أول مخزن فرع (الكاشير يبيع من الفرع لا من الرئيسي)
    warehouseId:
      activeWarehouses.value.find((w) => w.type === "branch")?.id ?? "",
    isActive: true,
  });
  editing.value = null;
  showModal.value = true;
};

const openEdit = (device: PosDevice) => {
  Object.assign(form, {
    name: device.name,
    code: device.code,
    warehouseId: device.warehouseId,
    isActive: device.isActive,
  });
  editing.value = device;
  showModal.value = true;
};

const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (editing.value) {
      await store.updateDevice(editing.value.id, {
        name: form.name,
        warehouseId: form.warehouseId,
        isActive: form.isActive,
      });
      toast.success("تم حفظ التعديلات");
    } else {
      await store.createDevice({ ...form });
      toast.success("تمت إضافة الجهاز — افتح شاشة الكاشير عليه واربطه");
      accessStore.fetch(true); // تحديث عدّاد حد الخطة
    }
    showModal.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الجهاز"));
  } finally {
    submitting.value = false;
  }
};

// ─── فك الربط ─────────────────────────────────────────────────────────────────
const showUnbind = ref(false);
const unbinding = ref(false);
const unbindTarget = ref<PosDevice | null>(null);

const askUnbind = (device: PosDevice) => {
  unbindTarget.value = device;
  showUnbind.value = true;
};

const doUnbind = async () => {
  if (!unbindTarget.value) return;
  unbinding.value = true;
  try {
    await store.unbindDevice(unbindTarget.value.id);
    toast.success("تم فك ربط الجهاز");
    showUnbind.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فك ربط الجهاز"));
  } finally {
    unbinding.value = false;
  }
};

// ─── الحذف ────────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<PosDevice | null>(null);

const askDelete = (device: PosDevice) => {
  deleteTarget.value = device;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeDevice(deleteTarget.value.id);
    toast.success("تم حذف الجهاز");
    showConfirm.value = false;
    accessStore.fetch(true);
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف الجهاز"));
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  inventory.fetchWarehouses().catch(() => {});
  load();
});
</script>
