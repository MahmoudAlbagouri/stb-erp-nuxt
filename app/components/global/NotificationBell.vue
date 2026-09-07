<!-- components/NotificationBell.vue -->
<template>
  <div class="notification-bell-wrapper" v-click-outside="closePopover">
    <button
      class="topbar-icon-btn"
      @click="togglePopover"
      aria-label="الإشعارات"
    >
      <Bell :size="20" />
      <span v-if="store.hasUnread" class="notification-badge"></span>
    </button>

    <Transition name="fade-scale">
      <div v-if="isOpen" class="notification-popover">
        <div class="popover-header">
          <h4>الإشعارات</h4>
          <button
            v-if="store.unreadCount > 0"
            class="btn btn--ghost btn--sm"
            @click="handleMarkAllRead"
            :disabled="actionLoading"
          >
            تحديد الكل كمقروء
          </button>
        </div>

        <div
          class="popover-body"
          v-if="!store.loading && store.myNotifications.length"
        >
          <div
            v-for="notif in limitedNotifications"
            :key="notif.id"
            class="notif-item"
            :class="{ 'is-unread': !notif.isRead }"
            @click="handleNotifClick(notif)"
          >
            <div class="notif-icon" :class="`notif-icon--${notif.type}`">
              <component :is="getIcon(notif.category)" :size="16" />
            </div>
            <div class="notif-content">
              <div class="notif-title">{{ notif.title }}</div>
              <div class="notif-message">{{ notif.message }}</div>
              <div class="notif-time">{{ formatTimeAgo(notif.createdAt) }}</div>
            </div>
            <div v-if="!notif.isRead" class="notif-dot"></div>
          </div>
        </div>

        <div v-else-if="store.loading" class="popover-loading">
          <div class="spinner spinner--sm" />
        </div>
        <div v-else class="popover-empty">
          <BellOff :size="24" class="text-muted" />
          <p>لا توجد إشعارات جديدة</p>
        </div>

        <div class="popover-footer">
          <NuxtLink
            to="/dashboard/notifications"
            class="btn btn--ghost btn--full"
            @click="closePopover"
          >
            عرض كل الإشعارات
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useNotificationsStore } from "@/stores/notifications";
import { useToast } from "@/composables/useToast";
import {
  Bell,
  BellOff,
  FileText,
  CreditCard,
  UserCheck,
  Info,
  AlertTriangle,
} from "lucide-vue-next";
import type { Notification, NotificationCategory } from "@/types";

const vClickOutside = {
  mounted: (el: any, binding: any) => {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target)))
        binding.value(event, el);
    };
    document.addEventListener("click", el.clickOutsideEvent);
  },
  unmounted: (el: any) =>
    document.removeEventListener("click", el.clickOutsideEvent),
};

const store = useNotificationsStore();
const toast = useToast();
const router = useRouter();
const isOpen = ref(false);
const actionLoading = ref(false);

const limitedNotifications = computed(() => store.myNotifications.slice(0, 5));

const togglePopover = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value && store.myNotifications.length === 0)
    await store.fetchMyNotifications();
};

const closePopover = () => {
  isOpen.value = false;
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

// ✅ تحسين منطق التوجيه للتعامل مع العقود والموظفين
const handleNotifClick = async (notif: Notification) => {
  if (!notif.isRead) await store.markAsRead(notif.id);

  let targetUrl = "";

  if (notif.actionUrl) {
    targetUrl = notif.actionUrl.startsWith("/dashboard")
      ? notif.actionUrl
      : `/dashboard${notif.actionUrl.startsWith("/") ? "" : "/"}${notif.actionUrl}`;
  } else if (notif.referenceType && notif.referenceId) {
    switch (notif.referenceType) {
      case "contract":
        targetUrl = `/dashboard/contracts/${notif.referenceId}`;
        break;
      case "employee":
        targetUrl = `/dashboard/employees/${notif.referenceId}`;
        break;
      case "leave":
        targetUrl = `/dashboard/leaves/${notif.referenceId}`;
        break;
      default:
        targetUrl = "/dashboard/notifications";
    }
  } else {
    targetUrl = "/dashboard/notifications";
  }

  if (targetUrl) {
    router.push(targetUrl);
    closePopover();
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
      return AlertTriangle;
    default:
      return Info;
  }
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays} يوم`;
};

onMounted(() => {
  store.fetchUnreadCount();
  setInterval(() => {
    if (!isOpen.value) store.fetchUnreadCount();
  }, 60000);
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.notification-bell-wrapper {
  position: relative;
}

.topbar-icon-btn {
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  @include flex(row, center, center);
  border-radius: $radius-md;
  color: $stb-text-secondary;
  transition: all $transition-fast;
  position: relative;
  &:hover {
    background: $stb-surface-3;
    color: $stb-text-primary;
  }
}

.notification-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: $stb-danger;
  border-radius: 50%;
  border: 2px solid $stb-surface;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba($stb-danger, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba($stb-danger, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba($stb-danger, 0);
  }
}

.notification-popover {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: auto;
  width: 320px;
  max-height: 400px;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  z-index: $z-dropdown;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: top right;
}

.popover-header {
  @include flex(row, center, space-between);
  padding: $space-3 $space-4;
  border-bottom: 1px solid $stb-border;
  background: rgba($stb-surface, 0.5);
  h4 {
    font-size: $font-size-sm;
    font-weight: 700;
    margin: 0;
  }
}

.popover-body {
  flex: 1;
  overflow-y: auto;
  @include scrollbar;
}

.notif-item {
  @include flex(row, flex-start, flex-start, $space-3);
  padding: $space-3 $space-4;
  border-bottom: 1px solid rgba($stb-border, 0.3);
  cursor: pointer;
  transition: background $transition-fast;
  position: relative;
  &:hover {
    background: rgba($stb-primary, 0.05);
  }
  &.is-unread {
    background: rgba($stb-accent, 0.03);
  }
  &:last-child {
    border-bottom: none;
  }
}

.notif-icon {
  width: 32px;
  height: 32px;
  border-radius: $radius-full;
  @include flex(row, center, center);
  flex-shrink: 0;
  &--info {
    background: rgba($stb-info, 0.1);
    color: $stb-info;
  }
  &--warning {
    background: rgba($stb-warning, 0.1);
    color: $stb-warning;
  }
  &--error {
    background: rgba($stb-danger, 0.1);
    color: $stb-danger;
  }
  &--success {
    background: rgba($stb-success, 0.1);
    color: $stb-success;
  }
}

.notif-content {
  flex: 1;
  min-width: 0;
}
.notif-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $stb-text-primary;
  margin-bottom: 2px;
  @include truncate;
}
.notif-message {
  font-size: $font-size-xs;
  color: $stb-text-secondary;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notif-time {
  font-size: 10px;
  color: $stb-text-muted;
}
.notif-dot {
  width: 6px;
  height: 6px;
  background: $stb-accent;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.popover-loading,
.popover-empty {
  @include flex(column, center, center, $space-3);
  padding: $space-8;
  color: $stb-text-muted;
  font-size: $font-size-sm;
}
.popover-footer {
  padding: $space-2;
  border-top: 1px solid $stb-border;
  background: rgba($stb-surface, 0.5);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.2s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
