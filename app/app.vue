<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastContainer />

  <!-- ✦ خلفية متحركة واحدة على canvas (الرئيسية وشاشات الدخول فقط) -->
  <StbBackdrop />
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { onMounted } from "vue";
import { useTheme } from "@/composables/useTheme";

const auth = useAuthStore();
onMounted(() => auth.hydrate());

// ✅ الوضع الداكن/الفاتح على <html> (من الـ cookie — يعمل على السيرفر أيضاً)
useTheme().applyTheme();
</script>

<style>
/* المحتوى فوق الخلفية المتحركة (z-index 0 في StbBackdrop) */
#__nuxt > .layout,
#__nuxt > [data-v-app] {
  position: relative;
  z-index: 1;
}
</style>
