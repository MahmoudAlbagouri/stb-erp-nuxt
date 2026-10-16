// stores/accounting.ts — المحاسبة: التفعيل، شجرة الحسابات، القيود، والتقارير
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type {
  Account,
  AccountingStatus,
  AccountPayload,
  BalanceSheet,
  IncomeStatement,
  JournalEntry,
  JournalEntryView,
  JournalFilters,
  JournalPayload,
  Ledger,
  PartyType,
  PeriodQuery,
  SettingsPayload,
  TemplateAccount,
  TrialBalance,
} from "@/types/accounting";

const BASE = "/accounting";

export const useAccountingStore = defineStore("accounting", () => {
  const api = useApi();

  // ─── التفعيل والإعدادات ─────────────────────────────────────────────────────
  const status = ref<AccountingStatus | null>(null);

  const fetchStatus = async () => {
    status.value = (await api.get<AccountingStatus>(`${BASE}/status`)).data;
    return status.value;
  };

  const fetchTemplate = async (country: string) =>
    (await api.get<TemplateAccount[]>(`${BASE}/templates/${country}`)).data;

  const activate = async (country?: string) => {
    status.value = (
      await api.post<AccountingStatus>(`${BASE}/activate`, country ? { country } : {})
    ).data;
    accounts.value = [];
    return status.value;
  };

  const updateSettings = async (payload: SettingsPayload) => {
    status.value = (
      await api.patch<AccountingStatus>(`${BASE}/settings`, payload)
    ).data;
    return status.value;
  };

  const sync = async () =>
    (
      await api.post<{ skipped: boolean; posted: number; failed: number }>(
        `${BASE}/sync`,
        {},
      )
    ).data;

  // ─── شجرة الحسابات ──────────────────────────────────────────────────────────
  const accounts = ref<Account[]>([]);

  const fetchAccounts = async (force = false) => {
    if (accounts.value.length && !force) return accounts.value;
    accounts.value = (await api.get<Account[]>(`${BASE}/accounts`)).data;
    return accounts.value;
  };

  const createAccount = async (payload: AccountPayload) => {
    const created = (await api.post<Account>(`${BASE}/accounts`, payload)).data;
    await fetchAccounts(true);
    return created;
  };

  const updateAccount = async (id: string, payload: AccountPayload) => {
    const updated = (await api.patch<Account>(`${BASE}/accounts/${id}`, payload)).data;
    await fetchAccounts(true);
    return updated;
  };

  const removeAccount = async (id: string) => {
    await api.del(`${BASE}/accounts/${id}`);
    await fetchAccounts(true);
  };

  // ─── القيود ─────────────────────────────────────────────────────────────────
  const fetchJournals = async (filters: JournalFilters = {}) =>
    (
      await api.get<Paginated<JournalEntry>>(
        `${BASE}/journals${toQueryString(filters)}`,
      )
    ).data;

  const getJournal = async (id: string) =>
    (await api.get<JournalEntryView>(`${BASE}/journals/${id}`)).data;

  const createJournal = async (payload: JournalPayload) =>
    (await api.post<JournalEntryView>(`${BASE}/journals`, payload)).data;

  const reverseJournal = async (id: string, date: string) =>
    (
      await api.post<JournalEntryView>(`${BASE}/journals/${id}/reverse`, { date })
    ).data;

  // ─── التقارير ───────────────────────────────────────────────────────────────
  const trialBalance = async (query: PeriodQuery & { level?: number }) =>
    (
      await api.get<TrialBalance>(
        `${BASE}/reports/trial-balance${toQueryString(query)}`,
      )
    ).data;

  const ledger = async (
    query: PeriodQuery & {
      accountId: string;
      partyType?: PartyType;
      partyId?: string;
    },
  ) =>
    (await api.get<Ledger>(`${BASE}/reports/ledger${toQueryString(query)}`)).data;

  const incomeStatement = async (query: PeriodQuery) =>
    (
      await api.get<IncomeStatement>(
        `${BASE}/reports/income-statement${toQueryString(query)}`,
      )
    ).data;

  const balanceSheet = async (query: { asOf: string; branchId?: string }) =>
    (
      await api.get<BalanceSheet>(
        `${BASE}/reports/balance-sheet${toQueryString(query)}`,
      )
    ).data;

  const reset = () => {
    status.value = null;
    accounts.value = [];
  };

  return {
    status,
    fetchStatus,
    fetchTemplate,
    activate,
    updateSettings,
    sync,
    accounts,
    fetchAccounts,
    createAccount,
    updateAccount,
    removeAccount,
    fetchJournals,
    getJournal,
    createJournal,
    reverseJournal,
    trialBalance,
    ledger,
    incomeStatement,
    balanceSheet,
    reset,
  };
});
