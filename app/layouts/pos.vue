<!-- layouts/pos.vue — شاشة الكاشير: ملء الشاشة بلا قائمة جانبية ولا شريط علوي -->
<template>
  <div class="pos-layout">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

// الإشعارات (toasts) خارج هذا العنصر (في body): نعلّم الـ body لننقلها عن
// زر الدفع أسفل الشاشة
onMounted(() => document.body.classList.add("is-pos"));
onBeforeUnmount(() => document.body.classList.remove("is-pos"));
</script>

<style lang="scss">
.pos-layout {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: $stb-dark;
}

// في شاشة الكاشير تظهر الإشعارات أعلى الوسط: أسفل الشاشة للسلة وزر الدفع
body.is-pos .toast-container {
  top: 64px;
  bottom: auto;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  align-items: center;
}
</style>
