// composables/useConnection.ts — هل السيرفر في المتناول؟
//
// حالة واحدة للوحة التحكم كلها: useApi يحدّثها مع كل طلب (فشل الشبكة = بلا
// اتصال، أي رد من السيرفر = متصل)، وشريط ConnectionBanner يعرضها. لا شيء
// يُحفظ للعمل بلا إنترنت هنا: ما على الشاشة يبقى كما هو، والحفظ ينتظر الاتصال.
// (الشاشات التي تعمل بلا إنترنت فعلاً — الكاشير والطيار والعدّ — لها طوابيرها.)
import { useRuntimeConfig, useState } from "nuxt/app";

/** طلب لم يصل للسيرفر أصلاً (النت مقطوع، أو السيرفر يُعاد تشغيله) */
export class NetworkError extends Error {}

export const OFFLINE_MESSAGE =
  "انقطع الاتصال بالسيرفر — تحقّق من الإنترنت ثم أعد المحاولة";
export const SERVER_BUSY_MESSAGE =
  "السيرفر غير متاح الآن — أعد المحاولة بعد قليل";

export interface ConnectionState {
  offline: boolean;
  /** متى انقطع (ms) — للعرض */
  since: number | null;
}

/** كل كم يُفحص السيرفر ما دام الاتصال منقطعاً */
export const PROBE_INTERVAL_MS = 15_000;

export const useConnection = () => {
  const state = useState<ConnectionState>("api-connection", () => ({
    offline: false,
    since: null,
  }));
  const apiBase = useRuntimeConfig().public.apiBase;

  const markOffline = () => {
    // على السيرفر (SSR) لا معنى لها: الحالة تُرسل للمتصفح مع الصفحة
    if (!import.meta.client || state.value.offline) return;
    state.value = { offline: true, since: Date.now() };
  };

  const markOnline = () => {
    if (!import.meta.client || !state.value.offline) return;
    state.value = { offline: false, since: null };
  };

  /**
   * هل السيرفر يرد؟ أي رد (ولو 404) يكفي؛ no-cors فلا يتوقف على ترويسات CORS.
   * navigator.onLine وحده لا يكفي: يقول "متصل" والجهاز على راوتر بلا إنترنت.
   */
  const probe = async (): Promise<boolean> => {
    try {
      await fetch(apiBase, { method: "HEAD", mode: "no-cors", cache: "no-store" });
      markOnline();
      return true;
    } catch {
      markOffline();
      return false;
    }
  };

  return { state, markOffline, markOnline, probe };
};
