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
        <img v-if="logoSrc" :src="logoSrc" alt="" class="invoice-print__logo" />
        <h1>{{ settings?.sellerName || "فاتورة" }}</h1>
        <p v-if="branchLine">{{ branchLine }}</p>
        <p v-if="address">{{ address }}</p>
        <p v-if="phone" dir="ltr">{{ phone }}</p>
        <p v-if="taxInvoice && settings?.taxNumber">
          الرقم الضريبي: <span dir="ltr">{{ settings.taxNumber }}</span>
        </p>
        <p v-if="settings?.commercialRegister">
          السجل التجاري: <span dir="ltr">{{ settings.commercialRegister }}</span>
        </p>
        <h2>{{ title }}</h2>
        <p v-if="invoice.test" class="invoice-print__test">
          إيصال تجريبي لاختبار الطابعة — ليس فاتورة
        </p>
      </header>

      <section class="invoice-print__meta">
        <div v-if="invoice.number || !invoice.delivery?.orderNumber">
          <span>رقم الفاتورة</span>
          <strong dir="ltr">{{ invoice.number }}</strong>
        </div>
        <div v-if="invoice.delivery?.orderNumber">
          <span>رقم الأوردر</span>
          <strong dir="ltr">{{ invoice.delivery.orderNumber }}</strong>
        </div>
        <div>
          <span>التاريخ</span>
          <strong dir="ltr">
            {{ formatDateTime(invoice.issuedAt || invoice.invoiceDate) }}
          </strong>
        </div>
        <div v-if="invoice.tableName">
          <span>الطاولة</span>
          <strong>{{ invoice.tableName }}</strong>
        </div>
        <div>
          <span>العميل</span>
          <strong>{{ customerLabel(invoice.customer) }}</strong>
        </div>
        <div v-if="invoice.customer?.phone">
          <span>جوال العميل</span>
          <strong dir="ltr">{{ invoice.customer.phone }}</strong>
        </div>
        <div v-if="invoice.customer?.taxNumber">
          <span>الرقم الضريبي للعميل</span>
          <strong dir="ltr">{{ invoice.customer.taxNumber }}</strong>
        </div>
      </section>

      <!-- أوردر توصيل: لمن ولأين، ومن يوصّله -->
      <section v-if="invoice.delivery" class="invoice-print__delivery">
        <h3>توصيل</h3>
        <div>
          <span>المستلم</span>
          <strong>{{ invoice.delivery.recipientName }}</strong>
        </div>
        <div>
          <span>الجوال</span>
          <strong dir="ltr">{{ invoice.delivery.phone }}</strong>
        </div>
        <div>
          <span>العنوان</span>
          <strong>
            <template v-if="invoice.delivery.zoneName">{{ invoice.delivery.zoneName }} — </template>{{ invoice.delivery.address }}
          </strong>
        </div>
        <div v-if="invoice.delivery.agentName">
          <span>الطيار / الشحن</span>
          <strong>{{ invoice.delivery.agentName }}</strong>
        </div>
        <div v-if="invoice.delivery.note">
          <span>ملاحظة</span>
          <strong>{{ invoice.delivery.note }}</strong>
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

      <section class="invoice-print__count">
        <span>عدد الأصناف: <strong dir="ltr">{{ formatNumber(itemsCount) }}</strong></span>
        <span>
          إجمالي الكميات: <strong dir="ltr">{{ formatNumber(totalQuantity) }}</strong>
        </span>
      </section>

      <section class="invoice-print__totals">
        <!-- منشأة غير مسجّلة في الضريبة: لا سطر ضريبة أصلاً -->
        <template v-if="taxInvoice">
          <div>
            <span>الإجمالي قبل الضريبة</span>
            <span dir="ltr">{{ formatMoney(invoice.subtotal) }}</span>
          </div>
          <div>
            <span>ضريبة القيمة المضافة</span>
            <span dir="ltr">{{ formatMoney(invoice.taxTotal) }}</span>
          </div>
        </template>
        <div class="is-grand">
          <span>
            {{ taxInvoice ? "الإجمالي شامل الضريبة" : "الإجمالي" }}
            ({{ currencyLabel() }})
          </span>
          <span dir="ltr">{{ formatMoney(invoice.total) }}</span>
        </div>
        <div v-if="invoice.delivery" class="is-collect">
          <span>
            {{ invoice.delivery.collect > 0 ? "المطلوب تحصيله من العميل" : "مدفوع — لا يُحصَّل شيء" }}
          </span>
          <span v-if="invoice.delivery.collect > 0" dir="ltr">
            {{ formatMoney(invoice.delivery.collect) }}
          </span>
        </div>
        <div v-else-if="invoice.paidAmount > 0">
          <span>المدفوع</span>
          <span dir="ltr">{{ formatMoney(invoice.paidAmount) }}</span>
        </div>
        <div v-if="invoice.remaining > 0">
          <span>المتبقي</span>
          <span dir="ltr">{{ formatMoney(invoice.remaining) }}</span>
        </div>
        <!-- ما على العميل كله الآن — فاتورة لوحة التحكم (رصيده لحظتها غير معروف) -->
        <div v-if="!account && customerBalance > 0" class="is-balance">
          <span>إجمالي الآجل على العميل</span>
          <span dir="ltr">{{ formatMoney(customerBalance) }}</span>
        </div>
      </section>

      <!-- إيصال الكاشير: الفاتورة + ما كان على العميل − ما دفعه = ما عليه الآن -->
      <section v-if="account" class="invoice-print__account">
        <h3>حساب العميل</h3>
        <div>
          <span>الإجمالي</span>
          <span dir="ltr">{{ formatMoney(account.total) }}</span>
        </div>
        <div>
          <span>{{ account.previous < 0 ? "رصيد سابق له (يُخصم)" : "الرصيد السابق" }}</span>
          <span dir="ltr">{{ formatMoney(Math.abs(account.previous)) }}</span>
        </div>
        <div v-if="account.paid > 0">
          <span>تنزيل</span>
          <span dir="ltr">{{ formatMoney(account.paid) }}</span>
        </div>
        <div class="is-total">
          <span>
            {{ account.balance < 0 ? "رصيد العميل لدينا" : "إجمالي المستحق" }}
          </span>
          <span dir="ltr">{{ formatMoney(Math.abs(account.balance)) }}</span>
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
import { useCompanyStore } from "@/stores/company";
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
  /**
   * شعار الشركة (Data URL). غائب = من هوية الشركة في لوحة التحكم؛ شاشة
   * الكاشير تمرّر نسختها المحفوظة (تطبع بلا إنترنت)
   */
  logo?: string | null;
}>();

const company = useCompanyStore();
const logoSrc = computed(() =>
  props.logo !== undefined ? props.logo : (company.branding?.logo ?? null),
);

/** عدد أسطر الفاتورة، ومجموع كمياتها (بوحدات البيع كما كُتبت) */
const itemsCount = computed(() => props.invoice?.lines?.length ?? 0);
const totalQuantity = computed(() =>
  (props.invoice?.lines ?? []).reduce(
    (sum, line) => Math.round((sum + (Number(line.quantity) || 0)) * 10000) / 10000,
    0,
  ),
);
const customerBalance = computed(() => Number(props.invoice?.customer?.balance) || 0);

/**
 * حساب العميل مفصّلاً (إيصال الكاشير — يعرف رصيده لحظة البيع): إجمالي الفاتورة
 * + السابق − ما دفعه منها (التنزيل) = ما عليه الآن. لا يُطبع لعميل لا رصيد له ولا آجل
 */
const account = computed(() => {
  const previous = props.invoice?.customer?.previousBalance;
  if (previous == null) return null;
  const total = Number(props.invoice?.total) || 0;
  const credit = Number(props.invoice?.remaining) || 0;
  if (previous === 0 && credit <= 0) return null;
  return {
    total,
    previous,
    // من الإجمالي والباقي لا من paidAmount: فيبقى الصندوق متّسقاً حسابياً
    paid: Math.round((total - credit) * 1000) / 1000,
    balance: Math.round((previous + credit) * 1000) / 1000,
  };
});

/**
 * فاتورة ضريبية؟ منشأة مسجّلة في الضريبة، أو فاتورة صدرت بضريبة أو برمز QR
 * (أُصدرت قبل أن تُلغى الشركة تسجيلها: تُعاد طباعتها كما صدرت)
 */
const taxInvoice = computed(
  () =>
    props.settings?.vatRegistered !== false ||
    (props.invoice?.taxTotal ?? 0) > 0 ||
    !!props.invoice?.qrCode,
);
const title = computed(() =>
  // مسودة أوردر توصيل (لم يخرج بعد): ليست فاتورة
  props.invoice && !props.invoice.number && props.invoice.delivery
    ? "أمر توصيل — ليس فاتورة"
    : taxInvoice.value && props.invoice
    ? SALES_INVOICE_TYPE_LABELS[props.invoice.invoiceType]
    : "فاتورة مبيعات",
);

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
  // شعار لوحة التحكم: يُجلب مرة في الجلسة (فشله لا يمنع الطباعة)
  if (props.logo === undefined) await company.fetchBranding();
  await renderQr();

  // مقاس الصفحة يختلف بين المقاسين، فنحقنه لحظة الطباعة ثم نزيله
  const style = document.createElement("style");
  style.textContent = PAGE_RULES[target];
  document.head.appendChild(style);
  await nextTick();
  // الشعار ورمز QR يُرسمان قبل فتح الطباعة، وإلا قد يخرجان فارغين
  await Promise.all(
    Array.from(document.querySelectorAll<HTMLImageElement>(".invoice-print img")).map(
      (img) => img.decode?.().catch(() => {}),
    ),
  );

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

  &__logo {
    display: block;
    max-width: 45mm;
    max-height: 22mm;
    margin: 0 auto 4pt;
    object-fit: contain;
  }

  &__test {
    margin-top: 4pt;
    padding: 2pt;
    font-weight: 800;
    border: 1px dashed #000;
  }

  // عدد الأصناف وإجمالي الكميات
  &__count {
    display: flex;
    justify-content: space-between;
    gap: 8pt;
    padding-top: 6pt;
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
    .is-balance {
      margin-top: 3pt;
      padding-top: 3pt;
      font-weight: 800;
      border-top: 1px dashed #000;
    }
    // ما يحصّله الطيار: أوضح سطر في الإيصال
    .is-collect {
      margin-top: 4pt;
      padding: 4pt;
      font-size: 1.15em;
      font-weight: 800;
      border: 2px solid #000;
    }
  }

  // حساب العميل الآجل: الفاتورة + السابق − التنزيل = المستحق، في صندوق آخر الإيصال
  &__account {
    width: 55%;
    margin-top: 6pt;
    margin-inline-start: auto;
    padding: 4pt 6pt;
    border: 1px solid #000;

    h3 {
      margin: 0 0 3pt;
      font-size: 1em;
      text-align: center;
      color: #000;
    }
    div {
      display: flex;
      justify-content: space-between;
      gap: 8pt;
    }
    .is-total {
      margin-top: 3pt;
      padding-top: 3pt;
      font-size: 1.1em;
      font-weight: 800;
      border-top: 1px solid #000;
    }
  }

  // بيانات التوصيل
  &__delivery {
    margin: 4pt 0 8pt;
    padding: 6pt;
    border: 1px dashed #000;

    h3 {
      margin: 0 0 4pt;
      font-size: 1.05em;
      color: #000;
    }
    div {
      display: flex;
      justify-content: space-between;
      gap: 8pt;
    }
    strong {
      text-align: left;
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

  // ورق حراري 80مم: عمود واحد وخط أصغر. العرض المطبوع 72مم؛ هامش داخلي يمين
  // وشمال فلا يلامس الكلام حافة الورق (الطباعة غالباً بلا هوامش)
  &--thermal {
    box-sizing: border-box;
    width: 72mm;
    margin: 0 auto;
    padding: 2mm 3mm;
    font-size: 9pt;

    // الرمادي يخرج باهتاً على الورق الحراري: خطوط سوداء
    .invoice-print__lines td {
      border-bottom-color: #000;
    }
    .invoice-print__logo {
      max-width: 40mm;
      max-height: 18mm;
    }

    h1 {
      font-size: 12pt;
    }
    h2 {
      font-size: 10pt;
    }
    .invoice-print__meta {
      grid-template-columns: 1fr;
    }
    .invoice-print__totals,
    .invoice-print__account {
      width: 100%;
    }
    .invoice-print__footer img {
      width: 32mm;
      height: 32mm;
    }
  }
}
</style>
