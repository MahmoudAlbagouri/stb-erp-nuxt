<!-- components/farms/FarmLabelsPrint.vue — طباعة لوحات QR للنخيل وملصقات الحصاد على A4.
     sticker: 3×8 لكل صفحة (ورق ملصقات) — plate: 2×3 (لوحة كبيرة تُثبَّت على الجذع
     وتُقرأ من حوالي متر). رمز QR بصيغة SVG فيبقى حاداً بأي مقاس. -->
<template>
  <Teleport to="body">
    <div class="print-area farm-labels" :class="`farm-labels--${size}`">
      <div v-for="(label, i) in rendered" :key="i" class="farm-labels__item">
        <!-- eslint-disable-next-line vue/no-v-html -- SVG تولّده مكتبة qrcode من نص الرمز -->
        <div class="farm-labels__qr" v-html="label.svg" />
        <div class="farm-labels__text">
          <strong dir="ltr">{{ label.title }}</strong>
          <span v-for="(line, j) in label.lines" :key="j">{{ line }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import QRCode from "qrcode";

export interface FarmLabel {
  /** محتوى الرمز (رابط utils/farm-codes) */
  code: string;
  /** السطر الكبير: وسم النخلة أو رقم الحصاد */
  title: string;
  lines: string[];
}
export type FarmLabelSize = "sticker" | "plate";

const rendered = ref<(FarmLabel & { svg: string })[]>([]);
const size = ref<FarmLabelSize>("sticker");

const PAGE_RULE = "@page { size: A4 portrait; margin: 8mm; }";

/** يرسم الرموز ثم يفتح الطباعة */
const print = async (labels: FarmLabel[], target: FarmLabelSize = "sticker") => {
  size.value = target;
  rendered.value = await Promise.all(
    labels.map(async (label) => ({
      ...label,
      // M: يتحمل خدشاً أو غباراً على اللوحة (~15%)
      svg: await QRCode.toString(label.code, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
      }),
    })),
  );
  const style = document.createElement("style");
  style.textContent = PAGE_RULE;
  document.head.appendChild(style);
  await nextTick();
  window.print();
  style.remove();
};

defineExpose({ print });
</script>

<style lang="scss">
// غير scoped: العنصر خارج شجرة الصفحة (Teleport)، وحبر أسود على ورق أبيض دائماً
.farm-labels {
  color: #000;
  background: #fff;
  font-family: "Cairo", sans-serif;
  direction: rtl;

  &__item {
    display: flex;
    align-items: center;
    gap: 3mm;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
    border: 0.2mm dashed #999;
    padding: 2mm;
    box-sizing: border-box;
  }

  &__qr {
    flex-shrink: 0;

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 0.6mm;
    min-width: 0;

    strong {
      font-family: "Consolas", "Courier New", monospace;
      font-weight: 800;
      letter-spacing: 0.3px;
      word-break: break-all;
      text-align: start;
    }

    span {
      font-size: 8.5pt;
      line-height: 1.25;
    }
  }

  // ورق ملصقات: 3 × 8 على A4
  &--sticker {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 34mm;
    gap: 1.5mm;

    .farm-labels__qr {
      width: 26mm;
      height: 26mm;
    }
    strong {
      font-size: 11pt;
    }
  }

  // لوحة كبيرة: 2 × 3 على A4، رمز 58 مم يُقرأ من حوالي متر
  &--plate {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 89mm;
    gap: 3mm;

    .farm-labels__item {
      flex-direction: column;
      justify-content: center;
      text-align: center;
    }
    .farm-labels__qr {
      width: 58mm;
      height: 58mm;
    }
    .farm-labels__text {
      align-items: center;
    }
    strong {
      font-size: 18pt;
    }
    span {
      font-size: 10pt;
    }
  }
}
</style>
