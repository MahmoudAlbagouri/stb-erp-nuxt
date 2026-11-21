<!-- pages/dashboard/manufacturing/boms.vue — قوائم مكوّنات المنتجات المصنّعة -->
<template>
  <BomManager kind="production" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });
</script>
