// composables/useToast.ts
import { useUiStore } from "../stores/ui";
import type { ToastType } from "../types";

export const useToast = () => {
  const ui = useUiStore();

  const show = (message: string, type: ToastType = "info") => {
    ui.addToast({ id: Date.now().toString(), message, type });
  };

  return {
    success: (msg: string) => show(msg, "success"),
    error: (msg: string) => show(msg, "error"),
    info: (msg: string) => show(msg, "info"),
    warning: (msg: string) => show(msg, "warning"),
  };
};
