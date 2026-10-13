<!--
  PosCashMoveModal — إيداع نقد في الدرج أو سحبه خلال الوردية (فكّة، مصروف نثري،
  توريد للخزنة). يُحسب في "المفترض في الدرج" فلا يظهر عجزاً عند التقفيل.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><Wallet :size="20" class="doc-modal__icon" /> حركة نقدية في الدرج</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="submit">
            <div class="pos-toggle">
              <button
                type="button"
                :class="{ 'is-active': form.type === 'out' }"
                @click="form.type = 'out'"
              >
                <ArrowUpFromLine :size="16" /> سحب من الدرج
              </button>
              <button
                type="button"
                :class="{ 'is-active': form.type === 'in' }"
                @click="form.type = 'in'"
              >
                <ArrowDownToLine :size="16" /> إيداع في الدرج
              </button>
            </div>

            <div class="form-group">
              <label>المبلغ ({{ currencyLabel() }}) *</label>
              <StbNumberInput
                ref="amountEl"
                v-model.number="form.amount"
                class="form-input"
                min="0"
                :step="moneyStep()"
                required
              />
            </div>
            <div class="form-group">
              <label>السبب *</label>
              <input
                v-model.trim="form.reason"
                class="form-input"
                maxlength="300"
                required
                :placeholder="
                  form.type === 'out' ? 'مثال: مصروف نثري — مياه' : 'مثال: فكّة'
                "
              />
              <div class="doc-actions">
                <button
                  v-for="reason in quickReasons"
                  :key="reason"
                  type="button"
                  class="btn btn--sm btn--ghost"
                  @click="form.reason = reason"
                >
                  {{ reason }}
                </button>
              </div>
            </div>

            <div class="doc-totals">
              <span>المفترض في الدرج بعد الحركة</span>
              <strong class="doc-money">{{ formatCurrency(after) }}</strong>
            </div>
            <p v-if="after < 0" class="form-error">المبلغ أكبر من المفترض في الدرج</p>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">إلغاء</button>
              <button type="submit" class="btn btn--primary" :disabled="after < 0">
                تسجيل الحركة
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
import { ArrowDownToLine, ArrowUpFromLine, Wallet, X } from "lucide-vue-next";
import { sumAmounts } from "@/pos/calc";
import type { CashMove } from "@/pos/types";
import { usePosStore } from "@/stores/pos";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  /** الصفحة تطلب موافقة المشرف إن لزمت ثم تسجّل الحركة */
  submit: [move: { type: CashMove["type"]; amount: number; reason: string }];
}>();

const pos = usePosStore();
const amountEl = ref<{ $el: HTMLInputElement } | null>(null);
const form = reactive({
  type: "out" as CashMove["type"],
  amount: "" as number | "",
  reason: "",
});

const quickReasons = computed(() =>
  form.type === "out"
    ? ["مصروف نثري", "توريد للخزنة", "سداد مورد"]
    : ["فكّة", "عهدة إضافية"],
);

const after = computed(() =>
  sumAmounts([
    pos.shiftSummary.expectedCash,
    (form.type === "in" ? 1 : -1) * (Number(form.amount) || 0),
  ]),
);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    Object.assign(form, { type: "out", amount: "", reason: "" });
    await nextTick();
    amountEl.value?.$el.focus();
  },
);

const close = () => emit("update:modelValue", false);
const submit = () => {
  if (!(Number(form.amount) > 0) || after.value < 0) return;
  emit("submit", {
    type: form.type,
    amount: Number(form.amount),
    reason: form.reason,
  });
};
</script>
