<!--
  شريط وضع الدعم: يظهر طوال عمل مالك النظام داخل شركة، حتى لا ينسى أن ما
  يفعله يقع على بيانات عميل حقيقي، ومنه يعود لحسابه.
-->
<template>
  <div v-if="auth.supportTenant" class="support-banner" role="status">
    <LifeBuoy :size="18" class="support-banner__icon" />
    <span class="support-banner__text">
      وضع الدعم — أنت تعمل داخل شركة
      <strong>{{ auth.supportTenant.companyName }}</strong>
      بصلاحيات مديرها، وأي تعديل يقع على بياناتها الفعلية.
    </span>
    <button class="btn btn--sm support-banner__exit" @click="auth.exitSupport()">
      <LogOut :size="14" /> العودة لحساب مالك النظام
    </button>
  </div>
</template>

<script setup lang="ts">
import { LifeBuoy, LogOut } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
</script>

<style lang="scss" scoped>
.support-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-2 $space-3;
  padding: $space-2 $space-4;
  font-size: $font-size-sm;
  color: $stb-text-primary;
  background: rgba($stb-warning, 0.16);
  border-bottom: 1px solid rgba($stb-warning, 0.45);

  &__icon {
    flex-shrink: 0;
    color: $stb-warning;
  }
  &__text {
    flex: 1;
    min-width: 220px;
  }
  &__exit {
    color: $stb-text-primary;
    background: transparent;
    border: 1px solid rgba($stb-warning, 0.6);

    &:hover {
      background: rgba($stb-warning, 0.2);
    }
  }
}
</style>
