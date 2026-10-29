<!--
  جرس الإشعارات (الشريط العلوي): العدّاد، آخر الإشعارات، والبث اللحظي —
  الإشعار الجديد يظهر فوراً مع تنبيه منبثق وصوت (إن فُعّل). الضغط يفتح درج
  التفاصيل (NotificationDetailDrawer).
-->
<template>
  <!-- بلا صلاحية عرض الإشعارات: لا جرس (لا شيء يصله) -->
  <div
    v-if="allowed"
    class="notification-bell-wrapper"
    v-click-outside="closePopover"
  >
    <button
      class="topbar-icon-btn"
      :class="{ 'is-ringing': ringing }"
      :aria-label="store.unreadCount ? `الإشعارات: ${store.unreadCount} غير مقروء` : 'الإشعارات'"
      @click="togglePopover"
    >
      <Bell :size="20" />
      <span v-if="store.hasUnread" class="notification-badge">
        {{ store.unreadCount > 99 ? "99+" : store.unreadCount }}
      </span>
    </button>

    <Transition name="fade-scale">
      <div v-if="isOpen" class="notification-popover">
        <div class="popover-header">
          <h4>
            الإشعارات
            <span
              class="live-dot"
              :class="{ 'is-live': store.connected }"
              :title="store.connected ? 'متصل — تصل الإشعارات فوراً' : 'يعيد الاتصال...'"
            />
          </h4>
          <button
            v-if="store.hasUnread"
            class="btn btn--ghost btn--sm"
            :disabled="actionLoading"
            @click="handleMarkAllRead"
          >
            <CheckCheck :size="14" /> قراءة الكل
          </button>
        </div>

        <div v-if="loading && !store.recent.length" class="popover-loading">
          <div class="spinner spinner--sm" />
        </div>
        <div v-else-if="store.recent.length" class="popover-body">
          <button
            v-for="notif in store.recent"
            :key="notif.id"
            class="notif-item"
            :class="{ 'is-unread': !notif.readAt }"
            @click="open(notif)"
          >
            <div class="notif-icon" :class="`sev-${notif.severity}`">
              <component :is="iconOf(notif.type)" :size="16" />
            </div>
            <div class="notif-content">
              <div class="notif-title">{{ notif.title }}</div>
              <div class="notif-message">{{ notif.body }}</div>
              <div class="notif-time">
                {{ timeAgo(notif.createdAt) }}
                <span v-if="notif.requiresAck && !notif.acknowledgedAt" class="notif-ack">
                  · يتطلب تأكيد الاطلاع
                </span>
              </div>
            </div>
            <div v-if="!notif.readAt" class="notif-dot"></div>
          </button>
        </div>
        <div v-else class="popover-empty">
          <BellOff :size="24" class="text-muted" />
          <p>لا توجد إشعارات</p>
        </div>

        <div class="popover-sound">
          <SoundSettingsPanel
            scope="dashboard"
            label="صوت عند وصول إشعار جديد"
            :sounds="['notification']"
            compact
          />
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Bell, BellOff, CheckCheck } from "lucide-vue-next";
import type { Directive } from "vue";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";
import { useAccess } from "@/composables/useAccess";
import { installSoundUnlock, playSound } from "@/utils/sounds";
import { notificationIcon, timeAgo } from "@/utils/notifications";
import type { NotificationItem } from "@/types/notifications";
import type { ToastType } from "@/types";

type ClickOutsideEl = HTMLElement & {
  clickOutsideEvent?: (event: Event) => void;
};

const vClickOutside: Directive<
  ClickOutsideEl,
  (event: Event, el: HTMLElement) => void
> = {
  mounted: (el, binding) => {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node)))
        binding.value(event, el);
    };
    document.addEventListener("click", el.clickOutsideEvent);
  },
  unmounted: (el) => {
    if (el.clickOutsideEvent)
      document.removeEventListener("click", el.clickOutsideEvent);
  },
};

/** البث منقطع: العدّاد يُسأل كل دقيقة حتى يعود */
const FALLBACK_POLL_MS = 60_000;

const TOAST_TYPE: Record<NotificationItem["severity"], ToastType> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
};

const store = useNotificationsStore();
const auth = useAuthStore();
const toast = useToast();
const { can, P } = useAccess();

const allowed = computed(() => can(P.NOTIFICATION_VIEW));
const isOpen = ref(false);
const loading = ref(false);
const actionLoading = ref(false);
const ringing = ref(false);

const iconOf = (type: string) => notificationIcon(store.typeOf(type)?.icon);

const refresh = async () => {
  loading.value = true;
  try {
    await store.fetchRecent();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الإشعارات"));
  } finally {
    loading.value = false;
  }
};

const togglePopover = () => {
  isOpen.value = !isOpen.value;
  // كل فتح يجلب الأحدث (البث يحدّثها بعدها وهي مفتوحة)
  if (isOpen.value) void refresh();
};

const closePopover = () => {
  isOpen.value = false;
};

const open = (notif: NotificationItem) => {
  store.openItem(notif);
  closePopover();
};

const handleMarkAllRead = async () => {
  actionLoading.value = true;
  try {
    await store.markAllRead();
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    actionLoading.value = false;
  }
};

// إشعار جديد عبر البث: صوت + تنبيه منبثق + هزة الجرس
let stopListening: (() => void) | null = null;
const onNew = (item: NotificationItem) => {
  playSound("notification", "dashboard");
  if (!isOpen.value) toast[TOAST_TYPE[item.severity]](item.title);
  ringing.value = true;
  setTimeout(() => (ringing.value = false), 1200);
};

// والبث منقطع: الصوت حين يزيد العدّاد في الفحص الدوري (لا لما كان عند الفتح)
let countKnown = false;
watch(
  () => store.unreadCount,
  (count, before) => {
    if (!store.connected && countKnown && count > before) {
      playSound("notification", "dashboard");
    }
  },
);

let poll: ReturnType<typeof setInterval> | null = null;

const start = () => {
  if (!allowed.value) return;
  void store.fetchCatalog().catch(() => undefined);
  void store.fetchUnread().then(() => (countKnown = true));
  store.connect();
  stopListening ??= store.onNew(onNew);
  poll ??= setInterval(() => {
    if (!store.connected) void store.fetchUnread();
  }, FALLBACK_POLL_MS);
};

const stop = () => {
  store.disconnect();
  stopListening?.();
  stopListening = null;
  if (poll) clearInterval(poll);
  poll = null;
};

onMounted(() => {
  installSoundUnlock();
  start();
});

// مستخدم آخر (دخول/خروج/وضع الدعم): بث جديد بجلسته
watch(
  () => auth.userId,
  (id, previous) => {
    if (id === previous) return;
    stop();
    if (id) start();
  },
);

onBeforeUnmount(stop);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

$severities: (
  info: $stb-info,
  success: $stb-success,
  warning: $stb-warning,
  danger: $stb-danger,
);

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
  &.is-ringing {
    animation: ring 0.6s ease 2;
  }
}

@keyframes ring {
  0%,
  100% {
    transform: rotate(0);
  }
  25% {
    transform: rotate(-14deg);
  }
  75% {
    transform: rotate(14deg);
  }
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 0;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  @include flex(row, center, center);
  background: $stb-danger;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  border-radius: $radius-full;
  border: 2px solid $stb-surface;
}

.notification-popover {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: auto;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: 480px;
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
    @include flex(row, center, flex-start, $space-2);
    font-size: $font-size-sm;
    font-weight: 700;
    margin: 0;
  }
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: $stb-text-muted;
  &.is-live {
    background: $stb-success;
    box-shadow: 0 0 0 3px rgba($stb-success, 0.2);
  }
}

.popover-body {
  flex: 1;
  overflow-y: auto;
  @include scrollbar;
}

.notif-item {
  @include flex(row, flex-start, flex-start, $space-3);
  width: 100%;
  padding: $space-3 $space-4;
  cursor: pointer;
  background: none;
  border: none;
  text-align: start;
  font: inherit;
  color: inherit;
  transition: background $transition-fast;
  position: relative;
  &:hover,
  &:focus-visible {
    background: rgba($stb-primary, 0.06);
  }
  &.is-unread {
    background: rgba($stb-accent, 0.04);
  }
  // فاصل بين العناصر (لا ‎:last-child: آخر أبناء القائمة شريط التمرير)
  & + & {
    border-top: 1px solid rgba($stb-border, 0.3);
  }
}

.notif-icon {
  width: 32px;
  height: 32px;
  border-radius: $radius-full;
  @include flex(row, center, center);
  flex-shrink: 0;
}

@each $name, $color in $severities {
  .sev-#{$name} {
    background: rgba($color, 0.12);
    color: $color;
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
.notif-ack {
  color: $stb-warning;
}
.notif-dot {
  width: 7px;
  height: 7px;
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
.popover-sound {
  padding: $space-3 $space-4;
  border-top: 1px solid $stb-border;
  font-size: $font-size-xs;
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

@media (prefers-reduced-motion: reduce) {
  .topbar-icon-btn.is-ringing {
    animation: none;
  }
}
</style>
