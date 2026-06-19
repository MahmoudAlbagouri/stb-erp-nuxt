<template>
  <header class="app-topbar">
    <button class="topbar-toggle" @click="ui.toggleSidebar">
      <span />
      <span />
      <span />
    </button>

    <div class="topbar-breadcrumb">
      <span class="topbar-breadcrumb__home">STB ERP</span>
      <span class="topbar-breadcrumb__sep">/</span>
      <span class="topbar-breadcrumb__current">{{ pageTitle }}</span>
    </div>

    <div class="topbar-actions">
      <div class="topbar-badge">
        <span v-if="auth.isSuperAdmin" class="badge badge--active">مدير</span>
        <span v-else class="badge badge--tenant">مستخدم</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useUiStore } from "../../stores/ui";
import { useAuthStore } from "../../stores/auth";
import { useRoute } from "nuxt/app";
import { computed } from "vue";

const ui = useUiStore();
const auth = useAuthStore();
const route = useRoute();

const pageTitles: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/dashboard/users": "المستخدمون",
  "/dashboard/roles": "الأدوار",
  "/dashboard/permissions": "الصلاحيات",
  "/dashboard/employees": "الموظفون",
};

const pageTitle = computed(() => pageTitles[route.path] ?? "الصفحة");
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.app-topbar {
  height: $topbar-height;
  background: rgba($stb-surface, 0.9);
  border-bottom: 1px solid $stb-border;
  backdrop-filter: blur(10px);
  @include flex(row, center, flex-start, $space-4);
  padding: 0 $space-6;
  position: sticky;
  top: 0;
  z-index: $z-topbar;
  flex-shrink: 0;
}

.topbar-toggle {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  @include flex(column, center, center, 5px);
  padding: $space-1;
  border-radius: $radius-sm;
  transition: background $transition-fast;

  span {
    display: block;
    width: 20px;
    height: 2px;
    background: $stb-text-secondary;
    border-radius: $radius-full;
    transition: background $transition-fast;
  }

  &:hover {
    background: $stb-surface-3;
    span {
      background: $stb-text-primary;
    }
  }
}

.topbar-breadcrumb {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-sm;

  &__home {
    color: $stb-text-muted;
  }
  &__sep {
    color: $stb-text-muted;
  }
  &__current {
    color: $stb-text-primary;
    font-weight: 600;
  }
}

.topbar-actions {
  margin-right: auto;
  @include flex(row, center, flex-end, $space-3);
}
</style>
