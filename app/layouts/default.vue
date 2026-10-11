<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': !ui.sidebarOpen }">
    <AppSidebar />
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

  &.sidebar-collapsed {
    .app-sidebar {
      width: $sidebar-collapsed;
    }
    .app-main {
      margin-right: $sidebar-collapsed;
    }
    .sidebar-label,
    .sidebar-logo__text,
    .sidebar-footer__info {
      display: none;
    }
    .sidebar-nav__item span {
      display: none;
    }
    .sidebar-nav__item {
      justify-content: center;
      padding: $space-3;
    }
    .sidebar-section__title {
      display: none;
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

@include respond-to("lg") {
  .app-main {
    margin-right: 0;
  }
}
</style>
