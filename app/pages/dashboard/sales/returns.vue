<!-- pages/dashboard/sales/returns.vue — مرتجعات البيع (إشعارات دائنة) -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>مرتجعات البيع</h1>
        <p>بضاعة أعادها العملاء — تعود للمخزن وتُخصم مما عليهم (إشعار دائن)</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/dashboard/sales" class="btn btn--ghost">
          <ReceiptText :size="16" />
          <span>فواتير البيع</span>
        </NuxtLink>
      </div>
    </div>

    <div class="doc-note page-note">
      <Info :size="16" />
      <span>
        المرتجع يُنشأ من فاتورة البيع نفسها: افتح الفاتورة الصادرة واضغط
        "مرتجع"، فيرث السعر والضريبة منها. وهو الطريقة الوحيدة لتصحيح فاتورة
        صادرة.
      </span>
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
        <RotateCcw :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد مرتجعات</div>
        <div class="empty-state__text">
          تظهر هنا المرتجعات المسجّلة من فواتير البيع
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
                <th>من فاتورة</th>
                <th>التاريخ</th>
                <th>القيمة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in list.rows.value" :key="r.id">
                <td>
                  <code v-if="r.number" class="doc-code">{{ r.number }}</code>
                  <span v-else class="doc-cell__sub">بلا رقم بعد</span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ customerLabel(r.customer) }}</span>
                    <span v-if="r.reason" class="doc-cell__sub">{{ r.reason }}</span>
                  </div>
                </td>
                <td><code class="doc-code">{{ r.invoice?.number }}</code></td>
                <td>
                  <span class="doc-num">{{ formatDate(r.returnDate) }}</span>
                </td>
                <td>
                  <span class="doc-money doc-money--strong">
                    {{ formatCurrency(r.total) }}
                  </span>
                </td>
                <td>
                  <span
                    :class="[
                      'badge',
                      `doc-status--${SALES_RETURN_STATUS[r.status].tone}`,
                    ]"
                  >
                    {{ SALES_RETURN_STATUS[r.status].label }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <button
                      v-if="r.status === 'draft'"
                      v-can="'manage_sales_returns'"
                      class="btn btn--sm btn--primary"
                      @click="askAction('post', r)"
                    >
                      <CheckCheck :size="14" /> إصدار
                    </button>
                    <button
                      class="btn btn--sm btn--ghost btn--icon"
                      title="عرض"
                      @click="openDetails(r)"
                    >
                      <Eye :size="14" />
                    </button>
                    <button
                      v-if="r.status === 'draft'"
                      v-can="'manage_sales_returns'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="إلغاء المرتجع"
                      @click="askAction('cancel', r)"
                    >
                      <Ban :size="14" />
                    </button>
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
        label="مرتجع"
        @change="list.load"
      />
    </template>

    <!-- ══ عرض المرتجع ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="details" class="modal-overlay" @click.self="details = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <RotateCcw :size="20" class="doc-modal__icon" />
                مرتجع بيع {{ details.number }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="details = null"
              >
                <X :size="20" />
              </button>
            </div>

            <div class="doc-form">
              <div class="doc-info">
                <div class="doc-cell">
                  <span class="doc-cell__sub">العميل</span>
                  <span class="doc-cell__main">
                    {{ customerLabel(details.customer) }}
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">من فاتورة</span>
                  <span><code class="doc-code">{{ details.invoice?.number }}</code></span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">المخزن</span>
                  <span>{{ details.warehouse?.name }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">التاريخ</span>
                  <span class="doc-num">{{ formatDate(details.returnDate) }}</span>
                </div>
              </div>
              <p v-if="details.reason" class="doc-hint">
                السبب: {{ details.reason }}
              </p>

              <div class="doc-lines" :style="{ '--doc-cols': COLS }">
                <div class="doc-lines__head">
                  <span>الصنف</span>
                  <span>الكمية</span>
                  <span>قبل الضريبة</span>
                  <span>الإجمالي</span>
                </div>
                <div
                  v-for="line in details.lines"
                  :key="line.id"
                  class="doc-lines__row"
                >
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ line.productName }}</span>
                  </div>
                  <div>
                    <span class="doc-lines__label">الكمية</span>
                    <span class="doc-qty">
                      <span class="doc-num doc-num--strong">
                        {{ formatNumber(line.quantity) }}
                      </span>
                      <span class="doc-cell__sub">{{ line.unitName }}</span>
                    </span>
                  </div>
                  <div>
                    <span class="doc-lines__label">قبل الضريبة</span>
                    <span class="doc-money">{{ formatCurrency(line.subtotal) }}</span>
                  </div>
                  <div>
                    <span class="doc-lines__label">الإجمالي</span>
                    <span class="doc-money doc-money--strong">
                      {{ formatCurrency(line.total) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="doc-totals doc-totals--box">
                <div>
                  <span>قبل الضريبة</span>
                  <span class="doc-money">{{ formatCurrency(details.subtotal) }}</span>
                </div>
                <div>
                  <span>الضريبة</span>
                  <span class="doc-money">{{ formatCurrency(details.taxTotal) }}</span>
                </div>
                <div class="is-grand">
                  <span>إجمالي المرتجع</span>
                  <span class="doc-money">{{ formatCurrency(details.total) }}</span>
                </div>
                <div v-if="details.refundedAmount > 0">
                  <span>رُدّ للعميل نقداً</span>
                  <span class="doc-money">
                    {{ formatCurrency(details.refundedAmount) }}
                  </span>
                </div>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="details = null">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      :title="pendingAction === 'post' ? 'إصدار المرتجع' : 'إلغاء المرتجع'"
      :message="confirmMessage"
      :confirm-text="pendingAction === 'post' ? 'إصدار' : 'إلغاء المرتجع'"
      :loading="acting"
      @confirm="runAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  Ban,
  CheckCheck,
  Eye,
  Info,
  ReceiptText,
  RotateCcw,
  X,
} from "lucide-vue-next";
import { useSalesStore } from "@/stores/sales";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  SalesReturn,
  SalesReturnStatus,
} from "@/types/sales";

definePageMeta({ middleware: "auth" });

const store = useSalesStore();
const toast = useToast();

const COLS = "2fr 1fr 1fr 1fr";

const STATUS_TABS: { value: SalesReturnStatus | ""; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "issued", label: "صادر" },
  { value: "cancelled", label: "ملغي" },
];

const filters = reactive({
  status: "" as SalesReturnStatus | "",
  customerId: "",
});

const list = usePagedList(
  (page) => store.fetchReturns({ ...filters, page }),
  "تعذر تحميل المرتجعات",
);

const setStatus = (status: SalesReturnStatus | "") => {
  filters.status = status;
  list.load(1);
};

// ─── العرض ────────────────────────────────────────────────────────────────────
const details = ref<SalesReturn | null>(null);

const openDetails = async (salesReturn: SalesReturn) => {
  try {
    details.value = await store.getReturn(salesReturn.id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل المرتجع"));
  }
};

// ─── إصدار / إلغاء ───────────────────────────────────────────────────────────
const showConfirm = ref(false);
const acting = ref(false);
const pendingAction = ref<"post" | "cancel">("post");
const actionTarget = ref<SalesReturn | null>(null);

const confirmMessage = computed(() => {
  const target = actionTarget.value;
  if (!target) return "";
  return pendingAction.value === "post"
    ? `إصدار المرتجع يعيد بضاعته للمخزن ويخصم ${formatCurrency(target.total)} مما على "${customerLabel(target.customer)}". لا يمكن تعديله بعد الإصدار.`
    : "هل تريد إلغاء هذه المسودة؟";
});

const askAction = (action: "post" | "cancel", target: SalesReturn) => {
  pendingAction.value = action;
  actionTarget.value = target;
  showConfirm.value = true;
};

const runAction = async () => {
  if (!actionTarget.value) return;
  acting.value = true;
  try {
    if (pendingAction.value === "post") {
      await store.issueReturn(actionTarget.value.id);
      toast.success("تم إصدار المرتجع");
    } else {
      await store.cancelReturn(actionTarget.value.id);
      toast.success("تم إلغاء المرتجع");
    }
    showConfirm.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تنفيذ العملية"));
  } finally {
    acting.value = false;
  }
};

onMounted(() => {
  store.fetchCustomerOptions().catch(() => {});
  list.load(1);
});
</script>

<style lang="scss" scoped>
.page-note {
  margin-bottom: $space-4;
}
</style>
