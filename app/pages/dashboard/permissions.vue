<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الصلاحيات</h1>
        <p>إدارة صلاحيات النظام والأدوار المخصصة</p>
      </div>
      <button class="btn btn--primary" @click="openCreate">
        <span>+</span> إضافة صلاحية مخصصة
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
            placeholder="بحث بالاسم التقني أو الوصف العربي..."
          />
        </div>
        <select v-model="scopeFilter" class="form-select" style="width: 160px">
          <option value="">كل النطاقات</option>
          <option value="system">نظام (System)</option>
          <option value="tenant">مؤسسة (Tenant)</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div v-if="store.loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <div v-else-if="!filtered.length" class="empty-state">
        <div class="empty-state__icon"></div>
        <div class="empty-state__title">لا توجد صلاحيات مطابقة</div>
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>الوصف (عربي)</th>
            <th>المعرف التقني</th>
            <th>النطاق</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="perm in filtered" :key="perm.id">
            <td class="font-medium">{{ perm.displayNameAr }}</td>
            <td>
              <code class="perm-code">{{ perm.name }}</code>
            </td>
            <td>
              <span :class="`badge badge--${perm.scope}`">
                {{ perm.scope === "system" ? "نظام" : "مؤسسة" }}
              </span>
            </td>
            <td>
              <div style="display: flex; gap: 0.5rem; align-items: center">
                <!-- ✅ الحماية تعتمد على tenantId وليس scope فقط -->
                <!-- الصلاحيات التي ليس لها tenantId (null) تعتبر أساسية ومحمية -->
                <template v-if="perm.tenantId">
                  <button
                    class="btn btn--ghost btn--sm"
                    @click="openEdit(perm)"
                  >
                    تعديل
                  </button>
                  <button
                    class="btn btn--danger btn--sm"
                    @click="confirmDelete(perm)"
                  >
                    حذف
                  </button>
                </template>

                <!-- رسالة للصلاحيات المحمية (سواء system أو tenant بدون id) -->
                <span v-else class="text-xs text-muted locked-badge">
                  🔒 محمي (أساسي)
                </span>
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
                <label>المعرف التقني (Name) *</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-input"
                  placeholder="مثال: custom_view_reports"
                  required
                  :disabled="!!editing"
                />
                <small class="text-muted"
                  >يستخدم هذا المعرف في الكود والـ Guards. لا يمكن تغييره بعد
                  الإنشاء.</small
                >
              </div>

              <div class="form-group">
                <label>الوصف العربي *</label>
                <input
                  v-model="form.displayNameAr"
                  type="text"
                  class="form-input"
                  placeholder="عرض تقارير مخصصة"
                  required
                />
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
                  <span v-else>{{ editing ? "حفظ التعديلات" : "إنشاء" }}</span>
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
      :message="`هل أنت متأكد من حذف الصلاحية '${deleteTarget?.displayNameAr}'؟ لا يمكن التراجع عن هذا الإجراء.`"
      confirm-text="حذف نهائي"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { usePermissionsStore, type Permission } from "@/stores/permissions";
import { useToast } from "@/composables/useToast";
import { computed, reactive, ref, onMounted } from "vue";

definePageMeta({ middleware: "auth" });

const store = usePermissionsStore();
const toast = useToast();

const search = ref("");
const scopeFilter = ref("");
const showModal = ref(false);
const showConfirm = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const editing = ref<Permission | null>(null);
const deleteTarget = ref<Permission | null>(null);

const form = reactive({ name: "", displayNameAr: "" });

const filtered = computed(() =>
  store.permissions.filter((p) => {
    const q = search.value.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.displayNameAr.toLowerCase().includes(q);

    const matchesScope = !scopeFilter.value || p.scope === scopeFilter.value;

    return matchesSearch && matchesScope;
  }),
);

const openCreate = () => {
  editing.value = null;
  form.name = "";
  form.displayNameAr = "";
  showModal.value = true;
};

const openEdit = (p: Permission) => {
  // ✅ حماية إضافية: منع فتح المودال للتعديل إذا لم يكن هناك tenantId
  if (!p.tenantId) return;

  editing.value = p;
  form.name = p.name;
  form.displayNameAr = p.displayNameAr;
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (editing.value) {
      await store.update(editing.value.id, {
        displayNameAr: form.displayNameAr,
      });
      toast.success("تم تحديث الصلاحية بنجاح");
    } else {
      await store.create({
        name: form.name,
        displayNameAr: form.displayNameAr,
      });
      toast.success("تم إنشاء الصلاحية بنجاح");
    }
    showModal.value = false;
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء العملية");
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (p: Permission) => {
  // ✅ حماية إضافية: منع فتح نافذة التأكيد إذا لم يكن هناك tenantId
  if (!p.tenantId) return;

  deleteTarget.value = p;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم حذف الصلاحية بنجاح");
    showConfirm.value = false;
    deleteTarget.value = null;
  } catch (e: any) {
    toast.error(e.message || "فشل الحذف");
  } finally {
    deleting.value = false;
  }
};

onMounted(() => store.fetchAll());
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;

.perm-code {
  font-family: "Courier New", monospace;
  font-size: 0.75rem;
  background: rgba($stb-primary, 0.08);
  color: $stb-accent;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba($stb-accent, 0.15);
  direction: ltr;
  display: inline-block;
}

.font-medium {
  font-weight: 600;
  color: var(--color-text-primary);
}

.locked-badge {
  opacity: 0.6;
  font-style: italic;
  background: rgba($stb-text-muted, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
