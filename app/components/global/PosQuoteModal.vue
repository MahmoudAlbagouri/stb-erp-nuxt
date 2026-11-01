<!--
  PosQuoteModal — حفظ عرض السعر: لمن، وحتى متى، وملاحظة. يُحفظ على الجهاز
  ويُطبع فوراً (حتى بلا إنترنت)، ويُرفع للسيرفر مع الطابور.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><FileText :size="20" class="doc-modal__icon" /> حفظ عرض السعر</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="submit('thermal')">
            <div class="form-group">
              <label>اسم العميل</label>
              <input
                ref="nameEl"
                v-model.trim="form.customerName"
                class="form-input"
                maxlength="200"
                placeholder="يُطبع على العرض — اتركه فارغاً لعميل نقدي"
              />
            </div>
            <div class="form-group">
              <label>الجوال</label>
              <StbPhoneInput v-model="form.customerPhone" />
            </div>
            <div class="form-group">
              <label>صالح لمدة (أيام) *</label>
              <StbNumberInput
                v-model.number="form.validityDays"
                class="form-input"
                min="1"
                max="365"
                step="1"
                required
              />
            </div>
            <div class="form-group">
              <label>ملاحظة</label>
              <textarea
                v-model.trim="form.note"
                class="form-input"
                rows="2"
                maxlength="500"
                placeholder="تُطبع على العرض: مدة التوريد، شروط الدفع…"
              />
            </div>

            <div class="doc-totals doc-totals--box">
              <div class="is-grand">
                <span>إجمالي العرض</span>
                <span class="doc-money">{{ formatCurrency(total) }}</span>
              </div>
            </div>
            <p v-if="shortCount" class="doc-hint">
              {{ formatNumber(shortCount) }} صنف أكثر من المتاح في المخزن — لا يظهر هذا
              للعميل، ولا يُحجز شيء.
            </p>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">إلغاء</button>
              <button
                type="button"
                class="btn btn--ghost"
                :disabled="busy"
                @click="submit('a4')"
              >
                حفظ وطباعة A4
              </button>
              <button
                type="submit"
                class="btn btn--primary"
                :class="{ 'btn--loading': busy }"
                :disabled="busy"
              >
                حفظ وطباعة إيصال
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref, watch } from "vue";
import { FileText, X } from "lucide-vue-next";
import type { QuoteDetails } from "@/pos/store/quotes";
import type { PosCustomer } from "@/pos/types";

const props = defineProps<{
  modelValue: boolean;
  /** العميل المختار في السلة: يملأ الاسم والجوال */
  customer: PosCustomer | null;
  total: number;
  defaultDays: number;
  /** كم صنفاً أكثر من المتاح (للكاشير فقط) */
  shortCount: number;
  busy: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: { details: QuoteDetails; size: "a4" | "thermal" }];
}>();

const nameEl = ref<HTMLInputElement | null>(null);
const form = reactive({
  customerName: "",
  customerPhone: "",
  validityDays: 7 as number | "",
  note: "",
});

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    Object.assign(form, {
      customerName: props.customer?.name ?? "",
      customerPhone: props.customer?.phone ?? "",
      validityDays: props.defaultDays,
      note: "",
    });
    await nextTick();
    nameEl.value?.focus();
  },
);

const close = () => emit("update:modelValue", false);

const submit = (size: "a4" | "thermal") =>
  emit("submit", {
    details: { ...form, validityDays: Number(form.validityDays) || 0 },
    size,
  });
</script>
