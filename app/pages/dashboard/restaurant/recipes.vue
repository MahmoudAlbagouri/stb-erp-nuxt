<!-- pages/dashboard/restaurant/recipes.vue — وصفات الأطباق (تُخصم مكوّناتها عند البيع) -->
<template>
  <BomManager kind="recipe" />
</template>

<script setup lang="ts">
import BomManager from "~/components/manufacturing/BomManager.vue";

definePageMeta({ middleware: "auth" });
</script>
