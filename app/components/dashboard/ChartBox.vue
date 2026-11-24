<!--
  رسم ECharts واحد. يُرسم في المتصفح فقط (canvas)، ويتبع حجم حاويته.
  المكتبة لا تدخل حزمة الصفحة: تُحمَّل (utils/echarts-setup.ts) عندما يقترب
  الرسم من الشاشة، والمكان محجوز بارتفاعه من أول رسم فلا تتحرك الصفحة.
-->
<template>
  <div ref="host" class="chart-box" :style="{ height: `${height}px` }">
    <component
      :is="chart"
      v-if="chart"
      class="chart-box__canvas"
      :option="option"
      :update-options="{ notMerge: true }"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  type Component,
} from "vue";
import type { EChartsOption } from "echarts";

withDefaults(defineProps<{ option: EChartsOption; height?: number }>(), {
  height: 260,
});

// تحميل واحد مشترك لكل الرسوم في التطبيق
let loading: Promise<Component> | null = null;
const loadChart = () =>
  (loading ??= import("@/utils/echarts-setup").then((m) => m.VChart));

const host = ref<HTMLElement | null>(null);
const chart = shallowRef<Component | null>(null);
let observer: IntersectionObserver | null = null;

const show = async () => {
  observer?.disconnect();
  observer = null;
  chart.value = await loadChart();
};

onMounted(() => {
  if (!host.value || !("IntersectionObserver" in window)) return void show();
  // قبل ظهوره بقليل: يكون جاهزاً عندما يصل إليه التمرير
  observer = new IntersectionObserver(
    (entries) => entries.some((e) => e.isIntersecting) && show(),
    { rootMargin: "200px" },
  );
  observer.observe(host.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<style lang="scss" scoped>
.chart-box {
  width: 100%;
  // المحاور والأرقام لاتينية من اليسار لليمين حتى في واجهة عربية
  direction: ltr;
}

.chart-box__canvas {
  width: 100%;
  height: 100%;
}
</style>
