<template>
  <input
    ref="inputEl"
    type="text"
    :inputmode="allowsDecimals ? 'decimal' : 'numeric'"
    autocomplete="off"
    @input="onInput"
  />
</template>

<script setup lang="ts">
/**
 * بديل <input type="number">: المتصفحات العربية تعرض حقل number الأصلي بأرقام
 * هندية (٣٠) ولا يمكن تغيير ذلك بالـ CSS أو lang. هذا الحقل نصّي يقبل الأرقام
 * فقط ويعرضها دائماً لاتينية، مع نفس تحقق min / max / step / required.
 */
import { computed, onMounted, ref, useAttrs, watch } from "vue";

const props = defineProps<{ modelValue?: number | string | null }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const attrs = useAttrs();
const inputEl = ref<HTMLInputElement | null>(null);

const toLimit = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const min = computed(() => toLimit(attrs.min));
const max = computed(() => toLimit(attrs.max));
// كالحقل الأصلي: الخطوة الافتراضية 1 (أعداد صحيحة) ما لم يُحدَّد step
const step = computed(() =>
  attrs.step === "any" ? null : (toLimit(attrs.step) ?? 1),
);
const allowsDecimals = computed(
  () => step.value === null || !Number.isInteger(step.value),
);
const allowsNegative = computed(() => min.value === null || min.value < 0);

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** يحوّل الأرقام الهندية/الفارسية إلى لاتينية ويزيل أي محرف غير رقمي */
const sanitize = (raw: string): string => {
  let text = raw
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٫,،]/g, ".");

  const negative = allowsNegative.value && text.trim().startsWith("-");
  text = text.replace(allowsDecimals.value ? /[^0-9.]/g : /[^0-9]/g, "");

  const firstDot = text.indexOf(".");
  if (firstDot !== -1) {
    text =
      text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, "");
  }
  return negative ? `-${text}` : text;
};

const validationMessage = (text: string): string => {
  if (text === "") return ""; // required يتولاه المتصفح
  const value = Number(text);
  if (!Number.isFinite(value)) return "يرجى إدخال رقم صحيح";
  if (min.value !== null && value < min.value)
    return `يجب أن تكون القيمة ${min.value} أو أكثر`;
  if (max.value !== null && value > max.value)
    return `يجب أن تكون القيمة ${max.value} أو أقل`;
  if (step.value !== null) {
    const steps = (value - (min.value ?? 0)) / step.value;
    if (Math.abs(steps - Math.round(steps)) > 1e-9)
      return Number.isInteger(step.value)
        ? "يرجى إدخال عدد صحيح"
        : "يرجى إدخال قيمة صالحة";
  }
  return "";
};

const syncValidity = () => {
  const el = inputEl.value;
  if (el) el.setCustomValidity(validationMessage(el.value));
};

const onInput = (event: Event) => {
  const el = event.target as HTMLInputElement;
  const clean = sanitize(el.value);
  if (clean !== el.value) el.value = clean;
  syncValidity();
  emit("update:modelValue", clean);
};

/**
 * مزامنة القيمة القادمة من الأب مع الحقل. أثناء الكتابة لا نعيد كتابة النص إذا
 * كان يساوي القيمة عددياً — حتى لا تُحذف الفاصلة العشرية في "12." مع v-model.number
 */
const syncValue = () => {
  const el = inputEl.value;
  if (!el) return;
  const next =
    props.modelValue === null || props.modelValue === undefined
      ? ""
      : String(props.modelValue);
  const isTyping = document.activeElement === el;
  const sameNumber =
    el.value !== "" && next !== "" && Number(el.value) === Number(next);
  if (el.value !== next && !(isTyping && sameNumber)) el.value = next;
  syncValidity();
};

onMounted(syncValue);
watch(() => props.modelValue, syncValue, { flush: "post" });
watch([min, max, step], syncValidity, { flush: "post" });
</script>
