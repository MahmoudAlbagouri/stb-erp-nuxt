// ============================================
// STB ERP - Type Definitions (Updated for Payment Method & IBAN)
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  statusCode: number;
  data: T;
}

export interface Tenant {
  id: string;
  companyName: string;
  logo_url: string | null;
  domain: string | null;
  phone: string | null;
  address: string | null;
  /** رمز الدولة ISO (SA, EG…) */
  country: string | null;
  /** عملة الشركة ISO 4217 — تُشتق من الدولة */
  currency: string;
  status: "active" | "trial" | "inactive";
  language: string;
  timezone: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  displayNameAr?: string | null;
  scope: "system" | "tenant";
  tenantId: string | null;
}

export interface Role {
  id: string;
  name: string;
  scope: "system" | "tenant";
  tenantId: string | null;
  permissions?: Permission[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  status: "active" | "inactive" | "suspended";
  isSuperAdmin: boolean;
  isSystemAdmin: boolean;
  isEmailVerified: boolean;
  tenantId: string;
  roleId: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  role?: Role | null;
  tenant?: Tenant;
  /** الفروع المقيَّد بها. فارغة = كل الفروع */
  branches?: { id: string; name: string }[];
}

// ✅ تعريف واجهة المؤهل التعليمي
export interface Education {
  id?: string; // معرف المؤهل (للتحديث والحذف)
  degree: string; // درجة الشهادة
  certificateNumber?: string; // رقم الشهادة
  issuingAuthority?: string; // ✅ جهة الإصدار / المصدر (جديد)
  expiryDate?: string | null; // تاريخ الانتهاء
  attachmentPath?: string; // مسار المرفق
}

// ✅ بيانات من قام بالصرف (مشتركة بين المسير / التسويات / المكافآت / السلف)
export interface DisbursedByUser {
  id: string;
  username: string;
  email?: string;
}

/** حقول الصرف الاستثنائي المباشر (Off-Cycle Disbursement) */
export interface Disbursable {
  isDisbursed?: boolean;
  disbursedAt?: string;
  disbursedBy?: DisbursedByUser;
}

// ✅ تعريفات الجداول المرتبطة بالموظف
export type AdvanceStatus = "pending" | "approved" | "rejected" | "paid";

export interface Advance extends Disbursable {
  id: string;
  amount: number;
  reason?: string | null;
  status: AdvanceStatus;
  repaymentDate: string;
  createdAt: string;
  employeeId: string;
  employee?: Employee;
}

export type LoanStatus = "pending" | "approved" | "rejected" | "completed";

export interface Loan {
  id: string;
  totalAmount: number;
  installmentsCount: number;
  paidInstallments?: number;
  monthlyInstallment: number;
  startDate: string;
  reason?: string | null;
  status: LoanStatus;
  createdAt: string;
  employeeId: string;
  employee?: Employee;
}

export enum BonusStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid",
}

export interface Bonus extends Disbursable {
  id: string;
  amount: number;
  payoutDate: string;
  notes?: string | null;
  status?: BonusStatus;
  createdAt: string;
  employeeId: string;
  employee?: Employee;
}

export enum DeductionStatus {
  PENDING = "pending",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface Deduction {
  id: string;
  name: string;
  totalAmount: number;
  monthlyAmount: number;
  paidInstallments: number;
  installmentsCount: number;
  startDate: string;
  notes?: string | null;
  status?: DeductionStatus;
  createdAt: string;
  employeeId: string;
  employee?: Employee;
}

export type LeaveType = "annual" | "unpaid" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string | null;
  createdAt: string;
  employeeId: string;
  employee?: Employee;
}

export interface Settlement extends Disbursable {
  id: string;
  unusedLeaveDays: number;
  dailyRate?: number;
  totalAmount: number;
  settlementDate: string;
  notes?: string | null;
  createdAt: string;
  employeeId: string;
  employee?: Employee;
}

export interface EndOfService {
  id: string;
  eosAmount: number;
  terminationDate: string;
  reason: string;
  serviceYears: number;
  lastBasicSalary: number;
  payoutDate: string;
  notes?: string | null;
  createdAt: string;
  employeeId: string;
  employee?: Employee;
}

export interface ResignationRequest {
  id: string;
  requestDate: string;
  lastWorkingDay: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  employeeId: string;
}

// ✅ نوع طريقة الدفع
export type PaymentMethod = "CASH" | "BANK";

// ✅ تحديث واجهة Salary
export interface Salary {
  id: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  totalSalary: number;

  // ✅ الحقول الجديدة
  paymentMethod: PaymentMethod;
  iban?: string | null;

  createdAt: string;
  updatedAt?: string;
  employeeId: string;
  employee?: Employee;
}

export interface Department {
  id: string;
  name: string;
  tenantId: string;
  createdAt: string;
  employeesCount?: number;
}

export interface Shift {
  id: string;
  alias?: string;
  startTime?: string;
  endTime?: string;
}

export type NationalityType = "saudi" | "non_saudi" | "outside_sponsorship";

// ✅ تحديث واجهة Employee
export interface Employee {
  id: string;
  fullName: string;
  employeeCode: string;

  // حقول الجنسية والجواز/الإقامة
  nationalityType: NationalityType;
  iqamaExpiryDate?: string | null;

  nationalId?: string | null;
  nationalIdCardPath?: string | null;
  phone: string | null;
  jobTitle?: string | null;
  // ✅ القسم علاقة (كائن) وليس نصاً حراً
  departmentId?: string | null;
  department?: Department | null;
  /** الفرع الذي يعمل فيه */
  branchId?: string | null;
  branch?: { id: string; name: string } | null;

  status: "active" | "inactive" | "terminated";
  tenantId: string;
  shiftId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // العلاقات الأساسية
  user?: User | null;
  contract?: Contract | null;
  educations?: Education[];
  shift?: Shift | null;

  // ✅ العلاقات الجديدة
  advances?: Advance[];
  loans?: Loan[];
  bonuses?: Bonus[];
  deductions?: Deduction[];
  leaveRequests?: LeaveRequest[];
  settlements?: Settlement[];
  endOfServices?: EndOfService[];
  resignationRequests?: ResignationRequest[];
  salaries?: Salary[];
}

// --- Auth ---
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  companyName: string;
  /** رمز الدولة ISO: منه تُحدَّد العملة ومفتاح الهاتف */
  country: string;
  phone?: string;
  address?: string;
  username: string;
  email: string;
  password: string;
}

/** استجابة login / register / accept-disclaimer */
export interface AuthTokens {
  userId?: string;
  message?: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

// --- Forms & Payloads ---
export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  roleId?: string;
  /** فارغة = كل الفروع */
  branchIds?: string[];
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  status?: "active" | "inactive" | "suspended";
  roleId?: string;
  branchIds?: string[];
}

export interface CreateRolePayload {
  name: string;
  scope?: "system" | "tenant";
  permissionIds: string[];
}

export interface UpdateRolePayload {
  name?: string;
  permissionIds?: string[];
}

export interface CreatePermissionPayload {
  name: string;
  scope?: "system" | "tenant";
}

// ✅ تحديث بايلودات الموظفين
export interface CreateEmployeePayload {
  fullName: string;
  employeeCode?: string;
  nationalityType: "saudi" | "non_saudi" | "outside_sponsorship";
  iqamaExpiryDate?: string | null;
  nationalId?: string;
  nationalIdCardPath?: string;
  phone?: string;
  jobTitle?: string;
  departmentId?: string;
  branchId?: string;
  shiftId?: string;
  status?: "active" | "inactive" | "terminated";
  userId?: string;

  // ✅ إضافة المؤهلات عند الإنشاء
  educations?: Education[];
}

export interface UpdateEmployeePayload {
  fullName?: string;
  employeeCode?: string;
  nationalityType?: "saudi" | "non_saudi" | "outside_sponsorship";
  iqamaExpiryDate?: string | null;
  nationalId?: string;
  nationalIdCardPath?: string;
  phone?: string;
  jobTitle?: string;
  departmentId?: string | null;
  branchId?: string;
  shiftId?: string | null;
  status?: "active" | "inactive" | "terminated";
  userId?: string | null;

  // ✅ إضافة المؤهلات عند التحديث
  educations?: Education[];
}

// --- Leaves ---
export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number;
  totalAllowance: number;
  consumedDays: number;
  carriedOverDays?: number;
  accrualStartDate?: string;
  tenantId: string;
}

export interface CreateLeavePayload {
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason?: string;
}

export interface SetBalancePayload {
  employeeId: string;
  year: number;
  amount: number;
}

/** ملخص إجازات الموظف (GET /leaves/summary/:employeeId) */
export interface EmployeeLeaveSummary {
  totalAllowance: number;
  carriedOverDays: number;
  earnedDays: number;
  consumedAnnualDays: number;
  availableDays: number;
  allowedRequestLimit: number;
  requests: {
    id: string;
    startDate: string;
    endDate: string;
    type: LeaveType;
    status: LeaveStatus;
    days: number;
    reason?: string | null;
  }[];
}

// --- Contracts ---
export type ContractType = "دائم" | "جزئي" | "مرن" | "عن بعد" | "أخرى";
export type TicketType = "بدون" | "ذهاب فقط" | "ذهاب وعودة";
export type ProbationPeriod = "بدون" | "3 شهور" | "6 شهور";

export interface Contract {
  id: string;
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string | null;
  annualLeaveDays: number;
  contractDurationYears?: number | null;
  ticketType?: TicketType | null;
  probationPeriod?: ProbationPeriod | null;
  probationEndDate?: string | null;
  medicalInsurance?: string | null;
  nationality?: string | null;
  notes?: string | null;
  attachmentPaths?: string[] | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
}

export interface CreateContractPayload {
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
  annualLeaveDays: number;
  contractDurationYears?: number;
  ticketType?: TicketType;
  probationPeriod?: ProbationPeriod;
  notes?: string;
  attachmentPaths?: string[];
}

export interface UpdateContractPayload {
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  annualLeaveDays?: number;
  contractDurationYears?: number;
  ticketType?: TicketType;
  probationPeriod?: ProbationPeriod;
  notes?: string;
  attachmentPaths?: string[];
}

// --- Advances & Loans Payloads ---
export interface CreateAdvancePayload {
  amount: number;
  repaymentDate: string;
  reason?: string;
}

export interface CreateLoanPayload {
  totalAmount: number;
  installmentsCount: number;
  startDate: string;
  reason?: string;
}

// --- Salaries Payloads (✅ محدثة لتشمل طريقة الدفع والآيبان) ---
export interface CreateSalaryPayload {
  employeeId: string;
  basicSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;

  // ✅ الحقول الجديدة
  paymentMethod: PaymentMethod;
  iban?: string;
}

export interface UpdateSalaryPayload {
  basicSalary?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;

  // ✅ الحقول الجديدة
  paymentMethod?: PaymentMethod;
  iban?: string;
}

// --- Biometric / Attendance ---
export type DeviceStatus = "online" | "offline" | "disabled";
export type PunchType =
  | "check_in"
  | "check_out"
  | "break_out"
  | "break_in"
  | "overtime_in"
  | "overtime_out"
  | "leave";

export interface BiometricDevice {
  id: string;
  serialNumber: string;
  alias?: string;
  ipAddress?: string;
  location?: string;
  model?: string;
  /** منطقة ساعة الجهاز (IANA)؛ فارغة = منطقة الشركة */
  timezone?: string | null;
  /** الفرع المركَّب فيه الجهاز */
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  /** الحالة الفعلية محسوبة من آخر اتصال */
  status: DeviceStatus;
  lastSeenAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceLog {
  id: string;
  deviceUserId: string;
  employeeId?: string;
  employee?: Pick<Employee, "id" | "fullName" | "employeeCode">;
  deviceId?: string;
  device?: Pick<BiometricDevice, "id" | "alias" | "serialNumber" | "location">;
  punchTime: string;
  punchType: PunchType;
  verifyMode: string;
  deviceSn?: string;
  isManualEntry: boolean;
  isEdited: boolean;
  editedByName?: string;
  editedAt?: string;
  createdByName?: string;
  originalPunchTime?: string;
  leaveReason?: string;
  workHours?: number | null;
  overtimeHours?: number | null;
  createdAt: string;
}

export interface CreateDevicePayload {
  serialNumber: string;
  alias?: string;
  location?: string;
  model?: string;
  /** تُترك فارغة ليتبع الجهاز منطقة الشركة */
  timezone?: string;
  /** يُترك فارغاً للفرع الرئيسي */
  branchId?: string;
}

// --- Subscriptions ---
export interface QuotaUsage {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
}

/** ملخص الاشتراك (GET /subscriptions/me و /subscriptions/tenant/:id) */
export interface SubscriptionSummary {
  isSuperSystem?: boolean;
  plan: {
    id?: string;
    name: string;
    nameAr: string;
    price?: string | number | null;
    billingCycle?: string;
  };
  status: string;
  startDate?: string;
  endDate?: string | null;
  quotas: Record<string, QuotaUsage> | null;
  message?: string;
}

/** نتيجة POST /employees/onboard */
export interface OnboardingResult {
  employee: Employee;
  user?: User;
  role?: Role;
  contract?: Contract;
  salary?: Salary;
}

// --- JWT & Security ---
export interface JwtPermission {
  name: string;
  scope?: "system" | "tenant";
  tenantId?: string | null;
}

export interface JwtRole {
  id: string;
  name: string;
  scope?: "system" | "tenant";
  permissions?: JwtPermission[];
}

/** محتوى الـ JWT كما يوقّعه الباك إند (AuthService.getTokens) */
export interface DecodedToken {
  sub: string;
  tenantId?: string | null;
  isSuperAdmin: boolean;
  isSystemAdmin: boolean;
  employeeId?: string;
  role?: JwtRole | null;
  isDisclaimerAccepted?: boolean;
  /** وضع الدعم: معرّف مالك النظام الذي يعمل داخل الشركة بهذا التوكن */
  supportBy?: string;
  /** إعدادات دولة الشركة (تغيب عن مالك النظام) — انظر utils/countries */
  country?: string;
  currency?: string;
  timezone?: string;
  /** وقت الإصدار والانتهاء بالثواني (يضيفهما توقيع الـ JWT) */
  iat?: number;
  exp?: number;
}

// --- Toast ---
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// ============================================
// Settlements
// ============================================

export enum SettlementType {
  FULL = "FULL",
  PARTIAL = "PARTIAL",
}

export interface SettlementPreview {
  employeeId: string;
  year: number;
  serviceDays: number;
  availableDays: number;
  dailyRate: number;
  totalAmountIfFull: number;
}

export interface ConfirmSettlementPayload {
  employeeId: string;
  settlementDate: string;
  settlementType: SettlementType;
  daysToSettle?: number;
  notes?: string;
}

// الإشعارات: types/notifications.ts
