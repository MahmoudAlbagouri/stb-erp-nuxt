<template>
  <!-- زر أيقونة واحد مثل باقي أزرار الشريط: القمر في الفاتح والشمس في الداكن.
       التبديل نفسه مزج على الـ GPU (useTheme ← View Transitions) -->
  <button
    type="button"
    class="theme-toggle"
    :title="label"
    :aria-label="label"
    @click="toggleTheme"
  >
    <Sun v-if="isDark" :size="18" />
    <Moon v-else :size="18" />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Moon, Sun } from "lucide-vue-next";
import { useTheme } from "@/composables/useTheme";

const { isDark, toggleTheme } = useTheme();

const label = computed(() =>
  isDark.value ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن",
);
</script>

<style lang="scss" scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: $stb-text-secondary;
  background: none;
  border: 0;
  border-radius: $radius-md;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color $transition-fast,
    color $transition-fast;

  &:hover {
    background: $stb-surface-3;
    color: $stb-text-primary;
  }

  &:focus-visible {
    outline: 2px solid $stb-focus-ring;
    outline-offset: 2px;
  }
}
</style>
