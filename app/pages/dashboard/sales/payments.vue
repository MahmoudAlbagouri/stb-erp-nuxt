<!-- pages/dashboard/sales/payments.vue — مقبوضات العملاء -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>مقبوضات العملاء</h1>
        <p>كل ما قُبض من العملاء (عند الإصدار، على الفواتير الآجلة، أو على الحساب) وما رُدّ لهم</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_customer_payments'"
          class="btn btn--primary"
          @click="showPayment = true"
        >
          <Plus :size="18" />
          <span>قبض على الحساب</span>
        </button>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        class="doc-tab"
        :class="{ 'is-active': filters.status === tab.value }"
        @click="setStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="card doc-filters doc-filters--even">
      <select
        v-model="filters.customerId"
        class="form-select"
        @change="list.load(1)"
      >
        <option value="">كل العملاء</option>
        <option v-for="s in store.customerOptions" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <CircleDollarSign :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد مقبوضات</div>
        <div class="empty-state__text">
          اقبض فاتورة من صفحة فواتير البيع، أو سجّل قبضاً على حساب عميل
        </div>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>العميل</th>
                <th>على فاتورة</th>
                <th>التاريخ</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in list.rows.value" :key="p.id">
                <td><code class="doc-code">{{ p.number }}</code></td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ customerLabel(p.customer) }}</span>
                    <span v-if="p.note" class="doc-cell__sub">{{ p.note }}</span>
                  </div>
                </td>
                <td>
                  <code v-if="p.invoice" class="doc-code">{{ p.invoice.number }}</code>
                  <span v-else class="doc-cell__sub">على الحساب</span>
                </td>
                <td>
                  <span class="doc-num">{{ formatDate(p.paymentDate) }}</span>
                </td>
                <td>
                  <span
                    class="doc-money doc-money--strong"
                    :class="p.direction === 'in' ? 'doc-money--in' : 'doc-money--out'"
                  >
                    {{ formatCurrency(p.amount) }}
                  </span>
                  <span v-if="p.direction === 'out'" class="doc-cell__sub">
                    ردّ للعميل
                  </span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span>{{ SALES_PAYMENT_METHOD_LABELS[p.method] }}</span>
                    <span v-if="p.reference" class="doc-cell__sub" dir="ltr">
                      {{ p.reference }}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    :class="[
                      'badge',
                      p.status === 'posted'
                        ? 'doc-status--done'
                        : 'doc-status--cancelled',
                    ]"
                  >
                    {{ p.status === "posted" ? "مسجّل" : "ملغي" }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <button
                      v-if="p.status === 'posted' && p.direction === 'in' && p.customerId"
                      v-can="'manage_customer_payments'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="إلغاء القبض"
                      @click="askCancel(p)"
                    >
                      <Ban :size="14" />
                    </button>
                    <span v-else>—</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DocPager
        :total="list.total.value"
        :page="list.page.value"
        :total-pages="list.totalPages.value"
        label="سند"
        @change="list.load"
      />
    </template>

    <CustomerPaymentModal v-model="showPayment" @saved="list.load(1)" />

    <ConfirmDialog
      v-model="showConfirm"
      title="إلغاء القبض"
      :message="`إلغاء سند القبض ${cancelTarget?.number} يعيد ${formatCurrency(cancelTarget?.amount ?? 0)} على العميل '${cancelTarget?.customer?.name}'.`"
      confirm-text="إلغاء القبض"
      :loading="cancelling"
      @confirm="doCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Ban, CircleDollarSign, Plus } from "lucide-vue-next";
import { useSalesStore } from "@/stores/sales";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  CustomerPayment,
  CustomerPaymentStatus,
} from "@/types/sales";

definePageMeta({ middleware: "auth" });

const store = useSalesStore();
const toast = useToast();

const STATUS_TABS: { value: CustomerPaymentStatus | ""; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "posted", label: "مسجّل" },
  { value: "cancelled", label: "ملغي" },
];

const filters = reactive({
  status: "" as CustomerPaymentStatus | "",
  customerId: "",
});

const list = usePagedList(
  (page) => store.fetchPayments({ ...filters, page }),
  "تعذر تحميل المقبوضات",
);

const setStatus = (status: CustomerPaymentStatus | "") => {
  filters.status = status;
  list.load(1);
};

const showPayment = ref(false);

const showConfirm = ref(false);
const cancelling = ref(false);
const cancelTarget = ref<CustomerPayment | null>(null);

const askCancel = (payment: CustomerPayment) => {
  cancelTarget.value = payment;
  showConfirm.value = true;
};

const doCancel = async () => {
  if (!cancelTarget.value) return;
  cancelling.value = true;
  try {
    await store.cancelPayment(cancelTarget.value.id);
    toast.success("تم إلغاء القبض");
    showConfirm.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إلغاء القبض"));
  } finally {
    cancelling.value = false;
  }
};

onMounted(() => {
  store.fetchCustomerOptions().catch(() => {});
  list.load(1);
});
</script>
