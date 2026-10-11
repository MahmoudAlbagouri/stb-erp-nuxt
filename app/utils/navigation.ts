// utils/navigation.ts
// ✅ خريطة الصفحات: المصدر الوحيد لعناصر القائمة الجانبية ولقواعد الوصول لكل
// مسار (تُستخدم في AppSidebar وفي layout لحماية الدخول بالرابط المباشر).

import type { Component } from "vue";
import {
  Banknote,
  Bell,
  Building2,
  Calculator,
  CalendarDays,
  Clock,
  CreditCard,
  FileCheck,
  FilePlus,
  FileText,
  Fingerprint,
  Gift,
  HandCoins,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  MinusCircle,
  Receipt,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
} from "lucide-vue-next";
import type { AccessRule } from "../composables/useAccess";
import { FEATURES as F, PERMS as P } from "./access";

export interface NavItem extends AccessRule {
  to: string;
  label: string;
  icon: Component;
}

export interface NavSection {
  id: string;
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "main",
    title: "الرئيسية",
    items: [
      { to: "/dashboard", label: "الصفحة الرئيسية", icon: LayoutDashboard },
      {
        to: "/dashboard/subscription",
        label: "اشتراكي الحالي",
        icon: CreditCard,
        permissions: [P.SUBSCRIPTION_VIEW_OWN],
      },
      { to: "/dashboard/profile", label: "ملفي الشخصي", icon: User },
    ],
  },
  {
    id: "admin",
    title: "إدارة النظام",
    items: [
      {
        to: "/dashboard/users",
        label: "المستخدمون",
        icon: Users,
        permissions: [P.USER_VIEW],
        feature: F.EMPLOYEES_MODULE,
      },
      {
        to: "/dashboard/notifications",
        label: "الإشعارات",
        icon: Bell,
        permissions: [P.NOTIFICATION_VIEW],
      },
      {
        to: "/dashboard/roles",
        label: "المسمى الوظيفي",
        icon: ShieldCheck,
        permissions: [P.ROLE_VIEW],
      },
      {
        to: "/dashboard/permissions",
        label: "الصلاحيات",
        icon: KeyRound,
        permissions: [P.PERMISSION_VIEW],
      },
      {
        to: "/dashboard/companies",
        label: "الشركات",
        icon: Building2,
        systemOnly: true,
      },
      {
        to: "/dashboard/plans",
        label: "الخطط والاشتراكات",
        icon: Layers,
        permissions: [P.PLAN_VIEW],
      },
      {
        to: "/dashboard/admin/subscriptions",
        label: "إدارة التجديدات",
        icon: RefreshCw,
        permissions: [P.SUBSCRIPTION_VIEW_ANY],
      },
      {
        to: "/dashboard/quotations",
        label: "عروض الأسعار والفواتير",
        icon: FileText,
        permissions: [P.QUOTATION_VIEW],
      },
    ],
  },
  {
    id: "hr",
    title: "الموارد البشرية",
    collapsible: true,
    items: [
      {
        to: "/dashboard/employees",
        label: "الموظفون",
        icon: Users,
        permissions: [P.EMPLOYEE_VIEW],
        feature: F.EMPLOYEES_MODULE,
      },
      {
        to: "/dashboard/contracts",
        label: "العقود",
        icon: FileText,
        permissions: [P.CONTRACT_VIEW],
        feature: F.CONTRACTS_MODULE,
      },
      {
        to: "/dashboard/salaries",
        label: "الرواتب",
        icon: Banknote,
        permissions: [P.SALARY_VIEW],
        feature: F.EMPLOYEES_MODULE,
      },
      {
        to: "/dashboard/leaves",
        label: "الإجازات",
        icon: CalendarDays,
        permissions: [P.LEAVE_VIEW, P.LEAVE_REQUEST_SELF],
        feature: F.LEAVES_MODULE,
      },
      {
        to: "/dashboard/attendance",
        label: "البصمة والحضور",
        icon: Fingerprint,
        permissions: [
          P.ATTENDANCE_LOGS_VIEW,
          P.ATTENDANCE_SUMMARY_VIEW,
          P.BIOMETRIC_DEVICE_VIEW,
        ],
        feature: F.ATTENDANCE_MODULE,
      },
      {
        to: "/dashboard/shifts",
        label: "أوقات العمل",
        icon: Clock,
        permissions: [P.SHIFT_VIEW],
      },
      {
        to: "/dashboard/advances",
        label: "السلف",
        icon: HandCoins,
        permissions: [P.ADVANCE_VIEW, P.ADVANCE_REQUEST_SELF],
        feature: F.ADVANCES_MODULE,
      },
      {
        to: "/dashboard/loans",
        label: "القروض",
        icon: Landmark,
        permissions: [P.LOAN_VIEW, P.LOAN_REQUEST_SELF],
        feature: F.LOANS_MODULE,
      },
      {
        to: "/dashboard/bonuses",
        label: "المكافآت",
        icon: Gift,
        permissions: [P.BONUS_VIEW],
        feature: F.BONUSES_MODULE,
      },
      {
        to: "/dashboard/deductions",
        label: "الخصومات",
        icon: MinusCircle,
        permissions: [P.DEDUCTION_VIEW],
        feature: F.DEDUCTIONS_MODULE,
      },
      {
        to: "/dashboard/resignations",
        label: "طلبات الاستقالة",
        icon: FilePlus,
        permissions: [P.RESIGNATION_REQUEST_SELF, P.RESIGNATION_VIEW_ALL],
        feature: F.RESIGNATIONS_MODULE,
      },
      {
        to: "/dashboard/eos",
        label: "نهاية الخدمة",
        icon: FileCheck,
        permissions: [P.EOS_VIEW],
        feature: F.SETTLEMENTS_MODULE,
      },
      {
        to: "/dashboard/payroll",
        label: "مسيرات الرواتب",
        icon: Calculator,
        permissions: [P.PAYROLL_VIEW],
        feature: F.PAYROLL_MODULE,
      },
      {
        to: "/dashboard/settlements",
        label: "تسويات الإجازات",
        icon: Receipt,
        permissions: [P.SETTLEMENT_VIEW],
        feature: F.SETTLEMENTS_MODULE,
      },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

/** عنصر التنقل المطابق لمسار (أطول تطابق، ليشمل الصفحات الفرعية مثل /employees/:id) */
export const findNavItem = (path: string): NavItem | undefined =>
  ALL_ITEMS.filter(
    (item) => path === item.to || path.startsWith(`${item.to}/`),
  ).sort((a, b) => b.to.length - a.to.length)[0];
