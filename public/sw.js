// sw.js — يجعل الشاشات المستقلة تفتح وتعمل بلا إنترنت:
//   /pos         شاشة الكاشير
//   /driver      شاشة الطيار على جواله
//   /stocktake/* شاشة العدّ (جرد بالباركود داخل المخزن)
//
// يخزّن "هيكل" كل شاشة (صفحتها وملفات الواجهة والخطوط) عند أول زيارة وهي
// متصلة، فيمكن بعدها إعادة تحميل الصفحة أو إعادة تشغيل الجهاز بلا شبكة.
// بيانات الشاشات نفسها (الأصناف، الطوابير) في IndexedDB/localStorage لا هنا،
// وطلبات الـ API لا تمر من هنا إطلاقاً. باقي صفحات لوحة التحكم تمر للشبكة.
//
// اسم المخزن بقي كما كان قبل إضافة الطيار والعدّ: تغييره يمسح هيكل الكاشير
// المخزَّن، فلا تفتح أجهزة الكاشير بلا إنترنت حتى تتصل مرة.
const CACHE = "stb-pos-shell-v1";

/** الشاشات التي تفتح بلا إنترنت: مسارها هو مفتاح هيكلها في المخزن */
const SHELLS = ["/pos", "/driver", "/stocktake"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // نسخة أقدم من الهيكل تُحذف عند تغيير اسم المخزن
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

/** هيكل الشاشة التي يقع فيها المسار (أو undefined لصفحات لوحة التحكم) */
const shellOf = (pathname) =>
  SHELLS.find((shell) => pathname === shell || pathname.startsWith(shell + "/"));

// ملفات الواجهة تحمل بصمة في اسمها: محتواها لا يتغير، فالمخزَّن يكفي دائماً
const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_nuxt/") ||
    /\.(?:js|css|woff2?|ttf|png|jpg|svg|ico)$/.test(url.pathname));

const isFont = (url) =>
  url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

/**
 * الشبكة أولاً (لتصل التحديثات)، والمخزَّن عند انقطاعها. هيكل الشاشة واحد
 * لكل صفحاتها (تُرسم في المتصفح): /stocktake/أي-جرد يفتح بهيكل /stocktake.
 */
async function networkFirst(request, shell) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(shell, response.clone());
    return response;
  } catch {
    const cached = await cache.match(shell);
    if (cached) return cached;
    throw new Error(`offline and the ${shell} shell is not cached yet`);
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
 * بالتحكم في الصفحة، فلا تمر به ولا تُخزَّن. لذلك ترسل الصفحة مسارها وقائمة
 * ما حمّلته ونخزّنهما هنا، فتعمل الشاشة بلا إنترنت من أول زيارة لا من الثانية.
 */
async function warm(path, urls) {
  const cache = await caches.open(CACHE);
  // الصفحات القديمة (قبل الطيار والعدّ) ترسل القائمة بلا مسار: هي الكاشير
  const shell = shellOf(path || "/pos");
  if (shell && !(await cache.match(shell))) {
    try {
      const page = await fetch(path || shell);
      if (page.ok) await cache.put(shell, page);
    } catch {
      // انقطع النت قبل التسخين: يُخزَّن الهيكل في الزيارة القادمة
    }
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
    const path = typeof event.data.path === "string" ? event.data.path : "";
    event.waitUntil(warm(path, event.data.urls));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const shell = request.mode === "navigate" ? shellOf(url.pathname) : undefined;

  if (shell) {
    event.respondWith(networkFirst(request, shell));
  } else if (isStaticAsset(url) || isFont(url)) {
    event.respondWith(cacheFirst(request));
  }
  // غير ذلك (الـ API وباقي صفحات لوحة التحكم): يمر للشبكة كما هو
});
