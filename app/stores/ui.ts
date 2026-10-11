// stores/ui.ts
import { defineStore } from "pinia";
import type { Toast } from "../types";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  const sidebarOpen = ref(true);
  // درج القائمة الجانبية في الآيباد والفون (منفصل عن حالة الطي في اللاب)
  const mobileNavOpen = ref(false);
  const toasts = ref<Toast[]>([]);

  const isSmallScreen = () =>
    import.meta.client && window.matchMedia("(max-width: 1024px)").matches;

  // زر القائمة في الشريط العلوي: يطوي القائمة في اللاب، ويفتح الدرج في الشاشات الأصغر
  const toggleSidebar = () => {
    if (isSmallScreen()) mobileNavOpen.value = !mobileNavOpen.value;
    else sidebarOpen.value = !sidebarOpen.value;
  };

  const toggleMobileNav = () => {
    mobileNavOpen.value = !mobileNavOpen.value;
  };
  const closeMobileNav = () => {
    mobileNavOpen.value = false;
  };

  const addToast = (toast: Toast) => {
    toasts.value.push(toast);
    setTimeout(() => removeToast(toast.id), 4000);
  };

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  // ✅ دالة تفريغ المتجر (للاستخدام عند تسجيل الخروج)
  const reset = () => {
    toasts.value = [];
    mobileNavOpen.value = false;
    sidebarOpen.value = true; // إعادة تعيين القائمة للحالة الافتراضية
  };

  return {
    sidebarOpen,
    mobileNavOpen,
    toasts,
    toggleSidebar,
    toggleMobileNav,
    closeMobileNav,
    addToast,
    removeToast,
    reset, // ✅ تم التصدير
  };
});
