<!--
  PosReturnModal — مرتجع من شاشة الكاشير.
  خطوتان: إيجاد الفاتورة برقمها (أو من مبيعات الوردية)، ثم اختيار ما يُرجَع
  وطريقة ردّ المبلغ. يُسجَّل على الجهاز أولاً ثم يُرفع — كعملية البيع تماماً.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal pos-return">
          <div class="modal__header">
            <h3><Undo2 :size="20" class="doc-modal__icon" /> مرتجع</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <!-- ══ 1) إيجاد الفاتورة ══ -->
          <form v-if="!invoice" class="doc-form" @submit.prevent="find(number)">
            <div class="form-group">
              <label>رقم الفاتورة (من إيصال العميل)</label>
              <div class="pos-return__find">
                <input
                  ref="numberEl"
                  v-model.trim="number"
                  class="form-input"
                  placeholder="مثال: POS1-000123"
                  autocomplete="off"
                  dir="ltr"
                />
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': finding }"
                  :disabled="finding || !number"
                >
                  <Search :size="16" /> بحث
                </button>
              </div>
            </div>
            <p v-if="findError" class="form-error">{{ findError }}</p>

            <template v-if="recent.length">
              <p class="doc-hint">أو اختر من آخر مبيعات هذه الشاشة:</p>
              <div class="doc-lines" :style="{ '--doc-cols': '1.2fr 1fr 1fr' }">
                <button
                  v-for="sale in recent"
                  :key="sale.uuid"
                  type="button"
                  class="doc-lines__row pos-return__pick"
                  :disabled="finding"
                  @click="find(sale.number)"
                >
                  <span><code class="doc-code">{{ sale.number }}</code></span>
                  <span class="doc-num">{{ formatDateTime(sale.issuedAt) }}</span>
                  <span class="doc-money doc-money--strong">
                    {{ formatCurrency(sale.total) }}
                  </span>
                </button>
              </div>
            </template>
          </form>

          <!-- ══ 2) ما يُرجَع ══ -->
          <form v-else class="doc-form" @submit.prevent="submit">
            <div class="doc-totals doc-totals--box">
              <div>
                <span>الفاتورة</span>
                <code class="doc-code">{{ invoice.number }}</code>
              </div>
              <div v-if="invoice.issuedAt">
                <span>التاريخ</span>
                <span class="doc-num">{{ formatDateTime(invoice.issuedAt) }}</span>
              </div>
              <div v-if="invoice.customerName">
                <span>العميل</span>
                <span>{{ invoice.customerName }}</span>
              </div>
              <div>
                <span>الإجمالي</span>
                <span class="doc-money">{{ formatCurrency(invoice.total) }}</span>
              </div>
            </div>
            <p v-if="invoice.local" class="doc-hint">
              من نسخة هذه الشاشة (السيرفر غير متاح أو لم تُرفع الفاتورة بعد).
            </p>

            <div class="doc-lines" :style="{ '--doc-cols': '2fr 0.8fr 1.2fr 1fr' }">
              <div class="doc-lines__head">
                <span>الصنف</span>
                <span>المتاح</span>
                <span>كمية المرتجع</span>
                <span>القيمة</span>
              </div>
              <div
                v-for="line in invoice.lines"
                :key="line.lineIndex"
                class="doc-lines__row"
              >
                <span class="doc-cell">
                  <span class="doc-cell__main">{{ line.productName }}</span>
                  <span class="doc-cell__sub">
                    {{ line.unitName }} · بيع {{ formatNumber(line.quantity) }}
                    <template v-if="line.returnedQuantity">
                      · أُرجع {{ formatNumber(line.returnedQuantity) }}
                    </template>
                  </span>
                </span>
                <span class="doc-num">{{ formatNumber(remaining(line)) }}</span>
                <span class="pos-return__qty">
                  <StbNumberInput
                    v-model.number="quantities[line.lineIndex]"
                    class="form-input"
                    min="0"
                    :max="remaining(line)"
                    step="any"
                    placeholder="0"
                    :disabled="remaining(line) <= 0"
                  />
                  <button
                    type="button"
                    class="btn btn--sm btn--ghost"
                    :disabled="remaining(line) <= 0"
                    @click="quantities[line.lineIndex] = remaining(line)"
                  >
                    الكل
                  </button>
                </span>
                <span class="doc-money">
                  {{ formatCurrency(valueOf(line)) }}
                </span>
              </div>
            </div>
            <p v-if="!returnable" class="form-error">
              لم يبقَ في هذه الفاتورة ما يُرجَع.
            </p>

            <div class="doc-grid">
              <div class="form-group">
                <label>طريقة ردّ المبلغ</label>
                <select v-model="method" class="form-select">
                  <option value="cash">نقداً من الدرج</option>
                  <option value="card">شبكة / بطاقة</option>
                </select>
              </div>
              <div class="form-group">
                <label>سبب المرتجع</label>
                <input
                  v-model.trim="reason"
                  class="form-input"
                  maxlength="500"
                  placeholder="اختياري"
                />
              </div>
            </div>

            <div class="doc-totals">
              <span>قيمة المرتجع</span>
              <strong class="doc-money">{{ formatCurrency(preview.total) }}</strong>
            </div>
            <div class="doc-totals pos-return__refund">
              <span>يُردّ للعميل</span>
              <strong class="doc-money">{{ formatCurrency(preview.refund) }}</strong>
            </div>
            <p v-if="preview.total > 0 && preview.refund < preview.total" class="doc-hint">
              الباقي يُخصم مما على العميل (الفاتورة لم تُدفع كاملة).
            </p>
            <p v-if="quantityError" class="form-error">{{ quantityError }}</p>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="back">
                فاتورة أخرى
              </button>
              <button
                type="submit"
                class="btn btn--primary"
                :class="{ 'btn--loading': saving }"
                :disabled="saving || preview.total <= 0 || !!quantityError"
              >
                تأكيد المرتجع
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
import { Search, Undo2, X } from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import { returnShare } from "@/pos/calc";
import type { LocalReturn, ReturnableInvoice, ReturnableLine } from "@/pos/types";
import { usePosStore } from "@/stores/pos";
import type { SalesPaymentMethod } from "@/types/sales";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  done: [salesReturn: LocalReturn];
}>();

const pos = usePosStore();
const toast = useToast();

/** كم فاتورة من مبيعات الشاشة تُعرض للاختيار السريع */
const RECENT_COUNT = 6;

const numberEl = ref<HTMLInputElement | null>(null);
const number = ref("");
const finding = ref(false);
const findError = ref("");
const invoice = ref<ReturnableInvoice | null>(null);

const quantities = reactive<Record<number, number | "">>({});
const method = ref<SalesPaymentMethod>("cash");
const reason = ref("");
const saving = ref(false);

const recent = computed(() => pos.sales.slice(-RECENT_COUNT).reverse());

const reset = () => {
  number.value = "";
  findError.value = "";
  invoice.value = null;
  Object.keys(quantities).forEach((key) => delete quantities[Number(key)]);
  method.value = "cash";
  reason.value = "";
};

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    reset();
    await nextTick();
    numberEl.value?.focus();
  },
);

const close = () => emit("update:modelValue", false);

const back = async () => {
  reset();
  await nextTick();
  numberEl.value?.focus();
};

const find = async (target: string) => {
  if (!target || finding.value) return;
  finding.value = true;
  findError.value = "";
  try {
    invoice.value = await pos.lookupInvoice(target);
  } catch (e) {
    findError.value = getErrorMessage(e, "تعذر إيجاد الفاتورة");
  } finally {
    finding.value = false;
  }
};

const remaining = (line: ReturnableLine) =>
  Math.max(Math.round((line.quantity - line.returnedQuantity) * 10000) / 10000, 0);

const returnable = computed(
  () => !!invoice.value && invoice.value.lines.some((line) => remaining(line) > 0),
);

const valueOf = (line: ReturnableLine) => {
  const quantity = Number(quantities[line.lineIndex]) || 0;
  return quantity > 0 ? returnShare(line, quantity).total : 0;
};

const numericQuantities = computed(() =>
  Object.fromEntries(
    Object.entries(quantities).map(([index, value]) => [index, Number(value) || 0]),
  ),
);

const preview = computed(() =>
  invoice.value
    ? pos.refundPreview(invoice.value, numericQuantities.value)
    : { lines: [], total: 0, refund: 0 },
);

const quantityError = computed(() => {
  const over = invoice.value?.lines.find(
    (line) => (Number(quantities[line.lineIndex]) || 0) > remaining(line),
  );
  return over ? `كمية "${over.productName}" أكبر من المتاح للإرجاع` : "";
});

const submit = async () => {
  if (!invoice.value || saving.value || quantityError.value) return;
  saving.value = true;
  try {
    const salesReturn = await pos.refund(
      invoice.value,
      numericQuantities.value,
      method.value,
      reason.value,
    );
    emit("done", salesReturn);
    close();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تسجيل المرتجع"));
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
.pos-return__find {
  display: flex;
  gap: $space-2;

  .form-input {
    flex: 1;
    min-width: 0;
  }
}

.pos-return__pick {
  width: 100%;
  text-align: start;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba($stb-primary, 0.08);
  }
}

.pos-return__qty {
  display: flex;
  align-items: center;
  gap: $space-1;

  .form-input {
    min-width: 0;
    width: 100%;
  }
}

.pos-return__refund strong {
  font-size: 1.25rem;
  color: $stb-primary;
}
</style>
