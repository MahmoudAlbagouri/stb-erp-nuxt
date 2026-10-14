// utils/sounds.ts — أصوات التنبيه في الشاشات
//
// النغمات تُولَّد بالكود (Web Audio API) لا من ملفات: تعمل بلا إنترنت (شاشة
// الكاشير) ولا تزيد حجم التطبيق. كل صوت معنى واحد ثابت، وعددها قليل عمداً
// ليحفظها الكاشير بالسمع.
//
// الإعدادات لكل جهاز (localStorage) وفي نطاقين مستقلين:
//   pos        شاشة الكاشير — مفعّلة افتراضياً (الكاشير لا ينظر للشاشة)
//   dashboard  لوحة التحكم — مقفلة افتراضياً، يفعّلها المستخدم بنفسه
//
// المتصفح لا يسمح بالصوت قبل أول تفاعل للمستخدم مع الصفحة: أول ضغطة أو زر
// يفتحه، وما قبلها يُتجاهل بصمت.
import { reactive } from "vue";

export type SoundName =
  /** باركود أُضيف للسلة */
  | "scan"
  /** باركود غير معروف، أو عملية رُفضت على الشاشة */
  | "error"
  /** تمّ البيع */
  | "success"
  /** مطلوب رقم مشرف */
  | "attention"
  /** انقطع الاتصال بالسيرفر */
  | "offline"
  /** عاد الاتصال */
  | "online"
  /** السيرفر رفض عمليات من الطابور */
  | "rejected"
  /** إشعار جديد في لوحة التحكم */
  | "notification";

export type SoundScope = "pos" | "dashboard";

export interface SoundSettings {
  enabled: boolean;
  /** 0 – 1 */
  volume: number;
}

/** وصف مقروء لكل صوت — لقائمة التجربة في الإعدادات */
export const SOUND_LABELS: Record<SoundName, string> = {
  scan: "مسح باركود",
  error: "خطأ أو صنف غير معروف",
  success: "تمّ البيع",
  attention: "مطلوب موافقة مشرف",
  offline: "انقطع الاتصال",
  online: "عاد الاتصال",
  rejected: "عمليات رفضها السيرفر",
  notification: "إشعار جديد",
};

const DEFAULTS: Record<SoundScope, SoundSettings> = {
  pos: { enabled: true, volume: 0.7 },
  dashboard: { enabled: false, volume: 0.5 },
};

const STORAGE_KEY = "stb-sound-settings";

// ─── النغمات ──────────────────────────────────────────────────────────────────
interface Note {
  /** Hz */
  freq: number;
  /** ثوانٍ */
  duration: number;
  wave?: OscillatorType;
  /** صمت بعدها (ثوانٍ) */
  gap?: number;
  /** نسبة من مستوى الصوت العام */
  gain?: number;
}

const TONES: Record<SoundName, Note[]> = {
  // صفّارة قارئ الباركود المعتادة: قصيرة وحادة
  scan: [{ freq: 1800, duration: 0.06, wave: "square", gain: 0.35 }],
  // طنين منخفض مزدوج: لا يُخلط بأي صوت آخر
  error: [
    { freq: 196, duration: 0.14, wave: "square", gap: 0.06, gain: 0.5 },
    { freq: 196, duration: 0.2, wave: "square", gain: 0.5 },
  ],
  success: [
    { freq: 880, duration: 0.09, wave: "triangle", gap: 0.02 },
    { freq: 1319, duration: 0.16, wave: "triangle" },
  ],
  // "دينغ دونغ": يسمعه المشرف من بعيد
  attention: [
    { freq: 988, duration: 0.22, wave: "sine", gap: 0.04 },
    { freq: 784, duration: 0.32, wave: "sine" },
  ],
  offline: [
    { freq: 659, duration: 0.14, wave: "sine", gap: 0.03, gain: 0.6 },
    { freq: 440, duration: 0.22, wave: "sine", gain: 0.6 },
  ],
  online: [
    { freq: 440, duration: 0.12, wave: "sine", gap: 0.03, gain: 0.6 },
    { freq: 659, duration: 0.18, wave: "sine", gain: 0.6 },
  ],
  rejected: [
    { freq: 523, duration: 0.09, wave: "triangle", gap: 0.05 },
    { freq: 523, duration: 0.09, wave: "triangle", gap: 0.05 },
    { freq: 392, duration: 0.2, wave: "triangle" },
  ],
  notification: [
    { freq: 1047, duration: 0.1, wave: "sine", gap: 0.03, gain: 0.5 },
    { freq: 1319, duration: 0.18, wave: "sine", gain: 0.5 },
  ],
};

/** نفس الصوت مرتين في أقل من هذا (مسح متتابع سريع) يُعزف مرة */
const MIN_INTERVAL_MS = 45;
/** صعود ونزول الصوت لكل نغمة: يمنع "الطقطقة" عند بدايتها ونهايتها */
const RAMP = 0.008;

// ─── الإعدادات ────────────────────────────────────────────────────────────────
const readStored = (): Partial<Record<SoundScope, Partial<SoundSettings>>> => {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const clampVolume = (value: unknown, fallback: number): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), 1) : fallback;
};

const load = (): Record<SoundScope, SoundSettings> => {
  const stored = readStored();
  const of = (scope: SoundScope): SoundSettings => ({
    enabled:
      typeof stored[scope]?.enabled === "boolean"
        ? stored[scope]!.enabled!
        : DEFAULTS[scope].enabled,
    volume: clampVolume(stored[scope]?.volume, DEFAULTS[scope].volume),
  });
  return { pos: of("pos"), dashboard: of("dashboard") };
};

/** إعدادات الصوت الحالية (تفاعلية: الواجهة تقرأها وتعدّلها مباشرة) */
export const soundSettings = reactive<Record<SoundScope, SoundSettings>>(
  typeof window === "undefined"
    ? { pos: { ...DEFAULTS.pos }, dashboard: { ...DEFAULTS.dashboard } }
    : load(),
);

export const setSoundSettings = (
  scope: SoundScope,
  next: Partial<SoundSettings>,
) => {
  Object.assign(soundSettings[scope], {
    ...next,
    ...(next.volume !== undefined
      ? { volume: clampVolume(next.volume, soundSettings[scope].volume) }
      : {}),
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(soundSettings));
  } catch {
    // تصفّح خاص أو تخزين ممتلئ: الإعداد يبقى لهذه الجلسة فقط
  }
};

// ─── التشغيل ──────────────────────────────────────────────────────────────────
let context: AudioContext | null = null;
let unlockInstalled = false;
const lastPlayed = new Map<SoundName, number>();

const audioContext = (): AudioContext | null => {
  if (context) return context;
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
};

/**
 * يفتح الصوت مع أول تفاعل للمستخدم (سياسة المتصفحات). يُستدعى مرة عند فتح
 * الشاشة؛ الأصوات التي تأتي من مؤقّت (انقطاع الاتصال) تحتاجه.
 */
export const installSoundUnlock = () => {
  if (unlockInstalled || typeof window === "undefined") return;
  unlockInstalled = true;
  const unlock = () => {
    const ctx = audioContext();
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
    if (ctx?.state === "running") {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    }
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
};

/**
 * يعزف صوتاً إن كانت أصوات النطاق مفعّلة. لا يرمي خطأ أبداً: الصوت تنبيه
 * إضافي، وغيابه لا يوقف شيئاً.
 */
export const playSound = (
  name: SoundName,
  scope: SoundScope,
  options: { force?: boolean } = {},
) => {
  const settings = soundSettings[scope];
  if ((!settings.enabled && !options.force) || settings.volume <= 0) return;

  const now = Date.now();
  if (now - (lastPlayed.get(name) ?? 0) < MIN_INTERVAL_MS) return;
  lastPlayed.set(name, now);

  const ctx = audioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});

    let at = ctx.currentTime + 0.01;
    for (const note of TONES[name]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const peak = settings.volume * (note.gain ?? 0.7);
      oscillator.type = note.wave ?? "sine";
      oscillator.frequency.setValueAtTime(note.freq, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(peak, at + RAMP);
      gain.gain.setValueAtTime(peak, at + Math.max(note.duration - RAMP, RAMP));
      gain.gain.linearRampToValueAtTime(0, at + note.duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + note.duration + 0.02);
      at += note.duration + (note.gap ?? 0);
    }
  } catch {
    // متصفح بلا دعم كامل: بلا صوت
  }
};
