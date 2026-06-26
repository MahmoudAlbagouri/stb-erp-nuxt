<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastContainer />
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { onMounted } from "vue";

const auth = useAuthStore();
onMounted(() => auth.hydrate());
</script>
