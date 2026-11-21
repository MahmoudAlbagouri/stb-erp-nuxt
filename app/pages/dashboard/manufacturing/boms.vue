<!-- pages/dashboard/manufacturing/boms.vue — قوائم مكوّنات المنتجات المصنّعة -->
<template>
  <BomManager kind="production" />
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import BomManager from "~/components/manufacturing/BomManager.vue";
definePageMeta({ middleware: "auth" });
</script>
