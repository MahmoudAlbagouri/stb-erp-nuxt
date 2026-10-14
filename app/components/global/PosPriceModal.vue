<!--
  PosPriceModal — سعر صنف في هذه الفاتورة وحدها (سعر الصنف نفسه لا يتغيّر).
  وضعان: صنف بسعر مفتوح (يُكتب سعره)، أو تغيير سعر صنف عن سعر قائمته — والتخفيض
  يحتاج سبباً. الصلاحية وموافقة المشرف على الشاشة الأم (@submit).
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="line" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3>
              <Tag :size="20" class="doc-modal__icon" />
              {{ open ? "سعر الصنف" : "تغيير السعر لهذه الفاتورة" }}
            </h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="submit">
            <p class="pos-note">
              {{ line.product.name }} — {{ line.unitName }}
              <template v-if="!open">
                · سعر القائمة {{ formatCurrency(listPrice) }}
              </template>
            </p>

            <div class="form-group">
              <label>{{ open ? "السعر (شامل الضريبة)" : "السعر الجديد (شامل الضريبة)" }}</label>
              <StbNumberInput
                ref="priceEl"
                v-model.number="form.price"
                class="form-input"
                min="0"
                :step="moneyStep()"
                :placeholder="listPrice > 0 ? String(listPrice) : ''"
              />
              <p v-if="change" class="doc-hint" :class="change.tone">
                {{ change.label }}
              </p>
            </div>

            <!-- السبب: إلزامي في التخفيض، اختياري في الرفع -->
            <div v-if="!open && change" class="form-group">
              <label>
                السبب
                <span v-if="lowering" class="text-danger">*</span>
                <span v-else class="doc-hint">(اختياري)</span>
              </label>
              <div class="doc-actions">
                <button
                  v-for="reason in reasons"
                  :key="reason"
                  type="button"
                  class="btn btn--sm"
                  :class="form.reason === reason ? 'btn--primary' : 'btn--ghost'"
                  @click="form.reason = reason"
                >
                  {{ reason }}
                </button>
              </div>
              <input
                v-if="form.reason === OTHER"
                v-model="form.other"
                class="form-input"
                maxlength="150"
                placeholder="اكتب السبب"
              />
            </div>

            <p v-if="!open && pos.discountLimit !== null && lowering" class="doc-hint">
              التخفيض يُحسب من حدّ خصمك ({{ pos.discountLimit }}%) — ما زاد عنه، أو
              نزل تحت أقل سعر للصنف، يحتاج موافقة مشرف عند الدفع.
            </p>
            <p v-if="!open && approvalNeeded && change" class="doc-hint">
              تغيير السعر يحتاج موافقة مشرف.
            </p>

            <div class="modal__footer">
              <button
                v-if="!open && repriced"
                type="button"
                class="btn btn--ghost"
                @click="emit('submit', { price: listPrice, reason: null })"
              >
                إرجاع سعر القائمة
              </button>
              <button type="button" class="btn btn--ghost" @click="close">إلغاء</button>
              <button type="submit" class="btn btn--primary" :disabled="!canSubmit">
                تطبيق
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { Tag, X } from "lucide-vue-next";
import { roundAmount, sumAmounts } from "@/pos/calc";
import { isRepriced } from "@/pos/promotions";
import { PRICE_REASONS, type CartLine } from "@/pos/types";
import { usePosStore } from "@/stores/pos";

const props = defineProps<{ line: CartLine | null }>();
const emit = defineEmits<{
  close: [];
  submit: [value: { price: number; reason: string | null }];
}>();

const OTHER = "أخرى";
const reasons = [...PRICE_REASONS, OTHER];

const pos = usePosStore();
const priceEl = ref<{ $el: HTMLInputElement } | null>(null);
const form = reactive({ price: "" as number | "", reason: "", other: "" });

const open = computed(() => !!props.line?.product.openPrice);
const repriced = computed(() => !!props.line && isRepriced(props.line));
const listPrice = computed(() => (props.line ? pos.listPriceOf(props.line) : 0));
const approvalNeeded = computed(() => pos.needsPriceApproval());

const price = computed(() => roundAmount(Number(form.price) || 0));
const lowering = computed(() => !open.value && price.value > 0 && price.value < listPrice.value);

/** الفرق عن سعر القائمة كما يراه الكاشير */
const change = computed(() => {
  if (open.value || !(price.value > 0) || price.value === listPrice.value) return null;
  const diff = sumAmounts([price.value, -listPrice.value]);
  const percent = listPrice.value > 0 ? Math.abs(diff / listPrice.value) * 100 : 0;
  return diff < 0
    ? {
        tone: "text-danger",
        label: `تخفيض ${formatMoney(-diff)} للوحدة (${percent.toFixed(1)}%)`,
      }
    : {
        tone: "text-success",
        label: `رفع ${formatMoney(diff)} للوحدة (${percent.toFixed(1)}%)`,
      };
});

const reason = computed(() =>
  form.reason === OTHER ? form.other.trim() : form.reason,
);

const canSubmit = computed(
  () => price.value > 0 && (!lowering.value || !!reason.value),
);

watch(
  () => props.line,
  async (line) => {
    if (!line) return;
    // سعر مفتوح لم يُكتب: الخانة فارغة والاقتراح فيها كنص إرشادي
    form.price = line.pricePending ? "" : line.unitPrice;
    form.reason = "";
    form.other = "";
    const saved = line.priceReason ?? "";
    if (saved) {
      if ((PRICE_REASONS as readonly string[]).includes(saved)) form.reason = saved;
      else {
        form.reason = OTHER;
        form.other = saved;
      }
    }
    await nextTick();
    priceEl.value?.$el.focus();
    priceEl.value?.$el.select?.();
  },
);

const close = () => emit("close");

const submit = () => {
  if (!canSubmit.value) return;
  emit("submit", { price: price.value, reason: reason.value || null });
};
</script>
