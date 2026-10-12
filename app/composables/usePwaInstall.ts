// composables/usePwaInstall.ts — تثبيت شاشة الكاشير كتطبيق على الجهاز
import { computed } from "vue";
import { useState } from "nuxt/app";
import type { InstallPromptEvent } from "@/plugins/pwa-install.client";

export const usePwaInstall = () => {
  const prompt = useState<InstallPromptEvent | null>("pwa-install-prompt", () => null);
  const installed = useState<boolean>("pwa-installed", () => false);

  /** الشاشة مفتوحة الآن كتطبيق مثبّت (نافذة مستقلة بلا شريط المتصفح) */
  const standalone = computed(
    () =>
      import.meta.client &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true),
  );

  /** iPhone / iPad: لا عرض تثبيت تلقائي، التثبيت من قائمة المشاركة */
  const isIos = computed(
    () =>
      import.meta.client &&
      (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
        // iPadOS يعرّف نفسه كـ Mac
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)),
  );

  const canInstall = computed(() => !!prompt.value);

  /** يعرض نافذة التثبيت. يعيد true إذا وافق المستخدم */
  const install = async (): Promise<boolean> => {
    const event = prompt.value;
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // العرض يُستخدم مرة واحدة
    prompt.value = null;
    return outcome === "accepted";
  };

  return { canInstall, installed, standalone, isIos, install };
};
