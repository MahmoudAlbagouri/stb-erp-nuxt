// utils/offline-shell.ts — تسجيل الـ service worker (public/sw.js) للشاشات
// المستقلة التي تفتح بلا إنترنت: الكاشير، الطيار، وشاشة العدّ.

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
