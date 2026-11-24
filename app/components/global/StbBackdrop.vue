<template>
  <!-- خلف كل المحتوى (z-index 0، والمحتوى 1 في app.vue)، ولا يستقبل النقر -->
  <Teleport to="body">
    <div
      v-if="active"
      ref="host"
      class="stb-backdrop"
      :class="{ 'is-still': still }"
      aria-hidden="true"
    />
  </Teleport>
</template>

<script setup lang="ts">
// ✅ الخلفية المتحركة (utils/backdrop.ts): تُبنى في المتصفح فقط، في الرئيسية
// وشاشات الدخول، وعندما لم يوقفها المستخدم (useBackdrop). الرسم مرة واحدة
// (قناعاً)، والحركة CSS transform على الـ GPU، واللون من متغير الوضع.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { backdropAllowedOn, useBackdrop } from "@/composables/useBackdrop";
import { mountBackdrop, prefersStillBackdrop } from "@/utils/backdrop";

const route = useRoute();
const { enabled } = useBackdrop();

const isClient = ref(false);
const still = ref(false);
onMounted(() => {
  isClient.value = true;
  still.value = prefersStillBackdrop();
});

const active = computed(
  () => isClient.value && enabled.value && backdropAllowedOn(route.path),
);

const host = ref<HTMLElement | null>(null);
let stop: (() => void) | null = null;

watch(
  host,
  (el) => {
    stop?.();
    stop = el ? mountBackdrop(el) : null;
  },
  { flush: "post" },
);

onBeforeUnmount(() => stop?.());
</script>

<style>
.stb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* خط واحد: تنفّس رأسي بطيء على الغلاف، وانسياب أفقي على الـ canvas.
   transform فقط، فيحرّكه الـ compositor بلا إعادة رسم ولا JavaScript */
.stb-strand {
  position: absolute;
  top: var(--top);
  left: 0;
  width: max-content;
  animation: stb-bob var(--bob-time) ease-in-out var(--delay) infinite alternate;
  will-change: transform;
}

/* الخط: لونه من الوضع الحالي وشكله القناع المرسوم مرة واحدة، فتبديل الوضع
   يغيّر اللون بلا إعادة رسم. أعرض من الشاشة بدورة كاملة عمداً */
.stb-strand__line {
  background: var(--stb-strand);
  -webkit-mask: var(--mask) 0 0 / 100% 100% no-repeat;
  mask: var(--mask) 0 0 / 100% 100% no-repeat;
  animation: stb-flow var(--flow) linear var(--delay) infinite;
  will-change: transform;
}

.stb-strand__line.is-lead {
  background: var(--stb-strand-lead);
}

@keyframes stb-flow {
  to {
    transform: translateX(calc(-1 * var(--period)));
  }
}

@keyframes stb-bob {
  from {
    transform: translateY(calc(-1 * var(--bob)));
  }
  to {
    transform: translateY(var(--bob));
  }
}

/* تقليل الحركة، توفير البيانات، والأجهزة الضعيفة: الخطوط ثابتة */
.stb-backdrop.is-still .stb-strand,
.stb-backdrop.is-still .stb-strand__line {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .stb-strand,
  .stb-strand__line {
    animation: none;
  }
}
</style>
