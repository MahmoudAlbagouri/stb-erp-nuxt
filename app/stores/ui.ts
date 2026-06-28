// stores/ui.ts
import { defineStore } from "pinia";
import type { Toast } from "../types";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  const sidebarOpen = ref(true);
  const toasts = ref<Toast[]>([]);

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value;
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
    sidebarOpen.value = true; // إعادة تعيين القائمة للحالة الافتراضية
  };

  return {
    sidebarOpen,
    toasts,
    toggleSidebar,
    addToast,
    removeToast,
    reset, // ✅ تم التصدير
  };
});
