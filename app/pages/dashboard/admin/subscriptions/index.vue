<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة اشتراكات العملاء</h1>
        <p>التحكم في خطط وتجديدات الشركات المسجلة في النظام</p>
      </div>
    </div>

    <!-- ══ Stats Bar ════════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <Building2 :size="13" />
        <span
          >إجمالي الشركات:
          <strong>{{ tenantStore.tenants.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--accent">
        <CreditCard :size="13" />
        <span
          >الاشتراكات النشطة: <strong>{{ activeSubsCount }}</strong></span
        >
      </div>
      <div class="stat-pill">
        <Clock :size="13" />
        <span
          >آخر تحديث: <strong>{{ todayLabel }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Admin Layout ═════════════════════════════════════════════════════ -->
    <div class="admin-sub-layout">
      <!-- Sidebar: Companies List -->
      <div class="card selection-panel">
        <div class="panel-header">
          <h3>الشركات المسجلة</h3>
          <span class="count-badge">{{ filteredTenants.length }}</span>
        </div>

        <div class="search-box">
          <Search :size="14" />
          <input
            v-model="searchQuery"
            placeholder="بحث عن شركة..."
            class="form-input"
          />
        </div>

        <div class="tenant-list">
          <div
            v-for="t in filteredTenants"
            :key="t.id"
            class="tenant-card"
            :class="{ 'is-active': selectedTenantId === t.id }"
            @click="selectTenant(t.id)"
          >
            <div class="t-accent-bar"></div>
            <div class="t-content">
              <div class="t-info">
                <span class="t-name">{{ t.company_name }}</span>
                <span class="t-status" :class="`s-${t.status}`">{{
                  getStatusLabel(t.status)
                }}</span>
              </div>
              <span class="t-id">{{ t.id.slice(0, 8) }}...</span>
            </div>
          </div>

          <div v-if="filteredTenants.length === 0" class="empty-search">
            لا توجد نتائج مطابقة
          </div>
        </div>
      </div>

      <!-- Main: Subscription Details -->
      <div class="card details-panel" v-if="selectedTenantId">
        <div v-if="loadingSub" class="flex-center p-10">
          <div class="spinner spinner--lg"></div>
        </div>

        <div v-else-if="subData" class="sub-content animate-fade-in">
          <!-- Plan Hero Section -->
          <div class="plan-hero">
            <div class="plan-icon-wrapper">
              <Gem :size="28" />
            </div>
            <div class="plan-details">
              <h2>{{ subData.plan.nameAr }}</h2>
              <span :class="['status-badge', `b-${subData.status}`]">
                <span class="dot"></span>
                {{ getStatusLabel(subData.status) }}
              </span>
            </div>
            <div class="plan-price-tag">
              {{ formatPrice(subData.plan.price) }}
              <span class="cycle"
                >/ {{ getBillingLabel(subData.plan.billingCycle) }}</span
              >
            </div>
          </div>

          <!-- Actions Toolbar -->
          <div class="actions-toolbar">
            <button class="btn btn--outline btn--sm" @click="openStatusModal">
              <SlidersHorizontal :size="14" /> إدارة الحالة
            </button>
            <button
              class="btn btn--accent-outline btn--sm"
              @click="showRenewModal = true"
            >
              <RefreshCw :size="14" /> تجديد
            </button>
            <button
              class="btn btn--primary btn--sm"
              @click="showChangePlanModal = true"
            >
              <Layers :size="14" /> تغيير الخطة
            </button>
          </div>

          <!-- Meta Data Grid -->
          <div class="sub-meta-grid">
            <div class="meta-box">
              <span class="label"><CalendarDays :size="12" /> تاريخ البدء</span>
              <span class="val">{{ formatDate(subData.startDate) }}</span>
            </div>
            <div class="meta-box">
              <span class="label"
                ><CalendarRange :size="12" /> تاريخ الانتهاء</span
              >
              <span class="val">{{
                subData.endDate
                  ? formatDate(subData.endDate)
                  : "غير محدد (مدى الحياة)"
              }}</span>
            </div>
          </div>
        </div>

        <div v-else class="empty-state-panel">
          <div class="empty-illustration"><AlertCircle :size="32" /></div>
          <p>لا يوجد اشتراك نشط لهذه الشركة حالياً.</p>
          <button
            class="btn btn--primary btn--sm mt-3"
            @click="openStatusModal"
          >
            تفعيل اشتراك جديد
          </button>
        </div>
      </div>

      <div v-else class="card details-panel empty-placeholder">
        <div class="placeholder-content">
          <Layers :size="48" class="placeholder-icon" />
          <p>قم باختيار شركة من القائمة لعرض تفاصيل اشتراكها وإدارتها</p>
        </div>
      </div>
    </div>

    <!-- ✅ Status Management Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showStatusModal"
          class="modal-overlay"
          @click.self="showStatusModal = false"
        >
          <div class="modal modal--md">
            <div class="modal__header">
              <h3><SlidersHorizontal :size="18" /> إدارة حالة الاشتراك</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showStatusModal = false"
              >
                <X :size="18" />
              </button>
            </div>
            <form @submit.prevent="handleUpdateStatus" class="modal-form">
              <div class="form-group">
                <label>الحالة الجديدة</label>
                <select v-model="newStatus" class="form-select" required>
                  <option value="active">نشط (Active)</option>
                  <option value="suspended">معلق (Suspended)</option>
                  <option value="cancelled">ملغي (Cancelled)</option>
                  <option value="pending">قيد الانتظار (Pending)</option>
                </select>
              </div>
              <div class="form-group" v-if="newStatus === 'active'">
                <label>مدة الاشتراك (أيام) - اختياري للتجديد</label>
                <input
                  v-model.number="statusDurationDays"
                  type="number"
                  min="1"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>سبب التغيير (للتدقيق)</label>
                <input
                  v-model="statusReason"
                  type="text"
                  class="form-input"
                  placeholder="مثال: تأخر سداد، طلب العميل..."
                />
              </div>
              <div class="alert-info">
                <Info :size="14" />
                <span
                  >سيتم تسجيل هذا التغيير في سجل التدقيق (Audit Log) الخاص
                  بالاشتراك.</span
                >
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showStatusModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="actionLoading"
                >
                  تطبيق التغيير
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Renew Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showRenewModal"
          class="modal-overlay"
          @click.self="showRenewModal = false"
        >
          <div class="modal modal--sm">
            <div class="modal__header">
              <h3><RefreshCw :size="18" /> تجديد الاشتراك</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showRenewModal = false"
              >
                <X :size="18" />
              </button>
            </div>
            <form @submit.prevent="handleRenew" class="modal-form">
              <div class="form-group">
                <label>عدد الأيام الإضافية</label>
                <input
                  v-model.number="renewDays"
                  type="number"
                  min="1"
                  class="form-input"
                  required
                />
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showRenewModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--accent"
                  :disabled="actionLoading"
                >
                  تأكيد التجديد
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Change Plan Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showChangePlanModal"
          class="modal-overlay"
          @click.self="showChangePlanModal = false"
        >
          <div class="modal modal--md">
            <div class="modal__header">
              <h3><Layers :size="18" /> تغيير الخطة</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showChangePlanModal = false"
              >
                <X :size="18" />
              </button>
            </div>
            <form @submit.prevent="handleChangePlan" class="modal-form">
              <div class="form-group">
                <label>الخطة الجديدة</label>
                <select v-model="newPlanId" class="form-select" required>
                  <option value="" disabled>اختر خطة...</option>
                  <option
                    v-for="p in planStore.plans"
                    :key="p.id"
                    :value="p.id"
                  >
                    {{ p.nameAr }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>مدة الاشتراك (أيام)</label>
                <input
                  v-model.number="changeDuration"
                  type="number"
                  min="1"
                  class="form-input"
                  required
                />
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showChangePlanModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="actionLoading"
                >
                  تطبيق التغيير
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
import { ref, computed, onMounted } from "vue";
import { useTenantStore } from "@/stores/tenants";
import { usePlanStore } from "@/stores/plans";
import { useApi } from "@/composables/useApi";
import { useToast } from "@/composables/useToast";
import {
  Search,
  RefreshCw,
  Layers,
  X,
  SlidersHorizontal,
  Building2,
  CreditCard,
  Clock,
  Gem,
  CalendarDays,
  CalendarRange,
  AlertCircle,
  Info,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const tenantStore = useTenantStore();
const planStore = usePlanStore();
const api = useApi();
const toast = useToast();

const selectedTenantId = ref("");
const searchQuery = ref("");
const subData = ref<any>(null);
const loadingSub = ref(false);
const actionLoading = ref(false);

// Modals State
const showRenewModal = ref(false);
const showChangePlanModal = ref(false);
const showStatusModal = ref(false);
const renewDays = ref(30);
const newPlanId = ref("");
const changeDuration = ref(30);
const newStatus = ref("active");
const statusDurationDays = ref(30);
const statusReason = ref("");

const filteredTenants = computed(() => {
  return tenantStore.tenants.filter((t) =>
    t.company_name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  );
});

const activeSubsCount = computed(() => {
  // يمكن استبداله برقم حقيقي من API إذا توفر
  return tenantStore.tenants.filter((t) => t.status === "active").length;
});

const todayLabel = new Date().toLocaleDateString("ar-SA");

const selectTenant = async (id: string) => {
  selectedTenantId.value = id;
  loadingSub.value = true;
  subData.value = null;
  try {
    const res = await api.get(`/subscriptions/tenant/${id}`);
    subData.value = res.data;
  } catch (e) {
    subData.value = null;
  } finally {
    loadingSub.value = false;
  }
};

const openStatusModal = () => {
  newStatus.value = subData.value?.status || "active";
  statusDurationDays.value = 30;
  statusReason.value = "";
  showStatusModal.value = true;
};

const handleUpdateStatus = async () => {
  actionLoading.value = true;
  try {
    const payload: any = { newStatus: newStatus.value };
    if (newStatus.value === "active" && statusDurationDays.value) {
      payload.durationDays = statusDurationDays.value;
    }
    if (statusReason.value) payload.reason = statusReason.value;

    await api.post(
      `/subscriptions/tenant/${selectedTenantId.value}/status`,
      payload,
    );
    toast.success("تم تحديث حالة الاشتراك بنجاح");
    showStatusModal.value = false;
    selectTenant(selectedTenantId.value);
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    actionLoading.value = false;
  }
};

const handleRenew = async () => {
  actionLoading.value = true;
  try {
    await api.post(`/subscriptions/tenant/${selectedTenantId.value}/renew`, {
      extraDays: renewDays.value,
    });
    toast.success("تم التجديد بنجاح");
    showRenewModal.value = false;
    selectTenant(selectedTenantId.value);
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    actionLoading.value = false;
  }
};

const handleChangePlan = async () => {
  actionLoading.value = true;
  try {
    await api.post(
      `/subscriptions/tenant/${selectedTenantId.value}/change-plan`,
      {
        planId: newPlanId.value,
        durationDays: changeDuration.value,
      },
    );
    toast.success("تم تغيير الخطة بنجاح");
    showChangePlanModal.value = false;
    selectTenant(selectedTenantId.value);
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    actionLoading.value = false;
  }
};

const getStatusLabel = (s: string) => {
  const map: any = {
    active: "نشط",
    trial: "تجريبي",
    expired: "منتهي",
    cancelled: "ملغي",
    suspended: "معلق",
    pending: "قيد الانتظار",
  };
  return map[s] || s;
};

const formatPrice = (p: string) => Number(p).toLocaleString("en-US") + " ر.س";
const getBillingLabel = (c: string) =>
  c === "monthly" ? "شهر" : c === "yearly" ? "سنة" : "مدى الحياة";
const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");

onMounted(() => {
  tenantStore.fetchAll();
  planStore.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

// ── Stats Bar ──────────────────────────────────────────────────────────────
.stats-bar {
  display: flex;
  gap: $space-3;
  flex-wrap: wrap;
  margin-bottom: $space-5;
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
  &--accent {
    border-color: rgba($stb-accent, 0.3);
    strong {
      color: $stb-accent;
    }
  }
}

// ── Layout ─────────────────────────────────────────────────────────────────
.admin-sub-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: $space-4;
  height: calc(100vh - 220px);
  @include respond-to("lg") {
    grid-template-columns: 1fr;
    height: auto;
  }
}

// ── Selection Panel ────────────────────────────────────────────────────────
.selection-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;

  .panel-header {
    padding: $space-4 $space-4 0;
    @include flex(row, space-between, center);
    h3 {
      font-size: $font-size-sm;
      color: $stb-text-muted;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .count-badge {
      background: $stb-surface-3;
      padding: 2px 8px;
      border-radius: $radius-full;
      font-size: 0.7rem;
      font-weight: 600;
      color: $stb-text-secondary;
    }
  }

  .search-box {
    position: relative;
    margin: $space-3 $space-4;
    svg {
      position: absolute;
      right: 12px;
      top: 10px;
      color: $stb-text-muted;
      pointer-events: none;
    }
    input {
      padding-right: 32px;
    }
  }

  .tenant-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 $space-2;
    @include scrollbar;
  }

  .tenant-card {
    position: relative;
    padding: $space-3 $space-4;
    margin-bottom: $space-2;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-base;
    border: 1px solid transparent;
    background: transparent;

    .t-accent-bar {
      position: absolute;
      right: 0;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 4px 0 0 4px;
      background: $stb-border;
      transition: background $transition-base;
    }

    &:hover {
      background: $stb-surface-2;
    }

    &.is-active {
      background: rgba($stb-accent, 0.08);
      border-color: rgba($stb-accent, 0.2);
      .t-accent-bar {
        background: $gradient-accent;
      }
      .t-name {
        color: $stb-accent;
      }
    }

    .t-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .t-info {
      @include flex(row, space-between, center);
      .t-name {
        font-weight: 600;
        font-size: $font-size-sm;
        transition: color $transition-base;
      }
      .t-status {
        font-size: 0.65rem;
        padding: 2px 6px;
        border-radius: 4px;
        background: $stb-surface-3;
        color: $stb-text-muted;
      }
    }
    .t-id {
      font-size: 0.6rem;
      color: $stb-text-muted;
      font-family: monospace;
      opacity: 0.6;
    }
  }

  .empty-search {
    text-align: center;
    padding: $space-6;
    color: $stb-text-muted;
    font-size: $font-size-xs;
  }
}

// ── Details Panel ──────────────────────────────────────────────────────────
.details-panel {
  position: relative;
  overflow-y: auto;
  @include scrollbar;

  .sub-content {
    display: flex;
    flex-direction: column;
    gap: $space-5;
  }

  .plan-hero {
    @include glass-card;
    padding: $space-5;
    @include flex(row, flex-start, center, $space-4);
    background: linear-gradient(
      135deg,
      rgba($stb-surface-2, 0.9),
      rgba($stb-surface, 0.6)
    );

    .plan-icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: $radius-lg;
      background: rgba($stb-accent, 0.1);
      color: $stb-accent;
      @include flex(row, center, center);
      flex-shrink: 0;
    }

    .plan-details {
      flex: 1;
      h2 {
        font-size: $font-size-xl;
        margin-bottom: 4px;
      }
      .status-badge {
        @include flex(row, center, center, 4px);
        font-size: 0.7rem;
        padding: 3px 10px;
        border-radius: $radius-full;
        font-weight: 600;
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        &.b-active {
          background: rgba($stb-success, 0.15);
          color: $stb-success;
        }
        &.b-trial {
          background: rgba($stb-warning, 0.15);
          color: $stb-warning;
        }
        &.b-suspended {
          background: rgba($stb-text-muted, 0.15);
          color: $stb-text-muted;
        }
        &.b-cancelled {
          background: rgba($stb-danger, 0.15);
          color: $stb-danger;
        }
        &.b-pending {
          background: rgba($stb-info, 0.15);
          color: $stb-info;
        }
      }
    }

    .plan-price-tag {
      text-align: left;
      font-size: $font-size-xl;
      font-weight: 800;
      color: $stb-text-primary;
      .cycle {
        display: block;
        font-size: $font-size-xs;
        color: $stb-text-muted;
        font-weight: 400;
        margin-top: 2px;
      }
    }
  }

  .actions-toolbar {
    @include flex(row, center, flex-end, $space-2);
    flex-wrap: wrap;
  }

  .sub-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: $space-3;
    .meta-box {
      background: $stb-surface;
      padding: $space-3;
      border-radius: $radius-md;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 1px solid $stb-border;
      .label {
        @include flex(row, center, flex-start, 4px);
        font-size: $font-size-xs;
        color: $stb-text-muted;
      }
      .val {
        font-weight: 600;
        color: $stb-text-primary;
        font-size: $font-size-sm;
      }
    }
  }
}

.empty-placeholder {
  @include flex(row, center, center);
  .placeholder-content {
    text-align: center;
    color: $stb-text-muted;
    .placeholder-icon {
      opacity: 0.15;
      margin-bottom: $space-3;
      color: $stb-accent;
    }
    p {
      font-size: $font-size-sm;
      max-width: 250px;
    }
  }
}

.empty-state-panel {
  @include flex(column, center, center, $space-3);
  min-height: 300px;
  text-align: center;
  color: $stb-text-muted;
  .empty-illustration {
    opacity: 0.3;
    margin-bottom: $space-2;
    color: $stb-warning;
  }
}

// ── Modal Enhancements ─────────────────────────────────────────────────────
.alert-info {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-3;
  background: rgba($stb-accent, 0.05);
  border: 1px solid rgba($stb-accent, 0.15);
  border-radius: $radius-md;
  font-size: $font-size-xs;
  color: $stb-text-secondary;
  svg {
    flex-shrink: 0;
    color: $stb-accent;
    margin-top: 1px;
  }
}

.btn--accent-outline {
  background: transparent;
  color: $stb-accent;
  border: 1px solid rgba($stb-accent, 0.3);
  &:hover:not(:disabled) {
    background: rgba($stb-accent, 0.08);
    border-color: $stb-accent;
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
