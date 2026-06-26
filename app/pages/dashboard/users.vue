<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>المستخدمون</h1>
        <p>إدارة مستخدمي النظام وصلاحياتهم</p>
      </div>
      <button class="btn btn--primary" @click="openCreate">
        <Plus :size="18" />
        <span>إضافة مستخدم</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="card filters-card">
      <div class="filters-row">
        <div class="search-bar">
          <Search class="search-bar__icon" :size="18" />
          <input
            v-model="search"
            type="text"
            placeholder="بحث باسم المستخدم أو البريد..."
          />
        </div>
        <select v-model="statusFilter" class="form-select status-select">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="suspended">موقوف</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card table-card">
      <div v-if="store.loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>

      <div v-else-if="!filtered.length" class="empty-state">
        <UserX :size="40" class="empty-icon" />
        <div class="empty-state__title">لا يوجد مستخدمون</div>
        <div class="empty-state__text">أضف مستخدمًا جديدًا للبدء</div>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>الحالة</th>
              <th>الدور</th>
              <th>النوع</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filtered" :key="user.id">
              <td>
                <div class="user-cell">
                  <div class="user-avatar-sm">
                    {{ (user.username || "").charAt(0).toUpperCase() }}
                  </div>
                  <div class="user-info">
                    <span class="user-name">{{ user.username }}</span>
                    <span class="user-date">{{
                      formatDate(user.created_at)
                    }}</span>
                  </div>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span :class="`badge badge--${user.status}`">
                  {{ statusLabel(user.status) }}
                </span>
              </td>
              <td>
                <span v-if="user.role">{{ user.role.name }}</span>
                <span v-else class="text-muted text-xs">استعلام</span>
              </td>
              <td>
                <span v-if="user.isSuperAdmin" class="badge badge--system">
                  مدير النظام
                </span>
                <span
                  v-else-if="user.isSystemAdmin"
                  class="badge badge--active"
                >
                  مالك النظام
                </span>
                <span v-else class="badge badge--tenant">موظف</span>
              </td>
              <td>
                <div class="actions-cell">
                  <button
                    class="btn btn--ghost btn--sm"
                    @click="openEdit(user)"
                    title="تعديل"
                  >
                    <Pencil :size="16" />
                  </button>
                  <button
                    class="btn btn--danger btn--sm"
                    @click="confirmDelete(user)"
                    title="حذف"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="modal-overlay"
          @click.self="showModal = false"
        >
          <div class="modal">
            <div class="modal__header">
              <h3>
                {{ editingUser ? "تعديل المستخدم" : "إضافة مستخدم جديد" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showModal = false"
              >
                <X :size="20" />
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="modal-form">
              <div class="form-group">
                <label>اسم المستخدم *</label>
                <input
                  v-model="form.username"
                  type="text"
                  class="form-input"
                  required
                />
              </div>

              <div class="form-group">
                <label>البريد الإلكتروني *</label>
                <input
                  v-model="form.email"
                  type="email"
                  class="form-input"
                  :required="!editingUser"
                />
              </div>

              <div v-if="!editingUser" class="form-group">
                <label>كلمة المرور *</label>
                <input
                  v-model="form.password"
                  type="password"
                  class="form-input"
                  minlength="6"
                  required
                />
              </div>

              <div class="form-group">
                <label>الدور</label>
                <select v-model="form.roleId" class="form-select">
                  <option value="">استعلام</option>
                  <option
                    v-for="role in rolesStore.roles"
                    :key="role.id"
                    :value="role.id"
                  >
                    {{ role.name }}
                  </option>
                </select>
              </div>

              <div v-if="editingUser" class="form-group">
                <label>الحالة</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="suspended">موقوف</option>
                </select>
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
                  <span v-else>{{
                    editingUser ? "حفظ التغييرات" : "إنشاء المستخدم"
                  }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Delete -->
    <ConfirmDialog
      v-model="showConfirm"
      title="حذف المستخدم"
      :message="`هل أنت متأكد من حذف المستخدم ${deleteTarget?.username}؟ لا يمكن التراجع عن هذا الإجراء.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useUsersStore } from "@/stores/users";
import { useRolesStore } from "@/stores/roles";
import { useToast } from "@/composables/useToast";
import type { User } from "@/types";
import { computed, onMounted, reactive, ref } from "vue";
import { Plus, Search, UserX, Pencil, Trash2, X } from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useUsersStore();
const rolesStore = useRolesStore();
const toast = useToast();

const search = ref("");
const statusFilter = ref("");
const showModal = ref(false);
const showConfirm = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const editingUser = ref<User | null>(null);
const deleteTarget = ref<User | null>(null);

const form = reactive({
  username: "",
  email: "",
  password: "",
  roleId: "",
  status: "active" as "active" | "inactive" | "suspended",
});

const filtered = computed(() =>
  store.users.filter((u) => {
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchStatus = !statusFilter.value || u.status === statusFilter.value;
    return matchSearch && matchStatus;
  }),
);

const openCreate = () => {
  editingUser.value = null;
  Object.assign(form, {
    username: "",
    email: "",
    password: "",
    roleId: "",
    status: "active",
  });
  showModal.value = true;
};

const openEdit = (user: User) => {
  editingUser.value = user;
  Object.assign(form, {
    username: user.username,
    email: user.email,
    password: "",
    roleId: user.roleId ?? "",
    status: user.status,
  });
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (editingUser.value) {
      await store.update(editingUser.value.id, {
        username: form.username,
        status: form.status,
        roleId: form.roleId || undefined,
      });
      toast.success("تم تحديث المستخدم بنجاح");
    } else {
      await store.create({
        username: form.username,
        email: form.email,
        password: form.password,
        roleId: form.roleId || undefined,
      });
      toast.success("تم إنشاء المستخدم بنجاح");
    }
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ");
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (user: User) => {
  deleteTarget.value = user;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم حذف المستخدم");
    showConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الحذف");
  } finally {
    deleting.value = false;
  }
};

const statusLabel = (s: string) =>
  ({ active: "نشط", inactive: "غير نشط", suspended: "موقوف" })[s] ?? s;
const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");

onMounted(() => {
  store.fetchAll();
  rolesStore.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

// ✅ استخدام الميكسنز والمتغيرات الصحيحة
.filters-card {
  padding: $space-4 $space-5;
  margin-bottom: $space-6;
}

.filters-row {
  @include flex(row, center, flex-start, $space-4);
  width: 100%;

  @include respond-to("md") {
    flex-direction: column;
    align-items: stretch;
  }
}

.search-bar {
  position: relative;
  flex: 1;
  min-width: 200px;

  .search-bar__icon {
    position: absolute;
    right: $space-3; // ✅ متغير صحيح
    top: 50%;
    transform: translateY(-50%);
    color: $stb-text-muted; // ✅ متغير صحيح
    pointer-events: none;
  }

  input {
    padding-right: $space-8; // ✅ مساحة كافية للأيقونة
  }
}

.status-select {
  width: 160px;

  @include respond-to("md") {
    width: 100%;
  }
}

.table-responsive {
  overflow-x: auto;
  @include scrollbar;
}

.user-cell {
  @include flex(row, center, flex-start, $space-3);
}

.user-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: $radius-full; // ✅ متغير صحيح
  background: $gradient-primary;
  @include flex(row, center, center);
  font-size: $font-size-xs;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: $stb-text-primary;
  font-size: $font-size-sm;
}

.user-date {
  font-size: $font-size-xs;
  color: $stb-text-secondary;
  margin-top: 2px;
}

.actions-cell {
  @include flex(row, center, flex-start, $space-2);
}

.empty-icon {
  color: $stb-text-muted;
  opacity: 0.4;
  margin-bottom: $space-3;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
</style>
