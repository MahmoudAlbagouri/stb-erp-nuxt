<template>
  <!-- الميزة ضمن الخطة: نعرض المحتوى كما هو -->
  <slot v-if="unlocked" />

  <!--
    خارج الخطة: نعرض نفس العنصر مقفولاً (غير قابل للضغط) مع شارة قفل،
    والضغط عليه ينقل لصفحة الاشتراك — دعوة للترقية بدل إخفاء الميزة.
  -->
  <NuxtLink
    v-else
    :to="upgradeTo"
    class="feature-gate"
    :class="{ 'feature-gate--block': block }"
    :title="`${label} — متاح في خطة أعلى`"
  >
    <span class="feature-gate__content" aria-hidden="true"><slot /></span>
    <span class="feature-gate__badge"><Lock :size="11" /></span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Lock } from "lucide-vue-next";
import { useAccess } from "@/composables/useAccess";
import { FEATURE_LABELS, type FeatureKey } from "@/utils/access";

const props = defineProps<{
  feature: FeatureKey;
  /** يملأ عرض الحاوية (للعناصر الكبيرة مثل التبويبات والكروت) */
  block?: boolean;
}>();

const { hasFeature, can, P } = useAccess();

const unlocked = computed(() => hasFeature(props.feature));
const label = computed(() => FEATURE_LABELS[props.feature]);
const upgradeTo = computed(() =>
  can(P.SUBSCRIPTION_VIEW_OWN) ? "/dashboard/subscription" : "/dashboard",
);
</script>

<style lang="scss" scoped>
.feature-gate {
  position: relative;
  display: inline-flex;
  text-decoration: none;
  cursor: pointer;

  &--block {
    display: flex;
    width: 100%;
  }
}

.feature-gate__content {
  display: inherit;
  width: 100%;
  opacity: 0.45;
  filter: grayscale(0.6);
  pointer-events: none;
  user-select: none;
}

.feature-gate__badge {
  position: absolute;
  top: -6px;
  left: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: $stb-on-accent;
  background: $stb-warning;
  box-shadow: 0 2px 8px rgba($stb-warning, 0.45);
}

.feature-gate:hover .feature-gate__content {
  opacity: 0.6;
}
</style>
