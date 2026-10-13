<!--
  بطاقة رقم: التسمية + القيمة + التغير عن الفترة السابقة + خط اتجاه صغير.
  الرقم هو الرسم — رقم واحد لا يحتاج عموداً أو دائرة.
-->
<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="stat-tile" :class="{ 'stat-tile--link': to, 'stat-tile--spark': !!sparkPath }">
    <div class="stat-tile__head">
      <span class="stat-tile__icon" :class="`stat-tile__icon--${tone}`">
        <component :is="icon" :size="18" />
      </span>
      <span class="stat-tile__label">{{ label }}</span>
    </div>

    <div class="stat-tile__value">{{ value }}</div>

    <div class="stat-tile__foot">
      <!-- الاتجاه بسهم ونص، لا باللون وحده -->
      <span
        v-if="change !== undefined && change !== null"
        class="stat-tile__delta"
        :class="`stat-tile__delta--${deltaTone}`"
      >
        <component :is="deltaIcon" :size="13" />
        <span dir="ltr">{{ deltaText }}</span>
      </span>
      <span v-if="hint" class="stat-tile__hint">{{ hint }}</span>
    </div>

    <svg
      v-if="sparkPath"
      class="stat-tile__spark"
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path :d="sparkPath" />
    </svg>
  </component>
</template>

<script setup lang="ts">
import { computed, resolveComponent, type Component } from "vue";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
    icon: Component;
    /** نسبة التغير عن الفترة السابقة (0.12 = ‎+12%). null = لا أساس للمقارنة */
    change?: number | null;
    /**
     * هل الزيادة خبر جيد؟ (المبيعات نعم، المرتجعات لا). null = لا جيد ولا
     * سيئ بذاته (المشتريات): يُعرض الاتجاه بلا لون حكم.
     */
    upIsGood?: boolean | null;
    hint?: string;
    /** قيم خط الاتجاه، الأقدم أولاً */
    trend?: number[];
    tone?: "accent" | "good" | "warning" | "critical";
    to?: string;
  }>(),
  { upIsGood: true, tone: "accent" },
);

const NuxtLink = resolveComponent("NuxtLink");

const direction = computed(() => {
  if (!props.change || Math.abs(props.change) < 0.0005) return "flat";
  return props.change > 0 ? "up" : "down";
});

const deltaIcon = computed(
  () => ({ up: ArrowUpRight, down: ArrowDownRight, flat: Minus })[direction.value],
);

const deltaTone = computed(() => {
  if (direction.value === "flat" || props.upIsGood === null) return "flat";
  return (direction.value === "up") === props.upIsGood ? "good" : "bad";
});

const deltaText = computed(() => {
  const percent = Math.round(Math.abs(props.change ?? 0) * 1000) / 10;
  const sign = { up: "+", down: "−", flat: "" }[direction.value];
  return `${sign}${percent}%`;
});

/** خط اتجاه بلا محاور: شكل الفترة بنظرة، والقيم في الرسم المفصّل */
const sparkPath = computed(() => {
  const points = props.trend ?? [];
  if (points.length < 2) return "";
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min;
  // فترة بلا أي تغير: لا خط (خط مستقيم لا يقول شيئاً)
  if (span === 0) return "";
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 26 - ((point - min) / span) * 24;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/mixins" as *;

.stat-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  min-width: 0;
  padding: $space-4 $space-5;
  overflow: hidden;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  color: inherit;
  text-decoration: none;
  transition:
    transform $transition-fast,
    border-color $transition-fast;

  // مساحة خاصة لخط الاتجاه: لا يمرّ فوق نسبة التغير
  &--spark {
    padding-bottom: 38px;
  }

  &--link:hover {
    transform: translateY(-2px);
    border-color: $stb-accent;
  }

  &__head {
    @include flex(row, center, flex-start, $space-2);
  }

  &__icon {
    @include flex(row, center, center);
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: $radius-md;

    &--accent {
      background: rgba($stb-accent, 0.12);
      color: $stb-accent;
    }
    &--good {
      background: rgba($stb-success, 0.12);
      color: $stb-success;
    }
    &--warning {
      background: rgba($stb-warning, 0.14);
      color: $stb-warning;
    }
    &--critical {
      background: rgba($stb-danger, 0.12);
      color: $stb-danger;
    }
  }

  &__label {
    font-size: $font-size-sm;
    color: $stb-text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__value {
    font-size: $font-size-2xl;
    font-weight: 800;
    line-height: 1.2;
    color: $stb-text-primary;
    // أرقام كبيرة منفردة: عرض الأرقام الطبيعي لا المتساوي
    font-variant-numeric: proportional-nums;
    overflow-wrap: anywhere;
  }

  &__foot {
    @include flex(row, center, flex-start, $space-2);
    min-height: 20px;
    flex-wrap: wrap;
    font-size: $font-size-xs;
  }

  &__delta {
    @include flex(row, center, center, 2px);
    padding: 1px 6px;
    border-radius: 999px;
    font-weight: 700;

    &--good {
      background: rgba($stb-success, 0.12);
      color: $stb-success;
    }
    &--bad {
      background: rgba($stb-danger, 0.12);
      color: $stb-danger;
    }
    &--flat {
      background: $stb-surface-3;
      color: $stb-text-secondary;
    }
  }

  &__hint {
    color: $stb-text-muted;
  }

  &__spark {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    width: 100%;
    height: 28px;
    // الاتجاه يُقرأ من اليسار (الأقدم) لليمين كباقي الرسوم
    direction: ltr;
    pointer-events: none;

    path {
      fill: none;
      stroke: $stb-accent;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
      opacity: 0.45;
    }
  }
}

// فون: بطاقتان في الصف، فالرقم أصغر ليتسع
@media (max-width: 640px) {
  .stat-tile {
    padding: $space-3 $space-4;

    &--spark {
      padding-bottom: 34px;
    }

    &__value {
      font-size: $font-size-lg;
    }
  }
}
</style>
