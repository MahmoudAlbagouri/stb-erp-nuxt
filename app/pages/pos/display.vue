<!--
  pages/pos/display.vue — شاشة العميل: نافذة تُسحب للشاشة الثانية الموجّهة للعميل،
  وتعرض ما يبثّه الكاشير (السلة والإجمالي، ثم الباقي بعد الدفع). لا تتصل
  بالسيرفر ولا تقرأ بيانات: تعرض ما يصلها فقط (انظر pos/display.ts).
-->
<template>
  <div class="cd" dir="rtl">
    <header class="cd__head">
      <h1>{{ state?.company || "أهلاً بك" }}</h1>
    </header>

    <!-- بعد الدفع -->
    <section v-if="state?.done" class="cd__done">
      <CircleCheck :size="72" />
      <h2>شكراً لك</h2>
      <div class="cd__total">
        <span>الإجمالي</span>
        <strong>{{ money(state.done.total) }}</strong>
      </div>
      <div v-if="state.done.change > 0" class="cd__change">
        <span>الباقي لك</span>
        <strong>{{ money(state.done.change) }}</strong>
      </div>
    </section>

    <!-- أثناء البيع -->
    <template v-else-if="state?.lines.length">
      <ul class="cd__lines">
        <li v-for="(line, index) in state.lines" :key="index">
          <span class="cd__name">{{ line.name }}</span>
          <span class="cd__qty">{{ line.quantity }} {{ line.unitName }}</span>
          <strong>{{ money(line.total) }}</strong>
        </li>
      </ul>
      <footer class="cd__foot">
        <div v-if="state.discount > 0" class="cd__discount">
          <span>وفّرت</span>
          <strong>{{ money(state.discount) }}</strong>
        </div>
        <div class="cd__total">
          <span>الإجمالي</span>
          <strong>{{ money(state.total) }}</strong>
        </div>
      </footer>
    </template>

    <section v-else class="cd__idle">
      <ShoppingBag :size="72" />
      <h2>أهلاً بك</h2>
      <p v-if="!state">افتح شاشة الكاشير في نافذة أخرى على نفس الجهاز.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { CircleCheck, ShoppingBag } from "lucide-vue-next";
import { subscribeToDisplay, type DisplayState } from "@/pos/display";

definePageMeta({ layout: "pos" });
useHead({ title: "شاشة العميل" });

const state = ref<DisplayState | null>(null);

/** العملة وخاناتها تأتيان مع البثّ: هذه النافذة لا تعرف الشركة */
const money = (value: number) =>
  `${value.toLocaleString("en-US", {
    minimumFractionDigits: state.value?.decimals ?? 2,
    maximumFractionDigits: state.value?.decimals ?? 2,
  })} ${state.value?.currency ?? ""}`;

let unsubscribe = () => {};
onMounted(() => {
  unsubscribe = subscribeToDisplay((next) => (state.value = next));
});
onBeforeUnmount(() => unsubscribe());
</script>

<style lang="scss" scoped>
.cd {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: $space-6;
  gap: $space-4;
  color: $stb-text-primary;

  &__head h1 {
    margin: 0;
    font-size: 2rem;
    text-align: center;
    color: $stb-accent;
  }

  &__lines {
    flex: 1;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $space-2;

    li {
      display: flex;
      align-items: center;
      gap: $space-4;
      padding: $space-3 $space-4;
      font-size: 1.4rem;
      background: $stb-surface-2;
      border: 1px solid $stb-border;
      border-radius: $radius-md;
    }
    strong {
      margin-inline-start: auto;
      direction: ltr;
    }
  }
  &__name {
    font-weight: 700;
  }
  &__qty {
    color: $stb-text-secondary;
    font-size: 1.1rem;
  }

  &__foot {
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }
  &__discount,
  &__total,
  &__change {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-4;
    padding: $space-3 $space-4;
    border-radius: $radius-md;

    strong {
      direction: ltr;
    }
  }
  &__discount {
    font-size: 1.3rem;
    color: $stb-success;
  }
  &__total {
    font-size: 1.6rem;
    background: $stb-surface-2;
    border: 2px solid $stb-accent;

    strong {
      font-size: 3rem;
      color: $stb-accent;
    }
  }
  &__change {
    font-size: 1.6rem;
    border: 2px solid $stb-success;

    strong {
      font-size: 2.6rem;
      color: $stb-success;
    }
  }

  &__done,
  &__idle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $space-4;
    text-align: center;

    h2 {
      margin: 0;
      font-size: 2.4rem;
    }
    > div {
      width: min(100%, 520px);
    }
  }
  &__done > svg {
    color: $stb-success;
  }
  &__idle {
    color: $stb-text-secondary;
  }
}
</style>
