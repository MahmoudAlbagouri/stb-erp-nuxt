<template>
  <button
    type="button"
    class="theme-toggle"
    :class="{ 'theme-toggle--light': !isDark }"
    :title="isDark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'"
    :aria-label="isDark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'"
    @click="toggleTheme"
  >
    <span class="theme-toggle__track">
      <Moon :size="13" class="theme-toggle__icon theme-toggle__icon--moon" />
      <Sun :size="13" class="theme-toggle__icon theme-toggle__icon--sun" />
      <span class="theme-toggle__thumb" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
import { useTheme } from "@/composables/useTheme";

const { isDark, toggleTheme } = useTheme();
</script>

<style lang="scss" scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible .theme-toggle__track {
    outline: 2px solid rgba($stb-accent, 0.7);
    outline-offset: 2px;
  }
}

.theme-toggle__track {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 54px;
  height: 28px;
  padding: 0 7px;
  direction: ltr;
  border-radius: $radius-full;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  transition:
    background $transition-base,
    border-color $transition-base;
}

.theme-toggle:hover .theme-toggle__track {
  border-color: $stb-accent;
}

.theme-toggle__icon {
  position: relative;
  z-index: 1;
  transition:
    color $transition-base,
    transform $transition-base;

  // الأيقونة النشطة تقع فوق الدائرة المتحركة
  &--moon {
    color: #fff;
  }
  &--sun {
    color: $stb-text-muted;
  }
}

.theme-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: $gradient-primary;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    background $transition-base;
}

.theme-toggle--light {
  .theme-toggle__thumb {
    transform: translateX(26px);
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  }
  .theme-toggle__icon--moon {
    color: $stb-text-muted;
  }
  .theme-toggle__icon--sun {
    color: #fff;
    transform: rotate(45deg);
  }
}
</style>
