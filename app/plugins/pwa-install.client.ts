// plugins/pwa-install.client.ts — يلتقط عرض المتصفح لتثبيت شاشة الكاشير كتطبيق.
//
// المتصفح يطلق beforeinstallprompt مرة واحدة وقد يسبق تحميل الصفحة، لذلك
// نلتقطه هنا مبكراً ونحتفظ به ليعرضه زر "تثبيت" متى ضغطه المستخدم.
import { defineNuxtPlugin, useState } from "nuxt/app";

/** الحدث كما يعرّفه Chromium (ليس في تعريفات TypeScript القياسية) */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default defineNuxtPlugin(() => {
  const prompt = useState<InstallPromptEvent | null>("pwa-install-prompt", () => null);
  const installed = useState<boolean>("pwa-installed", () => false);

  window.addEventListener("beforeinstallprompt", (event) => {
    // نمنع شريط المتصفح الصغير: العرض يأتي من زرّنا
    event.preventDefault();
    prompt.value = event as InstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    prompt.value = null;
    installed.value = true;
  });
});
