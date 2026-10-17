<!--
  PosDeliveryModal — بيع السلة "توصيل" من شاشة الكاشير: المستلم وعنوانه،
  المنطقة ورسومها، الطيار أو شركة الشحن، وطريقة الدفع (تحصيل عند الاستلام أو
  مدفوع الآن). يعمل بلا إنترنت: الفاتورة تُطبع فوراً وأوردرها يُنشأ عند رفعها.
  الإتمام نفسه (موافقة المشرف، الطباعة) في الصفحة عبر حدث submit.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal">
          <div class="modal__header">
            <h3><Truck :size="20" class="doc-modal__icon" /> بيع توصيل</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="submit">
            <div class="doc-grid">
              <div class="form-group">
                <label>اسم المستلم *</label>
                <input
                  ref="nameEl"
                  v-model.trim="form.recipientName"
                  class="form-input"
                  maxlength="150"
                  required
                />
              </div>
              <div class="form-group">
                <label>الجوال *</label>
                <input
                  v-model.trim="form.phone"
                  class="form-input"
                  dir="ltr"
                  inputmode="tel"
                  maxlength="30"
                  required
                />
              </div>
              <div class="form-group doc-grid__full">
                <label>العنوان *</label>
                <input
                  v-model.trim="form.address"
                  class="form-input"
                  maxlength="500"
                  required
                  placeholder="الحي، الشارع، رقم المبنى، علامة مميزة"
                />
              </div>
              <div class="form-group">
                <label>المنطقة</label>
                <select v-model="form.zoneId" class="form-select" @change="applyZone">
                  <option value="">بدون منطقة</option>
                  <option v-for="z in options?.zones ?? []" :key="z.id" :value="z.id">
                    {{ z.name }} — {{ formatMoney(z.fee) }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>رسوم التوصيل</label>
                <StbNumberInput
                  v-model.number="form.fee"
                  class="form-input"
                  min="0"
                  :step="moneyStep()"
                  placeholder="0"
                />
              </div>
              <div class="form-group">
                <label>الطيار / شركة الشحن</label>
                <select v-model="form.agentId" class="form-select">
                  <option value="">يُسند لاحقاً من لوحة التوصيل</option>
                  <option v-for="a in options?.agents ?? []" :key="a.id" :value="a.id">
                    {{ a.name }} ({{ a.type === "carrier" ? "شركة شحن" : "طيار" }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>الدفع *</label>
                <select v-model="form.payment" class="form-select">
                  <option value="cod">تحصيل عند الاستلام</option>
                  <option value="cash">مدفوع الآن نقداً</option>
                  <option v-if="pos.features.cardPayments" value="card">مدفوع الآن شبكة</option>
                  <option value="bank_transfer">مدفوع بتحويل</option>
                </select>
              </div>
              <div class="form-group doc-grid__full">
                <label>ملاحظة للطيار</label>
                <input v-model.trim="form.note" class="form-input" maxlength="500" />
              </div>
            </div>

            <label v-if="form.agentId" class="checkbox-label">
              <input v-model="form.dispatchNow" type="checkbox" />
              <span>خرج معه الآن (يظهر "في الطريق" مباشرة)</span>
            </label>

            <div class="doc-totals doc-totals--box">
              <div>
                <span>الأصناف</span>
                <span class="doc-money">{{ formatCurrency(itemsTotal) }}</span>
              </div>
              <div>
                <span>رسوم التوصيل</span>
                <span class="doc-money">{{ formatCurrency(Number(form.fee) || 0) }}</span>
              </div>
              <div class="is-grand">
                <span>{{ form.payment === "cod" ? "يُحصَّل من العميل" : "الإجمالي" }}</span>
                <span class="doc-money">
                  {{ formatCurrency(sumAmounts([itemsTotal, Number(form.fee) || 0])) }}
                </span>
              </div>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">إلغاء</button>
              <button
                type="submit"
                class="btn btn--primary"
                :class="{ 'btn--loading': busy }"
                :disabled="busy"
              >
                <Printer :size="16" /> إتمام وطباعة
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
import { Printer, Truck, X } from "lucide-vue-next";
import { sumAmounts } from "@/pos/calc";
import type { PosDeliveryOptions, SaleDelivery } from "@/pos/types";
import { usePosStore } from "@/stores/pos";

export type DeliveryPayment = "cod" | "cash" | "card" | "bank_transfer";

const props = defineProps<{
  modelValue: boolean;
  options: PosDeliveryOptions | null;
  /** إجمالي الأصناف بلا رسوم توصيل سابقة */
  itemsTotal: number;
  /** عميل الفاتورة: اسمه وجواله اقتراح للمستلم */
  customer?: { name: string; phone?: string | null } | null;
  busy?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: { delivery: SaleDelivery; payment: DeliveryPayment }];
}>();

const pos = usePosStore();
const nameEl = ref<HTMLInputElement | null>(null);
const emptyForm = () => ({
  recipientName: props.customer?.name ?? "",
  phone: props.customer?.phone ?? "",
  address: "",
  zoneId: "",
  fee: "" as number | "",
  agentId: "",
  dispatchNow: true,
  payment: "cod" as DeliveryPayment,
  note: "",
});
const form = reactive(emptyForm());

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    Object.assign(form, emptyForm());
    await nextTick();
    nameEl.value?.focus();
  },
);

const applyZone = () => {
  const zone = props.options?.zones.find((z) => z.id === form.zoneId);
  form.fee = zone ? zone.fee : "";
};

const close = () => emit("update:modelValue", false);

const submit = () => {
  const zone = props.options?.zones.find((z) => z.id === form.zoneId);
  const agent = props.options?.agents.find((a) => a.id === form.agentId);
  emit("submit", {
    payment: form.payment,
    delivery: {
      recipientName: form.recipientName,
      phone: form.phone,
      address: form.address,
      zoneId: zone?.id ?? null,
      zoneName: zone?.name ?? null,
      deliveryFee: Number(form.fee) || 0,
      agentId: agent?.id ?? null,
      agentName: agent?.name ?? null,
      dispatchNow: !!agent && form.dispatchNow,
      note: form.note || null,
    },
  });
};
</script>
