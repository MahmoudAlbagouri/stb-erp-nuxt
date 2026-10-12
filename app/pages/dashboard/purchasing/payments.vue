<!-- pages/dashboard/purchasing/payments.vue — سداد الموردين -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>سداد الموردين</h1>
        <p>كل ما دُفع للموردين: على فواتير محددة أو دفعات على الحساب</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_supplier_payments'"
          class="btn btn--primary"
          @click="showPayment = true"
        >
          <Plus :size="18" />
          <span>دفعة على الحساب</span>
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
        v-model="filters.supplierId"
        class="form-select"
        @change="list.load(1)"
      >
        <option value="">كل الموردين</option>
        <option v-for="s in store.supplierOptions" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <Wallet :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد مدفوعات</div>
        <div class="empty-state__text">
          سدّد فاتورة من صفحة فواتير الشراء، أو سجّل دفعة على حساب مورد
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
                <th>المورد</th>
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
                    <span class="doc-cell__main">{{ p.supplier?.name }}</span>
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
                  <span class="doc-money doc-money--strong">
                    {{ formatCurrency(p.amount) }}
                  </span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span>{{ PAYMENT_METHOD_LABELS[p.method] }}</span>
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
                      v-if="p.status === 'posted'"
                      v-can="'manage_supplier_payments'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="إلغاء السداد"
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
        label="سداد"
        @change="list.load"
      />
    </template>

    <SupplierPaymentModal v-model="showPayment" @saved="list.load(1)" />

    <ConfirmDialog
      v-model="showConfirm"
      title="إلغاء السداد"
      :message="`إلغاء السداد ${cancelTarget?.number} يعيد ${formatCurrency(cancelTarget?.amount ?? 0)} مستحقة للمورد '${cancelTarget?.supplier?.name}'.`"
      confirm-text="إلغاء السداد"
      :loading="cancelling"
      @confirm="doCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Ban, Plus, Wallet } from "lucide-vue-next";
import { usePurchasingStore } from "@/stores/purchasing";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  SupplierPayment,
  SupplierPaymentStatus,
} from "@/types/purchasing";

definePageMeta({ middleware: "auth" });

const store = usePurchasingStore();
const toast = useToast();

const STATUS_TABS: { value: SupplierPaymentStatus | ""; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "posted", label: "مسجّل" },
  { value: "cancelled", label: "ملغي" },
];

const filters = reactive({
  status: "" as SupplierPaymentStatus | "",
  supplierId: "",
});

const list = usePagedList(
  (page) => store.fetchPayments({ ...filters, page }),
  "تعذر تحميل المدفوعات",
);

const setStatus = (status: SupplierPaymentStatus | "") => {
  filters.status = status;
  list.load(1);
};

const showPayment = ref(false);

const showConfirm = ref(false);
const cancelling = ref(false);
const cancelTarget = ref<SupplierPayment | null>(null);

const askCancel = (payment: SupplierPayment) => {
  cancelTarget.value = payment;
  showConfirm.value = true;
};

const doCancel = async () => {
  if (!cancelTarget.value) return;
  cancelling.value = true;
  try {
    await store.cancelPayment(cancelTarget.value.id);
    toast.success("تم إلغاء السداد");
    showConfirm.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إلغاء السداد"));
  } finally {
    cancelling.value = false;
  }
};

onMounted(() => {
  store.fetchSupplierOptions().catch(() => {});
  list.load(1);
});
</script>
