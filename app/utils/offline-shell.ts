// utils/offline-shell.ts — تسجيل الـ service worker (public/sw.js) للشاشات
// التي تفتح بلا إنترنت: الكاشير، الطيار، شاشة العدّ، وصفحات المكتب.

/** صفحات المكتب التي تعمل بلا إنترنت (مرآة OFFICE في public/sw.js) */
export const OFFICE_ROUTES = [
  "/dashboard/sales",
  "/dashboard/purchasing",
  "/dashboard/inventory",
  "/dashboard/products",
];

export const isOfficeRoute = (path: string): boolean =>
  OFFICE_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));

/**
 * يسجّل الـ service worker ثم يرسل له مسار الصفحة وما حمّلته قبل أن يتحكم
 * بها (لم يمر به فلم يُخزَّن)، فتفتح الشاشة بلا إنترنت من أول زيارة.
 * الإنتاج فقط: في التطوير يخزّن ملفات تتغير مع كل تعديل.
 */
export const registerOfflineShell = (): void => {
  if (import.meta.dev || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then((registration) => {
      registration.active?.postMessage({
        type: "warm",
        path: window.location.pathname,
        urls: performance.getEntriesByType("resource").map((entry) => entry.name),
      });
    })
    .catch(() => {
      // بلا service worker الشاشة تعمل، لكن إعادة تحميلها تحتاج إنترنت
    });
};
