<template>
  <aside class="app-sidebar" :class="{ 'is-open': ui.sidebarOpen }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="sidabar-logo-image">
        <img src="/images/logo.png" alt="STB HR Logo" />
      </div>
      <div class="sidebar-logo__text">
        <span class="sidebar-logo__name">STB HR</span>
        <span class="sidebar-logo__sub">نظام إدارة الموارد البشرية</span>
      </div>
    </div>

    <!-- Navigation: تُبنى من utils/navigation.ts حسب الصلاحيات ومميزات الخطة -->
    <nav class="sidebar-nav">
      <div
        v-for="section in visibleSections"
        :key="section.id"
        class="sidebar-section"
      >
        <div
          v-if="section.collapsible"
          class="sidebar-section__header"
          @click="toggleSection(section.id)"
        >
          <span class="sidebar-section__title">{{ section.title }}</span>
          <ChevronDown
            class="sidebar-section__arrow"
            :class="{ 'is-rotated': !collapsed[section.id] }"
          />
        </div>
        <span v-else class="sidebar-section__title">{{ section.title }}</span>

        <Transition name="slide-down">
          <div
            v-if="!section.collapsible || !collapsed[section.id]"
            :class="{ 'sidebar-submenu': section.collapsible }"
          >
            <NuxtLink
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              class="sidebar-nav__item"
              :class="{
                'sidebar-nav__item--sub': section.collapsible,
                'sidebar-nav__item--locked': item.locked,
                'is-active': isActive(item.to),
              }"
              :title="item.locked ? 'غير متاح في خطتك الحالية — اضغط للتفاصيل' : undefined"
            >
              <component :is="item.icon" class="sidebar-nav__icon" />
              <span>{{ item.label }}</span>
              <Lock v-if="item.locked" :size="13" class="sidebar-nav__lock" />
              <span
                v-else-if="
                  item.to === '/dashboard/notifications' &&
                  notificationsStore.hasUnread
                "
                class="sidebar-badge"
                >{{ notificationsStore.unreadCount }}</span
              >
            </NuxtLink>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- Footer -->
    <NuxtLink to="/dashboard/profile" class="sidebar-footer-link">
      <div class="sidebar-footer">
        <div class="sidebar-footer__avatar">
          {{ profile.avatarInitials || "A" }}
        </div>
        <div class="sidebar-footer__info">
          <span class="sidebar-footer__name">{{
            profile.fullName || "جاري التحميل..."
          }}</span>
          <span class="sidebar-footer__role">{{ roleLabel }}</span>
        </div>
      </div>
    </NuxtLink>

    <button
      class="sidebar-logout-btn"
      title="تسجيل الخروج"
      @click="handleLogout"
    >
      <LogOut :size="16" />
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { useRoute } from "vue-router";
import { ChevronDown, Lock, LogOut } from "lucide-vue-next";
import { useUiStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { useProfileStore } from "@/stores/profile";
import { useNotificationsStore } from "@/stores/notifications";
import { useAccess } from "@/composables/useAccess";
import { NAV_SECTIONS } from "@/utils/navigation";

const ui = useUiStore();
const auth = useAuthStore();
const profile = useProfileStore();
const notificationsStore = useNotificationsStore();
const route = useRoute();
const { resolve } = useAccess();

// الأقسام القابلة للطي (مفتوحة افتراضياً)
const collapsed = reactive<Record<string, boolean>>({});
const toggleSection = (id: string) => {
  collapsed[id] = !collapsed[id];
};

/**
 * بدون صلاحية → العنصر لا يظهر. خارج الخطة → يظهر مقفولاً (دعوة للترقية).
 * القسم الذي لا يبقى فيه أي عنصر يختفي بالكامل.
 */
const visibleSections = computed(() =>
  NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .map((item) => ({ ...item, state: resolve(item) }))
      .filter((item) => item.state !== "denied")
      .map((item) => ({ ...item, locked: item.state === "locked" })),
  })).filter((section) => section.items.length > 0),
);

const isActive = (to: string) =>
  to === "/dashboard"
    ? route.path === to
    : route.path === to || route.path.startsWith(`${to}/`);

const roleLabel = computed(() => {
  if (auth.isSystemAdmin) return "مالك النظام";
  if (auth.isSuperAdmin) return "مالك الشركة";
  return auth.role?.name || profile.data?.personal?.user?.role || "مستخدم";
});

onMounted(async () => {
  if (auth.isAuthenticated && !profile.isLoaded) {
    await profile.fetchProfile();
  }
});

const handleLogout = () => {
  auth.logout();
};
</script>

<style lang="scss">
@use "../../assets/scss/variables" as *;
@use "../../assets/scss/mixins" as *;

.app-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: $sidebar-width;
  height: 100vh;
  background: $gradient-sidebar;
  border-left: 1px solid $stb-border;
  display: flex;
  flex-direction: column;
  transition: width $transition-base;
  z-index: $z-sidebar;
  overflow: hidden;
  @include scrollbar;
}

.sidebar-logo {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-5 $space-4;
  border-bottom: 1px solid rgba($stb-border, 0.5);
  flex-shrink: 0;

  .sidabar-logo-image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    img {
      width: 100%;
    }
  }

  &__text {
    min-width: 0;
  }

  &__name {
    display: block;
    font-size: $font-size-lg;
    font-weight: 900;
    color: $stb-text-primary;
    letter-spacing: 0.05em;
    background: $gradient-accent;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__sub {
    display: block;
    font-size: $font-size-xs;
    color: $stb-text-muted;
    margin-top: 2px;
  }
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: $space-4 $space-2;
  @include scrollbar;
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: $space-1;

  &__title {
    font-size: $font-size-xs;
    font-weight: 700;
    color: $stb-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 $space-3 $space-1;
  }

  &__header {
    @include flex(row, center, space-between);
    padding: 0 $space-3 $space-1;
    cursor: pointer;
    user-select: none;

    &:hover .sidebar-section__title {
      color: $stb-text-secondary;
    }
  }

  &__arrow {
    width: 16px;
    height: 16px;
    color: $stb-text-muted;
    transition: transform $transition-base;

    &.is-rotated {
      transform: rotate(-180deg);
    }
  }
}

.sidebar-submenu {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  padding-right: $space-2;
  border-right: 1px solid rgba($stb-border, 0.3);
  margin-right: $space-3;
}

.sidebar-nav__item {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  color: $stb-text-secondary;
  font-size: $font-size-sm;
  font-weight: 500;
  text-decoration: none;
  transition: all $transition-fast;
  position: relative;

  &:hover {
    background: rgba($stb-primary, 0.2);
    color: $stb-text-primary;
  }

  &.is-active {
    background: rgba($stb-accent, 0.1);
    color: $stb-accent;
    font-weight: 700;

    &::before {
      content: "";
      position: absolute;
      right: 0;
      top: 20%;
      height: 60%;
      width: 3px;
      background: $stb-accent;
      border-radius: $radius-full 0 0 $radius-full;
      box-shadow: 0 0 8px rgba($stb-accent, 0.5);
    }
  }

  &--sub {
    font-size: $font-size-xs;
    padding: $space-1 $space-3;

    &.is-active {
      background: rgba($stb-accent, 0.05);
      &::before {
        width: 2px;
        background: $stb-accent-glow;
      }
    }
  }
}

.sidebar-nav__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  stroke-width: 2px;
  transition: color $transition-fast;
}

.sidebar-footer-link {
  text-decoration: none;
  display: block;
  transition: background $transition-fast;

  &:hover {
    background: rgba($stb-primary, 0.15);
  }
}

.sidebar-footer {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-4;
  border-top: 1px solid rgba($stb-border, 0.5);
  flex-shrink: 0;

  &__avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: $gradient-primary;
    @include flex(row, center, center);
    font-weight: 700;
    font-size: $font-size-sm;
    color: #fff;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: $font-size-xs;
    color: $stb-text-primary;
    font-weight: 600;
    @include truncate;
  }

  &__role {
    font-size: $font-size-xs;
    color: $stb-accent;
    font-weight: 600;
    margin-top: 2px;
  }
}

.sidebar-logout-btn {
  position: absolute;
  bottom: $space-4;
  left: $space-4;
  width: 28px;
  height: 28px;
  border-radius: $radius-sm;
  background: transparent;
  border: 1px solid rgba($stb-border, 0.5);
  color: $stb-text-muted;
  cursor: pointer;
  @include flex(row, center, center);
  transition: all $transition-fast;

  &:hover {
    background: rgba($stb-danger, 0.15);
    border-color: $stb-danger;
    color: $stb-danger;
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  opacity: 1;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

// ✅ عنصر خارج الخطة: يظهر مقفولاً (ينقل لصفحة الترقية عند الضغط)
.sidebar-nav__item--locked {
  opacity: 0.55;

  .sidebar-nav__icon {
    opacity: 0.7;
  }
  &:hover {
    opacity: 0.85;
  }
}

.sidebar-nav__lock {
  margin-right: auto;
  flex-shrink: 0;
  color: $stb-warning;
}
</style>
