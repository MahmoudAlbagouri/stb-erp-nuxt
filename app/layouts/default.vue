<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': !ui.sidebarOpen }">
    <AppSidebar />
    <div class="app-main">
      <AppTopbar />
      <main class="app-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from "../stores/ui";
const ui = useUiStore();
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
