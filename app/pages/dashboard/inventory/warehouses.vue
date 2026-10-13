<!-- pages/dashboard/inventory/warehouses.vue — المخازن: الرئيسي + مخازن الفروع -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>المخازن</h1>
        <p>المخزن الرئيسي يستلم المشتريات ويغذّي مخازن الفروع ونقاط البيع</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_warehouses'"
          v-quota="'max_warehouses'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>إضافة مخزن فرع</span>
        </button>
      </div>
    </div>

    <div v-if="store.warehousesLoading && !store.warehouses.length" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>المخزن</th>
              <th>النوع</th>
              <th>العنوان</th>
              <th>الرصيد السالب</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in store.warehouses" :key="w.id">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ w.name }}</span>
                  <span v-if="w.code" class="doc-cell__sub">{{ w.code }}</span>
                </div>
              </td>
              <td>
                <span
                  :class="[
                    'badge',
                    w.type === 'main' ? 'doc-status--info' : 'doc-status--draft',
                  ]"
                >
                  {{ w.type === "main" ? "رئيسي" : "فرع" }}
                </span>
              </td>
              <td>
                <div class="doc-cell">
                  <span>{{ w.address || "—" }}</span>
                  <span v-if="w.phone" class="doc-cell__sub" dir="ltr">
                    {{ w.phone }}
                  </span>
                </div>
              </td>
              <td>{{ w.allowNegativeStock ? "مسموح" : "ممنوع" }}</td>
              <td>
                <span
                  :class="['badge', w.isActive ? 'badge--active' : 'badge--inactive']"
                >
                  {{ w.isActive ? "نشط" : "موقوف" }}
                </span>
              </td>
              <td>
                <div class="doc-actions">
                  <NuxtLink
                    class="btn btn--sm btn--ghost"
                    :to="{ path: '/dashboard/inventory', query: { warehouseId: w.id } }"
                  >
                    <PackageSearch :size="14" /> الأرصدة
                  </NuxtLink>
                  <button
                    v-can="'manage_warehouses'"
                    class="btn btn--sm btn--ghost"
                    @click="openEdit(w)"
                  >
                    <Pencil :size="14" /> تعديل
                  </button>
                  <button
                    v-if="w.type !== 'main'"
                    v-can="'manage_warehouses'"
                    class="btn btn--sm btn--danger btn--icon"
                    title="حذف"
                    @click="askDelete(w)"
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

    <!-- ══ نموذج المخزن ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <WarehouseIcon :size="20" class="doc-modal__icon" />
                {{ editing ? "تعديل مخزن" : "إضافة مخزن فرع" }}
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
                  <label>اسم المخزن *</label>
                  <input
                    v-model.trim="form.name"
                    class="form-input"
                    required
                    maxlength="120"
                    placeholder="مثال: فرع الرياض"
                  />
                </div>
                <div class="form-group">
                  <label>الكود</label>
                  <input
                    v-model.trim="form.code"
                    class="form-input"
                    dir="ltr"
                    maxlength="20"
                    placeholder="اختياري"
                  />
                </div>
                <div class="form-group">
                  <label>الهاتف</label>
                  <StbPhoneInput v-model="form.phone" />
                </div>
                <div class="form-group doc-grid__full">
                  <label>العنوان</label>
                  <input v-model.trim="form.address" class="form-input" maxlength="300" />
                </div>
              </div>

              <label class="checkbox-label">
                <input v-model="form.allowNegativeStock" type="checkbox" />
                <span>السماح بالرصيد السالب</span>
              </label>
              <small class="doc-hint">
                مفيد للفروع: البيع لا يتوقف إذا تأخر تسجيل استلام البضاعة، ويظهر
                الصنف في تنبيه "رصيد سالب" لتصحيحه.
              </small>

              <label v-if="editing?.type !== 'main'" class="checkbox-label">
                <input v-model="form.isActive" type="checkbox" />
                <span>نشط</span>
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
                  {{ editing ? "حفظ التعديلات" : "إضافة المخزن" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف المخزن"
      :message="`هل تريد حذف المخزن '${deleteTarget?.name}'؟ حركاته السابقة تبقى في السجل.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  PackageSearch,
  Pencil,
  Plus,
  Trash2,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-vue-next";
import { useInventoryStore } from "@/stores/inventory";
import { useAccessStore } from "@/stores/access";
import { useToast } from "@/composables/useToast";
import type { Warehouse } from "@/types/inventory";

definePageMeta({ middleware: "auth" });

const store = useInventoryStore();
const accessStore = useAccessStore();
const toast = useToast();

const showModal = ref(false);
const submitting = ref(false);
const editing = ref<Warehouse | null>(null);

const emptyForm = () => ({
  name: "",
  code: "",
  phone: "",
  address: "",
  allowNegativeStock: true,
  isActive: true,
});
const form = reactive(emptyForm());

const openCreate = () => {
  Object.assign(form, emptyForm());
  editing.value = null;
  showModal.value = true;
};

const openEdit = (warehouse: Warehouse) => {
  Object.assign(form, {
    name: warehouse.name,
    code: warehouse.code ?? "",
    phone: warehouse.phone ?? "",
    address: warehouse.address ?? "",
    allowNegativeStock: warehouse.allowNegativeStock,
    isActive: warehouse.isActive,
  });
  editing.value = warehouse;
  showModal.value = true;
};

const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload = {
      name: form.name,
      code: form.code || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      allowNegativeStock: form.allowNegativeStock,
      isActive: form.isActive,
    };
    if (editing.value) {
      await store.updateWarehouse(editing.value.id, payload);
      toast.success("تم حفظ التعديلات");
    } else {
      await store.createWarehouse(payload);
      toast.success("تمت إضافة المخزن");
      accessStore.fetch(true); // تحديث عدّاد حد الخطة
    }
    showModal.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ المخزن"));
  } finally {
    submitting.value = false;
  }
};

const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Warehouse | null>(null);

const askDelete = (warehouse: Warehouse) => {
  deleteTarget.value = warehouse;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeWarehouse(deleteTarget.value.id);
    toast.success("تم حذف المخزن");
    showConfirm.value = false;
    accessStore.fetch(true);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف المخزن"));
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  try {
    await store.fetchWarehouses(true);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل المخازن"));
  }
});
</script>
