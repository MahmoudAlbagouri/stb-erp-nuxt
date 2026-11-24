// utils/backdrop.ts
// ✅ الخلفية المتحركة: "خطوط بيانات" رفيعة تنساب من اليمين لليسار، وعلى خط واحد
// أوضح نبضة قصيرة. بديل الـ 23 عنصراً المتحركة القديمة.
//
// الأداء: كل خط موجة دورية تُرسم مرة واحدة (عند التحميل وتغيير المقاس) قناعاً
// (mask) لعنصر لونه ‎--stb-strand‎ أو ‎--stb-strand-lead‎ (_themes.scss)، ثم يحرّكه
// CSS بـ transform فقط (StbBackdrop.vue): الحركة على الـ GPU ولا JavaScript في
// أي إطار، وتبديل الوضع يغيّر اللون بلا إعادة رسم. تقليل الحركة والأجهزة
// الضعيفة وتوفير البيانات: خطوط ثابتة.
// المرجع: مكوّن Backdrop في Design System «STB ERP».

interface Strand {
  y: number; // موضع منتصفه كنسبة من الارتفاع
  a1: number; // سعة الموجة الأساسية (px)
  a2: number; // سعة الموجة الثانية (px)
  k2: number; // تردد الموجة الثانية (عدد صحيح: تبقى الموجة دورية)
  phase: number;
  flow: number; // ثوانٍ لانسياب دورة كاملة (PERIOD)
  bob: number; // تنفّس رأسي (px)
  bobTime: number; // ثوانٍ لنصف دورة التنفس
}

const PERIOD = 960; // px: كل موجة تتكرر كل PERIOD، فالانسياب بلا قفزة
const STEP = 6; // px بين نقاط رسم الموجة (مرة واحدة فقط)
const LEAD = 3; // الخط الأوضح الذي تجري عليه النبضة
const PULSE_LENGTH = 110; // px
const DPR_CAP = 1.5;

const STRANDS: Strand[] = Array.from({ length: 7 }, (_, i) => ({
  y: 0.16 + i * 0.115,
  a1: 14 + ((i * 7) % 20),
  a2: 5 + ((i * 5) % 9),
  k2: 2 + (i % 2),
  phase: i * 1.7,
  // الخط الأوضح أسرع قليلاً لتعبر نبضته الشاشة كل ~20 ثانية
  flow: i === LEAD ? 20 : 70 + (i % 3) * 25,
  bob: 4 + (i % 3) * 2,
  bobTime: 5 + (i % 4) * 1.5,
}));

/** جهاز يُفضَّل له خطوط ثابتة: توفير البيانات أو معالج ضعيف (تقليل الحركة في CSS) */
export const prefersStillBackdrop = (): boolean => {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  return (navigator.hardwareConcurrency ?? 4) <= 2;
};

/** ارتفاع الموجة عند x (دورية كل PERIOD) */
const waveAt = (s: Strand, x: number, mid: number) =>
  mid +
  s.a1 * Math.sin((2 * Math.PI * x) / PERIOD + s.phase) +
  s.a2 * Math.sin((2 * Math.PI * s.k2 * x) / PERIOD + s.phase * 1.3);

interface Mask {
  url: string; // blob: لصورة القناع
  width: number;
  height: number;
}

/** يرسم الخط مرة واحدة قناعاً بعرض الشاشة + دورة كاملة (الشفافية فقط تهم) */
const renderMask = async (
  s: Strand,
  width: number,
  isLead: boolean,
): Promise<Mask | null> => {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  const height = Math.ceil(2 * (s.a1 + s.a2) + 8);
  const stripWidth = width + PERIOD;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(stripWidth * dpr);
  canvas.height = Math.ceil(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  const mid = height / 2;
  const ink = "#000";

  ctx.beginPath();
  for (let x = 0; x <= stripWidth + STEP; x += STEP) {
    const y = waveAt(s, x, mid);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (isLead) {
    // النبضة مرسومة في الشريط نفسه مرة كل دورة، فتنساب معه بلا حساب لكل إطار:
    // رأس بنقطة، وذيل يتلاشى خلفه (يمينه، لأن الانسياب لليسار)
    for (let head = PERIOD * 0.35; head < stripWidth; head += PERIOD) {
      const fade = ctx.createLinearGradient(head, 0, head + PULSE_LENGTH, 0);
      fade.addColorStop(0, ink);
      fade.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      for (let x = head; x <= head + PULSE_LENGTH; x += 3) {
        if (x === head) ctx.moveTo(x, waveAt(s, x, mid));
        else ctx.lineTo(x, waveAt(s, x, mid));
      }
      ctx.strokeStyle = fade;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(head, waveAt(s, head, mid), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
    }
  }
  // ترميز الصورة خارج الخيط الرئيسي (toBlob غير متزامن)
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done));
  return blob ? { url: URL.createObjectURL(blob), width: stripWidth, height } : null;
};

/**
 * يبني الخطوط داخل container (عنصر بكامل الشاشة) ويعيد دالة إزالتها. كل خط
 * ‎.stb-strand‎ (تنفّس) فيه ‎.stb-strand__line‎ (انسياب، لونه من CSS وشكله القناع).
 */
export const mountBackdrop = (container: HTMLElement): (() => void) => {
  let lastWidth = -1;
  let lastHeight = -1;
  let urls: string[] = [];
  let generation = 0; // بناء أحدث يلغي ما قبله إن انتهى بعده

  const release = () => {
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls = [];
  };

  const build = async () => {
    const run = ++generation;
    const width = container.clientWidth;
    const height = container.clientHeight;
    lastWidth = width;
    lastHeight = height;
    const masks = await Promise.all(
      STRANDS.map((s, i) => renderMask(s, width, i === LEAD)),
    );
    if (run !== generation) {
      masks.forEach((m) => m && URL.revokeObjectURL(m.url));
      return;
    }
    const fragment = document.createDocumentFragment();
    STRANDS.forEach((s, i) => {
      const mask = masks[i];
      if (!mask) return;
      const strand = document.createElement("div");
      strand.className = "stb-strand";
      strand.style.setProperty("--top", `${s.y * height - mask.height / 2}px`);
      strand.style.setProperty("--period", `${PERIOD}px`);
      strand.style.setProperty("--flow", `${s.flow}s`);
      strand.style.setProperty("--bob", `${s.bob}px`);
      strand.style.setProperty("--bob-time", `${s.bobTime}s`);
      // بدايات مختلفة حتى لا تتحرك الخطوط كجسم واحد
      strand.style.setProperty("--delay", `${-((i * 7.3) % s.flow)}s`);
      const line = document.createElement("div");
      line.className = i === LEAD ? "stb-strand__line is-lead" : "stb-strand__line";
      line.style.width = `${mask.width}px`;
      line.style.height = `${mask.height}px`;
      line.style.setProperty("--mask", `url("${mask.url}")`);
      strand.appendChild(line);
      fragment.appendChild(strand);
    });
    container.replaceChildren(fragment);
    release();
    urls = masks.flatMap((m) => (m ? [m.url] : []));
  };

  // تغيّر المقاس: إعادة الرسم بعد أن يستقر (لا مع كل بكسل)
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const resizeObserver = new ResizeObserver(() => {
    if (container.clientWidth === lastWidth && container.clientHeight === lastHeight) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 200);
  });

  build();
  resizeObserver.observe(container);

  return () => {
    generation++;
    clearTimeout(resizeTimer);
    resizeObserver.disconnect();
    container.replaceChildren();
    release();
  };
};
