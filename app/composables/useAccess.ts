// composables/useAccess.ts
// ✅ المصدر الوحيد لقرارات الإظهار/القفل في الواجهة:
//    - can / canAny   → صلاحيات المستخدم (من التوكن) — نفس منطق PermissionsGuard
//    - hasFeature     → مميزات خطة الشركة — نفس منطق SubscriptionGuard
//    - quota          → حدود الاستخدام (max_employees ...)
// الباك إند يبقى خط الحماية الفعلي؛ هذا فقط يمنع عرض ما سيُرفض.

import { useAuthStore } from "../stores/auth";
import { useAccessStore } from "../stores/access";
import {
  FEATURES,
  PERMS,
  QUOTAS,
  SYSTEM_PERMISSION_PREFIX,
  type FeatureKey,
  type QuotaKey,
} from "../utils/access";
import type { QuotaUsage } from "../types";

export interface AccessRule {
  /** يكفي امتلاك أي صلاحية منها */
  permissions?: readonly string[];
  /** ميزة الخطة المطلوبة */
  feature?: FeatureKey;
  /** لمالك النظام فقط */
  systemOnly?: boolean;
  /** لحسابات الشركات فقط: مالك النظام بلا شركة فلا بيانات له هنا */
  tenantOnly?: boolean;
}

export type AccessState = "allowed" | "denied" | "locked";

export const useAccess = () => {
  const auth = useAuthStore();
  const access = useAccessStore();

  /** يملك كل الصلاحيات المطلوبة */
  const can = (required: string | readonly string[]): boolean => {
    if (!auth.isAuthenticated) return false;

    const list = typeof required === "string" ? [required] : required;
    if (list.length === 0) return true;

    // 1) مالك النظام - صلاحيات مطلقة
    if (auth.isSystemAdmin) return true;

    // 2) مدير الشركة - كل شيء عدا صلاحيات system:
    if (auth.isSuperAdmin && auth.tenantId) {
      return !list.some((perm) =>
        perm.toLowerCase().startsWith(SYSTEM_PERMISSION_PREFIX),
      );
    }

    // 3) موظف عادي - تحقق دقيق من صلاحيات التوكن
    const owned = auth.permissions.map((p) => p.name);
    return list.every((perm) => owned.includes(perm));
  };

  /** يملك صلاحية واحدة على الأقل */
  const canAny = (required: readonly string[]): boolean =>
    required.length === 0 || required.some((perm) => can(perm));

  /** الميزة ضمن خطة الشركة (قبل تحميل بيانات الخطة لا نقفل شيئاً) */
  const hasFeature = (feature: FeatureKey): boolean => {
    if (auth.isSystemAdmin || access.unrestricted) return true;
    if (!access.loaded) return true;
    return access.features.includes(feature);
  };

  const quota = (key: QuotaKey): QuotaUsage | null =>
    access.quotas[key] ?? null;

  /** وصلت الشركة للحد الأقصى لهذا المورد */
  const quotaReached = (key: QuotaKey): boolean => {
    if (auth.isSystemAdmin || access.unrestricted) return false;
    const usage = quota(key);
    return !!usage && usage.limit !== null && !usage.allowed;
  };

  const quotaMessage = (key: QuotaKey): string => {
    const usage = quota(key);
    return usage?.limit != null
      ? `وصلت للحد الأقصى في خطتك (${usage.used} / ${usage.limit}) — قم بالترقية للمتابعة`
      : "";
  };

  /**
   * حالة الوصول لعنصر/صفحة:
   * denied = لا صلاحية (يُخفى)، locked = خارج الخطة (يظهر مقفولاً مع دعوة للترقية)
   */
  const resolve = (rule?: AccessRule): AccessState => {
    if (!rule) return "allowed";
    if (rule.systemOnly && !auth.isSystemAdmin) return "denied";
    if (rule.tenantOnly && auth.isSystemAdmin) return "denied";
    if (rule.permissions && !canAny(rule.permissions)) return "denied";
    if (rule.feature && !hasFeature(rule.feature)) return "locked";
    return "allowed";
  };

  return {
    can,
    canAny,
    hasFeature,
    quota,
    quotaReached,
    quotaMessage,
    resolve,
    // الثوابت متاحة مباشرة في القوالب: can(P.EMPLOYEE_DELETE)
    P: PERMS,
    F: FEATURES,
    Q: QUOTAS,
  };
};
