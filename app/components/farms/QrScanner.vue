<!-- components/farms/QrScanner.vue — مسح QR بكاميرا الجوال (لوحات النخيل وملصقات الحصاد).
     كروم أندرويد: BarcodeDetector المدمج. آيفون (Safari بلا BarcodeDetector): jsQR
     على إطارات الفيديو. مستورد ثابتاً فيُخزَّن مع الشاشة الميدانية ويعمل بلا إنترنت.
     وضع مستمر (continuous) لمسح نخيل كثيرة متتالية، والكتابة بديل إن تعذرت الكاميرا. -->
<template>
  <div class="qr-scan" role="dialog" aria-label="مسح QR">
    <video ref="video" class="qr-scan__video" playsinline muted autoplay />
    <div class="qr-scan__frame" :class="{ 'is-hit': flash }" />

    <div class="qr-scan__top">
      <span>{{ title }}</span>
      <button type="button" class="qr-scan__close" aria-label="إغلاق" @click="$emit('close')">
        <X :size="22" />
      </button>
    </div>

    <div class="qr-scan__bottom">
      <p v-if="error" class="qr-scan__error">{{ error }}</p>
      <p v-else-if="continuous" class="qr-scan__count">
        مُسحت {{ count }} — وجّه الكاميرا للوحة التالية
      </p>
      <p v-else-if="ready" class="qr-scan__hint">وجّه الكاميرا لرمز QR على اللوحة</p>
      <div class="qr-scan__row">
        <button v-if="torchAvailable" type="button" class="qr-scan__btn" @click="toggleTorch">
          <Flashlight :size="18" /> {{ torchOn ? "إطفاء الكشاف" : "كشاف" }}
        </button>
        <button v-if="continuous" type="button" class="qr-scan__btn qr-scan__btn--primary" @click="$emit('close')">
          انتهيت
        </button>
      </div>
      <form class="qr-scan__manual" @submit.prevent="submitManual">
        <input v-model.trim="manual" dir="ltr" placeholder="أو اكتب الوسم: A-B1-R3-07" />
        <button type="submit" class="qr-scan__btn" :disabled="!manual">تم</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Flashlight, X } from "lucide-vue-next";
import jsQR from "jsqr";

/** ما يلزم من BarcodeDetector (غير موجود في أنواع lib.dom بعد) */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

const props = withDefaults(
  defineProps<{
    /** يبقى مفتوحاً بعد كل مسحة (نخيل متتالية) */
    continuous?: boolean;
    title?: string;
  }>(),
  { continuous: false, title: "مسح QR" },
);
const emit = defineEmits<{ code: [text: string]; close: [] }>();

/** كل كم ملّي ثانية يُفحص إطار (توفير للبطارية في الأرض) */
const SCAN_INTERVAL_MS = 180;
/** نفس الرمز لا يُحسب مرتين خلال هذه المدة (الكاميرا ثابتة على اللوحة) */
const REPEAT_GUARD_MS = 2000;
/** أقصى عرض للإطار المحلَّل بـ jsQR (أسرع على الجوالات الضعيفة) */
const FRAME_WIDTH = 640;

const video = ref<HTMLVideoElement | null>(null);
const error = ref("");
const ready = ref(false);
const manual = ref("");
const count = ref(0);
const flash = ref(false);
const torchAvailable = ref(false);
const torchOn = ref(false);

let stream: MediaStream | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let detector: BarcodeDetectorLike | null = null;
let canvas: HTMLCanvasElement | null = null;
let last = { text: "", at: 0 };
let stopped = false;

const deliver = (text: string) => {
  const now = Date.now();
  if (text === last.text && now - last.at < REPEAT_GUARD_MS) return;
  last = { text, at: now };
  count.value++;
  flash.value = true;
  setTimeout(() => (flash.value = false), 250);
  navigator.vibrate?.(60);
  emit("code", text);
  if (!props.continuous) stop();
};

const submitManual = () => {
  if (!manual.value) return;
  const text = manual.value;
  manual.value = "";
  last = { text: "", at: 0 };
  deliver(text);
};

/** إطار واحد: المدمج إن وُجد، وإلا jsQR على صورة مصغّرة */
const readFrame = async (): Promise<string | null> => {
  const el = video.value;
  if (!el || el.readyState < 2 || !el.videoWidth) return null;
  if (detector) {
    const codes = await detector.detect(el);
    return codes[0]?.rawValue ?? null;
  }
  canvas ??= document.createElement("canvas");
  const scale = Math.min(1, FRAME_WIDTH / el.videoWidth);
  const width = Math.round(el.videoWidth * scale);
  const height = Math.round(el.videoHeight * scale);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(el, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  return jsQR(image.data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
};

const loop = async () => {
  if (stopped) return;
  try {
    const text = await readFrame();
    if (text) deliver(text);
  } catch {
    // إطار تالف: نكمل
  }
  if (!stopped) timer = setTimeout(() => void loop(), SCAN_INTERVAL_MS);
};

const start = async () => {
  if (!window.isSecureContext) {
    error.value = "الكاميرا تحتاج اتصالاً آمناً (https) — اكتب الوسم";
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = "الكاميرا غير متاحة في هذا المتصفح — اكتب الوسم";
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      audio: false,
    });
  } catch (e) {
    const name = (e as DOMException).name;
    error.value =
      name === "NotAllowedError"
        ? "اسمح للمتصفح باستخدام الكاميرا من إعداداته — أو اكتب الوسم"
        : name === "NotFoundError"
          ? "لا كاميرا على هذا الجهاز — اكتب الوسم"
          : "تعذر فتح الكاميرا — اكتب الوسم";
    return;
  }
  if (stopped) return stop();
  if (video.value) {
    video.value.srcObject = stream;
    await video.value.play().catch(() => {});
  }
  const track = stream.getVideoTracks()[0];
  const capabilities = track?.getCapabilities?.() as { torch?: boolean } | undefined;
  torchAvailable.value = !!capabilities?.torch;

  const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (Detector) {
    try {
      const formats = await Detector.getSupportedFormats();
      if (formats.includes("qr_code")) detector = new Detector({ formats: ["qr_code"] });
    } catch {
      detector = null;
    }
  }
  ready.value = true;
  void loop();
};

const toggleTorch = async () => {
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  try {
    await track.applyConstraints({
      advanced: [{ torch: !torchOn.value } as MediaTrackConstraintSet],
    });
    torchOn.value = !torchOn.value;
  } catch {
    torchAvailable.value = false;
  }
};

const stop = () => {
  stopped = true;
  if (timer) clearTimeout(timer);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
};

onMounted(() => void start());
onBeforeUnmount(stop);
</script>

<style lang="scss">
.qr-scan {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: #000;
  color: #fff;
  font-family: "Cairo", sans-serif;

  &__video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__frame {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(70vw, 300px);
    aspect-ratio: 1;
    transform: translate(-50%, -55%);
    border: 3px solid rgba(255, 255, 255, 0.85);
    border-radius: 18px;
    box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.45);
    transition: border-color 0.15s;

    &.is-hit {
      border-color: #22c55e;
    }
  }

  &__top {
    position: absolute;
    top: 0;
    inset-inline: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    font-weight: 600;
    background: linear-gradient(rgba(0, 0, 0, 0.6), transparent);
  }

  &__close {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    cursor: pointer;
  }

  &__bottom {
    position: absolute;
    bottom: 0;
    inset-inline: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.75) 30%);

    p {
      margin: 0;
      text-align: center;
      font-size: 0.95rem;
    }
  }

  &__error {
    color: #fca5a5;
  }

  &__count {
    color: #86efac;
    font-weight: 600;
  }

  &__row {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    font: inherit;
    cursor: pointer;

    &--primary {
      background: #2563eb;
      border-color: #2563eb;
      font-weight: 600;
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &__manual {
    display: flex;
    gap: 8px;

    input {
      flex: 1;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      font: inherit;
    }
  }
}
</style>
