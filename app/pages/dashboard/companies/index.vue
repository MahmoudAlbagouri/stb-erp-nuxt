<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة الشركات</h1>
        <p>إضافة وتعديل بيانات الشركات والعملاء المشتركين في النظام</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--primary" @click="openModal()">
          <Plus :size="16" />
          إضافة شركة جديدة
        </button>
      </div>
    </div>

    <!-- ══ Stats Bar ════════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <Building2 :size="13" />
        <span
          >إجمالي الشركات: <strong>{{ store.tenants.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--success">
        <CheckCircle2 :size="13" />
        <span
          >شركات نشطة: <strong>{{ activeCount }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--accent">
        <Clock :size="13" />
        <span
          >فترة تجريبية: <strong>{{ trialCount }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Filters & Search ═════════════════════════════════════════════════ -->
    <div class="card filters-card">
      <div class="filters-row">
        <div class="search-wrapper">
          <Search class="search-icon" :size="16" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="بحث باسم الشركة أو رقم الهاتف..."
            class="form-input search-input"
          />
        </div>

        <select v-model="statusFilter" class="form-select status-select">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="trial">فترة تجريبية</option>
          <option value="inactive">غير نشط</option>
        </select>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="loading-grid">
      <div v-for="i in 4" :key="i" class="tenant-card tenant-card--skeleton">
        <div class="skeleton skeleton--circle"></div>
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line-sm"></div>
      </div>
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!filteredTenants.length" class="empty-wrapper">
      <div class="empty-state">
        <div class="empty-state__illustration">
          <Building2 :size="32" />
        </div>
        <div class="empty-state__title">لا توجد شركات</div>
        <div class="empty-state__text">
          {{
            searchQuery || statusFilter
              ? "لا توجد نتائج تطابق معايير البحث"
              : "ابدأ بإضافة أول شركة عميل للنظام"
          }}
        </div>
        <button
          v-if="!searchQuery && !statusFilter"
          class="btn btn--primary mt-4"
          @click="openModal()"
        >
          <Plus :size="15" />
          إضافة شركة
        </button>
      </div>
    </div>

    <!-- ══ Tenants Grid ══════════════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div
        v-for="tenant in filteredTenants"
        :key="tenant.id"
        class="tenant-card"
      >
        <!-- Card Header -->
        <div class="tenant-card__header">
          <div class="tenant-logo">
            <img
              v-if="tenant.logo_url"
              :src="tenant.logo_url"
              alt="Logo"
              class="logo-img"
            />
            <Building2 v-else :size="24" class="logo-placeholder" />
          </div>
          <div class="tenant-info">
            <h3 class="tenant-name">{{ tenant.companyName }}</h3>
            <span class="tenant-id">ID: {{ shortenId(tenant.id) }}</span>
          </div>

          <!-- Badge Inline -->
          <span :class="['status-badge', getStatusClass(tenant.status)]">
            <span class="dot"></span>
            {{ getStatusLabel(tenant.status) }}
          </span>
        </div>

        <!-- Card Body -->
        <div class="tenant-card__body">
          <div class="tenant-detail">
            <Phone :size="14" />
            <span>{{ tenant.phone || "—" }}</span>
          </div>
          <div class="tenant-detail">
            <MapPin :size="14" />
            <span>{{ tenant.address || "—" }}</span>
          </div>
          <div class="tenant-detail">
            <Globe :size="14" />
            <span>{{ tenant.country || "غير محدد" }}</span>
          </div>
          <div class="tenant-detail">
            <Calendar :size="14" />
            <span>منذ {{ formatDate(tenant.created_at) }}</span>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="tenant-card__footer">
          <button class="btn btn--ghost btn--sm" @click="openModal(tenant)">
            <Edit :size="14" />
            تعديل
          </button>

          <div class="action-divider"></div>

          <button
            class="btn btn--danger-outline btn--sm"
            @click="confirmDelete(tenant)"
          >
            <Trash2 :size="14" />
            حذف
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Add/Edit Modal ═══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal__header">
              <h3>
                {{ isEditing ? "تعديل بيانات الشركة" : "إضافة شركة جديدة" }}
              </h3>
              <button class="btn btn--icon btn--ghost" @click="closeModal">
                <X :size="18" />
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="modal-form">
              <div class="form-group">
                <label>اسم الشركة *</label>
                <input
                  v-model="form.companyName"
                  type="text"
                  class="form-input"
                  required
                  placeholder="مثال: شركة المستقبل للتجارة"
                />
              </div>

              <div class="grid-2-modal">
                <div class="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    class="form-input"
                    placeholder="+966..."
                  />
                </div>
                <div class="form-group">
                  <label>الدولة</label>
                  <input
                    v-model="form.country"
                    type="text"
                    class="form-input"
                    placeholder="المملكة العربية السعودية"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>العنوان</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="form-input"
                  placeholder="الرياض - حي العليا"
                />
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="closeModal"
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
                    isEditing ? "حفظ التعديلات" : "إضافة الشركة"
                  }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Delete Confirmation ══════════════════════════════════════════════ -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="حذف الشركة"
      message="هل أنت متأكد من رغبتك في حذف هذه الشركة؟ سيتم حذف جميع البيانات المرتبطة بها نهائياً."
      confirm-text="نعم، احذف"
      :loading="deleting"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { useTenantStore } from "@/stores/tenants";
import { useToast } from "@/composables/useToast";
import type { Tenant } from "@/stores/tenants";

// Icons
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  Clock,
} from "lucide-vue-next";

import ConfirmDialog from "@/components/global/ConfirmDialog.vue";

definePageMeta({ middleware: "auth" });

const store = useTenantStore();
const toast = useToast();

// State
const searchQuery = ref("");
const statusFilter = ref("");
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const currentTenantId = ref<string | null>(null);
const isEditing = ref(false);

// Form Data
const form = reactive({
  companyName: "",
  phone: "",
  address: "",
  country: "",
});

// Computed
const filteredTenants = computed(() => {
  return store.tenants.filter((t) => {
    const matchesSearch =
      !searchQuery.value ||
      t.companyName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      t.phone?.includes(searchQuery.value);

    const matchesStatus =
      !statusFilter.value || t.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

const activeCount = computed(
  () => store.tenants.filter((t) => t.status === "active").length,
);
const trialCount = computed(
  () => store.tenants.filter((t) => t.status === "trial").length,
);

// Methods
const openModal = (tenant?: Tenant) => {
  if (tenant) {
    isEditing.value = true;
    currentTenantId.value = tenant.id;
    form.companyName = tenant.companyName;
    form.phone = tenant.phone || "";
    form.address = tenant.address || "";
    form.country = tenant.country || "";
  } else {
    isEditing.value = false;
    currentTenantId.value = null;
    form.companyName = "";
    form.phone = "";
    form.address = "";
    form.country = "";
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (isEditing.value && currentTenantId.value) {
      await store.update(currentTenantId.value, form);
      toast.success("تم تحديث بيانات الشركة بنجاح");
    } else {
      await store.create(form);
      toast.success("تم إضافة الشركة بنجاح");
    }
    closeModal();
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ ما");
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (tenant: Tenant) => {
  currentTenantId.value = tenant.id;
  showDeleteConfirm.value = true;
};

const handleDelete = async () => {
  if (!currentTenantId.value) return;
  deleting.value = true;
  try {
    await store.delete(currentTenantId.value);
    toast.success("تم حذف الشركة بنجاح");
    showDeleteConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في الحذف");
  } finally {
    deleting.value = false;
  }
};

// Helpers
const shortenId = (id: string) => id.split("-")[0];
const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Badge Helpers
const getStatusClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "badge--active";
    case "trial":
      return "badge--trial";
    case "inactive":
      return "badge--inactive";
    default:
      return "badge--pending";
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "نشط";
    case "trial":
      return "تجريبي";
    case "inactive":
      return "غير نشط";
    default:
      return status || "غير معروف";
  }
};

onMounted(() => {
  store.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

// Stats & Filters
.stats-bar {
  display: flex;
  gap: $space-3;
  flex-wrap: wrap;
  margin-bottom: $space-4;
}

.stat-pill {
  @include flex(row, center, flex-start, $space-2);
  padding: $space-2 $space-3;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $stb-text-secondary;

  strong {
    color: $stb-text-primary;
    font-weight: 700;
  }

  &--success {
    border-color: rgba($stb-success, 0.3);
    strong {
      color: $stb-success;
    }
  }
  &--accent {
    border-color: rgba($stb-accent, 0.3);
    strong {
      color: $stb-accent;
    }
  }
}

.filters-card {
  padding: $space-4 $space-5;
  margin-bottom: $space-5;
}

.filters-row {
  @include flex(row, center, flex-start, $space-3);
  width: 100%;

  @include respond-to("md") {
    flex-direction: column;
    align-items: stretch;
  }
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 400px;

  .search-icon {
    position: absolute;
    right: $space-3;
    top: 50%;
    transform: translateY(-50%);
    color: $stb-text-muted;
  }

  .search-input {
    padding-right: $space-10;
  }
}

.status-select {
  width: 160px;
  @include respond-to("md") {
    width: 100%;
  }
}

// Grid & Cards
.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: $space-4;
}

.tenant-card {
  @include glass-card;
  display: flex;
  flex-direction: column;
  transition: all $transition-base;
  overflow: hidden;
  position: relative;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba($stb-accent, 0.35);
    box-shadow:
      0 0 16px rgba($stb-accent, 0.12),
      0 8px 24px rgba(0, 0, 0, 0.5);
  }

  &__header {
    @include flex(row, flex-start, flex-start, $space-3);
    padding: $space-5;
    border-bottom: 1px solid rgba($stb-border, 0.6);
    background: linear-gradient(
      180deg,
      rgba($stb-surface-2, 0.8) 0%,
      transparent 100%
    );
  }

  &__body {
    padding: $space-4 $space-5;
    display: flex;
    flex-direction: column;
    gap: $space-3;
    flex: 1;
  }

  &__footer {
    @include flex(row, center, space-between);
    padding: $space-3 $space-5;
    border-top: 1px solid rgba($stb-border, 0.5);
    background: rgba($stb-dark, 0.3);
  }

  &--skeleton {
    min-height: 200px;
    pointer-events: none;
  }
}

.tenant-logo {
  width: 48px;
  height: 48px;
  border-radius: $radius-lg;
  background: $stb-surface-3;
  @include flex(row, center, center);
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid $stb-border;

  .logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .logo-placeholder {
    color: $stb-text-muted;
  }
}

.tenant-info {
  flex: 1;
  min-width: 0;
}

.tenant-name {
  font-size: $font-size-base;
  font-weight: 700;
  color: $stb-text-primary;
  margin-bottom: 2px;
  @include truncate;
}

.tenant-id {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  font-family: monospace;
}

.tenant-detail {
  @include flex(row, flex-start, flex-start, $space-2);
  font-size: $font-size-sm;
  color: $stb-text-secondary;

  svg {
    color: $stb-accent;
    opacity: 0.7;
    margin-top: 2px;
  }
}

.action-divider {
  width: 1px;
  height: 20px;
  background: $stb-border;
}

.btn--danger-outline {
  background: transparent;
  color: $stb-danger;
  border: 1px solid rgba($stb-danger, 0.3);

  &:hover:not(:disabled) {
    background: rgba($stb-danger, 0.1);
    border-color: $stb-danger;
  }
}

.grid-2-modal {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-3;

  @include respond-to("sm") {
    grid-template-columns: 1fr;
  }
}

.mt-4 {
  margin-top: $space-4 !important;
}

// Inline Badge Styles
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }
}

.badge--active {
  background: rgba($stb-success, 0.12);
  color: $stb-success;
  border: 1px solid rgba($stb-success, 0.25);
}

.badge--trial {
  background: rgba($stb-accent, 0.12);
  color: $stb-accent;
  border: 1px solid rgba($stb-accent, 0.25);
}

.badge--inactive {
  background: rgba($stb-text-muted, 0.12);
  color: $stb-text-muted;
  border: 1px solid rgba($stb-text-muted, 0.25);
}
</style>
