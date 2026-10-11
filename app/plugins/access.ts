// plugins/access.ts
// ✅ Directives موحّدة لإظهار/قفل عناصر الواجهة (أزرار، روابط...) حسب الوصول:
//
//   v-can="'delete_employee'"            ← بدون صلاحية: العنصر يختفي
//   v-can="['view_leaves', 'approve_leave']"  ← يكفي امتلاك أي واحدة
//   v-feature="'reports_export'"         ← خارج الخطة: يظهر مقفولاً والضغط ينقل للترقية
//   v-quota="'max_employees'"            ← عند بلوغ الحد: يتعطّل مع رسالة توضيحية
//
// كلها تعتمد على useAccess (نفس منطق الباك إند) وتتحدث تلقائياً عند تغيّر
// التوكن أو بيانات الخطة.

import { defineNuxtPlugin, useRouter } from "nuxt/app";
import { watchEffect, type Directive, type WatchStopHandle } from "vue";
import { useAccess } from "../composables/useAccess";
import { useToast } from "../composables/useToast";
import {
  FEATURE_LABELS,
  type FeatureKey,
  type PermissionName,
  type QuotaKey,
} from "../utils/access";

type CanValue = PermissionName | readonly PermissionName[];

type AccessEl = HTMLElement & {
  _stopCan?: WatchStopHandle;
  _stopFeature?: WatchStopHandle;
  _stopQuota?: WatchStopHandle;
  _featureClick?: (event: Event) => void;
  _canValue?: CanValue;
  _featureValue?: FeatureKey;
  _quotaValue?: QuotaKey;
  _originalTitle?: string;
};

const LOCKED_CLASS = "is-plan-locked";
const QUOTA_CLASS = "is-quota-reached";

export default defineNuxtPlugin((nuxtApp) => {
  const access = useAccess();
  const router = useRouter();

  const allowed = (value: CanValue): boolean =>
    typeof value === "string" ? access.can(value) : access.canAny(value);

  // ─── v-can ────────────────────────────────────────────────────────────────
  const vCan: Directive<AccessEl, CanValue> = {
    mounted(el, binding) {
      el._canValue = binding.value;
      el._stopCan = watchEffect(() => {
        el.style.display = allowed(el._canValue as CanValue) ? "" : "none";
      });
    },
    updated(el, binding) {
      if (el._canValue === binding.value) return;
      el._canValue = binding.value;
      el.style.display = allowed(binding.value) ? "" : "none";
    },
    unmounted(el) {
      el._stopCan?.();
    },
    // السيرفر يعرف الصلاحيات من الـ cookie: لا وميض للأزرار عند التحميل
    getSSRProps(binding) {
      return allowed(binding.value) ? {} : { style: { display: "none" } };
    },
  };

  // ─── v-feature ────────────────────────────────────────────────────────────
  const vFeature: Directive<AccessEl, FeatureKey> = {
    mounted(el, binding) {
      el._featureValue = binding.value;
      el._originalTitle = el.getAttribute("title") ?? "";

      // capture: نعترض الضغط قبل أي @click على العنصر نفسه
      el._featureClick = (event: Event) => {
        const feature = el._featureValue as FeatureKey;
        if (access.hasFeature(feature)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        useToast().info(
          `${FEATURE_LABELS[feature]} غير متاح في خطتك الحالية — قم بالترقية لتفعيله`,
        );
        if (access.can(access.P.SUBSCRIPTION_VIEW_OWN)) {
          router.push("/dashboard/subscription");
        }
      };
      el.addEventListener("click", el._featureClick, true);

      el._stopFeature = watchEffect(() => {
        const feature = el._featureValue as FeatureKey;
        const locked = !access.hasFeature(feature);
        el.classList.toggle(LOCKED_CLASS, locked);
        if (locked) {
          el.setAttribute(
            "title",
            `${FEATURE_LABELS[feature]} — متاح في خطة أعلى`,
          );
        } else if (el._originalTitle) {
          el.setAttribute("title", el._originalTitle);
        } else {
          el.removeAttribute("title");
        }
      });
    },
    updated(el, binding) {
      el._featureValue = binding.value;
    },
    unmounted(el) {
      el._stopFeature?.();
      if (el._featureClick) {
        el.removeEventListener("click", el._featureClick, true);
      }
    },
  };

  // ─── v-quota ──────────────────────────────────────────────────────────────
  const vQuota: Directive<AccessEl, QuotaKey> = {
    mounted(el, binding) {
      el._quotaValue = binding.value;
      el._stopQuota = watchEffect(() => {
        const key = el._quotaValue as QuotaKey;
        const reached = access.quotaReached(key);
        el.classList.toggle(QUOTA_CLASS, reached);
        if (reached) {
          el.setAttribute("disabled", "");
          el.setAttribute("title", access.quotaMessage(key));
        } else if (el.classList.contains(QUOTA_CLASS)) {
          el.removeAttribute("disabled");
        }
      });
    },
    updated(el, binding) {
      el._quotaValue = binding.value;
      // Vue قد يعيد ضبط disabled عند إعادة الرسم
      if (access.quotaReached(binding.value)) el.setAttribute("disabled", "");
    },
    unmounted(el) {
      el._stopQuota?.();
    },
  };

  nuxtApp.vueApp.directive("can", vCan);
  nuxtApp.vueApp.directive("feature", vFeature);
  nuxtApp.vueApp.directive("quota", vQuota);
});

// أنواع الـ directives في القوالب: vue-tsc يرفض أي اسم صلاحية/ميزة غير معرّف
declare module "vue" {
  interface GlobalDirectives {
    vCan: Directive<HTMLElement, CanValue>;
    vFeature: Directive<HTMLElement, FeatureKey>;
    vQuota: Directive<HTMLElement, QuotaKey>;
  }
}
