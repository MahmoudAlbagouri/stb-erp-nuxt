// types/accounting.ts — المحاسبة (مرآة src/modules/accounting في الباك إند)

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  asset: "الأصول",
  liability: "الخصوم",
  equity: "حقوق الملكية",
  revenue: "الإيرادات",
  expense: "المصروفات",
};

export interface Account {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  type: AccountType;
  parentId: string | null;
  isGroup: boolean;
  /** حساب نظام يرحّل إليه القيد التلقائي (لا يُحذف ولا يُوقف) */
  systemKey: string | null;
  isActive: boolean;
  description: string | null;
}

export interface AccountPayload {
  parentId?: string;
  code?: string;
  name?: string;
  nameEn?: string | null;
  isGroup?: boolean;
  isActive?: boolean;
  description?: string | null;
}

export type PartyType = "customer" | "supplier" | "employee" | "courier";

export const PARTY_LABEL: Record<PartyType, string> = {
  customer: "عميل",
  supplier: "مورد",
  employee: "موظف",
  courier: "جهة توصيل",
};

export type JournalSource =
  | "manual"
  | "opening"
  | "sales_invoice"
  | "sales_return"
  | "customer_payment"
  | "purchase_invoice"
  | "purchase_return"
  | "supplier_payment"
  | "stock_adjustment"
  | "stocktake"
  | "delivery_settlement"
  | "pos_shift"
  | "pos_cash_movement"
  | "payroll"
  | "advance"
  | "loan"
  | "bonus"
  | "leave_settlement"
  | "customer_opening"
  | "supplier_opening";

export const JOURNAL_SOURCE_LABEL: Record<JournalSource, string> = {
  manual: "قيد يدوي",
  opening: "قيد افتتاحي",
  sales_invoice: "فاتورة بيع",
  sales_return: "مرتجع بيع",
  customer_payment: "سند قبض / ردّ لعميل",
  purchase_invoice: "فاتورة شراء",
  purchase_return: "مرتجع شراء",
  supplier_payment: "سداد مورد",
  stock_adjustment: "تسوية مخزون",
  stocktake: "جرد",
  delivery_settlement: "تسوية جهة توصيل",
  pos_shift: "عجز/زيادة وردية",
  pos_cash_movement: "حركة درج كاشير",
  payroll: "مسير رواتب",
  advance: "سلفة موظف",
  loan: "قرض موظف",
  bonus: "مكافأة مصروفة",
  leave_settlement: "بدل إجازة",
  customer_opening: "رصيد افتتاحي لعميل",
  supplier_opening: "رصيد افتتاحي لمورد",
};

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  /** تاريخ المستند إن قُيِّد في أول يوم مفتوح (فترة مقفلة) */
  documentDate: string | null;
  description: string;
  sourceType: JournalSource;
  sourceId: string | null;
  sourceRef: string | null;
  total: number;
  reversalOfId: string | null;
  reversedById: string | null;
  createdAt: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string | null;
  branchId: string | null;
  branchName: string | null;
  partyType: PartyType | null;
  partyId: string | null;
  partyName: string | null;
}

export interface JournalEntryView extends JournalEntry {
  lines: JournalLine[];
}

export interface JournalLinePayload {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string | null;
  branchId?: string | null;
  partyType?: PartyType | null;
  partyId?: string | null;
}

export interface JournalPayload {
  date: string;
  description: string;
  lines: JournalLinePayload[];
}

export interface JournalFilters {
  from?: string;
  to?: string;
  sourceType?: JournalSource | "";
  accountId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PostingError {
  id: string;
  sourceType: JournalSource;
  sourceId: string;
  sourceEvent: string;
  message: string;
  attempts: number;
  lastSeenAt: string;
}

export interface AccountingSettings {
  activatedAt: string;
  startDate: string;
  lockDate: string | null;
  chartCountry: string;
  lastSyncAt: string | null;
}

export interface AccountingStatus {
  active: boolean;
  settings: AccountingSettings | null;
  receiptAccounts: Record<string, string>;
  paymentAccounts: Record<string, string>;
  errors: PostingError[];
  errorsCount: number;
}

export interface SettingsPayload {
  lockDate?: string | null;
  receiptAccounts?: Record<string, string>;
  paymentAccounts?: Record<string, string>;
}

export interface TemplateAccount {
  code: string;
  name: string;
  isGroup: boolean;
  parentCode?: string;
}

/** حساب في تقرير بموضعه في الشجرة (depth 1 = رئيسي) */
export interface ReportAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isGroup: boolean;
  depth: number;
}

export interface TrialBalanceRow extends ReportAccount {
  opening: number;
  debit: number;
  credit: number;
  closing: number;
}

export interface TrialBalance {
  from: string;
  to: string;
  rows: TrialBalanceRow[];
  totals: { opening: number; debit: number; credit: number; closing: number };
}

export interface AmountRow extends ReportAccount {
  amount: number;
}

export interface IncomeStatement {
  from: string;
  to: string;
  revenue: AmountRow[];
  expenses: AmountRow[];
  totals: {
    revenue: number;
    expenses: number;
    grossProfit: number | null;
    netProfit: number;
  };
}

export interface BalanceSheet {
  asOf: string;
  assets: AmountRow[];
  liabilities: AmountRow[];
  equity: AmountRow[];
  earnings: { retained: number; currentYear: number };
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
    liabilitiesAndEquity: number;
    balanced: boolean;
  };
}

export interface LedgerLine {
  id: string;
  date: string;
  entryId: string;
  entryNumber: string;
  description: string;
  sourceType: JournalSource;
  sourceRef: string | null;
  accountCode: string;
  accountName: string;
  partyName: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface Ledger {
  account: ReportAccount;
  from: string;
  to: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
  lines: LedgerLine[];
  truncated: boolean;
}

export interface PeriodQuery {
  from: string;
  to: string;
  branchId?: string;
}
