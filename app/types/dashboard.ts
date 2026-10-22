// types/dashboard.ts — رد ‎GET /dashboard/overview (انظر DashboardService بالسيرفر).
// القسم null = خارج خطة الشركة أو بلا صلاحية عرض: يُحذف من الصفحة كلياً.

export type DashboardRangeDays = 7 | 30 | 90;

export interface DashboardOverview {
  /** الفترة بأيام الشركة المحلية (الطرفان مشمولان) والفترة السابقة المساوية لها */
  range: {
    days: number;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    /** true = فترة اختارها المستخدم، false = "آخر N يوماً" */
    custom: boolean;
  };
  /** الفرع المختار، أو null لكل الفروع */
  branchId: string | null;
  /** فروع الشركة النشطة المسموحة للمستخدم، لقائمة الاختيار */
  branches: { id: string; name: string }[];
  sales: SalesOverview | null;
  purchasing: PurchasingOverview | null;
  inventory: InventoryOverview | null;
  hr: HrOverview | null;
  attendance: AttendanceOverview | null;
}

export interface NamedAmount {
  name: string;
  total: number;
}

export interface SalesOverview {
  total: number;
  previousTotal: number;
  invoices: number;
  previousInvoices: number;
  /** ما قبل الضريبة: أساس نسبة هامش الربح */
  subtotal: number;
  grossProfit: number;
  previousGrossProfit: number;
  returnsTotal: number;
  /**
   * ما على العملاء الآن (لا يتقيد بالفترة): للشركة كلها مجموع أرصدتهم كصفحة
   * العملاء، ومع فرع المتبقي على فواتيره فقط
   */
  receivables: number;
  /** من أين حُسب `receivables` و`topDebtors` */
  receivablesBasis: "balances" | "invoices";
  daily: { date: string; total: number; invoices: number }[];
  /** الفترة السابقة يوماً بيوم، بنفس طول `daily` وترتيبه */
  previousDaily: number[];
  /** 24 خانة: مبيعات كل ساعة من اليوم بتوقيت الشركة */
  byHour: { hour: number; total: number; invoices: number }[];
  byCategory: NamedAmount[];
  paymentMethods: { method: string; amount: number }[];
  topProducts: { name: string; quantity: number; total: number }[];
  topCustomers: (NamedAmount & { invoices: number })[];
  topDebtors: NamedAmount[];
  /** كل الفروع دائماً، حتى مع اختيار فرع */
  branches: {
    id: string;
    name: string;
    total: number;
    invoices: number;
    grossProfit: number;
  }[];
  /** null = نقاط البيع خارج الخطة */
  cashiers: (NamedAmount & { invoices: number })[] | null;
  recentInvoices: {
    id: string;
    number: string | null;
    issuedAt: string;
    customer: string | null;
    total: number;
    remaining: number;
  }[];
  /** null = نقاط البيع خارج الخطة */
  openShifts: number | null;
}

export interface PurchasingOverview {
  total: number;
  previousTotal: number;
  invoices: number;
  payables: number;
  topSuppliers: NamedAmount[];
}

export interface InventoryOverview {
  value: number;
  items: number;
  low: number;
  negative: number;
  lowStock: {
    product: string;
    warehouse: string;
    quantity: number;
    minQuantity: number;
  }[];
}

export interface HrOverview {
  employees: { active: number; inactive: number; terminated: number };
  departments: { name: string; count: number }[];
  /** الموظفون النشطون في كل فرع */
  branches: { name: string; count: number }[];
  pending: {
    leaves: number;
    advances: number;
    loans: number;
    bonuses: number;
    deductions: number;
  };
  /** ما يحتاج متابعة خلال 30 يوماً */
  alerts: {
    contractsEnding: number;
    residencyExpiring: number;
    onLeaveToday: number;
    newHires: number;
  };
  payroll: { year: number; month: number; total: number; paid: boolean }[] | null;
}

export interface AttendanceOverview {
  date: string;
  present: number;
  late: number;
  onLeave: number;
  absent: number;
}
