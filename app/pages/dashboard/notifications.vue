<!-- pages/dashboard/notifications/index.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>مركز الإشعارات</h1>
        <p>متابعة التنبيهات والإشعارات النظامية</p>
      </div>
      <div class="page-header__actions">
        <button
          v-if="!isAdminView && store.unreadCount > 0"
          class="btn btn--outline"
          @click="handleMarkAllRead"
          :disabled="actionLoading"
        >
          <CheckCheck :size="18" />
          <span>تحديد الكل كمقروء</span>
          <span class="btn__count">{{ store.unreadCount }}</span>
        </button>
        <div v-if="canViewAll" class="view-toggle">
          <button
            class="btn btn--sm"
            :class="isAdminView ? 'btn--ghost' : 'btn--primary'"
            @click="isAdminView = false"
          >
            <Bell :size="14" /><span>إشعاراتي</span>
          </button>
          <button
            class="btn btn--sm"
            :class="isAdminView ? 'btn--primary' : 'btn--ghost'"
            @click="switchToAdminView"
          >
            <Users :size="14" /><span>كل الإشعارات</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="isAdminView && store.stats" class="grid-4 stats-row">
      <div class="stat-card stat-total">
        <div class="stat-card__icon"><Bell :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.stats.total }}</div>
          <div class="stat-card__label">إجمالي الإشعارات</div>
        </div>
      </div>
      <div class="stat-card stat-unread">
        <div class="stat-card__icon"><MailOpen :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.stats.unread }}</div>
          <div class="stat-card__label">غير مقروءة</div>
        </div>
      </div>
      <div class="stat-card stat-expiry">
        <div class="stat-card__icon"><AlertTriangle :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            {{ store.stats.recentExpiryUnread }}
          </div>
          <div class="stat-card__label">تنبيهات انتهاء عاجلة</div>
        </div>
      </div>
      <div class="stat-card stat-categories">
        <div class="stat-card__icon"><Layers :size="24" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            {{ store.stats.byCategory.length }}
          </div>
          <div class="stat-card__label">أنواع نشطة</div>
        </div>
      </div>
    </div>

    <div class="card filter-card">
      <div class="filter-card__icon"><Filter :size="16" /></div>
      <div class="filter-group">
        <label>الحالة:</label>
        <select
          v-model="filters.isRead"
          class="form-select form-select--sm"
          @change="applyFilters"
        >
          <option :value="undefined">الكل</option>
          <option :value="false">غير مقروء</option>
          <option :value="true">مقروء</option>
        </select>
      </div>
      <div class="filter-group">
        <label>النوع:</label>
        <select
          v-model="filters.category"
          class="form-select form-select--sm"
          @change="applyFilters"
        >
          <option :value="undefined">جميع الأنواع</option>
          <option value="contract_expiry">انتهاء عقد</option>
          <option value="id_expiry">انتهاء هوية</option>
          <option value="probation_end">انتهاء تجربة</option>
          <option value="custom">عام</option>
          <option value="system">نظام</option>
        </select>
      </div>
      <div v-if="isAdminView" class="filter-group filter-group--search">
        <label>بحث باسم الموظف:</label>
        <input
          v-model="filters.recipientName"
          type="text"
          class="form-input form-input--sm"
          placeholder="ابحث..."
          @input="debounceSearch"
        />
      </div>
    </div>

    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>
    <div v-else-if="currentList.length === 0" class="card empty-card">
      <div class="empty-state">
        <div class="empty-state__icon-wrap">
          <BellOff :size="32" class="empty-icon" />
        </div>
        <div class="empty-state__title">لا توجد إشعارات</div>
        <div class="empty-state__text">
          لا توجد إشعارات تطابق معايير البحث الحالية
        </div>
      </div>
    </div>

    <div v-else class="notifications-list">
      <TransitionGroup name="list" tag="div">
        <div
          v-for="notif in currentList"
          :key="notif.id"
          class="notification-card"
          :class="{ 'is-unread': !notif.isRead }"
        >
          <div
            class="notif-card__icon"
            :class="`type-${getCategoryColor(notif.category)}`"
          >
            <component :is="getIcon(notif.category)" :size="20" />
            <span v-if="!notif.isRead" class="notif-card__dot" />
          </div>

          <div class="notif-card__content">
            <div class="notif-card__header">
              <h4 class="notif-card__title">{{ notif.title }}</h4>
              <span class="notif-card__time">{{
                formatTimeAgo(notif.createdAt)
              }}</span>
            </div>

            <p class="notif-card__message">{{ notif.message }}</p>

            <!-- ✅ NEW: عرض بيانات الموظف من Metadata -->
            <div
              v-if="notif.metadata?.employeeName"
              class="notif-card__extra-info text-xs text-muted mt-2 flex items-center gap-1"
            >
              <User :size="12" />
              <span
                >الموظف: {{ notif.metadata.employeeName }} ({{
                  notif.metadata.employeeCode
                }})</span
              >
            </div>

            <div class="notif-card__meta">
              <span
                class="badge text-xs"
                :class="`badge--${getCategoryColor(notif.category)}`"
              >
                {{ getCategoryLabel(notif.category) }}
              </span>
              <span
                v-if="isAdminView && notif.recipient"
                class="notif-card__recipient text-xs text-muted"
              >
                <User :size="12" />
                {{ notif.recipient.fullName || notif.recipient.username }}
              </span>
            </div>
          </div>

          <div class="notif-card__actions">
            <button
              v-if="!notif.isRead"
              class="btn btn--ghost btn--sm btn--icon"
              @click="handleMarkRead(notif.id)"
              title="تحديد كمقروء"
            >
              <Check :size="16" />
            </button>
            <button
              class="btn btn--ghost btn--sm btn--icon text-danger"
              @click="handleDelete(notif.id)"
              title="حذف"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </TransitionGroup>

      <div
        v-if="
          isAdminView &&
          store.allNotifications &&
          store.allNotifications.totalPages > 1
        "
        class="pagination"
      >
        <button
          :disabled="filters.page <= 1"
          @click="changePage(filters.page! - 1)"
        >
          السابق
        </button>
        <span class="page-info"
          >صفحة {{ filters.page }} من
          {{ store.allNotifications.totalPages }}</span
        >
        <button
          :disabled="filters.page >= store.allNotifications.totalPages"
          @click="changePage(filters.page! + 1)"
        >
          التالي
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";
import type { NotificationCategory } from "@/types";
import {
  Bell,
  BellOff,
  MailOpen,
  AlertTriangle,
  Layers,
  CheckCheck,
  Check,
  Trash2,
  FileText,
  CreditCard,
  UserCheck,
  Info,
  AlertCircle,
  Filter,
  Users,
  User,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useNotificationsStore();
const auth = useAuthStore();
const toast = useToast();

const isAdminView = ref(false);
const actionLoading = ref(false);
const searchTimeout = ref<any>(null);

const canViewAll = computed(() => true); // Temporarily true for testing

const filters = reactive({
  isRead: undefined as boolean | undefined,
  category: undefined as NotificationCategory | undefined,
  recipientName: "",
  page: 1,
  limit: 10,
});

const currentList = computed(() =>
  isAdminView.value
    ? store.allNotifications?.items || []
    : store.myNotifications,
);

const switchToAdminView = async () => {
  isAdminView.value = true;
  filters.page = 1;
  await store.fetchAdminStats();
  await applyFilters();
};

const applyFilters = async () => {
  if (isAdminView.value) await store.fetchAllNotifications({ ...filters });
  else
    await store.fetchMyNotifications({
      isRead: filters.isRead,
      category: filters.category,
    });
};

const debounceSearch = () => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value);
  searchTimeout.value = setTimeout(() => {
    filters.page = 1;
    applyFilters();
  }, 500);
};

const changePage = (newPage: number) => {
  filters.page = newPage;
  applyFilters();
};

const handleMarkAllRead = async () => {
  actionLoading.value = true;
  try {
    await store.markAllAsRead();
    toast.success("تم تحديد جميع الإشعارات كمقروءة");
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    actionLoading.value = false;
  }
};

const handleMarkRead = async (id: string) => {
  try {
    if (isAdminView.value) await store.markAsReadByAdmin(id);
    else await store.markAsRead(id);
  } catch (e: any) {
    toast.error(e.message);
  }
};

const handleDelete = async (id: string) => {
  if (!confirm("هل أنت متأكد من حذف هذا الإشعار؟")) return;
  try {
    if (isAdminView.value) await store.deleteByAdmin(id);
    else await store.deleteNotification(id);
    toast.success("تم حذف الإشعار");
  } catch (e: any) {
    toast.error(e.message);
  }
};

const getIcon = (category: NotificationCategory) => {
  switch (category) {
    case "contract_expiry":
      return FileText;
    case "id_expiry":
      return CreditCard;
    case "probation_end":
      return UserCheck;
    case "system":
      return AlertCircle;
    default:
      return Info;
  }
};

const categoryColorMap: Record<string, string> = {
  contract_expiry: "warning",
  id_expiry: "danger",
  probation_end: "info",
  custom: "accent",
  system: "primary",
  leave_approved: "success",
  leave_rejected: "danger",
};
const getCategoryColor = (cat: string) => categoryColorMap[cat] || "accent";

const getCategoryLabel = (cat: string) => {
  const labels: Record<string, string> = {
    contract_expiry: "انتهاء عقد",
    id_expiry: "انتهاء هوية",
    probation_end: "انتهاء تجربة",
    custom: "عام",
    system: "نظام",
    leave_approved: "إجازة معتمدة",
    leave_rejected: "إجازة مرفوضة",
  };
  return labels[cat] || cat;
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} د`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `منذ ${diffHours} س`;
  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays} يوم`;
};

onMounted(async () => {
  await store.fetchMyNotifications();
  await store.fetchUnreadCount();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.page-header {
  padding-bottom: $space-5;
  border-bottom: 1px solid rgba($stb-border, 0.6);
  &__title h1 {
    font-size: $font-size-2xl;
    letter-spacing: -0.01em;
  }
}

.page-header__actions {
  @include flex(row, center, flex-end, $space-3);
  flex-wrap: wrap;
}

.btn__count {
  @include flex(row, center, center);
  min-width: 20px;
  height: 20px;
  padding: 0 $space-1;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.18);
  font-size: 0.7rem;
  font-weight: 700;
}

.stats-row {
  margin-bottom: $space-6;
}

.stat-card {
  position: relative;
  overflow: hidden;
  &::before {
    content: "";
    position: absolute;
    top: 0;
    inset-inline: 0;
    height: 3px;
  }
  &.stat-total {
    &::before {
      background: $gradient-primary;
    }
    .stat-card__icon {
      background: rgba($stb-primary, 0.12);
      color: $stb-primary-light;
    }
  }
  &.stat-unread {
    &::before {
      background: $stb-accent;
    }
    .stat-card__icon {
      background: rgba($stb-accent, 0.12);
      color: $stb-accent;
    }
  }
  &.stat-expiry {
    &::before {
      background: $stb-danger;
    }
    .stat-card__icon {
      background: rgba($stb-danger, 0.12);
      color: $stb-danger;
    }
  }
  &.stat-categories {
    &::before {
      background: $stb-warning;
    }
    .stat-card__icon {
      background: rgba($stb-warning, 0.12);
      color: $stb-warning;
    }
  }
}

.filter-card {
  @include flex(row, center, flex-start, $space-5);
  padding: $space-4 $space-5;
  margin-bottom: $space-6;
  flex-wrap: wrap;
}

.filter-card__icon {
  @include flex(row, center, center);
  color: $stb-text-muted;
  flex-shrink: 0;
}

.filter-group {
  @include flex(row, center, flex-start, $space-2);
  position: relative;
  padding-inline-end: $space-5;
  &:not(:last-child)::after {
    content: "";
    position: absolute;
    inset-inline-end: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 20px;
    background: $stb-border;
  }
  label {
    font-size: $font-size-sm;
    color: $stb-text-secondary;
    white-space: nowrap;
  }
  &--search {
    flex: 1;
    min-width: 200px;
    input {
      width: 100%;
    }
  }
}

.form-select--sm,
.form-input--sm {
  padding: $space-2 $space-3;
  font-size: $font-size-sm;
  width: auto;
  min-width: 150px;
}

@include respond-to("sm") {
  .filter-group {
    width: 100%;
    padding-inline-end: 0;
    padding-bottom: $space-3;
    border-bottom: 1px solid $stb-border;
    &::after {
      display: none;
    }
    select,
    input {
      flex: 1;
    }
  }
}

.view-toggle {
  @include flex(row, center, center, 0);
  background: $stb-surface-2;
  border-radius: $radius-md;
  padding: 2px;
  border: 1px solid $stb-border;
  .btn {
    border: none;
    background: transparent;
  }
  .btn--primary {
    background: $stb-primary;
    color: white;
  }
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.notification-card {
  @include glass-card;
  @include flex(row, flex-start, flex-start, $space-4);
  padding: $space-4;
  transition: all $transition-fast;
  border-right: 3px solid transparent;
  animation: cardEnter 0.35s ease backwards;
  &:hover {
    transform: translateX(-2px);
    border-color: rgba($stb-border-light, 0.5);
  }
  &.is-unread {
    border-right-color: $stb-accent;
    background: linear-gradient(
      90deg,
      rgba($stb-accent, 0.03) 0%,
      $stb-surface-2 100%
    );
  }
}

// ✅ FIX: استبدال @for بحلقات ثابتة لتجنب خطأ Vite/PostCSS
.notification-card:nth-child(1) {
  animation-delay: 0.035s;
}
.notification-card:nth-child(2) {
  animation-delay: 0.07s;
}
.notification-card:nth-child(3) {
  animation-delay: 0.105s;
}
.notification-card:nth-child(4) {
  animation-delay: 0.14s;
}
.notification-card:nth-child(5) {
  animation-delay: 0.175s;
}
.notification-card:nth-child(6) {
  animation-delay: 0.21s;
}
.notification-card:nth-child(7) {
  animation-delay: 0.245s;
}
.notification-card:nth-child(8) {
  animation-delay: 0.28s;
}
.notification-card:nth-child(9) {
  animation-delay: 0.315s;
}
.notification-card:nth-child(10) {
  animation-delay: 0.35s;
}
.notification-card:nth-child(11) {
  animation-delay: 0.385s;
}
.notification-card:nth-child(12) {
  animation-delay: 0.42s;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notif-card__icon {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: $radius-lg;
  @include flex(row, center, center);
  flex-shrink: 0;
  &.type-info {
    background: rgba($stb-info, 0.1);
    color: $stb-info;
  }
  &.type-warning {
    background: rgba($stb-warning, 0.1);
    color: $stb-warning;
  }
  &.type-danger {
    background: rgba($stb-danger, 0.1);
    color: $stb-danger;
  }
  &.type-success {
    background: rgba($stb-success, 0.1);
    color: $stb-success;
  }
  &.type-accent {
    background: rgba($stb-accent, 0.1);
    color: $stb-accent;
  }
  &.type-primary {
    background: rgba($stb-primary-light, 0.1);
    color: $stb-primary-light;
  }
}

.notif-card__dot {
  position: absolute;
  top: -2px;
  inset-inline-end: -2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: $stb-accent;
  border: 2px solid $stb-surface-2;
  animation: pulseDot 2s ease-in-out infinite;
}

@keyframes pulseDot {
  0% {
    box-shadow: 0 0 0 0 rgba($stb-accent, 0.55);
  }
  70% {
    box-shadow: 0 0 0 6px rgba($stb-accent, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba($stb-accent, 0);
  }
}

.notif-card__content {
  flex: 1;
  min-width: 0;
}
.notif-card__header {
  @include flex(row, center, space-between);
  margin-bottom: $space-1;
  gap: $space-3;
}
.notif-card__title {
  font-size: $font-size-base;
  font-weight: 700;
  color: $stb-text-primary;
  margin: 0;
}
.notif-card__time {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  white-space: nowrap;
  flex-shrink: 0;
}
.notif-card__message {
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  margin-bottom: $space-2;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notif-card__meta {
  @include flex(row, center, flex-start, $space-3);
  flex-wrap: wrap;
}
.notif-card__recipient {
  @include flex(row, center, flex-start, 4px);
}
.notif-card__actions {
  @include flex(column, center, center, $space-2);
  opacity: 0.55;
  transition: opacity $transition-fast;
}
.notification-card:hover .notif-card__actions,
.notif-card__actions:focus-within {
  opacity: 1;
}

.badge {
  &--warning {
    @include status-badge($stb-warning);
  }
  &--danger {
    @include status-badge($stb-danger);
  }
  &--info {
    @include status-badge($stb-info);
  }
  &--accent {
    @include status-badge($stb-accent);
  }
  &--primary {
    @include status-badge($stb-primary-light);
  }
  &--success {
    @include status-badge($stb-success);
  }
}

.empty-card .empty-state {
  padding: $space-16 $space-8;
}
.empty-state__icon-wrap {
  position: relative;
  width: 84px;
  height: 84px;
  @include flex(row, center, center);
  color: $stb-text-muted;
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba($stb-accent, 0.14),
      transparent 70%
    );
    animation: floatGlow 3s ease-in-out infinite;
  }
}

@keyframes floatGlow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

.page-info {
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  padding: 0 $space-4;
}
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (prefers-reduced-motion: reduce) {
  .notification-card,
  .notif-card__dot,
  .empty-state__icon-wrap::before {
    animation: none !important;
  }
  .notification-card:hover {
    transform: none;
  }
}
</style>
