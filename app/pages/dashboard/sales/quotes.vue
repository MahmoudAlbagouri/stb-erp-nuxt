<!-- pages/dashboard/sales/quotes.vue — عروض أسعار العملاء (تصدر من شاشة الكاشير) -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>عروض أسعار العملاء</h1>
        <p>ما أصدره الكاشير للعملاء — ليس بيعاً ولا يمس المخزون حتى يتحول لفاتورة</p>
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
        يُنشأ العرض من شاشة الكاشير، ويتحول لفاتورة عليها برقمه حين يعود العميل. يُشغَّل
        ويُقفل من إعدادات شاشة الكاشير.
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

    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="filters.search"
          class="form-input"
          placeholder="بحث برقم العرض أو اسم العميل أو جواله..."
          @input="onSearchInput"
        />
      </div>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <FileText :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد عروض أسعار</div>
        <div class="empty-state__text">
          تظهر هنا العروض التي يصدرها الكاشير بعد رفعها من شاشته
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
                <th>التاريخ</th>
                <th>صالح حتى</th>
                <th>القيمة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in list.rows.value" :key="q.id">
                <td><code class="doc-code">{{ q.number }}</code></td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ q.customerName || "عميل نقدي" }}</span>
                    <span v-if="q.customerPhone" class="doc-cell__sub" dir="ltr">
                      {{ q.customerPhone }}
                    </span>
                  </div>
                </td>
                <td><span class="doc-num">{{ formatDate(q.issuedAt) }}</span></td>
                <td><span class="doc-num">{{ formatDate(q.validUntil) }}</span></td>
                <td>
                  <span class="doc-money doc-money--strong">
                    {{ formatCurrency(q.total) }}
                  </span>
                </td>
                <td>
                  <span :class="['badge', `doc-status--${statusOf(q).tone}`]">
                    {{ statusOf(q).label }}
                  </span>
                  <code v-if="q.convertedInvoiceNumber" class="doc-code">
                    {{ q.convertedInvoiceNumber }}
                  </code>
                </td>
                <td>
                  <div class="doc-actions">
                    <button
                      class="btn btn--sm btn--ghost btn--icon"
                      title="عرض"
                      @click="details = q"
                    >
                      <Eye :size="14" />
                    </button>
                    <button
                      class="btn btn--sm btn--ghost btn--icon"
                      title="طباعة A4"
                      @click="print(q, 'a4')"
                    >
                      <Printer :size="14" />
                    </button>
                    <button
                      class="btn btn--sm btn--ghost"
                      title="طباعة على الورق الحراري"
                      @click="print(q, 'thermal')"
                    >
                      80مم
                    </button>
                    <button
                      v-if="q.status === 'open'"
                      v-can="'manage_sales'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="إلغاء العرض"
                      @click="askCancel(q)"
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
        label="عرض"
        @change="list.load"
      />
    </template>

    <!-- ══ عرض السعر ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="details" class="modal-overlay" @click.self="details = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <FileText :size="20" class="doc-modal__icon" />
                عرض سعر {{ details.number }}
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
                    {{ details.customerName || "عميل نقدي" }}
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">الكاشير</span>
                  <span>{{ details.cashierName || "—" }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">التاريخ</span>
                  <span class="doc-num">{{ formatDateTime(details.issuedAt) }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">صالح حتى</span>
                  <span class="doc-num">{{ formatDate(details.validUntil) }}</span>
                </div>
              </div>
              <p v-if="details.approvedBy" class="doc-hint">
                وافق عليه المشرف: {{ details.approvedBy }}
              </p>
              <p v-if="details.note" class="doc-hint">ملاحظة: {{ details.note }}</p>

              <div class="doc-lines" :style="{ '--doc-cols': COLS }">
                <div class="doc-lines__head">
                  <span>الصنف</span>
                  <span>الكمية</span>
                  <span>السعر</span>
                  <span>الإجمالي</span>
                </div>
                <div
                  v-for="(line, index) in details.lines"
                  :key="index"
                  class="doc-lines__row"
                >
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ line.productName }}</span>
                    <span v-if="line.discount > 0" class="doc-cell__sub">
                      خصم {{ formatCurrency(line.discount) }}
                    </span>
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
                    <span class="doc-lines__label">السعر</span>
                    <span class="doc-money">{{ formatCurrency(line.unitPrice) }}</span>
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
                <div v-if="details.taxTotal > 0">
                  <span>قبل الضريبة</span>
                  <span class="doc-money">{{ formatCurrency(details.subtotal) }}</span>
                </div>
                <div v-if="details.taxTotal > 0">
                  <span>الضريبة</span>
                  <span class="doc-money">{{ formatCurrency(details.taxTotal) }}</span>
                </div>
                <div class="is-grand">
                  <span>إجمالي العرض</span>
                  <span class="doc-money">{{ formatCurrency(details.total) }}</span>
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
      title="إلغاء عرض السعر"
      :message="`إلغاء العرض ${cancelTarget?.number ?? ''} يمنع تحويله لفاتورة، حتى لو كانت الورقة مع العميل.`"
      confirm-text="إلغاء العرض"
      :loading="cancelling"
      @confirm="runCancel"
    />

    <SalesInvoicePrint
      ref="printer"
      :invoice="printTarget"
      :settings="store.settings"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from "vue";
import {
  Ban,
  Eye,
  FileText,
  Info,
  Printer,
  ReceiptText,
  Search,
  X,
} from "lucide-vue-next";
import { useSalesStore } from "@/stores/sales";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  PrintableInvoice,
  SalesQuote,
  SalesQuoteFilter,
} from "@/types/sales";

definePageMeta({ middleware: "auth" });

const store = useSalesStore();
const toast = useToast();

const COLS = "2fr 1fr 1fr 1fr";
const SEARCH_DELAY_MS = 350;

const STATUS_TABS: { value: SalesQuoteFilter | ""; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "open", label: "سارية" },
  { value: "expired", label: "منتهية" },
  { value: "converted", label: "حُوّلت لفاتورة" },
  { value: "cancelled", label: "ملغاة" },
];

const filters = reactive({
  status: "" as SalesQuoteFilter | "",
  search: "",
});

const list = usePagedList(
  (page) => store.fetchQuotes({ ...filters, page }),
  "تعذر تحميل عروض الأسعار",
);

const setStatus = (status: SalesQuoteFilter | "") => {
  filters.status = status;
  list.load(1);
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => list.load(1), SEARCH_DELAY_MS);
};

const statusOf = (quote: SalesQuote) =>
  SALES_QUOTE_STATUS[quote.expired ? "expired" : quote.status];

const details = ref<SalesQuote | null>(null);

// ─── الطباعة ──────────────────────────────────────────────────────────────────
const printer = ref<{ print: (size: "a4" | "thermal") => Promise<void> } | null>(
  null,
);
const printTarget = ref<PrintableInvoice | null>(null);

const print = async (quote: SalesQuote, size: "a4" | "thermal") => {
  try {
    await store.fetchSettings();
    printTarget.value = quoteToPrintable(quote);
    await nextTick();
    await printer.value?.print(size);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذرت الطباعة"));
  }
};

// ─── الإلغاء ──────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const cancelling = ref(false);
const cancelTarget = ref<SalesQuote | null>(null);

const askCancel = (quote: SalesQuote) => {
  cancelTarget.value = quote;
  showConfirm.value = true;
};

const runCancel = async () => {
  if (!cancelTarget.value) return;
  cancelling.value = true;
  try {
    await store.cancelQuote(cancelTarget.value.id);
    toast.success("أُلغي عرض السعر");
    showConfirm.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إلغاء العرض"));
  } finally {
    cancelling.value = false;
  }
};

onMounted(() => list.load(1));
</script>

<style lang="scss" scoped>
.page-note {
  margin-bottom: $space-4;
}
</style>
