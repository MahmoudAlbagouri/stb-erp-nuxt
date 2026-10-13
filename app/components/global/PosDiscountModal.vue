<!--
  PosDiscountModal — خصم على الفاتورة كلها (نسبة أو مبلغ). يُوزَّع على الأسطر
  بنسبة قيمتها، فالضريبة تُحسب بعد الخصم.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><Percent :size="20" class="doc-modal__icon" /> خصم على الفاتورة</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="apply">
            <div class="pos-toggle">
              <button
                type="button"
                :class="{ 'is-active': form.type === 'percent' }"
                @click="form.type = 'percent'"
              >
                نسبة %
              </button>
              <button
                type="button"
                :class="{ 'is-active': form.type === 'amount' }"
                @click="form.type = 'amount'"
              >
                مبلغ ({{ currencyLabel() }})
              </button>
            </div>

            <div class="form-group">
              <label>{{ form.type === "percent" ? "نسبة الخصم %" : "مبلغ الخصم" }}</label>
              <StbNumberInput
                ref="valueEl"
                v-model.number="form.value"
                class="form-input"
                min="0"
                :max="form.type === 'percent' ? 100 : undefined"
                :step="form.type === 'percent' ? 'any' : moneyStep()"
              />
              <div v-if="form.type === 'percent'" class="doc-actions">
                <button
                  v-for="p in [5, 10, 15, 20]"
                  :key="p"
                  type="button"
                  class="btn btn--sm btn--ghost"
                  @click="form.value = p"
                >
                  {{ p }}%
                </button>
              </div>
            </div>

            <p v-if="pos.discountLimit !== null" class="doc-hint">
              حدّ خصمك {{ pos.discountLimit }}% — ما زاد يحتاج موافقة مشرف عند الدفع.
            </p>

            <div class="modal__footer">
              <button
                v-if="pos.invoiceDiscount"
                type="button"
                class="btn btn--ghost"
                @click="clear"
              >
                إزالة الخصم
              </button>
              <button type="button" class="btn btn--ghost" @click="close">إلغاء</button>
              <button type="submit" class="btn btn--primary">تطبيق</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref, watch } from "vue";
import { Percent, X } from "lucide-vue-next";
import type { InvoiceDiscount } from "@/pos/types";
import { usePosStore } from "@/stores/pos";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const pos = usePosStore();
const valueEl = ref<{ $el: HTMLInputElement } | null>(null);
const form = reactive({
  type: "percent" as InvoiceDiscount["type"],
  value: "" as number | "",
});

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    form.type = pos.invoiceDiscount?.type ?? "percent";
    form.value = pos.invoiceDiscount?.value ?? "";
    await nextTick();
    valueEl.value?.$el.focus();
    valueEl.value?.$el.select?.();
  },
);

const close = () => emit("update:modelValue", false);

const clear = () => {
  pos.invoiceDiscount = null;
  close();
};

const apply = () => {
  const value = Number(form.value) || 0;
  pos.invoiceDiscount =
    value > 0
      ? { type: form.type, value: form.type === "percent" ? Math.min(value, 100) : value }
      : null;
  close();
};
</script>
