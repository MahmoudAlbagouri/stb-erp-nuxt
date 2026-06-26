<template>
  <header class="app-topbar">
    <!-- ✅ زر القائمة بأيقونة Lucide -->
    <button
      class="topbar-toggle"
      @click="ui.toggleSidebar"
      aria-label="فتح/إغلاق القائمة"
    >
      <Menu :size="20" />
    </button>

    <div class="topbar-breadcrumb">
      <!-- ✅ أيقونة المنزل للصفحة الرئيسية -->
      <Home :size="16" class="breadcrumb-icon home-icon" />
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
import { useUiStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { useRoute } from "nuxt/app";
import { computed } from "vue";
// ✅ استيراد الأيقونات
import { Menu, Home } from "lucide-vue-next";

const ui = useUiStore();
const auth = useAuthStore();
const route = useRoute();

const pageTitles: Record<string, string> = {
  "/dashboard": "الصفحة الرئيسية",
  "/dashboard/profile": "الملف الشخصي",
  "/dashboard/users": "المستخدمون",
  "/dashboard/roles": "المسمى الوظيفي",
  "/dashboard/permissions": "الصلاحيات",
  "/dashboard/employees": "الموظفون",
  "/dashboard/contracts": "العقود",
  "/dashboard/salaries": "الرواتب",
  "/dashboard/leaves": "الإجازات",
  "/dashboard/attendance": "البصمة والحضور",
  "/dashboard/advances": "السلف",
  "/dashboard/loans": "القروض",
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
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  @include flex(row, center, center);
  border-radius: $radius-md;
  color: $stb-text-secondary;
  transition: all $transition-fast;

  &:hover {
    background: $stb-surface-3;
    color: $stb-text-primary;
  }
}

.topbar-breadcrumb {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-sm;

  .breadcrumb-icon {
    color: $stb-text-muted;
    flex-shrink: 0;
  }

  &__sep {
    color: $stb-text-muted;
    margin: 0 $space-1;
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
