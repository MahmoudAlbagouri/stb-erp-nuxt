<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الأدوار</h1>
        <p>إدارة أدوار المستخدمين وصلاحياتهم</p>
      </div>
      <button class="btn btn--primary" @click="openCreate">
        <span>+</span> إضافة دور
      </button>
    </div>

    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>
    <div v-else-if="!store.roles.length" class="card">
      <div class="empty-state">
        <div class="empty-state__icon">🛡</div>
        <div class="empty-state__title">لا توجد أدوار بعد</div>
        <div class="empty-state__text">
          أنشئ دورًا جديدًا وأسند له الصلاحيات المناسبة
        </div>
        <button
          class="btn btn--primary"
          @click="openCreate"
          style="margin-top: 1rem"
        >
          إنشاء دور
        </button>
      </div>
    </div>
    <div v-else class="roles-grid">
      <div v-for="role in store.roles" :key="role.id" class="role-card">
        <div class="role-card__header">
          <div class="role-card__icon">🛡</div>
          <div class="role-card__info">
            <h3>{{ role.name }}</h3>
            <span :class="`badge badge--${role.scope}`">{{
              role.scope === "system" ? "نظام" : "مستأجر"
            }}</span>
          </div>
        </div>
        <div class="role-card__perms">
          <div class="role-card__perms-title">
            الصلاحيات ({{ role.permissions?.length ?? 0 }})
          </div>
          <div v-if="role.permissions?.length" class="role-card__tags">
            <span
              v-for="p in role.permissions.slice(0, 4)"
              :key="p.id"
              class="perm-tag"
              >{{ p.name }}</span
            >
            <span
              v-if="(role.permissions?.length ?? 0) > 4"
              class="perm-tag perm-tag--more"
            >
              +{{ (role.permissions?.length ?? 0) - 4 }}
            </span>
          </div>
          <div v-else class="text-muted text-xs">لا توجد صلاحيات</div>
        </div>
        <div class="role-card__footer">
          <button class="btn btn--ghost btn--sm" @click="openEdit(role)">
            تعديل
          </button>
          <button class="btn btn--danger btn--sm" @click="confirmDelete(role)">
            حذف
          </button>
        </div>
      </div>
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
              <h3>{{ editing ? "تعديل الدور" : "إنشاء دور جديد" }}</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                ✕
              </button>
            </div>
            <form @submit.prevent="handleSubmit">
              <div style="display: flex; flex-direction: column; gap: 1rem">
                <div class="form-group">
                  <label>اسم الدور *</label>
                  <input
                    v-model="form.name"
                    type="text"
                    class="form-input"
                    placeholder="مثال: مدير المبيعات"
                    required
                  />
                </div>

                <div class="form-group">
                  <div class="perms-header-row">
                    <label class="perms-label">الصلاحيات</label>
                    <!-- ✅ زر تحديد الكل -->
                    <label class="checkbox-label select-all-label">
                      <input
                        type="checkbox"
                        :checked="isAllSelected"
                        @change="toggleAllPermissions"
                      />
                      <span>تحديد الكل</span>
                    </label>
                  </div>

                  <div class="perms-list">
                    <label
                      v-for="perm in permissionsStore.permissions"
                      :key="perm.id"
                      class="checkbox-label"
                    >
                      <input
                        type="checkbox"
                        :value="perm.id"
                        v-model="form.permissionIds"
                      />
                      <span>{{ perm.name }}</span>
                      <span
                        :class="`badge badge--${perm.scope}`"
                        style="margin-right: auto; margin-left: 0"
                        >{{ perm.scope === "system" ? "نظام" : "مستأجر" }}</span
                      >
                    </label>
                  </div>
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
      title="حذف الدور"
      :message="`هل تريد حذف دور '${deleteTarget?.name}'؟`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useRolesStore } from "../../stores/roles";
import { usePermissionsStore } from "../../stores/permissions";
import { useToast } from "../../composables/useToast";
import type { Role } from "../../types";
import { computed, reactive, ref, onMounted } from "vue"; // تأكد من استيراد computed

definePageMeta({ middleware: "auth" });

const store = useRolesStore();
const permissionsStore = usePermissionsStore();
const toast = useToast();

const showModal = ref(false);
const showConfirm = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const editing = ref<Role | null>(null);
const deleteTarget = ref<Role | null>(null);

const form = reactive({ name: "", permissionIds: [] as string[] });

// ✅ منطق تحديد الكل
const isAllSelected = computed(() => {
  if (!permissionsStore.permissions.length) return false;
  return form.permissionIds.length === permissionsStore.permissions.length;
});

const toggleAllPermissions = () => {
  if (isAllSelected.value) {
    // إذا كان الكل محدد، قم بإلغاء التحديد
    form.permissionIds = [];
  } else {
    // وإلا، حدد جميع معرفات الصلاحيات
    form.permissionIds = permissionsStore.permissions.map(
      (p: { id: string }) => p.id,
    );
  }
};

const openCreate = () => {
  editing.value = null;
  form.name = "";
  form.permissionIds = [];
  showModal.value = true;
};

const openEdit = (role: Role) => {
  editing.value = role;
  form.name = role.name;
  form.permissionIds = role.permissions?.map((p: { id: string }) => p.id) ?? [];
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (editing.value) {
      await store.update(editing.value.id, {
        name: form.name,
        permissionIds: form.permissionIds,
      });
      toast.success("تم تحديث الدور");
    } else {
      await store.create({
        name: form.name,
        scope: "tenant",
        permissionIds: form.permissionIds,
      });
      toast.success("تم إنشاء الدور");
    }
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (role: Role) => {
  deleteTarget.value = role;
  showConfirm.value = true;
};
const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم حذف الدور");
    showConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  store.fetchAll();
  permissionsStore.fetchAll();
});
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: $space-4;
}

.role-card {
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
    @include flex(row, center, flex-start, $space-3);
  }

  &__icon {
    width: 44px;
    height: 44px;
    border-radius: $radius-lg;
    background: rgba($stb-primary, 0.15);
    @include flex(row, center, center);
    font-size: 1.25rem;
  }

  &__info h3 {
    font-size: $font-size-base;
    font-weight: 700;
    margin-bottom: $space-1;
  }

  &__perms-title {
    font-size: $font-size-xs;
    color: $stb-text-muted;
    margin-bottom: $space-2;
    font-weight: 600;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $space-1;
  }

  &__footer {
    @include flex(row, center, flex-end, $space-2);
    margin-top: auto;
  }
}

.perm-tag {
  font-size: $font-size-xs;
  padding: 2px $space-2;
  background: rgba($stb-primary, 0.15);
  color: $stb-text-secondary;
  border-radius: $radius-full;
  border: 1px solid rgba($stb-primary, 0.2);

  &--more {
    background: rgba($stb-accent, 0.1);
    color: $stb-accent;
    border-color: rgba($stb-accent, 0.2);
  }
}

.perms-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  max-height: 260px;
  overflow-y: auto;
  padding: $space-3;
  background: $stb-surface;
  border-radius: $radius-md;
  border: 1px solid $stb-border;
  @include scrollbar;
}

// ✅ تنسيقات جديدة لتحديد الكل
.perms-header-row {
  padding: 0 10px;
  @include flex(row, center, space-between);
  margin-bottom: $space-2;
}

.perms-label {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $stb-text-secondary;
}

.select-all-label {
  font-size: $font-size-xs;
  color: $stb-accent;
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    accent-color: $stb-accent;
    width: 14px;
    height: 14px;
  }
}
</style>
