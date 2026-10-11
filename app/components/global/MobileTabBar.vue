<template>
  <!-- شريط التنقل السفلي (فون فقط): أهم الصفحات المتاحة للمستخدم + زر القائمة الكاملة -->
  <nav class="mobile-tabbar" aria-label="التنقل السريع">
    <NuxtLink
      v-for="item in tabs"
      :key="item.to"
      :to="item.to"
      class="mobile-tabbar__item"
      :class="{ 'is-active': isActive(item.to) }"
    >
      <span class="mobile-tabbar__icon">
        <component :is="item.icon" :size="21" />
        <span
          v-if="
            item.to === '/dashboard/notifications' && notifications.hasUnread
          "
          class="mobile-tabbar__dot"
        />
      </span>
      <span class="mobile-tabbar__label">{{ item.short }}</span>
    </NuxtLink>

    <button
      type="button"
      class="mobile-tabbar__item"
      :class="{ 'is-active': ui.mobileNavOpen }"
      @click="ui.toggleMobileNav"
    >
      <span class="mobile-tabbar__icon"><LayoutGrid :size="21" /></span>
      <span class="mobile-tabbar__label">المزيد</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { LayoutGrid } from "lucide-vue-next";
import { useUiStore } from "@/stores/ui";
import { useNotificationsStore } from "@/stores/notifications";
import { useAccess } from "@/composables/useAccess";
import { findNavItem } from "@/utils/navigation";

const ui = useUiStore();
const notifications = useNotificationsStore();
const route = useRoute();
const { resolve } = useAccess();

// الأولوية بالترتيب — يُعرض أول 4 يملك المستخدم الوصول لها (حسب الصلاحيات والخطة)
const PRIORITY: { to: string; short: string }[] = [
  { to: "/dashboard", short: "الرئيسية" },
  { to: "/dashboard/employees", short: "الموظفون" },
  { to: "/dashboard/leaves", short: "الإجازات" },
  { to: "/dashboard/attendance", short: "الحضور" },
  { to: "/dashboard/advances", short: "السلف" },
  { to: "/dashboard/payroll", short: "الرواتب" },
  { to: "/dashboard/notifications", short: "الإشعارات" },
  { to: "/dashboard/profile", short: "ملفي" },
];

const tabs = computed(() =>
  PRIORITY.flatMap(({ to, short }) => {
    const item = findNavItem(to);
    return item && item.to === to && resolve(item) === "allowed"
      ? [{ ...item, short }]
      : [];
  }).slice(0, 4),
);

const isActive = (to: string) =>
  !ui.mobileNavOpen &&
  (to === "/dashboard"
    ? route.path === to
    : route.path === to || route.path.startsWith(`${to}/`));
</script>

<style lang="scss" scoped>
@use "~/assets/scss/mixins" as *;

.mobile-tabbar {
  display: none;
}

@include respond-to("sm") {
  .mobile-tabbar {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    // فوق الخلفية المعتمة لدرج القائمة حتى يبقى زر "المزيد" قابلاً للضغط
    z-index: $z-sidebar + 1;
    display: flex;
    align-items: stretch;
    height: calc(var(--tabbar-height) + var(--safe-bottom));
    padding: 0 $space-1 var(--safe-bottom);
    background: rgba($stb-surface, 0.92);
    border-top: 1px solid $stb-border;
    backdrop-filter: blur(16px);
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
  }

  .mobile-tabbar__item {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 0;
    font-family: $font-family;
    color: $stb-text-muted;
    background: none;
    border: none;
    text-decoration: none;
    cursor: pointer;
    transition: color $transition-fast;
    -webkit-tap-highlight-color: transparent;

    // مؤشر الصفحة الحالية
    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      width: 0;
      height: 3px;
      border-radius: 0 0 $radius-sm $radius-sm;
      background: $gradient-accent;
      transform: translateX(-50%);
      transition: width $transition-base;
    }

    &.is-active {
      color: $stb-accent;

      &::before {
        width: 32px;
      }

      .mobile-tabbar__icon {
        background: rgba($stb-accent, 0.12);
        transform: translateY(-1px);
      }
    }

    &:active .mobile-tabbar__icon {
      transform: scale(0.92);
    }
  }

  .mobile-tabbar__icon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 28px;
    border-radius: $radius-full;
    transition:
      background $transition-fast,
      transform $transition-fast;
  }

  .mobile-tabbar__dot {
    position: absolute;
    top: 2px;
    right: 9px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $stb-danger;
    border: 2px solid $stb-surface;
  }

  .mobile-tabbar__label {
    max-width: 100%;
    overflow: hidden;
    font-size: 0.66rem;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
