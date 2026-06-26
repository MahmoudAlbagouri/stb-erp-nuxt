<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          @click="ui.removeToast(toast.id)"
        >
          <span class="toast__icon">{{ icons[toast.type] }}</span>
          <span class="toast__msg">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useUiStore } from "@/stores/ui";
const ui = useUiStore();
const icons = { success: "✓", error: "✕", info: "ℹ", warning: "⚠" };
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.toast-container {
  position: fixed;
  bottom: $space-6;
  left: $space-6;
  z-index: $z-toast;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  pointer-events: none;
}

.toast {
  @include glass-card;
  padding: $space-3 $space-5;
  @include flex(row, center, flex-start, $space-3);
  min-width: 280px;
  max-width: 360px;
  pointer-events: all;
  cursor: pointer;
  font-size: $font-size-sm;

  &--success {
    border-right: 3px solid $stb-success;
    .toast__icon {
      color: $stb-success;
    }
  }
  &--error {
    border-right: 3px solid $stb-danger;
    .toast__icon {
      color: $stb-danger;
    }
  }
  &--info {
    border-right: 3px solid $stb-accent;
    .toast__icon {
      color: $stb-accent;
    }
  }
  &--warning {
    border-right: 3px solid $stb-warning;
    .toast__icon {
      color: $stb-warning;
    }
  }

  &__icon {
    font-weight: 700;
    flex-shrink: 0;
  }
  &__msg {
    color: $stb-text-primary;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
