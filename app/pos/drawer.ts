// pos/drawer.ts — فتح درج النقود
//
// الدرج يُوصَّل بطابعة الإيصالات (كابل RJ11) ويفتحه أمر ESC/POS ترسله الطابعة.
// المتصفح يصل للطابعة عبر Web Serial (Chrome / Edge على الكمبيوتر) إن كانت
// على منفذ تسلسلي: COM حقيقي، أو USB بتعريف "Virtual COM"، أو بلوتوث.
//
// طابعة مُعرَّفة كطابعة ويندوز عادية (USB بتعريف الشركة) لا تظهر هنا — لها
// خيار "فتح الدرج عند الطباعة" في إعدادات تعريفها، ويعمل مع طباعة الإيصال
// دون أي شيء من هذا الملف.

export interface DrawerConfig {
  mode: "off" | "serial";
  baudRate: number;
  /** مخرج الدرج في الطابعة: 0 = الأول (الشائع)، 1 = الثاني */
  pin: 0 | 1;
}

export const DEFAULT_DRAWER: DrawerConfig = { mode: "off", baudRate: 9600, pin: 0 };
export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200];

// Web Serial ليس في تعريفات TypeScript القياسية: نعرّف ما نستخدمه فقط
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}
interface Serial {
  requestPort(): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

const serial = (): Serial | null =>
  typeof navigator !== "undefined" && "serial" in navigator
    ? (navigator as Navigator & { serial: Serial }).serial
    : null;

export const drawerSupported = (): boolean => serial() !== null;

/** ESC p m t1 t2 — نبضة على مخرج الدرج (50ms تشغيل، 500ms إيقاف) */
export const kickCommand = (pin: 0 | 1): Uint8Array =>
  new Uint8Array([0x1b, 0x70, pin, 0x19, 0xfa]);

/** هل سبق أن سمح المستخدم لهذه الشاشة بمنفذ؟ */
export const drawerPaired = async (): Promise<boolean> =>
  ((await serial()?.getPorts()) ?? []).length > 0;

/** يطلب من المستخدم اختيار منفذ الطابعة (مرة واحدة؛ المتصفح يتذكره) */
export const pairDrawer = async (): Promise<void> => {
  const api = serial();
  if (!api) throw new Error("هذا المتصفح لا يدعم التحكم بالدرج — استخدم Chrome أو Edge على الكمبيوتر");
  await api.requestPort();
};

/** الدرج يُفتح بطلب واحد في المرة: طلبان متداخلان يتنازعان المنفذ */
let busy: Promise<void> = Promise.resolve();

export const kickDrawer = (config: DrawerConfig): Promise<void> => {
  const run = async () => {
    const api = serial();
    if (!api) throw new Error("هذا المتصفح لا يدعم التحكم بالدرج");
    const [port] = await api.getPorts();
    if (!port) throw new Error("لم يُختر منفذ الطابعة — اختره من إعدادات الشاشة");

    await port.open({ baudRate: config.baudRate });
    try {
      const writer = port.writable?.getWriter();
      if (!writer) throw new Error("منفذ الطابعة لا يقبل الكتابة");
      try {
        await writer.write(kickCommand(config.pin));
      } finally {
        writer.releaseLock();
      }
    } finally {
      await port.close();
    }
  };
  // فشل طلب سابق لا يمنع التالي
  const next = busy.then(run, run);
  busy = next.catch(() => {});
  return next;
};
