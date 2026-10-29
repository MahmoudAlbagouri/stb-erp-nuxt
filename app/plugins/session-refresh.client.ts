// plugins/session-refresh.client.ts — يجدّد الجلسة قبل انتهاء توكن الوصول.
//
// توكن الوصول يعيش ربع ساعة. بدل انتظار طلب يُرفض بـ 401 ثم يُجدَّد، نجدّده
// قبل انتهائه بدقيقة: لا ينتهي ما دامت الصفحة مفتوحة، وتغيير صلاحيات الدور
// يصل للواجهة مع كل تجديد. المتصفح يُبطئ مؤقّتات التبويب المخفي (ويوقفها مع
// نوم الجهاز)، فنعيد الحساب حين يعود المستخدم للتبويب.
//
// هذا تحسين فقط: رفض السيرفر للجلسة لا يُخرج المستخدم من هنا، بل يقرره أول
// طلب حقيقي في useApi (وشاشة الكاشير تعمل بلا جلسة أصلاً).
import { defineNuxtPlugin } from "nuxt/app";
import { watch } from "vue";
import { useApi } from "../composables/useApi";
import { useAuthStore } from "../stores/auth";
import { REFRESH_TOKEN_COOKIE, readCookie } from "../utils/auth";

/** نجدّد قبل الانتهاء بدقيقة: هامش لبطء الشبكة */
const REFRESH_AHEAD_MS = 60_000;
/** تعذّر التجديد (النت مقطوع أو السيرفر يُعاد تشغيله): نعيد المحاولة بعدها */
const RETRY_MS = 60_000;

export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuthStore();
  const api = useApi();

  let timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * فرق ساعة الجهاز عن السيرفر (ms)، يُقاس من iat كل توكن نجدّده. بدونه جهاز
   * ساعته متقدمة يرى كل توكن جديد منتهياً فيجدّد بلا توقف.
   */
  let clockSkew = 0;

  /** المتبقي على انتهاء توكن الوصول بساعة السيرفر (0 بلا توكن) */
  const msLeft = (): number => {
    const exp = auth.decodedToken?.exp;
    return exp ? exp * 1000 - (Date.now() - clockSkew) : 0;
  };

  const plan = (delay = msLeft() - REFRESH_AHEAD_MS) => {
    clearTimeout(timer);
    timer = setTimeout(check, Math.max(delay, 0));
  };

  const check = async (): Promise<void> => {
    clearTimeout(timer);
    // من المتصفح مباشرة: نسخة useCookie قد تحمل توكناً حذفه الخروج للتو، فتجدّد
    // جلسة خرج منها صاحبها
    if (!readCookie(REFRESH_TOKEN_COOKIE)) return; // لا جلسة نجدّدها

    if (msLeft() > REFRESH_AHEAD_MS) return plan();
    // تبويب آخر ربما جدّد الجلسة للتو: نلتقط توكنه بدل تجديد ثانٍ
    auth.hydrate();
    if (msLeft() > REFRESH_AHEAD_MS) return plan();

    const outcome = await api.refreshSession();
    if (outcome.status === "refreshed") {
      const iat = auth.decodedToken?.iat;
      if (iat) clockSkew = Date.now() - iat * 1000;
      plan();
    } else if (outcome.status === "unavailable") {
      plan(RETRY_MS);
    }
    // rejected: الحكم لأول طلب حقيقي (انظر أعلى الملف)
  };

  nuxtApp.hook("app:mounted", () => {
    // توكن جديد (دخول، تجديد عند 401، قبول الإقرار): نعيد الجدولة على انتهائه
    watch(
      () => auth.decodedToken?.exp,
      () => plan(),
    );
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void check();
    });
    // جلسة refresh فقط (فُتحت الصفحة بعد انتهاء التوكن): تُجدَّد فوراً
    void check();
  });
});
