<!--
  StbLocationInput — موقع على الخريطة يُلصق كرابط (Google / Apple / واتساب) أو
  كإحداثيات "24.71, 46.67". يقرأ الإحداثيات من النص نفسه فيعمل بلا إنترنت.
  v-model: { latitude, longitude } أو null. اختياري دائماً: نص لا يُفهم لا
  يمنع الحفظ، يُنبَّه عليه ويُرسل بلا موقع.
-->
<template>
  <div class="location-input">
    <input
      v-model.trim="text"
      class="form-input"
      dir="ltr"
      maxlength="2000"
      :placeholder="placeholder"
      @blur="normalize"
    />
    <small v-if="modelValue" class="location-input__status is-ok">
      <MapPin :size="12" />
      <a :href="mapsLink(modelValue)" target="_blank" rel="noopener">
        {{ formatLocation(modelValue) }}
      </a>
    </small>
    <small v-else-if="text" class="location-input__status is-bad">
      لم تُفهم الإحداثيات — الرابط المختصر (maps.app.goo.gl) افتحه وانسخ الرابط
      الكامل، أو اكتب "خط العرض، خط الطول"
    </small>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { MapPin } from "lucide-vue-next";
import {
  formatLocation,
  mapsLink,
  parseLocation,
  type GeoPoint,
} from "@/utils/geo";

const props = withDefaults(
  defineProps<{ modelValue: GeoPoint | null; placeholder?: string }>(),
  { placeholder: "الصق رابط الموقع أو الإحداثيات (اختياري)" },
);
const emit = defineEmits<{ "update:modelValue": [value: GeoPoint | null] }>();

const text = ref(props.modelValue ? formatLocation(props.modelValue) : "");

watch(text, (value) => emit("update:modelValue", parseLocation(value)));

// تفريغ النموذج من الخارج يفرّغ الحقل
watch(
  () => props.modelValue,
  (point) => {
    if (!point && parseLocation(text.value)) text.value = "";
  },
);

/** بعد اللصق: رابط طويل يُختصر إلى إحداثياته */
const normalize = () => {
  if (props.modelValue) text.value = formatLocation(props.modelValue);
};
</script>

<style lang="scss" scoped>
.location-input {
  display: flex;
  flex-direction: column;
  gap: $space-1;

  &__status {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    font-size: $font-size-xs;

    &.is-ok,
    &.is-ok a {
      color: $stb-success;
    }

    &.is-bad {
      color: $stb-danger;
    }
  }
}
</style>
