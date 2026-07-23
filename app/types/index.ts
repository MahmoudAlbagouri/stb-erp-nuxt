// ============================================
// STB ERP - Type Definitions (Updated for New Logic)
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
  phone: string;
  address: string;
  country: string | null;
  subscription_plan: "free" | "basic" | "pro" | "enterprise";
  status: "trial" | "active" | "suspended" | "expired";
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  max_users: number;
  storage_limit_mb: number;
  language: string;
  timezone: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Permission {
  id: string;
  name: string;
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

// ✅ تعريفات الجداول المرتبطة بالموظف (لإصلاح خطأ TypeScript)
export interface Advance {
  id: string;
  amount: number;
  reason?: string | null;
  status: "pending" | "approved" | "rejected" | "paid";
  repaymentDate: string;
  createdAt: string;
  employeeId: string;
}

export interface Loan {
  id: string;
  totalAmount: number;
  installmentsCount: number;
  monthlyInstallment: number;
  startDate: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: string;
  employeeId: string;
}

export interface Bonus {
  id: string;
  amount: number;
  payoutDate: string;
  notes?: string | null;
  createdAt: string;
  employeeId: string;
}

export interface Deduction {
  id: string;
  name: string;
  totalAmount: number;
  monthlyAmount: number;
  paidInstallments: number;
  installmentsCount: number;
  startDate: string;
  createdAt: string;
  employeeId: string;
}

export interface LeaveRequest {
  id: string;
  type: "annual" | "unpaid" | "other";
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  createdAt: string;
  employeeId: string;
}

export interface Settlement {
  id: string;
  unusedLeaveDays: number;
  totalAmount: number;
  settlementDate: string;
  notes?: string | null;
  createdAt: string;
  employeeId: string;
}

export interface EndOfService {
  id: string;
  eosAmount: number;
  terminationDate: string;
  reason: string;
  createdAt: string;
  employeeId: string;
}

export interface ResignationRequest {
  id: string;
  requestDate: string;
  lastWorkingDay: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  employeeId: string;
}

export interface Salary {
  id: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  totalSalary: number;
  createdAt: string;
  employeeId: string;
}

export interface Shift {
  id: string;
  alias?: string;
  startTime?: string;
  endTime?: string;
}

// ✅ تحديث واجهة Employee لتشمل الجنسية والمؤهلات وجميع العلاقات
export interface Employee {
  id: string;
  fullName: string;
  employeeCode: string;

  // حقول الجنسية والجواز/الإقامة
  nationalityType: "saudi" | "non_saudi" | "outside_sponsorship";
  iqamaExpiryDate?: string | null;

  nationalId?: string | null;
  nationalIdCardPath?: string | null;
  phone: string | null;
  jobTitle?: string | null;
  department?: string | null;

  status: "active" | "inactive" | "terminated";
  tenantId: string;
  shiftId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // العلاقات الأساسية
  user?: User | null;
  contract?: any; // يمكن استبداله بواجهة Contract لاحقاً
  educations?: Education[];
  shift?: Shift | null;

  // ✅ العلاقات الجديدة التي تسبب الخطأ
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
  phone?: string;
  address?: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  userId: string;
  email: string;
  tenantId: string;
  isSuperAdmin: boolean;
  isSystemAdmin: boolean;
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
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  status?: "active" | "inactive" | "suspended";
  roleId?: string;
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

// ✅ تحديث بايلودات الموظفين لتتوافق مع الواجهة الجديدة وتشمل المؤهلات
export interface CreateEmployeePayload {
  fullName: string;
  employeeCode?: string;
  nationalityType: "saudi" | "non_saudi" | "outside_sponsorship";
  iqamaExpiryDate?: string | null;
  nationalId?: string;
  nationalIdCardPath?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
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
  department?: string;
  status?: "active" | "inactive" | "terminated";
  userId?: string;

  // ✅ إضافة المؤهلات عند التحديث
  educations?: Education[];
}

// --- Leaves (Legacy Interfaces kept for compatibility if needed) ---
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
  type: "annual" | "unpaid" | "other";
  reason?: string;
}

export interface SetBalancePayload {
  employeeId: string;
  year: number;
  amount: number;
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

// --- Salaries Payloads ---
export interface CreateSalaryPayload {
  employeeId: string;
  basicSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;
}

export interface UpdateSalaryPayload {
  basicSalary?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;
}

// --- Biometric / Attendance ---
export type DeviceStatus = "online" | "offline" | "disabled";
export type PunchType = "check_in" | "check_out" | "break_out" | "break_in";
export type VerifyMode = "fingerprint" | "card" | "password" | "face";

export interface BiometricDevice {
  id: string;
  serialNumber: string;
  alias?: string;
  ipAddress?: string;
  location?: string;
  model?: string;
  status: DeviceStatus;
  lastSeenAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceLog {
  id: string;
  deviceUserId: string;
  employeeId?: string;
  deviceId?: string;
  punchTime: string;
  punchType: PunchType;
  verifyMode: VerifyMode;
  deviceSn?: string;
  employee?: Employee;
  device?: BiometricDevice;
}

export interface CreateDevicePayload {
  serialNumber: string;
  alias?: string;
  location?: string;
  model?: string;
}

// --- JWT & Security ---
export interface JwtPermission {
  name: string;
  scope: "system" | "tenant";
  tenantId?: string | null;
}

export interface JwtRole {
  id: string;
  name: string;
  scope: "system" | "tenant";
  permissions?: JwtPermission[];
}

export interface DecodedToken {
  id: string;
  tenantId?: string;
  isSuperAdmin: boolean;
  isSystemAdmin: boolean;
  employeeId?: string;
  role?: JwtRole;
  permissions: JwtPermission[];
}

// --- Toast ---
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// ============================================
// Settlements (Updated for Partial/Full Logic)
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
