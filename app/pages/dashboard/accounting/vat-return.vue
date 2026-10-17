<!-- pages/dashboard/accounting/vat-return.vue — إقرار ضريبة القيمة المضافة لفترة (من المستندات، ومطابقته مع الدفاتر) -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>إقرار ضريبة القيمة المضافة</h1>
        <p>
          المبيعات والمشتريات والمصروفات بفئة ضريبتها لفترة الإقرار، والمرتجعات
          تعديلاً — وصافي الضريبة المستحقة أو المستردة
        </p>
      </div>
      <div class="page-header__actions">
        <ReportExport
          v-if="result"
          path="/accounting/reports/vat-return/export"
          :query="{ from: result.from, to: result.to }"
          :filename="`vat_return_${result.from}_${result.to}`"
        />
        <button class="btn btn--ghost" :disabled="!result" @click="print">
          <Printer :size="16" /> طباعة
        </button>
      </div>
    </div>

    <form class="card doc-filters" @submit.prevent="load">
      <select v-model="preset" class="form-select" @change="applyPreset">
        <option value="month">هذا الشهر</option>
        <option value="last_month">الشهر الماضي</option>
        <option value="quarter">هذا الربع</option>
        <option value="last_quarter">الربع الماضي</option>
        <option value="custom">فترة محددة</option>
      </select>
      <StbDateInput v-model="query.from" required @update:model-value="preset = 'custom'" />
      <StbDateInput v-model="query.to" required @update:model-value="preset = 'custom'" />
      <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': loading }" :disabled="loading">
        عرض
      </button>
    </form>

    <div v-if="loading && !result" class="empty-state"><div class="spinner spinner--lg" /></div>

    <div v-else-if="result" ref="report" class="card statement printable">
      <div class="report-title">
        <h2>إقرار ضريبة القيمة المضافة</h2>
        <span>من {{ result.from }} إلى {{ result.to }}</span>
        <span v-if="result.taxNumber">الرقم الضريبي <span class="doc-num">{{ result.taxNumber }}</span></span>
      </div>

      <div v-if="!result.vatRegistered" class="doc-note">
        <Info :size="16" />
        <span>
          المنشأة غير مسجّلة في ضريبة القيمة المضافة حالياً (إعدادات المبيعات): لا
          تحصّل ضريبة ولا تسترد ضريبة مشترياتها.
        </span>
      </div>

      <section v-for="part in sections" :key="part.key" class="vat-section">
        <h3>{{ part.title }}</h3>
        <div class="table-responsive">
          <table class="data-table vat-table">
            <thead>
              <tr>
                <th>البند</th>
                <th>المبلغ</th>
                <th>التعديلات</th>
                <th>الضريبة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in part.data.rows" :key="row.key" :class="{ 'is-muted': row.nonRecoverable }">
                <td>
                  {{ row.label }}
                  <span v-if="row.nonRecoverable" class="doc-cell__sub">(لا تُخصم)</span>
                </td>
                <td class="doc-num">{{ formatMoney(row.amount) }}</td>
                <td class="doc-num">{{ formatMoney(row.adjustment) }}</td>
                <td class="doc-num">{{ formatMoney(row.tax) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th>{{ part.total }}</th>
                <th class="doc-num">{{ formatMoney(part.data.totals.amount) }}</th>
                <th class="doc-num">{{ formatMoney(part.data.totals.adjustment) }}</th>
                <th class="doc-num">{{ formatMoney(part.data.totals.tax) }}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="vat-section">
        <div class="statement__line">
          <span>ضريبة المخرجات (المبيعات)</span>
          <span class="doc-num">{{ formatMoney(result.totals.outputTax) }}</span>
        </div>
        <div class="statement__line">
          <span>ضريبة المدخلات القابلة للخصم</span>
          <span class="doc-num">{{ formatMoney(result.totals.inputTax) }}</span>
        </div>
        <div class="statement__line statement__line--total" :class="{ 'is-credit': result.totals.netVat < 0 }">
          <span>
            {{ result.totals.netVat < 0 ? "صافي الضريبة لصالح المنشأة (يُرحَّل أو يُسترد)" : "صافي الضريبة المستحقة للسداد" }}
          </span>
          <strong class="doc-num">{{ formatMoney(Math.abs(result.totals.netVat)) }}</strong>
        </div>
      </section>

      <section v-if="result.ledger" class="vat-section">
        <h3>المطابقة مع الدفاتر</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th />
                <th>الإقرار</th>
                <th>الدفاتر</th>
                <th>الفرق</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reconciliation" :key="row.label">
                <td>{{ row.label }}</td>
                <td class="doc-num">{{ formatMoney(row.report) }}</td>
                <td class="doc-num">{{ formatMoney(row.ledger) }}</td>
                <td class="doc-num" :class="row.diff ? 'doc-money--out' : 'doc-money--in'">
                  {{ row.diff ? formatMoney(row.diff) : "✓" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="reconciliation.some((r) => r.diff)" class="doc-cell__sub">
          الفرق عادةً: مستندات قبل تفعيل المحاسبة، أو مستند في فترة مقفلة قُيِّد في أول
          يوم مفتوح، أو قيد يدوي على حساب الضريبة.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Info, Printer } from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useToast } from "@/composables/useToast";
import type { VatReturn } from "@/types/accounting";

definePageMeta({ middleware: "auth" });

const store = useAccountingStore();
const toast = useToast();
const loading = ref(false);
const result = ref<VatReturn | null>(null);

type Preset = "month" | "last_month" | "quarter" | "last_quarter" | "custom";
const preset = ref<Preset>("month");
const query = reactive({ from: "", to: "" });

const pad = (n: number) => String(n).padStart(2, "0");
/** آخر يوم في شهر (month من 1) */
const monthEnd = (year: number, month: number) =>
  `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`;

const applyPreset = () => {
  const today = companyToday();
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  switch (preset.value) {
    case "month":
      Object.assign(query, { from: `${year}-${pad(month)}-01`, to: monthEnd(year, month) });
      break;
    case "last_month":
      if (--month === 0) {
        month = 12;
        year--;
      }
      Object.assign(query, { from: `${year}-${pad(month)}-01`, to: monthEnd(year, month) });
      break;
    case "quarter":
    case "last_quarter": {
      let q = Math.ceil(month / 3);
      if (preset.value === "last_quarter" && --q === 0) {
        q = 4;
        year--;
      }
      Object.assign(query, {
        from: `${year}-${pad(q * 3 - 2)}-01`,
        to: monthEnd(year, q * 3),
      });
      break;
    }
    default:
      return;
  }
  void load();
};

const sections = computed(() =>
  result.value
    ? [
        {
          key: "sales",
          title: "المبيعات",
          total: "إجمالي المبيعات وضريبة المخرجات",
          data: result.value.sales,
        },
        {
          key: "purchases",
          title: "المشتريات والمصروفات",
          total: "إجمالي المشتريات وضريبة المدخلات",
          data: result.value.purchases,
        },
      ]
    : [],
);

const reconciliation = computed(() => {
  const r = result.value;
  if (!r?.ledger) return [];
  const row = (label: string, report: number, ledger: number) => ({
    label,
    report,
    ledger,
    diff: roundMoney(report - ledger),
  });
  return [
    row("ضريبة المخرجات", r.totals.outputTax, r.ledger.outputTax),
    row("ضريبة المدخلات", r.totals.inputTax, r.ledger.inputTax),
    row("الصافي", r.totals.netVat, r.ledger.netVat),
  ];
});

const load = async () => {
  if (!query.from || !query.to) return;
  loading.value = true;
  try {
    result.value = await store.vatReturn({ from: query.from, to: query.to });
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الإقرار"));
  } finally {
    loading.value = false;
  }
};

const report = ref<HTMLElement | null>(null);
const print = () => printElement(report.value);

onMounted(applyPreset);
</script>

<style lang="scss" scoped>
.statement {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-5;
}
.report-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: $space-2 $space-4;

  h2 {
    margin: 0;
    font-size: $font-size-lg;
  }
  span {
    font-size: $font-size-sm;
  }
}
.vat-section {
  display: flex;
  flex-direction: column;
  gap: $space-2;

  h3 {
    margin: 0;
    font-size: $font-size-base;
    color: $stb-text-secondary;
  }
}
.vat-table tr.is-muted td {
  color: $stb-text-muted;
}
.statement__line {
  display: flex;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-1 0;
  border-bottom: 1px dashed $stb-border;
  font-size: $font-size-sm;
}
.statement__line--total {
  margin-top: $space-2;
  padding: $space-3;
  border: 0;
  border-radius: $radius-md;
  font-size: $font-size-base;
  font-weight: 800;
  background: rgba($stb-danger, 0.08);

  &.is-credit {
    background: rgba($stb-success, 0.1);
  }
}
</style>
