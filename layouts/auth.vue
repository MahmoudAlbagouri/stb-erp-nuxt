<template>
  <div class="auth-layout">
    <div class="auth-bg">
      <div class="auth-bg__orb auth-bg__orb--1" />
      <div class="auth-bg__orb auth-bg__orb--2" />
      <div class="auth-bg__grid" />
    </div>
    <slot />
  </div>
</template>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $stb-dark;
  position: relative;
  overflow: hidden;
  padding: $space-4;
}

.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;

  &__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.15;

    &--1 {
      width: 600px;
      height: 600px;
      background: $stb-primary;
      top: -200px;
      right: -200px;
    }

    &--2 {
      width: 400px;
      height: 400px;
      background: $stb-accent;
      bottom: -100px;
      left: -100px;
    }
  }

  &__grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba($stb-border, 0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba($stb-border, 0.3) 1px, transparent 1px);
    background-size: 40px 40px;
    opacity: 0.4;
  }
}
</style>
