// types/branches.ts — الفروع: كيان فوق المخازن (للفرع مخازنه وموظفوه وأجهزته)

/** ما تحتاجه قوائم الاختيار (نموذج موظف، مخزن، جهاز، فلتر) */
export interface BranchOption {
  id: string;
  name: string;
  code?: string | null;
  isMain: boolean;
  isActive: boolean;
}

export interface Branch extends BranchOption {
  /** يُطبع على فواتير الفرع */
  address?: string | null;
  phone?: string | null;
  /** موقع الفرع: بدونه لا تُقبل بصمة الجوال من موظفيه */
  latitude?: number | string | null;
  longitude?: number | string | null;
  /** نطاق بصمة الجوال حول الفرع، بالمتر */
  punchRadiusMeters: number;
  warehousesCount: number;
  employeesCount: number;
  devicesCount: number;
  /** مستخدمون مقيَّدون بهذا الفرع */
  usersCount: number;
}

export interface BranchPayload {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  punchRadiusMeters?: number;
  isActive?: boolean;
}
