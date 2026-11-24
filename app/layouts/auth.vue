<template>
  <div class="auth-layout">
    <!-- الخلفية: خطوط البيانات المتحركة من StbBackdrop (app.vue) -->
    <div class="auth-theme-toggle"><ThemeToggle /></div>
    <slot />
  </div>
</template>

<style lang="scss">
@use "~/assets/scss/variables" as *;

.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: $space-4;
}

.auth-theme-toggle {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 5;
}
</style>
