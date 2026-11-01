<!--
  PosQuotesModal — عروض الأسعار على الشاشة: البحث برقم العرض المطبوع (أي عرض
  للشركة مع الاتصال)، إعادة الطباعة، والتحويل لفاتورة حين يعود العميل.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal">
          <div class="modal__header">
            <h3><FileText :size="20" class="doc-modal__icon" /> عروض الأسعار</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="doc-form">
            <form class="pos-quotes__search" @submit.prevent="search">
              <input
                ref="numberEl"
                v-model.trim="number"
                class="form-input"
                dir="ltr"
                placeholder="QT-POS1-000001"
                aria-label="رقم عرض السعر"
              />
              <button
                type="submit"
                class="btn btn--primary"
                :class="{ 'btn--loading': searching }"
                :disabled="searching || !number"
              >
                <Search :size="15" /> بحث
              </button>
            </form>
            <p v-if="searchError" class="form-error">{{ searchError }}</p>

            <div class="pos-rows">
              <p v-if="!rows.length" class="pos-rows__empty">
                لا توجد عروض أسعار على هذه الشاشة
              </p>
              <div v-for="q in rows" :key="q.uuid" class="pos-rows__row">
                <div class="doc-cell pos-rows__main">
                  <span class="doc-cell__main">
                    <code class="doc-code">{{ q.number }}</code>
                    {{ q.customerName || "عميل نقدي" }}
                  </span>
                  <span class="doc-cell__sub">
                    {{ formatDateTime(q.issuedAt) }} · صالح حتى
                    {{ formatDate(q.validUntil) }}
                  </span>
                </div>
                <span :class="['badge', `doc-status--${statusOf(q).tone}`]">
                  {{ statusOf(q).label }}
                </span>
                <strong class="doc-money">{{ formatCurrency(q.total) }}</strong>
                <button
                  class="btn btn--sm btn--ghost btn--icon"
                  title="طباعة إيصال"
                  @click="emit('print', q, 'thermal')"
                >
                  <Printer :size="14" />
                </button>
                <button
                  class="btn btn--sm btn--ghost"
                  title="طباعة A4"
                  @click="emit('print', q, 'a4')"
                >
                  A4
                </button>
                <button
                  v-if="q.status === 'open'"
                  class="btn btn--sm btn--primary"
                  @click="emit('convert', q)"
                >
                  تحويل لفاتورة
                </button>
              </div>
            </div>
            <p class="doc-hint">
              العرض الساري يبقى بسعره. بعد انتهائه يتحول بالأسعار الحالية، والمخزون
              يُفحص عند الدفع كأي بيع.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { FileText, Printer, Search, X } from "lucide-vue-next";
import type { LocalQuote } from "@/pos/types";
import { usePosStore } from "@/stores/pos";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  print: [quote: LocalQuote, size: "a4" | "thermal"];
  convert: [quote: LocalQuote];
}>();

const pos = usePosStore();
const numberEl = ref<HTMLInputElement | null>(null);
const number = ref("");
const searching = ref(false);
const searchError = ref("");
/** عرض وُجد بالبحث: قد يكون من شاشة أخرى */
const found = ref<LocalQuote | null>(null);

const rows = computed(() =>
  found.value
    ? [found.value, ...pos.quotes.filter((q) => q.uuid !== found.value!.uuid)]
    : pos.quotes,
);

const statusOf = (quote: LocalQuote) =>
  SALES_QUOTE_STATUS[pos.quoteExpired(quote) ? "expired" : quote.status];

const close = () => emit("update:modelValue", false);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    number.value = "";
    searchError.value = "";
    found.value = null;
    await nextTick();
    numberEl.value?.focus();
  },
);

const search = async () => {
  searching.value = true;
  searchError.value = "";
  try {
    found.value = await pos.lookupQuote(number.value);
  } catch (e) {
    found.value = null;
    searchError.value = getErrorMessage(e, "تعذر البحث عن العرض");
  } finally {
    searching.value = false;
  }
};
</script>

<style lang="scss" scoped>
.pos-quotes__search {
  display: flex;
  gap: $space-2;

  .form-input {
    flex: 1;
    min-width: 0;
  }
}
</style>
