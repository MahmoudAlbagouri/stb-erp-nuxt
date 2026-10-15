<!--
  CompanyLogoPicker — اختيار شعار الشركة ومعاينته. يُصغّر الصورة في المتصفح
  (utils/logo) ويعيدها Data URL عبر v-model؛ الرفع على الصفحة الأم (التسجيل
  يرفعه بعد إنشاء الحساب، والملف الشخصي فوراً).
-->
<template>
  <div class="logo-picker">
    <div class="logo-picker__preview" :class="{ 'is-empty': !modelValue }">
      <img v-if="modelValue" :src="modelValue" alt="شعار الشركة" />
      <ImageIcon v-else :size="28" />
    </div>

    <div class="logo-picker__body">
      <p class="logo-picker__hint">
        {{ hint }}
      </p>
      <div class="logo-picker__actions">
        <button
          type="button"
          class="btn btn--sm btn--ghost"
          :class="{ 'btn--loading': busy }"
          :disabled="busy || disabled"
          @click="input?.click()"
        >
          <Upload :size="14" />
          {{ modelValue ? "تغيير الشعار" : "اختيار شعار" }}
        </button>
        <button
          v-if="modelValue"
          type="button"
          class="btn btn--sm btn--ghost text-danger"
          :disabled="busy || disabled"
          @click="emit('update:modelValue', null)"
        >
          <Trash2 :size="14" /> إزالة
        </button>
      </div>
      <p v-if="error" class="form-error">{{ error }}</p>
    </div>

    <input
      ref="input"
      type="file"
      :accept="LOGO_TYPES.join(',')"
      class="logo-picker__input"
      @change="pick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ImageIcon, Trash2, Upload } from "lucide-vue-next";
import { LOGO_TYPES, prepareLogo } from "@/utils/logo";

withDefaults(
  defineProps<{
    modelValue: string | null;
    hint?: string;
    disabled?: boolean;
  }>(),
  {
    hint: "PNG أو JPG — يظهر على الفواتير والتقارير. يُفضّل خلفية بيضاء أو شفافة.",
    disabled: false,
  },
);
const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();

const input = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const error = ref("");

const pick = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  (event.target as HTMLInputElement).value = ""; // نفس الملف يُختار مرة أخرى
  if (!file) return;
  busy.value = true;
  error.value = "";
  try {
    emit("update:modelValue", await prepareLogo(file));
  } catch (e) {
    error.value = getErrorMessage(e, "تعذر تجهيز الصورة");
  } finally {
    busy.value = false;
  }
};
</script>

<style lang="scss" scoped>
.logo-picker {
  display: flex;
  align-items: center;
  gap: $space-4;

  &__preview {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 96px;
    height: 96px;
    padding: $space-2;
    // الشعار يُطبع على ورق أبيض: نعاينه على أبيض
    background: #fff;
    border: 1px solid $stb-border;
    border-radius: $radius-md;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    &.is-empty {
      color: $stb-text-muted;
      background: $stb-surface-2;
      border-style: dashed;
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    min-width: 0;
  }
  &__hint {
    margin: 0;
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }
  &__input {
    display: none;
  }
}
</style>
