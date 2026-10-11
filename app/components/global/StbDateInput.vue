<template>
  <div
    class="stb-date-input"
    :class="[
      attrs.class,
      {
        'stb-date-input--empty': !modelValue,
        'stb-date-input--locked': isLocked,
      },
    ]"
    :style="attrs.style as StyleValue"
  >
    <span class="stb-date-input__text" dir="ltr">{{ displayText }}</span>
    <component :is="type === 'time' ? Clock : Calendar" :size="16" />

    <!--
      الحقل الأصلي شفاف فوق المكوّن: نستخدمه لاختيار القيمة والتحقق (required/min/max)
      فقط، ولا نعرض نصّه — لأن المتصفحات العربية تعرضه بحروف معكوسة وأرقام هندية.
    -->
    <input
      ref="nativeInput"
      class="stb-date-input__native"
      :type="type"
      :value="modelValue ?? ''"
      v-bind="nativeAttrs"
      @input="onInput"
      @click="openPicker"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, type StyleValue } from "vue";
import { Calendar, Clock } from "lucide-vue-next";

type DateInputType = "date" | "datetime-local" | "time";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    type?: DateInputType;
  }>(),
  { modelValue: "", type: "date" },
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const attrs = useAttrs();
const nativeInput = ref<HTMLInputElement | null>(null);

const PLACEHOLDERS: Record<DateInputType, string> = {
  date: "MM/DD/YYYY",
  "datetime-local": "MM/DD/YYYY, --:-- --",
  time: "--:-- --",
};

// class/style للحاوية، و onInput نستدعيه يدوياً بعد تحديث v-model
const nativeAttrs = computed(() => {
  const { class: _class, style: _style, onInput: _onInput, ...rest } = attrs;
  return rest;
});

const isLocked = computed(
  () =>
    (attrs.readonly !== undefined && attrs.readonly !== false) ||
    (attrs.disabled !== undefined && attrs.disabled !== false),
);

/** "2026-10-11" → "10/11/2026" (تنسيق نصّي مباشر لتفادي فروق المنطقة الزمنية) */
const formatDatePart = (value: string): string => {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${month}/${day}/${year}` : value;
};

/** "15:45" → "03:45 PM" */
const formatTimePart = (value: string): string => {
  const [hourStr, minute] = value.split(":");
  const hour = Number(hourStr);
  if (!minute || Number.isNaN(hour)) return value;
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${hour < 12 ? "AM" : "PM"}`;
};

const displayText = computed(() => {
  const value = props.modelValue;
  if (!value) return PLACEHOLDERS[props.type];

  if (props.type === "time") return formatTimePart(value);
  if (props.type === "date") return formatDatePart(value.slice(0, 10));

  const [datePart = "", timePart = ""] = value.split("T");
  return `${formatDatePart(datePart)}, ${formatTimePart(timePart)}`;
});

const onInput = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
  const listener = attrs.onInput as ((event: Event) => void) | undefined;
  listener?.(event);
};

const openPicker = () => {
  if (isLocked.value) return;
  try {
    nativeInput.value?.showPicker();
  } catch {
    // متصفحات لا تدعم showPicker: يبقى الحقل الأصلي قابلاً للتركيز والكتابة
  }
};
</script>

<style lang="scss" scoped>
.stb-date-input {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  cursor: pointer;

  svg {
    flex-shrink: 0;
    color: $stb-accent;
    opacity: 0.8;
    pointer-events: none;
  }

  &:focus-within {
    border-color: $stb-accent;
  }

  &--empty &__text {
    opacity: 0.45;
  }

  &--locked {
    cursor: not-allowed;
  }
}

.stb-date-input__text {
  flex: 1;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

.stb-date-input__native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: inherit;
}
</style>
