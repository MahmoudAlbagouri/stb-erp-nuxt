<template>
  <div
    class="app-layout"
    :class="{
      'sidebar-collapsed': !ui.sidebarOpen,
      'mobile-nav-open': ui.mobileNavOpen,
    }"
  >
    <AppSidebar />
    <!-- خلفية معتمة خلف درج القائمة (آيباد/فون) -->
    <Transition name="fade">
      <div
        v-if="ui.mobileNavOpen"
        class="app-backdrop"
        @click="ui.closeMobileNav"
      />
    </Transition>
    <div class="app-main">
      <AppTopbar />
      <main class="app-content">
        <!-- ✅ حماية الصفحات: الدخول بالرابط المباشر يخضع لنفس قواعد القائمة -->
        <div v-if="!sessionReady" class="app-content__loading">
          <span class="spinner" />
        </div>
        <AccessState
          v-else-if="pageState !== 'allowed'"
          :state="pageState"
          :title="navItem?.label"
          :feature="navItem?.feature"
        />
        <slot v-else />
      </main>
    </div>
    <MobileTabBar />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useUiStore } from "../stores/ui";
import { useAuthStore } from "../stores/auth";
import { useAccessStore } from "../stores/access";
import { useAccess } from "../composables/useAccess";
import { findNavItem } from "../utils/navigation";

const ui = useUiStore();
const auth = useAuthStore();
const accessStore = useAccessStore();
const route = useRoute();
const { resolve } = useAccess();

const navItem = computed(() => findNavItem(route.path));

// التوكن قد يكون منتهياً (جلسة refresh فقط): ننتظر تجديده قبل الحكم على الصلاحيات
const sessionReady = computed(() => !!auth.decodedToken);
const pageState = computed(() => resolve(navItem.value));

// إغلاق درج القائمة عند الانتقال لصفحة أخرى
watch(
  () => route.fullPath,
  () => ui.closeMobileNav(),
);

// بيانات الخطة (المميزات + الحدود) تُحمَّل مرة لكل جلسة، ويُعاد تحميلها عند تغيّر المستخدم
onMounted(() => accessStore.fetch());
watch(
  () => auth.userId,
  (id, previous) => {
    if (id && id !== previous) accessStore.fetch(true);
  },
);
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.app-layout {
  display: flex;
  min-height: 100vh;
  background: $stb-dark;
  direction: rtl;

  // حالة الطي خاصة باللاب فقط — في الشاشات الأصغر القائمة درج كامل العرض
  @media (min-width: 1025px) {
    &.sidebar-collapsed {
      .app-sidebar {
        width: $sidebar-collapsed;
      }
      .app-main {
        margin-right: $sidebar-collapsed;
      }
      .sidebar-label,
      .sidebar-logo__text,
      .sidebar-footer__info,
      .sidebar-section__title,
      .sidebar-nav__lock,
      .sidebar-badge,
      .sidebar-section__arrow {
        display: none;
      }
      .sidebar-nav__item span {
        display: none;
      }
      .sidebar-nav__item {
        justify-content: center;
        padding: $space-3;
      }
    }
  }

}

.app-main {
  flex: 1;
  margin-right: $sidebar-width;
  transition: margin $transition-base;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
}

.app-content__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  @include scrollbar;
}

.app-backdrop {
  position: fixed;
  inset: 0;
  z-index: $z-sidebar - 1;
  background: $stb-scrim;
  backdrop-filter: blur(3px);
}

// ─── آيباد/فون: القائمة الجانبية درج ينزلق من اليمين ───────────────────────
@include respond-to("lg") {
  .app-main {
    margin-right: 0;
  }

  .app-sidebar {
    width: min(86vw, 320px) !important;
    height: 100vh;
    height: 100dvh;
    transform: translateX(105%);
    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    box-shadow: none;
  }

  .mobile-nav-open .app-sidebar {
    transform: translateX(0);
    box-shadow: -16px 0 48px rgba(0, 0, 0, 0.55);
  }

  // منع تمرير الصفحة خلف الدرج
  .mobile-nav-open {
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
}

@include respond-to("sm") {
  // الدرج يقف فوق شريط التنقل السفلي
  .app-sidebar {
    height: calc(100dvh - var(--tabbar-height) - var(--safe-bottom));
  }
}
</style>
