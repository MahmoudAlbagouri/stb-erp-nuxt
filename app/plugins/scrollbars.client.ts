// plugins/scrollbars.client.ts
// ✅ شريط تمرير موحّد (OverlayScrollbars) للصفحة ولكل عنصر يتمرر بدون تعديل أي
// صفحة: كل عنصر يُضاف وتنسيقه overflow: auto أو scroll يأخذه تلقائياً (نفس
// أسلوب plugins/table-labels). الشكل في assets/scss/_scrollbars.scss.
//
// العنصر نفسه يبقى منطقة التمرير: لا يُغلَّف محتواه، فتبقى تنسيقاته وتحديثات
// Vue و scrollTop / scrollIntoView كما هي. لكن الشريط يُضاف آخر أبنائه، فلا
// تستخدم ‎:last-child لعناصر قائمة تتمرر — ‎:last-of-type أو ‎& + & بدلها.
//
// استثناء عنصر (يبقى بشريط المتصفح): data-native-scroll عليه أو على أحد آبائه.

import { defineNuxtPlugin, onNuxtReady } from "nuxt/app";
import { OverlayScrollbars, type PartialOptions } from "overlayscrollbars";

const OPTIONS: PartialOptions = {
  scrollbars: {
    theme: "os-theme-stb",
    // يظهر ما دام المؤشر فوق العنصر ويختفي بعد خروجه، لكنه ظاهر من البداية
    // حتى أول تمرير: يعرف المستخدم أن تحته المزيد
    autoHide: "leave",
    autoHideDelay: 800,
    autoHideSuspend: true,
  },
};

/** تبقى بشريط المتصفح: الحقول، نسخة الطباعة، وقوائم التقويم (مكتبة خارجية) */
const NATIVE = "[data-native-scroll], textarea, select, .print-area, .dp__menu";

const SCROLLING = ["auto", "scroll"];

/**
 * عناصر لا تكون منطقة تمرير في المشروع: نتخطاها بلا getComputedStyle. جدول
 * بألف صف = آلاف الخانات، وكل قراءة تنسيق لها ثمن
 */
const NEVER_SCROLLS = new Set([
  "TD", "TH", "TR", "THEAD", "TBODY", "TFOOT", "COL", "COLGROUP",
  "SPAN", "A", "B", "I", "EM", "STRONG", "SMALL", "LABEL", "BUTTON",
  "INPUT", "IMG", "OPTION", "BR", "HR", "CANVAS", "VIDEO",
]);

const isScrollContainer = (el: HTMLElement): boolean => {
  const style = getComputedStyle(el);
  if (
    !SCROLLING.includes(style.overflowY) &&
    !SCROLLING.includes(style.overflowX)
  ) {
    return false;
  }
  // شريط مخفي عمداً (شرائط التبويبات الأفقية)
  if (style.getPropertyValue("scrollbar-width") === "none") return false;
  return !el.closest(NATIVE);
};

export default defineNuxtPlugin(() => {
  const instances = new Map<HTMLElement, OverlayScrollbars>();
  const pending = new Set<Element>();
  let scheduled = false;

  /** قراءة فقط: يجمع مناطق التمرير الجديدة تحت root دون أي كتابة في الـ DOM */
  const collect = (root: Element, found: Set<HTMLElement>) => {
    const visit = (el: Element) => {
      if (!(el instanceof HTMLElement) || el === document.body) return;
      if (NEVER_SCROLLS.has(el.tagName) || instances.has(el)) return;
      if (isScrollContainer(el)) found.add(el);
    };
    visit(root);
    root.querySelectorAll("*").forEach(visit);
  };

  const flush = () => {
    scheduled = false;
    // عنصر خرج من الصفحة: نوقف مراقبته
    instances.forEach((instance, el) => {
      if (el.isConnected) return;
      instance.destroy();
      instances.delete(el);
    });
    // كل القراءات أولاً (يُحسب التنسيق مرة واحدة)، ثم كل الكتابات: تركيب
    // الشريط يغيّر الـ DOM، فلو تبادلت القراءة والكتابة أُعيد حساب التنسيق كل مرة
    const found = new Set<HTMLElement>();
    pending.forEach((root) => {
      if (root.isConnected) collect(root, found);
    });
    pending.clear();
    found.forEach((el) => {
      instances.set(
        el,
        OverlayScrollbars({ target: el, elements: { viewport: el } }, OPTIONS),
      );
    });
  };

  // دفعة واحدة لكل إطار مهما كثرت تغييرات الـ DOM
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
  };

  // بعد اكتمال hydration: إضافة الشريط داخل عنصر قبلها تُربك Vue
  onNuxtReady(() => {
    // الصفحة نفسها: html يصبح منطقة التمرير، و window.scrollTo يعمل كما هو
    OverlayScrollbars(document.body, OPTIONS);

    new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          // أشرطتنا نحن لا تُفحص
          if (node instanceof Element && !node.matches(".os-scrollbar")) {
            pending.add(node);
          }
        });
      });
      schedule();
    }).observe(document.body, { childList: true, subtree: true });

    // عنصر يتمرر في مقاس شاشة دون آخر (media query): نعيد الفحص بعد تغيّره
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        pending.add(document.body);
        schedule();
      }, 300);
    });

    pending.add(document.body);
    schedule();
  });
});
