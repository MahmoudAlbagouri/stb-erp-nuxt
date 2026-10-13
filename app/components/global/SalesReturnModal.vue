<!--
  مرتجع بيع (إشعار دائن) من فاتورة صادرة: يعرض أسطر الفاتورة وما بقي منها
  للإرجاع، ويرث السعر والضريبة منها. إن كان العميل دفع أكثر من صافي الفاتورة
  بعد المرتجع يُردّ له المبلغ.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal">
          <div class="modal__header">
            <h3>
              <RotateCcw :size="20" class="doc-modal__icon" />
              مرتجع بيع
              <template v-if="invoice">من الفاتورة {{ invoice.number }}</template>
            </h3>
            <button
              class="btn btn--icon btn--ghost"
              aria-label="إغلاق"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <div v-if="!invoice" class="empty-state">
            <div class="spinner spinner--lg" />
          </div>

          <form v-else class="doc-form" @submit.prevent="submit">
            <div class="doc-grid">
              <div class="doc-cell">
                <span class="doc-cell__sub">العميل</span>
                <span class="doc-cell__main">
                  {{ customerLabel(invoice.customer) }}
                </span>
              </div>
              <div class="doc-cell">
                <span class="doc-cell__sub">تعود إلى مخزن</span>
                <span class="doc-cell__main">{{ invoice.warehouse?.name }}</span>
              </div>
              <div class="form-group">
                <label>تاريخ المرتجع *</label>
                <StbDateInput
                  v-model="form.returnDate"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label>سبب الإرجاع</label>
                <input
                  v-model.trim="form.reason"
                  class="form-input"
                  maxlength="500"
                  placeholder="غير مطابق، تالف، رغبة العميل..."
                />
              </div>
            </div>

            <div class="doc-lines" :style="{ '--doc-cols': COLS }">
              <div class="doc-lines__head">
                <span>الصنف</span>
                <span>المتاح للإرجاع</span>
                <span>الكمية المُرجعة</span>
                <span>القيمة</span>
              </div>
              <div v-if="!lines.length" class="doc-lines__empty">
                أُرجعت كل أصناف هذه الفاتورة بالفعل
              </div>
              <div v-for="line in lines" :key="line.id" class="doc-lines__row">
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ line.name }}</span>
                  <span class="doc-cell__sub">{{ line.unit }}</span>
                </div>
                <div>
                  <span class="doc-lines__label">المتاح للإرجاع</span>
                  <span class="doc-num doc-num--strong">
                    {{ formatNumber(line.available) }}
                  </span>
                </div>
                <div>
                  <span class="doc-lines__label">الكمية المُرجعة</span>
                  <StbNumberInput
                    v-model.number="line.quantity"
                    class="form-input"
                    min="0"
                    :max="line.available"
                    step="any"
                    placeholder="0"
                  />
                </div>
                <div>
                  <span class="doc-lines__label">القيمة</span>
                  <span class="doc-money">{{ formatCurrency(valueOf(line)) }}</span>
                </div>
              </div>
            </div>

            <div class="doc-totals">
              <span>إجمالي المرتجع (شامل الضريبة)</span>
              <strong class="doc-money">{{ formatCurrency(total) }}</strong>
            </div>

            <!-- ردّ المبلغ: يظهر فقط إذا كان المدفوع يزيد عن صافي الفاتورة بعد المرتجع -->
            <section v-if="refundable > 0" class="doc-section">
              <h4 class="doc-section__title">ردّ المبلغ للعميل</h4>
              <div class="doc-grid">
                <div class="form-group">
                  <label>المبلغ المردود ({{ currencyLabel() }})</label>
                  <StbNumberInput
                    v-model.number="form.refundAmount"
                    class="form-input"
                    min="0"
                    :max="refundable"
                    :step="moneyStep()"
                    :disabled="!invoice.customerId"
                  />
                  <small class="doc-hint">
                    <template v-if="invoice.customerId">
                      حتى {{ formatCurrency(refundable) }} — ما لا يُردّ يبقى
                      رصيداً للعميل
                    </template>
                    <template v-else>
                      بيع نقدي بلا عميل: يُردّ المبلغ كاملاً
                    </template>
                  </small>
                </div>
                <div class="form-group">
                  <label>طريقة الردّ</label>
                  <select v-model="form.refundMethod" class="form-select">
                    <option
                      v-for="(label, method) in SALES_PAYMENT_METHOD_LABELS"
                      :key="method"
                      :value="method"
                    >
                      {{ label }}
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <div class="doc-note">
              <Info :size="16" />
              <span>
                إصدار المرتجع يعيد البضاعة للمخزن ويخصم قيمته مما على العميل،
                ولا يمكن تعديله بعد الإصدار.
              </span>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">
                إلغاء
              </button>
              <button
                type="submit"
                class="btn btn--primary"
                :class="{ 'btn--loading': submitting }"
                :disabled="submitting || total <= 0"
              >
                <CheckCheck :size="16" /> إصدار المرتجع
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { CheckCheck, Info, RotateCcw, X } from "lucide-vue-next";
import { useSalesStore } from "@/stores/sales";
import { useToast } from "@/composables/useToast";
import type { SalesInvoice, SalesPaymentMethod } from "@/types/sales";

const props = defineProps<{
  modelValue: boolean;
  invoiceId: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const store = useSalesStore();
const toast = useToast();

const COLS = "2fr 0.9fr 1fr 0.9fr";

interface ReturnLine {
  id: string;
  name: string;
  unit: string;
  available: number;
  /** قيمة الوحدة الواحدة شاملة الضريبة (من سطر الفاتورة) */
  unitTotal: number;
  quantity: number | "";
}

const invoice = ref<SalesInvoice | null>(null);
const lines = ref<ReturnLine[]>([]);
const submitting = ref(false);
const form = reactive({
  returnDate: "",
  reason: "",
  refundAmount: "" as number | "",
  refundMethod: "cash" as SalesPaymentMethod,
});

const valueOf = (line: ReturnLine) =>
  (Number(line.quantity) || 0) * line.unitTotal;

const total = computed(() => sumMoney(lines.value.map(valueOf)));

/** المدفوع الزائد عن صافي الفاتورة بعد هذا المرتجع = أقصى ما يُردّ */
const refundable = computed(() => {
  if (!invoice.value) return 0;
  const net = invoice.value.total - invoice.value.returnedAmount - total.value;
  return Math.max(sumMoney([invoice.value.paidAmount, -net]), 0);
});

// الافتراضي ردّ كل المتاح (وهو إلزامي للبيع النقدي بلا عميل)
watch(refundable, (value) => {
  form.refundAmount = value > 0 ? value : "";
});

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.invoiceId) return;
    invoice.value = null;
    lines.value = [];
    Object.assign(form, {
      returnDate: todayStamp(),
      reason: "",
      refundAmount: "",
      refundMethod: "cash",
    });
    try {
      const full = await store.getInvoice(props.invoiceId);
      lines.value = (full.lines ?? [])
        .map((line) => ({
          id: line.id,
          name: line.productName,
          unit: line.unitName,
          available: line.quantity - line.returnedQuantity,
          unitTotal: line.total / line.quantity,
          quantity: "" as number | "",
        }))
        .filter((line) => line.available > 0);
      invoice.value = full;
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر تحميل الفاتورة"));
      emit("update:modelValue", false);
    }
  },
);

const close = () => {
  if (!submitting.value) emit("update:modelValue", false);
};

const submit = async () => {
  if (!invoice.value) return;
  submitting.value = true;
  let draftId = "";
  try {
    const draft = await store.createReturn({
      invoiceId: invoice.value.id,
      returnDate: form.returnDate,
      reason: form.reason || undefined,
      lines: lines.value
        .filter((l) => Number(l.quantity) > 0)
        .map((l) => ({ invoiceLineId: l.id, quantity: Number(l.quantity) })),
    });
    draftId = draft.id;

    const refund = Number(form.refundAmount) || 0;
    const issued = await store.issueReturn(
      draft.id,
      refund > 0 ? { method: form.refundMethod, amount: refund } : undefined,
    );
    toast.success(`تم إصدار المرتجع ${issued.number}`);
    emit("update:modelValue", false);
    emit("saved");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إصدار المرتجع"));
    // فشل الإصدار بعد حفظ المسودة: نلغيها حتى لا تبقى مسودة يتيمة
    if (draftId) store.cancelReturn(draftId).catch(() => {});
  } finally {
    submitting.value = false;
  }
};
</script>
