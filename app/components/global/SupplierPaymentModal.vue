<!--
  سداد لمورد: على فاتورة محددة (invoice) أو دفعة على الحساب (supplier أو اختيار
  المورد من القائمة). يُستخدم في صفحات الفواتير والموردين والسداد.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3>
              <Wallet :size="20" class="doc-modal__icon" />
              {{ invoice ? `سداد الفاتورة ${invoice.number}` : "سداد لمورد" }}
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
              <div class="form-group doc-grid__full">
                <label>المورد *</label>
                <select
                  v-model="form.supplierId"
                  class="form-select"
                  required
                  :disabled="!!fixedSupplier"
                >
                  <option value="" disabled>اختر المورد...</option>
                  <option v-if="fixedSupplier" :value="fixedSupplier.id">
                    {{ fixedSupplier.name }}
                  </option>
                  <template v-else>
                    <option
                      v-for="s in store.supplierOptions"
                      :key="s.id"
                      :value="s.id"
                    >
                      {{ s.name }}
                    </option>
                  </template>
                </select>
                <small class="doc-hint">
                  <template v-if="invoice">
                    المتبقي على الفاتورة:
                    <strong>{{ formatCurrency(invoice.remaining) }}</strong>
                  </template>
                  <template v-else-if="supplierBalance !== null">
                    المستحق للمورد:
                    <strong>{{ formatCurrency(supplierBalance) }}</strong>
                    — دفعة على الحساب غير مرتبطة بفاتورة
                  </template>
                </small>
              </div>
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
                    v-for="(label, method) in PAYMENT_METHOD_LABELS"
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
                  placeholder="رقم الحوالة / الشيك"
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
                تسجيل السداد
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
import { Wallet, X } from "lucide-vue-next";
import { usePurchasingStore } from "@/stores/purchasing";
import { useToast } from "@/composables/useToast";
import type {
  PaymentMethod,
  PurchaseInvoice,
  Supplier,
} from "@/types/purchasing";

const props = defineProps<{
  modelValue: boolean;
  /** سداد على هذه الفاتورة */
  invoice?: PurchaseInvoice | null;
  /** دفعة على حساب هذا المورد */
  supplier?: Supplier | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const store = usePurchasingStore();
const toast = useToast();

const submitting = ref(false);
const form = reactive({
  supplierId: "",
  amount: "" as number | "",
  paymentDate: "",
  method: "cash" as PaymentMethod,
  reference: "",
  note: "",
});

/** المورد محدد سلفاً (من الفاتورة أو من صفحة الموردين) فلا يُغيَّر */
const fixedSupplier = computed(() =>
  props.invoice
    ? {
        id: props.invoice.supplierId,
        name: props.invoice.supplier?.name ?? "",
      }
    : props.supplier
      ? { id: props.supplier.id, name: props.supplier.name }
      : null,
);

const supplierBalance = computed(() => {
  if (props.supplier) return props.supplier.balance ?? null;
  return (
    store.supplierOptions.find((s) => s.id === form.supplierId)?.balance ?? null
  );
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    Object.assign(form, {
      supplierId: fixedSupplier.value?.id ?? "",
      // الافتراضي: سداد كامل المتبقي على الفاتورة
      amount: props.invoice ? props.invoice.remaining : "",
      paymentDate: companyToday(),
      method: "cash",
      reference: "",
      note: "",
    });
    if (!fixedSupplier.value) {
      store.fetchSupplierOptions(true).catch(() => {});
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
      supplierId: form.supplierId,
      invoiceId: props.invoice?.id,
      paymentDate: form.paymentDate,
      amount: Number(form.amount),
      method: form.method,
      reference: form.reference || undefined,
      note: form.note || undefined,
    });
    toast.success(`تم تسجيل السداد ${payment.number}`);
    emit("update:modelValue", false);
    emit("saved");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تسجيل السداد"));
  } finally {
    submitting.value = false;
  }
};
</script>
