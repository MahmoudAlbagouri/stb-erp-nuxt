// pos/display.ts — شاشة العميل: نافذة ثانية تعرض السلة والإجمالي
//
// شاشة الكاشير تبثّ حالتها عبر BroadcastChannel، ونافذة /pos/display (على
// الشاشة الثانية الموجّهة للعميل) تعرضها. نفس المتصفح ونفس الجهاز: لا سيرفر
// ولا إنترنت.
const CHANNEL = "stb-pos-display";

export interface DisplayLine {
  name: string;
  quantity: number;
  unitName: string;
  total: number;
}

export interface DisplayState {
  company: string;
  currency: string;
  decimals: number;
  lines: DisplayLine[];
  discount: number;
  total: number;
  /** آخر فاتورة أُتمّت: تُعرض رسالة الشكر والباقي حتى تبدأ فاتورة جديدة */
  done: { total: number; paid: number; change: number } | null;
}

/** نافذة العرض تطلب الحالة عند فتحها (فُتحت بعد أن بدأ البيع) */
type DisplayMessage = { kind: "state"; state: DisplayState } | { kind: "hello" };

const supported = () => typeof BroadcastChannel !== "undefined";

/** جهة الكاشير: تبثّ الحالة، وتعيد بثّها لأي نافذة عرض تُفتح */
export const createDisplayPublisher = (current: () => DisplayState) => {
  if (!supported()) return { publish: () => {}, close: () => {} };
  const channel = new BroadcastChannel(CHANNEL);
  const publish = () =>
    channel.postMessage({ kind: "state", state: current() } satisfies DisplayMessage);
  channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
    if (event.data.kind === "hello") publish();
  };
  return { publish, close: () => channel.close() };
};

/** جهة نافذة العرض */
export const subscribeToDisplay = (onState: (state: DisplayState) => void) => {
  if (!supported()) return () => {};
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
    if (event.data.kind === "state") onState(event.data.state);
  };
  channel.postMessage({ kind: "hello" } satisfies DisplayMessage);
  return () => channel.close();
};
