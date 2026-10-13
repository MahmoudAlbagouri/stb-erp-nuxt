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
  isActive?: boolean;
}
