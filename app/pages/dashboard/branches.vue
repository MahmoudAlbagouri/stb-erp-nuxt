<!-- pages/dashboard/branches.vue — الفروع: لكل فرع مخازنه وموظفوه وأجهزته ومستخدموه -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الفروع</h1>
        <p>
          لكل فرع مخازنه وموظفوه وأجهزته، ويمكن قصر المستخدم على فروع محددة فلا
          يرى بيانات غيرها
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_branches'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>إضافة فرع</span>
        </button>
      </div>
    </div>

    <div v-if="store.loading && !store.branches.length" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الفرع</th>
              <th>العنوان</th>
              <th>المخازن</th>
              <th>الموظفون</th>
              <th>أجهزة البصمة</th>
              <th>مستخدمون مقيَّدون به</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in store.branches" :key="b.id">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">
                    {{ b.name }}
                    <span v-if="b.isMain" class="badge doc-status--info">
                      رئيسي
                    </span>
                  </span>
                  <span v-if="b.code" class="doc-cell__sub">{{ b.code }}</span>
                </div>
              </td>
              <td>
                <div class="doc-cell">
                  <span>{{ b.address || "—" }}</span>
                  <span v-if="b.phone" class="doc-cell__sub" dir="ltr">
                    {{ b.phone }}
                  </span>
                </div>
              </td>
              <td>{{ b.warehousesCount }}</td>
              <td>{{ b.employeesCount }}</td>
              <td>{{ b.devicesCount }}</td>
              <td>{{ b.usersCount }}</td>
              <td>
                <span
                  :class="['badge', b.isActive ? 'badge--active' : 'badge--inactive']"
                >
                  {{ b.isActive ? "نشط" : "موقوف" }}
                </span>
              </td>
              <td>
                <div class="doc-actions">
                  <button
                    v-can="'manage_branches'"
                    class="btn btn--sm btn--ghost"
                    @click="openEdit(b)"
                  >
                    <Pencil :size="14" /> تعديل
                  </button>
                  <button
                    v-if="!b.isMain"
                    v-can="'manage_branches'"
                    class="btn btn--sm btn--danger btn--icon"
                    title="حذف"
                    @click="askDelete(b)"
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

    <!-- ══ نموذج الفرع ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <MapPin :size="20" class="doc-modal__icon" />
                {{ editing ? "تعديل فرع" : "إضافة فرع" }}
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
                  <label>اسم الفرع *</label>
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
                  <input
                    v-model.trim="form.address"
                    class="form-input"
                    maxlength="300"
                  />
                </div>
              </div>
              <small class="doc-hint">
                العنوان والهاتف يُطبعان على فواتير الفرع وإيصالات كاشيره.
              </small>

              <label v-if="!editing?.isMain" class="checkbox-label">
                <input v-model="form.isActive" type="checkbox" />
                <span>نشط</span>
              </label>

              <small v-if="!editing" class="doc-hint">
                بعد الإضافة: أنشئ للفرع مخزناً من صفحة المخازن، ثم انسب إليه
                موظفيه وأجهزته.
              </small>

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
                  {{ editing ? "حفظ التعديلات" : "إضافة الفرع" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف الفرع"
      :message="`هل تريد حذف الفرع '${deleteTarget?.name}'؟ موظفوه وأجهزة بصمته ينتقلون إلى الفرع الرئيسي.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-vue-next";
import { useBranchesStore } from "@/stores/branches";
import { useToast } from "@/composables/useToast";
import type { Branch } from "@/types/branches";

definePageMeta({ middleware: "auth" });

const store = useBranchesStore();
const toast = useToast();

const showModal = ref(false);
const submitting = ref(false);
const editing = ref<Branch | null>(null);

const emptyForm = () => ({
  name: "",
  code: "",
  phone: "",
  address: "",
  isActive: true,
});
const form = reactive(emptyForm());

const openCreate = () => {
  Object.assign(form, emptyForm());
  editing.value = null;
  showModal.value = true;
};

const openEdit = (branch: Branch) => {
  Object.assign(form, {
    name: branch.name,
    code: branch.code ?? "",
    phone: branch.phone ?? "",
    address: branch.address ?? "",
    isActive: branch.isActive,
  });
  editing.value = branch;
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
      isActive: form.isActive,
    };
    if (editing.value) {
      await store.update(editing.value.id, payload);
      toast.success("تم حفظ التعديلات");
    } else {
      await store.create(payload);
      toast.success("تمت إضافة الفرع");
    }
    showModal.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الفرع"));
  } finally {
    submitting.value = false;
  }
};

const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Branch | null>(null);

const askDelete = (branch: Branch) => {
  deleteTarget.value = branch;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم حذف الفرع");
    showConfirm.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف الفرع"));
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  try {
    await store.fetchAll();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الفروع"));
  }
});
</script>
