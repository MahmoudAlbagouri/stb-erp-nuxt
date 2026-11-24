// composables/useBackdrop.ts
// ✅ تشغيل الخلفية المتحركة وإيقافها. الاختيار في cookie (مثل الوضع الفاتح/الداكن
// في useTheme) فيعرفه السيرفر ولا تظهر الخلفية ثم تختفي.

import { computed } from "vue";
import { useCookie } from "nuxt/app";

const MOTION_COOKIE = "stb_motion";

/**
 * أين تظهر الخلفية: الرئيسية وشاشات الدخول فقط. شاشات العمل (الكاشير، الجرد،
 * الطيار، الحقل، المطبخ) والقوائم بلا حركة: أجهزتها أضعف والتركيز فيها على البيانات
 */
export const backdropAllowedOn = (path: string): boolean =>
  path === "/dashboard" || path === "/dashboard/" || path.startsWith("/auth");

export const useBackdrop = () => {
  const cookie = useCookie<"on" | "off">(MOTION_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
    default: () => "on",
  });

  const enabled = computed(() => cookie.value !== "off");
  const toggle = () => {
    cookie.value = enabled.value ? "off" : "on";
  };

  return { enabled, toggle };
};
