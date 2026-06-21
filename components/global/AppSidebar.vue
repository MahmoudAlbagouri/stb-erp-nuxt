<template>
  <aside class="app-sidebar" :class="{ 'is-open': ui.sidebarOpen }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="sidebar-logo__icon">
        <svg viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="20" fill="url(#sgrad)" />
          <text
            x="20"
            y="26"
            text-anchor="middle"
            fill="white"
            font-weight="900"
            font-size="14"
            font-family="Cairo"
          >
            STB
          </text>
          <defs>
            <linearGradient id="sgrad" x1="0" y1="0" x2="40" y2="40">
              <stop stop-color="#1a6fd4" />
              <stop offset="1" stop-color="#062d6b" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="sidebar-logo__text">
        <span class="sidebar-logo__name">STB ERP</span>
        <span class="sidebar-logo__sub">نظام إدارة المؤسسات</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <!-- الرئيسية -->
      <div class="sidebar-section">
        <span class="sidebar-section__title">الرئيسية</span>
        <NuxtLink
          to="/dashboard"
          class="sidebar-nav__item"
          active-class="is-active"
        >
          <span class="sidebar-nav__icon">⊞</span>
          <span>لوحة التحكم</span>
        </NuxtLink>

        <!-- ✅ إضافة رابط مباشر للبروفايل في القائمة الرئيسية -->
        <NuxtLink
          to="/dashboard/profile"
          class="sidebar-nav__item"
          active-class="is-active"
        >
          <span class="sidebar-nav__icon">👤</span>
          <span>ملفي الشخصي</span>
        </NuxtLink>
      </div>

      <!-- إدارة النظام -->
      <div class="sidebar-section">
        <span class="sidebar-section__title">إدارة النظام</span>
        <NuxtLink
          to="/dashboard/users"
          class="sidebar-nav__item"
          active-class="is-active"
        >
          <span class="sidebar-nav__icon">👥</span>
          <span>المستخدمون</span>
        </NuxtLink>
        <NuxtLink
          to="/dashboard/roles"
          class="sidebar-nav__item"
          active-class="is-active"
        >
          <span class="sidebar-nav__icon">🛡</span>
          <span>الأدوار</span>
        </NuxtLink>
        <NuxtLink
          to="/dashboard/permissions"
          class="sidebar-nav__item"
          active-class="is-active"
        >
          <span class="sidebar-nav__icon">🔑</span>
          <span>الصلاحيات</span>
        </NuxtLink>
      </div>

      <!-- ✅ الموارد البشرية (قائمة منسدلة) -->
      <div class="sidebar-section">
        <div class="sidebar-section__header" @click="toggleHrMenu">
          <span class="sidebar-section__title">الموارد البشرية</span>
          <span
            class="sidebar-section__arrow"
            :class="{ 'is-rotated': isHrOpen }"
          >
            ▼
          </span>
        </div>

        <Transition name="slide-down">
          <div v-if="isHrOpen" class="sidebar-submenu">
            <NuxtLink
              to="/dashboard/employees"
              class="sidebar-nav__item sidebar-nav__item--sub"
              active-class="is-active"
            >
              <span class="sidebar-nav__icon">👥</span>
              <span>الموظفون</span>
            </NuxtLink>
            <NuxtLink
              to="/dashboard/contracts"
              class="sidebar-nav__item sidebar-nav__item--sub"
              active-class="is-active"
            >
              <span class="sidebar-nav__icon">📝</span>
              <span>العقود</span>
            </NuxtLink>
            <NuxtLink
              to="/dashboard/salaries"
              class="sidebar-nav__item sidebar-nav__item--sub"
              active-class="is-active"
            >
              <span class="sidebar-nav__icon">💵</span>
              <span>الرواتب</span>
            </NuxtLink>
            <NuxtLink
              to="/dashboard/leaves"
              class="sidebar-nav__item sidebar-nav__item--sub"
              active-class="is-active"
            >
              <span class="sidebar-nav__icon">📅</span>
              <span>الإجازات</span>
            </NuxtLink>
            <NuxtLink
              to="/dashboard/attendance"
              class="sidebar-nav__item sidebar-nav__item--sub"
              active-class="is-active"
            >
              <span class="sidebar-nav__icon">📟</span>
              <span>البصمة والحضور</span>
            </NuxtLink>
            <NuxtLink
              to="/dashboard/advances"
              class="sidebar-nav__item sidebar-nav__item--sub"
              active-class="is-active"
            >
              <span class="sidebar-nav__icon"></span>
              <span>السلف</span>
            </NuxtLink>
            <NuxtLink
              to="/dashboard/loans"
              class="sidebar-nav__item sidebar-nav__item--sub"
              active-class="is-active"
            >
              <span class="sidebar-nav__icon">🏦</span>
              <span>القروض</span>
            </NuxtLink>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- Footer: تم تحويله لرابط قابل للنقر يوجه للبروفايل -->
    <NuxtLink to="/dashboard/profile" class="sidebar-footer-link">
      <div class="sidebar-footer">
        <div class="sidebar-footer__avatar">
          {{ profile.avatarInitials || "A" }}
        </div>
        <div class="sidebar-footer__info">
          <span class="sidebar-footer__name">
            {{ profile.fullName || "جاري التحميل..." }}
          </span>
          <span class="sidebar-footer__role">
            {{ profile.data?.personal.user.role || "مستخدم" }}
          </span>
        </div>
      </div>
    </NuxtLink>

    <button
      class="sidebar-logout-btn"
      @click="handleLogout"
      title="تسجيل الخروج"
    >
      ⎋
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useUiStore } from "../../stores/ui";
import { useAuthStore } from "../../stores/auth";
import { useProfileStore } from "../../stores/profile"; // ✅ استيراد ستور البروفايل

const ui = useUiStore();
const auth = useAuthStore();
const profile = useProfileStore(); // ✅ تهيئة الستور
const route = useRoute();

// حالة القائمة المنسدلة للموارد البشرية
const isHrOpen = ref(true);

// دالة التبديل
const toggleHrMenu = () => {
  isHrOpen.value = !isHrOpen.value;
};

// جلب بيانات البروفايل عند تحميل السايدبار لعرض الاسم والصورة
onMounted(async () => {
  if (auth.isAuthenticated && !profile.isLoaded) {
    await profile.fetchProfile();
  }

  const hrRoutes = [
    "/dashboard/employees",
    "/dashboard/contracts",
    "/dashboard/salaries",
    "/dashboard/advances",
    "/dashboard/loans",
    "/dashboard/leaves",
  ];
  if (hrRoutes.includes(route.path)) {
    isHrOpen.value = true;
  }
});

const handleLogout = () => {
  profile.clearProfile(); // مسح بيانات البروفايل عند الخروج
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

// Logo
.sidebar-logo {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-5 $space-4;
  border-bottom: 1px solid rgba($stb-border, 0.5);
  flex-shrink: 0;

  &__icon {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    filter: drop-shadow(0 0 8px rgba($stb-accent, 0.4));
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

// Nav
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
    font-size: 0.6rem;
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
  font-size: 1rem;
  flex-shrink: 0;
}

// ✅ Footer Styles Updated for Profile Link
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

// Logout Button Positioned Separately or Integrated
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
  font-size: $font-size-base;

  &:hover {
    background: rgba($stb-danger, 0.15);
    border-color: $stb-danger;
    color: $stb-danger;
  }
}

// Animation for Dropdown
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
</style>
