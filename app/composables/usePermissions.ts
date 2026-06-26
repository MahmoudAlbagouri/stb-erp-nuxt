// composables/usePermissions.ts
// ✅ نفس منطق src/common/guards/permissions.guard.ts بالظبط

import { useAuthStore } from "../stores/auth";

export const usePermissions = () => {
  const authStore = useAuthStore();

  const can = (required: string | string[]): boolean => {
    if (!authStore.isAuthenticated) return false;

    const requiredPermissions = Array.isArray(required) ? required : [required];
    if (requiredPermissions.length === 0) return true;

    // 1) مالك النظام - صلاحيات مطلقة
    if (authStore.isSystemAdmin) return true;

    // 2) مدير الشركة - بايباس كامل، إلا صلاحيات system:
    if (authStore.isSuperAdmin && authStore.user?.tenantId) {
      const hasSystemPermission = requiredPermissions.some((perm) =>
        perm.toLowerCase().startsWith("system:"),
      );
      return !hasSystemPermission;
    }

    // 3) موظف عادي - تحقق دقيق من صلاحيات التوكن
    const userPermNames = authStore.permissions.map((p) => p.name);
    return requiredPermissions.every((perm) => userPermNames.includes(perm));
  };

  const canAny = (required: string[]): boolean => required.some((p) => can(p));

  return { can, canAny };
};
