<!--
  رسم ECharts واحد. يُرسم في المتصفح فقط (canvas)، ويتبع حجم حاويته.
  المكتبة تُحمَّل بما تحتاجه الصفحة الرئيسية فقط (خط، عمود، دائرة) لا كلها.
-->
<template>
  <ClientOnly>
    <VChart
      class="chart-box"
      :style="{ height: `${height}px` }"
      :option="option"
      :update-options="{ notMerge: true }"
      autoresize
    />
    <template #fallback>
      <div class="chart-box" :style="{ height: `${height}px` }" />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import type { EChartsOption } from "echarts";

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
]);

withDefaults(defineProps<{ option: EChartsOption; height?: number }>(), {
  height: 260,
});
</script>

<style lang="scss" scoped>
.chart-box {
  width: 100%;
  // المحاور والأرقام لاتينية من اليسار لليمين حتى في واجهة عربية
  direction: ltr;
}
</style>
