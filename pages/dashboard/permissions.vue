<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الصلاحيات</h1>
        <p>إدارة صلاحيات النظام</p>
      </div>
      <button class="btn btn--primary" @click="openCreate">
        <span>+</span> إضافة صلاحية
      </button>
    </div>

    <!-- Search + filter -->
    <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.5rem">
      <div class="filters-row">
        <div class="search-bar" style="flex: 1; min-width: 200px">
          <span class="search-bar__icon">🔍</span>
          <input
            v-model="search"
            type="text"
            placeholder="بحث في الصلاحيات..."
          />
        </div>
        <select v-model="scopeFilter" class="form-select" style="width: 160px">
          <option value="">كل النطاقات</option>
          <option value="system">نظام</option>
          <option value="tenant">صلاحيات انشأتها</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div v-if="store.loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <div v-else-if="!filtered.length" class="empty-state">
        <div class="empty-state__icon">🔑</div>
        <div class="empty-state__title">لا توجد صلاحيات</div>
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>اسم الصلاحية</th>
            <th>النطاق</th>
            <th>منشأة من قبل من</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="perm in filtered" :key="perm.id">
            <td>
              <code class="perm-code">{{ perm.name }}</code>
            </td>
            <td>
              <span :class="`badge badge--${perm.scope}`">{{
                perm.scope === "system" ? "نظام" : "مالك"
              }}</span>
            </td>
            <td>
              <span v-if="perm.tenantId" class="text-xs text-muted"
                >{{ perm.tenantId.slice(0, 8) }}…</span
              >
              <span v-else class="text-xs text-muted">—</span>
            </td>
            <td>
              <div style="display: flex; gap: 0.5rem">
                <button
                  v-if="perm.scope === 'tenant'"
                  class="btn btn--ghost btn--sm"
                  @click="openEdit(perm)"
                >
                  تعديل
                </button>
                <button
                  v-if="perm.scope === 'tenant'"
                  class="btn btn--danger btn--sm"
                  @click="confirmDelete(perm)"
                >
                  حذف
                </button>
                <span v-if="perm.scope === 'system'" class="text-xs text-muted"
                  >غير قابلة للتعديل</span
                >
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>{{ editing ? "تعديل الصلاحية" : "إضافة صلاحية جديدة" }}</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                ✕
              </button>
            </div>
            <form @submit.prevent="handleSubmit">
              <div class="form-group">
                <label>اسم الصلاحية *</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-input"
                  placeholder="create_invoice"
                  required
                />
                <span class="form-error" v-if="!form.name && submitted"
                  >هذا الحقل مطلوب</span
                >
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
                  <span v-else>{{ editing ? "حفظ" : "إنشاء" }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف الصلاحية"
      :message="`هل تريد حذف الصلاحية '${deleteTarget?.name}'؟`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { usePermissionsStore } from "~/stores/permissions";
import { useToast } from "~/composables/useToast";
import type { Permission } from "~/types";

definePageMeta({ middleware: "auth" });

const store = usePermissionsStore();
const toast = useToast();

const search = ref("");
const scopeFilter = ref("");
const showModal = ref(false);
const showConfirm = ref(false);
const submitting = ref(false);
const submitted = ref(false);
const deleting = ref(false);
const editing = ref<Permission | null>(null);
const deleteTarget = ref<Permission | null>(null);

const form = reactive({ name: "" });

const filtered = computed(() =>
  store.permissions.filter((p) => {
    const q = search.value.toLowerCase();
    return (
      (!q || p.name.toLowerCase().includes(q)) &&
      (!scopeFilter.value || p.scope === scopeFilter.value)
    );
  }),
);

const openCreate = () => {
  editing.value = null;
  form.name = "";
  showModal.value = true;
};
const openEdit = (p: Permission) => {
  editing.value = p;
  form.name = p.name;
  showModal.value = true;
};

const handleSubmit = async () => {
  submitted.value = true;
  if (!form.name) return;
  submitting.value = true;
  try {
    if (editing.value) {
      await store.update(editing.value.id, form.name);
      toast.success("تم تحديث الصلاحية");
    } else {
      await store.create({ name: form.name });
      toast.success("تم إنشاء الصلاحية");
    }
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (p: Permission) => {
  deleteTarget.value = p;
  showConfirm.value = true;
};
const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم الحذف");
    showConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    deleting.value = false;
  }
};

onMounted(() => store.fetchAll());
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.perm-code {
  font-family: "Courier New", monospace;
  font-size: $font-size-xs;
  background: rgba($stb-primary, 0.12);
  color: $stb-accent;
  padding: $space-1 $space-2;
  border-radius: $radius-sm;
  border: 1px solid rgba($stb-accent, 0.15);
}
</style>
