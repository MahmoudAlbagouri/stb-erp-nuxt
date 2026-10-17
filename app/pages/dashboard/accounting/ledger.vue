<!-- pages/dashboard/accounting/ledger.vue — كشف حساب (دفتر الأستاذ) برصيد متحرك -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>كشف حساب</h1>
        <p>حركة حساب (أو مجموعة حسابات) في فترة، برصيد أول المدة والرصيد بعد كل حركة</p>
      </div>
      <div class="page-header__actions">
        <ReportExport
          v-if="result"
          path="/accounting/reports/ledger/export"
          :query="shownQuery"
          :filename="`ledger_${result.account.code}_${result.from}_${result.to}`"
        />
        <button class="btn btn--ghost" :disabled="!result" @click="print">
          <Printer :size="16" /> طباعة
        </button>
      </div>
    </div>

    <AccountingInactive v-if="notActive" />

    <template v-else>
      <form class="card doc-filters report-filters" @submit.prevent="load">
        <AccountSelect v-model="query.accountId" :accounts="store.accounts" required />
        <StbDateInput v-model="query.from" required />
        <StbDateInput v-model="query.to" required />
        <select v-if="branches.hasMany" v-model="query.branchId" class="form-select">
          <option value="">كل الفروع</option>
          <option v-for="b in branches.options" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': loading }" :disabled="loading">
          عرض
        </button>
      </form>

      <div v-if="loading && !result" class="empty-state"><div class="spinner spinner--lg" /></div>

      <div v-else-if="result" ref="report" class="card doc-table-card printable">
        <div class="report-title">
          <h2>كشف حساب {{ result.account.code }} — {{ result.account.name }}</h2>
          <span>من {{ result.from }} إلى {{ result.to }}</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>القيد</th>
                <th>البيان</th>
                <th v-if="result.account.isGroup">الحساب</th>
                <th>مدين</th>
                <th>دائن</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              <tr class="report-row--sub">
                <td colspan="2" />
                <td>رصيد أول المدة</td>
                <td v-if="result.account.isGroup" />
                <td />
                <td />
                <td class="doc-num doc-num--strong">{{ signed(result.opening) }}</td>
              </tr>
              <tr v-for="line in result.lines" :key="line.id">
                <td class="doc-num">{{ line.date }}</td>
                <td>
                  <button type="button" class="link-btn" @click="viewing = line.entryId">
                    <code class="doc-code">{{ line.entryNumber }}</code>
                  </button>
                </td>
                <td>
                  {{ line.description }}
                  <span v-if="line.partyName" class="doc-cell__sub"> — {{ line.partyName }}</span>
                  <span v-if="line.sourceRef" class="doc-cell__sub"> ({{ line.sourceRef }})</span>
                </td>
                <td v-if="result.account.isGroup">
                  <code class="doc-code">{{ line.accountCode }}</code> {{ line.accountName }}
                </td>
                <td class="doc-num">{{ line.debit ? formatMoney(line.debit) : "" }}</td>
                <td class="doc-num">{{ line.credit ? formatMoney(line.credit) : "" }}</td>
                <td class="doc-num">{{ signed(line.balance) }}</td>
              </tr>
              <tr v-if="!result.lines.length">
                <td :colspan="result.account.isGroup ? 7 : 6" class="empty-state__text">
                  لا حركة في هذه الفترة
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th :colspan="result.account.isGroup ? 4 : 3">الإجمالي والرصيد الختامي</th>
                <th class="doc-num">{{ formatMoney(result.debit) }}</th>
                <th class="doc-num">{{ formatMoney(result.credit) }}</th>
                <th class="doc-num">{{ signed(result.closing) }}</th>
              </tr>
            </tfoot>
          </table>
        </div>
        <p v-if="result.truncated" class="doc-hint">
          عُرضت أول 5000 حركة فقط — ضيّق الفترة لترى الباقي.
        </p>
      </div>
    </template>

    <JournalEntryModal v-model:entry-id="viewing" @reversed="load" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Printer } from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useBranchesStore } from "@/stores/branches";
import { useToast } from "@/composables/useToast";
import type { Ledger } from "@/types/accounting";

definePageMeta({ middleware: "auth" });

const store = useAccountingStore();
const branches = useBranchesStore();
const toast = useToast();
const route = useRoute();
const notActive = ref(false);
const loading = ref(false);
const result = ref<Ledger | null>(null);
const viewing = ref<string | null>(null);
/** فلاتر الكشف المعروض (للتصدير) */
const shownQuery = ref<object>({});

const today = companyToday();
const query = reactive({
  accountId: typeof route.query.accountId === "string" ? route.query.accountId : "",
  from: `${today.slice(0, 7)}-01`,
  to: today,
  branchId: "",
});

/** الرصيد بطبيعته: مدين (م) أو دائن (د) */
const signed = (value: number) =>
  value === 0 ? "0" : `${formatMoney(Math.abs(value))} ${value > 0 ? "م" : "د"}`;

const load = async () => {
  if (!query.accountId) return;
  loading.value = true;
  try {
    const params = {
      accountId: query.accountId,
      from: query.from,
      to: query.to,
      branchId: query.branchId || undefined,
    };
    result.value = await store.ledger(params);
    shownQuery.value = params;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل كشف الحساب"));
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
    await store.fetchAccounts();
    if (query.accountId) await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الحسابات"));
  }
});
</script>

<style lang="scss" scoped>
.report-filters {
  > :first-child {
    flex: 2;
    min-width: 240px;
  }
}
.report-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: $space-2;
  padding: $space-4 $space-4 0;

  h2 {
    margin: 0;
    font-size: $font-size-lg;
  }
  span {
    color: $stb-text-muted;
    font-size: $font-size-sm;
  }
}
.report-row--sub td {
  font-weight: 700;
  color: $stb-text-secondary;
}
.link-btn {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
</style>
