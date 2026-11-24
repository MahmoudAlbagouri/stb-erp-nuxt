// composables/useTheme.ts
// ✅ الوضع الداكن / الفاتح.
// الاختيار يُحفظ في cookie (وليس localStorage) حتى يعرفه السيرفر عند أول رسم،
// فلا يظهر وميض بالوضع الخاطئ عند تحميل الصفحة.

import { computed } from "vue";
import { useCookie, useHead } from "nuxt/app";

export type Theme = "dark" | "light";

const THEME_COOKIE = "stb_theme";
// الفاتح هو الافتراضي: يوم عمل كامل في المكتب. الداكن اختيار يُحفظ في الـ cookie
const DEFAULT_THEME: Theme = "light";
// لون شريط المتصفح في الموبايل (يطابق خلفية الصفحة ‎--stb-dark‎ في كل وضع)
const BROWSER_BAR_COLOR: Record<Theme, string> = {
  dark: "#0b0d10",
  light: "#f6f8fb",
};

export const useTheme = () => {
  const cookie = useCookie<Theme>(THEME_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
    default: () => DEFAULT_THEME,
  });

  const theme = computed<Theme>(() =>
    cookie.value === "light" ? "light" : "dark",
  );
  const isDark = computed(() => theme.value === "dark");

  /**
   * التبديل: المتصفح يلتقط صورة للصفحة قبل وبعد، ويمزج بينهما على الـ GPU
   * (View Transitions، المدة في main.scss) — لا transition على كل عنصر، فلا
   * لاج مهما كبرت الصفحة. الوضع يُطبَّق على <html> فوراً داخل الالتقاط، وما
   * يتأخر رسمه (الرسوم البيانية) يظهر في الصورة الجديدة لأنها حية.
   * بلا دعم للـ API أو مع تقليل الحركة: تبديل فوري.
   */
  const setTheme = (next: Theme) => {
    const apply = () => {
      if (import.meta.client) document.documentElement.dataset.theme = next;
      cookie.value = next;
    };

    const doc = import.meta.client
      ? (document as Document & {
          startViewTransition?: (update: () => void) => unknown;
        })
      : null;
    const reduceMotion =
      import.meta.client &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!doc?.startViewTransition || reduceMotion) return apply();
    doc.startViewTransition(apply);
  };

  const toggleTheme = () => setTheme(isDark.value ? "light" : "dark");

  /** يُستدعى مرة واحدة في app.vue: يربط الوضع بخاصية data-theme على <html> */
  const applyTheme = () => {
    useHead({
      htmlAttrs: { "data-theme": theme },
      meta: [
        {
          name: "theme-color",
          content: computed(() => BROWSER_BAR_COLOR[theme.value]),
        },
      ],
    });
  };

  return { theme, isDark, setTheme, toggleTheme, applyTheme };
};
