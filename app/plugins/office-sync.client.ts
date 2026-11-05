// plugins/office-sync.client.ts — لوحة المكتب أونلاين وأوفلاين (stores/office)
//
// - يبدأ رفع طابور المكتب: عند فتح اللوحة، وعودة الشبكة، وكل 30 ثانية.
// - صفحات المكتب (المبيعات، المشتريات، المخزون، الأصناف) تُخزَّن في الـ service
//   worker (public/sw.js) فتُفتح بلا إنترنت، وتُحمَّل ملفاتها مسبقاً بعد الدخول.
// - تُحفظ نسخة من القوائم الأساسية (العملاء، الموردون، الأصناف، المخازن،
//   الأرصدة) فتعمل نماذج الحفظ بلا إنترنت ولو لم تُفتح صفحاتها قبل الانقطاع.
import { defineNuxtPlugin, useRouter } from "nuxt/app";
import { useApi } from "../composables/useApi";
import { useAuthStore } from "../stores/auth";
import { useOfficeStore } from "../stores/office";
import { isOfficeRoute, registerOfflineShell } from "../utils/offline-shell";

const SYNC_EVERY_MS = 30_000;
/** بعد الدخول بقليل (لا يزاحم الصفحة الأولى) */
const PRIME_AFTER_MS = 8_000;

/** القوائم التي تحتاجها نماذج الحفظ بلا إنترنت */
const PRIME = [
  "/sales/customers?isActive=true&limit=200",
  "/purchasing/suppliers?isActive=true&limit=200",
  "/catalog/products?limit=200",
  "/inventory/warehouses",
  "/inventory/stock?limit=200",
  "/sales/settings",
];

export default defineNuxtPlugin(() => {
  const office = useOfficeStore();
  const api = useApi();
  const router = useRouter();

  void office.start(api.sendQueued);
  const kick = () => void office.sync();
  window.addEventListener("online", kick);
  setInterval(kick, SYNC_EVERY_MS);

  let prepared = false;
  /** هيكل صفحات المكتب وملفاتها وقوائمها: مرة لكل فتح للوحة */
  const prepareOffline = () => {
    if (prepared || !useAuthStore().userId) return;
    prepared = true;
    registerOfflineShell();
    setTimeout(() => {
      if (!navigator.onLine) return;
      for (const route of router.getRoutes()) {
        const component = route.components?.default;
        if (isOfficeRoute(route.path) && typeof component === "function") {
          void (component as () => Promise<unknown>)().catch(() => {});
        }
      }
      // بلا صلاحية القائمة يرفضها السيرفر بهدوء: لا شيء يُحفظ لها
      void Promise.allSettled(PRIME.map((path) => api.get(path)));
    }, PRIME_AFTER_MS);
  };

  // من صفحات المكتب، ومن شاشة الكاشير (زر "المكتب" فيها يفتحها بلا إنترنت)
  const wantsOffice = (path: string) =>
    isOfficeRoute(path) || path === "/pos" || path.startsWith("/pos/");
  if (wantsOffice(window.location.pathname)) prepareOffline();
  router.afterEach((to) => {
    if (wantsOffice(to.path)) prepareOffline();
  });
});
