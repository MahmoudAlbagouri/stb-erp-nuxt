<!--
  قبض من عميل: على فاتورة محددة (invoice) أو دفعة على الحساب (customer أو
  اختيار العميل من القائمة). يُستخدم في صفحات الفواتير والعملاء والمقبوضات.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3>
              <CircleDollarSign :size="20" class="doc-modal__icon" />
              {{ invoice ? `قبض الفاتورة ${invoice.number}` : "قبض من عميل" }}
            </h3>
            <button
              class="btn btn--icon btn--ghost"
              aria-label="إغلاق"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="submit">
            <div class="doc-grid">
              <!-- المحدد سلفاً (فاتورة أو عميل) يُعرض نصاً، وإلا قائمة اختيار -->
              <div v-if="fixedName !== null" class="doc-cell doc-grid__full">
                <span class="doc-cell__sub">العميل</span>
                <span class="doc-cell__main">{{ fixedName }}</span>
              </div>
              <div v-else class="form-group doc-grid__full">
                <label>العميل *</label>
                <select v-model="form.customerId" class="form-select" required>
                  <option value="" disabled>اختر العميل...</option>
                  <option
                    v-for="c in store.customerOptions"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.name }}
                  </option>
                </select>
              </div>
              <small class="doc-hint doc-grid__full">
                <template v-if="invoice">
                  المتبقي على الفاتورة:
                  <strong>{{ formatCurrency(invoice.remaining) }}</strong>
                </template>
                <template v-else-if="customerBalance !== null">
                  ما على العميل:
                  <strong>{{ formatCurrency(customerBalance) }}</strong>
                  — دفعة على الحساب غير مرتبطة بفاتورة
                </template>
              </small>

              <div class="form-group">
                <label>المبلغ ({{ currencyLabel() }}) *</label>
                <StbNumberInput
                  v-model.number="form.amount"
                  class="form-input"
                  min="0.01"
                  :max="invoice ? invoice.remaining : undefined"
                  :step="moneyStep()"
                  required
                />
              </div>
              <div class="form-group">
                <label>التاريخ *</label>
                <StbDateInput
                  v-model="form.paymentDate"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label>طريقة الدفع</label>
                <select v-model="form.method" class="form-select">
                  <option
                    v-for="(label, method) in PUBLIC_SALES_PAYMENT_METHOD_LABELS"
                    :key="method"
                    :value="method"
                  >
                    {{ label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>رقم المرجع</label>
                <input
                  v-model.trim="form.reference"
                  class="form-input"
                  dir="ltr"
                  maxlength="80"
                  placeholder="رقم العملية / الحوالة"
                />
              </div>
              <div class="form-group doc-grid__full">
                <label>ملاحظة</label>
                <input v-model.trim="form.note" class="form-input" maxlength="500" />
              </div>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">
                إلغاء
              </button>
              <button
                type="submit"
                class="btn btn--primary"
                :class="{ 'btn--loading': submitting }"
                :disabled="submitting"
              >
                تسجيل القبض
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
import { CircleDollarSign, X } from "lucide-vue-next";
import { useSalesStore } from "@/stores/sales";
import { useToast } from "@/composables/useToast";
import type {
  Customer,
  SalesInvoice,
  SalesPaymentMethod,
} from "@/types/sales";

const props = defineProps<{
  modelValue: boolean;
  /** قبض على هذه الفاتورة */
  invoice?: SalesInvoice | null;
  /** دفعة على حساب هذا العميل */
  customer?: Customer | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const store = useSalesStore();
const toast = useToast();

const submitting = ref(false);
const form = reactive({
  customerId: "",
  amount: "" as number | "",
  paymentDate: "",
  method: "cash" as SalesPaymentMethod,
  reference: "",
  note: "",
});

/** اسم العميل المحدد سلفاً، أو null إذا كان على المستخدم اختياره */
const fixedName = computed(() => {
  if (props.invoice) return customerLabel(props.invoice.customer);
  return props.customer?.name ?? null;
});

const customerBalance = computed(() => {
  if (props.customer) return props.customer.balance ?? null;
  return (
    store.customerOptions.find((c) => c.id === form.customerId)?.balance ?? null
  );
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    Object.assign(form, {
      customerId: props.customer?.id ?? "",
      // الافتراضي: قبض كامل المتبقي على الفاتورة
      amount: props.invoice ? props.invoice.remaining : "",
      paymentDate: companyToday(),
      method: "cash",
      reference: "",
      note: "",
    });
    if (fixedName.value === null) {
      store.fetchCustomerOptions(true).catch(() => {});
    }
  },
);

const close = () => {
  if (!submitting.value) emit("update:modelValue", false);
};

const submit = async () => {
  submitting.value = true;
  try {
    const payment = await store.createPayment({
      // مع الفاتورة يأخذ السيرفر العميل منها
      customerId: props.invoice ? undefined : form.customerId,
      invoiceId: props.invoice?.id,
      paymentDate: form.paymentDate,
      amount: Number(form.amount),
      method: form.method,
      reference: form.reference || undefined,
      note: form.note || undefined,
    });
    toast.success(`تم تسجيل سند القبض ${payment.number}`);
    emit("update:modelValue", false);
    emit("saved");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تسجيل القبض"));
  } finally {
    submitting.value = false;
  }
};
</script>
