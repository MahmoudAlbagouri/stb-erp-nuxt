<!--
  نسخة الطباعة لفاتورة البيع (A4 أو ورق حراري 80مم) مع رمز QR لهيئة الزكاة
  والضريبة. مخفية على الشاشة وتظهر وحدها عند الطباعة (انظر ‎.print-area في
  ‎_documents.scss). الاستخدام: ref ثم ‎print("a4" | "thermal")‎.
-->
<template>
  <Teleport to="body">
    <div
      v-if="invoice"
      class="print-area invoice-print"
      :class="`invoice-print--${size}`"
      dir="rtl"
    >
      <header class="invoice-print__header">
        <h1>{{ settings?.sellerName || "فاتورة" }}</h1>
        <p v-if="branchLine">{{ branchLine }}</p>
        <p v-if="address">{{ address }}</p>
        <p v-if="phone" dir="ltr">{{ phone }}</p>
        <p v-if="settings?.taxNumber">
          الرقم الضريبي: <span dir="ltr">{{ settings.taxNumber }}</span>
        </p>
        <p v-if="settings?.commercialRegister">
          السجل التجاري: <span dir="ltr">{{ settings.commercialRegister }}</span>
        </p>
        <h2>{{ SALES_INVOICE_TYPE_LABELS[invoice.invoiceType] }}</h2>
      </header>

      <section class="invoice-print__meta">
        <div>
          <span>رقم الفاتورة</span>
          <strong dir="ltr">{{ invoice.number }}</strong>
        </div>
        <div>
          <span>التاريخ</span>
          <strong dir="ltr">
            {{ formatDateTime(invoice.issuedAt || invoice.invoiceDate) }}
          </strong>
        </div>
        <div>
          <span>العميل</span>
          <strong>{{ customerLabel(invoice.customer) }}</strong>
        </div>
        <div v-if="invoice.customer?.taxNumber">
          <span>الرقم الضريبي للعميل</span>
          <strong dir="ltr">{{ invoice.customer.taxNumber }}</strong>
        </div>
      </section>

      <table class="invoice-print__lines">
        <thead>
          <tr>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in invoice.lines" :key="line.id">
            <td>
              {{ line.productName }}
              <small v-if="line.discount > 0">
                (خصم {{ formatMoney(line.discount) }})
              </small>
            </td>
            <td>
              <span dir="ltr">{{ formatNumber(line.quantity) }}</span>
              {{ line.unitName }}
            </td>
            <td dir="ltr">{{ formatMoney(line.unitPrice) }}</td>
            <td dir="ltr">{{ formatMoney(line.total) }}</td>
          </tr>
        </tbody>
      </table>

      <section class="invoice-print__totals">
        <div>
          <span>الإجمالي قبل الضريبة</span>
          <span dir="ltr">{{ formatMoney(invoice.subtotal) }}</span>
        </div>
        <div>
          <span>ضريبة القيمة المضافة</span>
          <span dir="ltr">{{ formatMoney(invoice.taxTotal) }}</span>
        </div>
        <div class="is-grand">
          <span>الإجمالي شامل الضريبة ({{ currencyLabel() }})</span>
          <span dir="ltr">{{ formatMoney(invoice.total) }}</span>
        </div>
        <div v-if="invoice.paidAmount > 0">
          <span>المدفوع</span>
          <span dir="ltr">{{ formatMoney(invoice.paidAmount) }}</span>
        </div>
        <div v-if="invoice.remaining > 0">
          <span>المتبقي</span>
          <span dir="ltr">{{ formatMoney(invoice.remaining) }}</span>
        </div>
      </section>

      <footer class="invoice-print__footer">
        <img v-if="qrImage" :src="qrImage" alt="رمز QR للفاتورة" />
        <p v-if="settings?.invoiceFooter">{{ settings.invoiceFooter }}</p>
      </footer>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import QRCode from "qrcode";
import type {
  PrintBranch,
  PrintableInvoice,
  SalesSettings,
} from "@/types/sales";

type PrintSize = "a4" | "thermal";

const props = defineProps<{
  invoice: PrintableInvoice | null;
  settings: SalesSettings | null;
  /** فرع البيع؛ إن غاب يؤخذ من مخزن الفاتورة */
  branch?: PrintBranch | null;
}>();

// عنوان الفرع وهاتفه يُطبعان بدل عنوان الشركة؛ ما لم يُدخَل للفرع يبقى للشركة
const printBranch = computed(
  () => props.branch ?? props.invoice?.warehouse?.branch ?? null,
);
const branchLine = computed(() =>
  printBranch.value && !printBranch.value.isMain ? printBranch.value.name : "",
);
const address = computed(
  () => printBranch.value?.address || props.settings?.address || "",
);
const phone = computed(
  () => printBranch.value?.phone || props.settings?.phone || "",
);

const size = ref<PrintSize>("a4");
const qrImage = ref("");

const renderQr = async () => {
  const code = props.invoice?.qrCode;
  qrImage.value = code
    ? await QRCode.toDataURL(code, { margin: 1, width: 180 })
    : "";
};

watch(() => props.invoice?.qrCode, renderQr, { immediate: true });

const PAGE_RULES: Record<PrintSize, string> = {
  a4: "@page { size: A4; margin: 12mm; }",
  // الارتفاع تلقائي: الورق الحراري يُقطع بطول الفاتورة
  thermal: "@page { size: 80mm auto; margin: 3mm; }",
};

/** يطبع الفاتورة بالمقاس المطلوب */
const print = async (target: PrintSize = "a4") => {
  size.value = target;
  await renderQr();

  // مقاس الصفحة يختلف بين المقاسين، فنحقنه لحظة الطباعة ثم نزيله
  const style = document.createElement("style");
  style.textContent = PAGE_RULES[target];
  document.head.appendChild(style);
  await nextTick();

  window.print();
  style.remove();
};

defineExpose({ print });
</script>

<style lang="scss">
// غير scoped عمداً: العنصر خارج شجرة الصفحة (Teleport) وألوانه ثابتة (حبر
// أسود على ورق أبيض) مهما كان وضع الواجهة.
.invoice-print {
  color: #000;
  background: #fff;
  font-family: "Cairo", sans-serif;
  font-size: 12pt;
  line-height: 1.5;

  // العناوين ترث لون الواجهة (فاتح في الوضع الداكن): نثبّت الأسود للطباعة
  h1,
  h2,
  strong {
    color: #000;
  }

  h1 {
    font-size: 16pt;
    font-weight: 800;
  }
  h2 {
    margin-top: 6pt;
    font-size: 12pt;
    font-weight: 700;
  }
  p {
    margin: 0;
  }

  &__header {
    padding-bottom: 8pt;
    text-align: center;
    border-bottom: 1px dashed #000;
  }

  &__meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2pt 12pt;
    padding: 8pt 0;

    div {
      display: flex;
      justify-content: space-between;
      gap: 8pt;
    }
  }

  &__lines {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 4pt 3pt;
      // يمين صريح: خانات الأرقام dir="ltr" فلا يصح معها "start"
      text-align: right;
      border-bottom: 1px solid #999;
    }
    th {
      font-weight: 700;
      border-bottom: 1px solid #000;
    }
    small {
      font-size: 0.8em;
    }
  }

  &__totals {
    width: 55%;
    margin-inline-start: auto;
    padding-top: 8pt;

    div {
      display: flex;
      justify-content: space-between;
      gap: 8pt;
    }
    .is-grand {
      margin: 3pt 0;
      padding: 3pt 0;
      font-weight: 800;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
  }

  &__footer {
    padding-top: 10pt;
    text-align: center;

    img {
      width: 38mm;
      height: 38mm;
    }
  }

  // ورق حراري 80مم: عمود واحد وخط أصغر
  &--thermal {
    width: 72mm;
    font-size: 9pt;

    h1 {
      font-size: 12pt;
    }
    h2 {
      font-size: 10pt;
    }
    .invoice-print__meta {
      grid-template-columns: 1fr;
    }
    .invoice-print__totals {
      width: 100%;
    }
    .invoice-print__footer img {
      width: 32mm;
      height: 32mm;
    }
  }
}
</style>
