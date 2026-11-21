<!-- pages/dashboard/restaurant/recipes.vue — وصفات الأطباق (تُخصم مكوّناتها عند البيع) -->
<template>
  <BomManager kind="recipe" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });
</script>
