<!-- pages/dashboard/accounting/trial-balance.vue — ميزان المراجعة: أول المدة، حركة الفترة، الختامي -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>ميزان المراجعة</h1>
        <p>رصيد كل حساب أول الفترة وحركته فيها ورصيده الختامي — مجموع المدين يساوي مجموع الدائن</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--ghost" :disabled="!result" @click="print">
          <Printer :size="16" /> طباعة
        </button>
      </div>
    </div>

    <AccountingInactive v-if="notActive" />

    <template v-else>
      <form class="card doc-filters" @submit.prevent="load">
        <StbDateInput v-model="query.from" required />
        <StbDateInput v-model="query.to" required />
        <select v-model.number="query.level" class="form-select">
          <option :value="0">كل المستويات</option>
          <option v-for="n in 4" :key="n" :value="n">حتى المستوى {{ n }}</option>
        </select>
        <select v-if="branches.hasMany" v-model="query.branchId" class="form-select">
          <option value="">كل الفروع</option>
          <option v-for="b in branches.options" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <label class="check"><input v-model="hideZero" type="checkbox" /> إخفاء الأصفار</label>
        <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': loading }" :disabled="loading">
          عرض
        </button>
      </form>

      <div v-if="loading && !result" class="empty-state"><div class="spinner spinner--lg" /></div>

      <div v-else-if="result" ref="report" class="card doc-table-card printable">
        <div class="report-title">
          <h2>ميزان المراجعة</h2>
          <span>من {{ result.from }} إلى {{ result.to }}</span>
          <span v-if="balanced" class="doc-money--in">متوازن ✓</span>
          <span v-else class="doc-money--out">غير متوازن</span>
        </div>
        <div class="table-responsive">
          <table class="data-table tb-table">
            <thead>
              <tr>
                <th rowspan="2">الحساب</th>
                <th colspan="2">أول المدة</th>
                <th colspan="2">حركة الفترة</th>
                <th colspan="2">الرصيد الختامي</th>
              </tr>
              <tr>
                <th>مدين</th><th>دائن</th><th>مدين</th><th>دائن</th><th>مدين</th><th>دائن</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" :class="{ 'is-group': row.isGroup }">
                <td :style="{ paddingInlineStart: `${(row.depth - 1) * 18 + 12}px` }">
                  <code class="doc-code">{{ row.code }}</code> {{ row.name }}
                </td>
                <td class="doc-num">{{ side(row.opening, "d") }}</td>
                <td class="doc-num">{{ side(row.opening, "c") }}</td>
                <td class="doc-num">{{ row.debit ? formatMoney(row.debit) : "" }}</td>
                <td class="doc-num">{{ row.credit ? formatMoney(row.credit) : "" }}</td>
                <td class="doc-num">{{ side(row.closing, "d") }}</td>
                <td class="doc-num">{{ side(row.closing, "c") }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th>الإجمالي</th>
                <th class="doc-num">{{ formatMoney(rootSum("opening", "d")) }}</th>
                <th class="doc-num">{{ formatMoney(rootSum("opening", "c")) }}</th>
                <th class="doc-num">{{ formatMoney(result.totals.debit) }}</th>
                <th class="doc-num">{{ formatMoney(result.totals.credit) }}</th>
                <th class="doc-num">{{ formatMoney(rootSum("closing", "d")) }}</th>
                <th class="doc-num">{{ formatMoney(rootSum("closing", "c")) }}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Printer } from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useBranchesStore } from "@/stores/branches";
import { useToast } from "@/composables/useToast";
import type { TrialBalance, TrialBalanceRow } from "@/types/accounting";

definePageMeta({ middleware: "auth" });

const store = useAccountingStore();
const branches = useBranchesStore();
const toast = useToast();
const notActive = ref(false);
const loading = ref(false);
const result = ref<TrialBalance | null>(null);
const hideZero = ref(true);

const today = companyToday();
const query = reactive({
  from: `${today.slice(0, 4)}-01-01`,
  to: today,
  level: 0,
  branchId: "",
});

const rows = computed(() =>
  (result.value?.rows ?? []).filter(
    (r) => !hideZero.value || r.opening || r.debit || r.credit || r.closing,
  ),
);
const balanced = computed(
  () =>
    !!result.value &&
    Math.abs(result.value.totals.debit - result.value.totals.credit) < 0.0005,
);

/** الرصيد في عموده: مدين (موجب) أو دائن (سالب) */
const side = (value: number, column: "d" | "c") =>
  column === "d" ? (value > 0 ? formatMoney(value) : "") : value < 0 ? formatMoney(-value) : "";

/** مجموع عمود من الحسابات الرئيسية (لا ازدواج مع ما تحتها) */
const rootSum = (field: "opening" | "closing", column: "d" | "c") =>
  (result.value?.rows ?? [])
    .filter((r: TrialBalanceRow) => r.depth === 1)
    .reduce((sum, r) => {
      const v = r[field];
      return sum + (column === "d" ? Math.max(v, 0) : Math.max(-v, 0));
    }, 0);

const load = async () => {
  loading.value = true;
  try {
    result.value = await store.trialBalance({
      from: query.from,
      to: query.to,
      level: query.level || undefined,
      branchId: query.branchId || undefined,
    });
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل ميزان المراجعة"));
  } finally {
    loading.value = false;
  }
};

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
    toast.error(getErrorMessage(e, "تعذر تحميل ميزان المراجعة"));
  }
});
</script>

<style lang="scss" scoped>
.report-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: $space-2 $space-4;
  padding: $space-4 $space-4 0;

  h2 {
    margin: 0;
    font-size: $font-size-lg;
  }
  span {
    font-size: $font-size-sm;
  }
}
.tb-table {
  thead th {
    text-align: center;
  }
  tr.is-group td {
    font-weight: 700;
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
