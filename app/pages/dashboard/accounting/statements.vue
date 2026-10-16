<!-- pages/dashboard/accounting/statements.vue — القوائم المالية: قائمة الدخل والميزانية -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>القوائم المالية</h1>
        <p>قائمة الدخل لفترة، والمركز المالي (الميزانية) في تاريخ — من القيود مباشرة</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--ghost" @click="print"><Printer :size="16" /> طباعة</button>
      </div>
    </div>

    <AccountingInactive v-if="notActive" />

    <template v-else>
      <div class="doc-tabs">
        <button class="doc-tab" :class="{ 'is-active': tab === 'income' }" @click="tab = 'income'">
          قائمة الدخل
        </button>
        <button class="doc-tab" :class="{ 'is-active': tab === 'balance' }" @click="tab = 'balance'">
          الميزانية
        </button>
      </div>

      <form class="card doc-filters" @submit.prevent="load">
        <template v-if="tab === 'income'">
          <StbDateInput v-model="period.from" required />
          <StbDateInput v-model="period.to" required />
        </template>
        <StbDateInput v-else v-model="asOf" required />
        <select v-if="branches.hasMany" v-model="branchId" class="form-select">
          <option value="">كل الفروع</option>
          <option v-for="b in branches.options" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <label class="check"><input v-model="detailed" type="checkbox" /> كل الحسابات</label>
        <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': loading }" :disabled="loading">
          عرض
        </button>
      </form>

      <!-- ══ قائمة الدخل ══ -->
      <div v-if="tab === 'income' && income" ref="report" class="card statement printable">
        <h2>قائمة الدخل <small>من {{ income.from }} إلى {{ income.to }}</small></h2>
        <StatementSection title="الإيرادات" :rows="shown(income.revenue)" :total="income.totals.revenue" />
        <StatementSection title="المصروفات" :rows="shown(income.expenses)" :total="income.totals.expenses" />
        <div v-if="income.totals.grossProfit !== null" class="statement__line">
          <span>مجمل الربح (إيرادات النشاط − تكلفة المبيعات)</span>
          <strong class="doc-num">{{ formatMoney(income.totals.grossProfit) }}</strong>
        </div>
        <div class="statement__line statement__line--total" :class="income.totals.netProfit < 0 ? 'is-loss' : 'is-profit'">
          <span>{{ income.totals.netProfit < 0 ? "صافي الخسارة" : "صافي الربح" }}</span>
          <strong class="doc-num">{{ formatMoney(Math.abs(income.totals.netProfit)) }}</strong>
        </div>
      </div>

      <!-- ══ الميزانية ══ -->
      <div v-else-if="tab === 'balance' && sheet" ref="report" class="card statement printable">
        <h2>
          المركز المالي في {{ sheet.asOf }}
          <span v-if="sheet.totals.balanced" class="doc-money--in">متوازنة ✓</span>
          <span v-else class="doc-money--out">غير متوازنة</span>
        </h2>
        <StatementSection title="الأصول" :rows="shown(sheet.assets)" :total="sheet.totals.assets" />
        <StatementSection title="الخصوم" :rows="shown(sheet.liabilities)" :total="sheet.totals.liabilities" />
        <StatementSection title="حقوق الملكية" :rows="shown(sheet.equity)">
          <div class="statement__line">
            <span>أرباح (خسائر) السنوات السابقة غير المقفلة</span>
            <span class="doc-num">{{ formatMoney(sheet.earnings.retained) }}</span>
          </div>
          <div class="statement__line">
            <span>صافي ربح (خسارة) السنة حتى التاريخ</span>
            <span class="doc-num">{{ formatMoney(sheet.earnings.currentYear) }}</span>
          </div>
          <div class="statement__line statement__line--sub">
            <span>إجمالي حقوق الملكية</span>
            <strong class="doc-num">{{ formatMoney(sheet.totals.equity) }}</strong>
          </div>
        </StatementSection>
        <div class="statement__line statement__line--total">
          <span>إجمالي الخصوم وحقوق الملكية</span>
          <strong class="doc-num">{{ formatMoney(sheet.totals.liabilitiesAndEquity) }}</strong>
        </div>
      </div>

      <div v-else-if="loading" class="empty-state"><div class="spinner spinner--lg" /></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, onMounted, reactive, ref, watch, type PropType } from "vue";
import { Printer } from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useBranchesStore } from "@/stores/branches";
import { useToast } from "@/composables/useToast";
import type { AmountRow, BalanceSheet, IncomeStatement } from "@/types/accounting";

definePageMeta({ middleware: "auth" });

const store = useAccountingStore();
const branches = useBranchesStore();
const toast = useToast();
const notActive = ref(false);
const loading = ref(false);
const tab = ref<"income" | "balance">("income");
const detailed = ref(false);
const branchId = ref("");

const today = companyToday();
const period = reactive({ from: `${today.slice(0, 4)}-01-01`, to: today });
const asOf = ref(today);
const income = ref<IncomeStatement | null>(null);
const sheet = ref<BalanceSheet | null>(null);

/** الملخص: المجموعات حتى المستوى الثالث بلا أصفار؛ "كل الحسابات" يعرض الفرعية */
const shown = (rows: AmountRow[]) =>
  rows.filter((r) => r.depth > 1 && r.amount !== 0 && (detailed.value || r.isGroup || r.depth <= 3));

/** قسم في القائمة: عنوانه، أسطره مزاحة بمستواها، وإجماليه */
const StatementSection = defineComponent({
  props: {
    title: { type: String, required: true },
    rows: { type: Array as PropType<AmountRow[]>, required: true },
    total: { type: Number, default: null },
  },
  setup(props, { slots }) {
    return () =>
      h("section", { class: "statement__section" }, [
        h("h3", props.title),
        ...props.rows.map((row) =>
          h(
            "div",
            {
              class: ["statement__line", { "is-group": row.isGroup }],
              style: { paddingInlineStart: `${(row.depth - 2) * 18}px` },
            },
            [
              h("span", [h("code", { class: "doc-code" }, row.code), ` ${row.name}`]),
              h("span", { class: "doc-num" }, formatMoney(row.amount)),
            ],
          ),
        ),
        slots.default?.(),
        props.total !== null
          ? h("div", { class: "statement__line statement__line--sub" }, [
              h("span", `إجمالي ${props.title}`),
              h("strong", { class: "doc-num" }, formatMoney(props.total)),
            ])
          : null,
      ]);
  },
});

const load = async () => {
  loading.value = true;
  try {
    if (tab.value === "income") {
      income.value = await store.incomeStatement({
        from: period.from,
        to: period.to,
        branchId: branchId.value || undefined,
      });
    } else {
      sheet.value = await store.balanceSheet({
        asOf: asOf.value,
        branchId: branchId.value || undefined,
      });
    }
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل القائمة"));
  } finally {
    loading.value = false;
  }
};

watch(tab, () => {
  if ((tab.value === "income" && !income.value) || (tab.value === "balance" && !sheet.value)) {
    void load();
  }
});

const report = ref<HTMLElement | null>(null);
const print = () => printElement(report.value);

onMounted(async () => {
  try {
    const status = await store.fetchStatus();
    notActive.value = !status.active;
    if (!status.active) return;
    branches.fetchOptions().catch(() => {});
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل القوائم"));
  }
});
</script>

<style lang="scss" scoped>
.statement {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-5;

  h2 {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: $space-3;
    margin: 0;
    font-size: $font-size-lg;

    small,
    span {
      font-size: $font-size-sm;
      font-weight: 400;
      color: $stb-text-muted;
    }
  }

  :deep(.statement__section) {
    display: flex;
    flex-direction: column;

    h3 {
      margin: $space-2 0;
      font-size: $font-size-base;
      color: $stb-text-secondary;
    }
  }

  :deep(.statement__line) {
    display: flex;
    justify-content: space-between;
    gap: $space-3;
    padding: $space-1 0;
    border-bottom: 1px dashed $stb-border;
    font-size: $font-size-sm;

    &.is-group {
      font-weight: 700;
    }
    code {
      color: $stb-text-muted;
    }
  }
  :deep(.statement__line--sub) {
    font-weight: 700;
    border-bottom-style: solid;
  }
  :deep(.statement__line--total) {
    margin-top: $space-2;
    padding: $space-3;
    border: 0;
    border-radius: $radius-md;
    font-size: $font-size-base;
    font-weight: 800;
    background: rgba($stb-success, 0.1);

    &.is-loss {
      background: rgba($stb-danger, 0.1);
    }
  }
}
.check {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}
</style>
