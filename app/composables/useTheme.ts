// composables/useTheme.ts
// ✅ الوضع الداكن / الفاتح.
// الاختيار يُحفظ في cookie (وليس localStorage) حتى يعرفه السيرفر عند أول رسم،
// فلا يظهر وميض بالوضع الخاطئ عند تحميل الصفحة.

import { computed } from "vue";
import { useCookie, useHead } from "nuxt/app";

export type Theme = "dark" | "light";

const THEME_COOKIE = "stb_theme";
const DEFAULT_THEME: Theme = "dark";
// لون شريط المتصفح في الموبايل (يطابق خلفية الصفحة في كل وضع)
const BROWSER_BAR_COLOR: Record<Theme, string> = {
  dark: "#0d1117",
  light: "#eef2f8",
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

  const setTheme = (next: Theme) => {
    if (import.meta.client) {
      // انتقال ناعم للألوان أثناء التبديل فقط (انظر _themes.scss)
      const root = document.documentElement;
      root.classList.add("theme-switching");
      window.setTimeout(() => root.classList.remove("theme-switching"), 400);
    }
    cookie.value = next;
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
