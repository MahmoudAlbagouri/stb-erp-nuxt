// sw.js — يجعل شاشة الكاشير (/pos) تفتح وتعمل بلا إنترنت.
//
// يخزّن "هيكل" الشاشة (صفحة /pos وملفات الواجهة والخطوط) عند أول زيارة وهي
// متصلة، فيمكن بعدها إعادة تحميل الصفحة أو إعادة تشغيل الجهاز بلا شبكة.
// بيانات البيع نفسها (الأصناف، المبيعات، طابور الرفع) في IndexedDB لا هنا،
// وطلبات الـ API لا تمر من هنا إطلاقاً.
const CACHE = "stb-pos-shell-v1";
const POS_PATH = "/pos";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // نسخة أقدم من الهيكل تُحذف عند تحديث هذا الملف
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("stb-pos-shell-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isPosNavigation = (request, url) =>
  request.mode === "navigate" &&
  (url.pathname === POS_PATH || url.pathname.startsWith(POS_PATH + "/"));

// ملفات الواجهة تحمل بصمة في اسمها: محتواها لا يتغير، فالمخزَّن يكفي دائماً
const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_nuxt/") ||
    /\.(?:js|css|woff2?|ttf|png|jpg|svg|ico)$/.test(url.pathname));

const isFont = (url) =>
  url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

/** الشبكة أولاً (لتصل التحديثات)، والمخزَّن عند انقطاعها */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(POS_PATH, response.clone());
    return response;
  } catch {
    const cached = await cache.match(POS_PATH);
    if (cached) return cached;
    throw new Error("offline and the POS shell is not cached yet");
  }
}

/** المخزَّن أولاً، وإلا من الشبكة مع تخزينه للمرة القادمة */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // opaque = رد من نطاق آخر (الخطوط) لا تُقرأ حالته لكنه صالح للتخزين
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
}

/**
 * "تسخين" الهيكل: عند أول زيارة تُحمَّل ملفات الشاشة قبل أن يبدأ هذا الملف
 * بالتحكم في الصفحة، فلا تمر به ولا تُخزَّن. لذلك ترسل الصفحة قائمة ما حمّلته
 * ونخزّنه هنا، فتعمل الشاشة بلا إنترنت من أول زيارة لا من الثانية.
 */
async function warm(urls) {
  const cache = await caches.open(CACHE);
  if (!(await cache.match(POS_PATH))) {
    const shell = await fetch(POS_PATH);
    if (shell.ok) await cache.put(POS_PATH, shell);
  }
  await Promise.all(
    urls.map(async (raw) => {
      const url = new URL(raw, self.location.origin);
      if (!isStaticAsset(url) && !isFont(url)) return;
      if (await cache.match(url.href)) return;
      try {
        // خطوط Google تُرسل ترويسات CORS، فتُجلب كأي ملف وتصلح لطلبات الخط
        const response = await fetch(url.href);
        if (response.ok) {
          await cache.put(url.href, response);
        }
      } catch {
        // ملف واحد تعذّر: لا يمنع تخزين الباقي
      }
    }),
  );
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "warm" && Array.isArray(event.data.urls)) {
    event.waitUntil(warm(event.data.urls));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (isPosNavigation(request, url)) {
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(url) || isFont(url)) {
    event.respondWith(cacheFirst(request));
  }
  // غير ذلك (الـ API وباقي صفحات لوحة التحكم): يمر للشبكة كما هو
});
