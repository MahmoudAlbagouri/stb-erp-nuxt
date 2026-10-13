<!--
  دائرة "جزء من كل": الإجمالي في الوسط، والقيم والنسب في قائمة بجانبها.
  القائمة هي ما يُقرأ — اللون يربط الشريحة بسطرها فقط، والنص بلون النص لا
  بلون الشريحة (الأصفر والأخضر الفاتح لا يُقرآن كنص).
-->
<template>
  <div class="donut">
    <div class="donut__ring">
      <ChartBox :option="option" :height="size" />
      <div class="donut__center">
        <strong>{{ centerValue }}</strong>
        <span>{{ centerLabel }}</span>
      </div>
    </div>

    <ul class="donut__legend">
      <li v-for="slice in rows" :key="slice.name">
        <span class="donut__swatch" :style="{ background: slice.color }" />
        <span class="donut__name">{{ slice.name }}</span>
        <span class="donut__value">{{ format(slice.value) }}</span>
        <span class="donut__share" dir="ltr">{{ slice.share }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";
import ChartBox from "./ChartBox.vue";
import { useTheme } from "@/composables/useTheme";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

const props = withDefaults(
  defineProps<{
    slices: DonutSlice[];
    centerLabel: string;
    /** نص الوسط؛ الافتراضي مجموع الشرائح منسّقاً بـ `format` */
    centerValue?: string;
    format?: (value: number) => string;
    size?: number;
  }>(),
  { format: (value: number) => formatNumber(value), size: 170 },
);

const { theme } = useTheme();
const palette = computed(() => chartPalette(theme.value));

const total = computed(() =>
  props.slices.reduce((sum, slice) => sum + slice.value, 0),
);

const centerValue = computed(
  () => props.centerValue ?? props.format(total.value),
);

const rows = computed(() =>
  props.slices.map((slice) => ({
    ...slice,
    share: total.value
      ? Math.round((slice.value / total.value) * 1000) / 10
      : 0,
  })),
);

const option = computed<EChartsOption>(() => ({
  aria: { enabled: true },
  tooltip: {
    trigger: "item",
    confine: true,
    backgroundColor: palette.value.surface,
    borderColor: palette.value.axis,
    textStyle: { color: palette.value.text, fontFamily: "Cairo, sans-serif" },
    valueFormatter: (value) => props.format(Number(value)),
  },
  series: [
    {
      type: "pie",
      radius: ["62%", "88%"],
      // الشرائح بترتيبها المعطى: الترتيب جزء من المعنى (والألوان مرتبطة به)
      data: props.slices.map((slice) => ({
        name: slice.name,
        value: slice.value,
        itemStyle: { color: slice.color },
      })),
      // فاصل بلون الخلفية بين الشرائح بدل إطار مرسوم حولها
      itemStyle: {
        borderColor: palette.value.surface,
        borderWidth: 2,
        borderRadius: 4,
      },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 4 },
      // شريحة صغيرة جداً تبقى مرئية وقابلة للإشارة
      minAngle: 4,
    },
  ],
}));
</script>

<style lang="scss" scoped>
@use "~/assets/scss/mixins" as *;

.donut {
  @include flex(row, center, center, $space-5);
  flex-wrap: wrap;

  &__ring {
    position: relative;
    flex: 0 0 170px;
    width: 170px;
  }

  &__center {
    @include flex(column, center, center, 0);
    position: absolute;
    inset: 0;
    pointer-events: none;
    text-align: center;

    strong {
      max-width: 96px;
      font-size: $font-size-lg;
      font-weight: 800;
      line-height: 1.2;
      color: $stb-text-primary;
      overflow-wrap: anywhere;
    }

    span {
      font-size: $font-size-xs;
      color: $stb-text-muted;
    }
  }

  &__legend {
    flex: 1 1 180px;
    min-width: 0;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: $space-2;
      padding: 6px 0;
      font-size: $font-size-sm;

      & + li {
        border-top: 1px solid $stb-border;
      }
    }
  }

  &__swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }

  &__name {
    color: $stb-text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__value {
    font-weight: 700;
    color: $stb-text-primary;
    font-variant-numeric: tabular-nums;
  }

  &__share {
    min-width: 44px;
    text-align: end;
    color: $stb-text-muted;
    font-variant-numeric: tabular-nums;
  }
}
</style>
