<template>
  <div class="phone-input" dir="ltr">
    <select
      v-model="countryCode"
      class="form-select phone-input__country"
      aria-label="مفتاح الدولة"
      :disabled="disabled"
      @change="commit"
    >
      <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">
        +{{ c.dialCode }} {{ c.nameAr }}
      </option>
    </select>
    <input
      ref="inputEl"
      :value="national"
      type="tel"
      inputmode="numeric"
      autocomplete="tel-national"
      class="form-input phone-input__number"
      :class="inputClass"
      :placeholder="placeholder"
      :maxlength="maxLength"
      :required="required"
      :disabled="disabled"
      @input="onInput"
      @blur="emit('blur')"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * حقل هاتف بمفتاح الدولة: يخزّن الرقم دولياً (E.164: ‎+9665XXXXXXXX) أياً كانت
 * طريقة كتابته. المفتاح الافتراضي دولة الشركة، ويمكن تغييره لرقم من دولة
 * أخرى (عميل أو مورد خارجي).
 */
import { computed, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{
  modelValue?: string | null;
  /** الدولة الافتراضية للمفتاح (ISO) — دولة الشركة إن لم تُحدَّد */
  country?: string;
  required?: boolean;
  disabled?: boolean;
  inputClass?: string | Record<string, unknown>;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();

const auth = useAuthStore();
const inputEl = ref<HTMLInputElement | null>(null);

const defaultCountry = computed(() => props.country ?? auth.country);
const countryCode = ref(defaultCountry.value);
const national = ref("");

const selected = computed(() => getCountry(countryCode.value));
// خانة إضافية للصفر البادئ الذي يكتبه المستخدم محلياً (05…)
const maxLength = computed(() => selected.value.phoneLength[1] + 1);
const placeholder = computed(() => "X".repeat(selected.value.phoneLength[1]));

const syncValidity = () => {
  const valid =
    national.value === "" ||
    isValidNationalPhone(countryCode.value, national.value);
  inputEl.value?.setCustomValidity(
    valid
      ? ""
      : `رقم غير صالح لـ${selected.value.nameAr} (+${selected.value.dialCode})`,
  );
};

const commit = () => {
  syncValidity();
  emit("update:modelValue", joinPhone(countryCode.value, national.value));
};

const onInput = (event: Event) => {
  const el = event.target as HTMLInputElement;
  const clean = toPhoneDigits(el.value);
  if (clean !== el.value) el.value = clean;
  national.value = clean;
  commit();
};

/** مزامنة القيمة القادمة من الأب — لا تُعاد كتابة ما يكتبه المستخدم الآن */
const syncFromModel = () => {
  const incoming = props.modelValue ?? "";
  if (incoming === joinPhone(countryCode.value, national.value)) return;

  const parts = splitPhone(incoming, defaultCountry.value);
  countryCode.value = parts.country;
  national.value = parts.national;
  // رقم محفوظ سابقاً بصيغة قديمة لا يمنع حفظ بقية النموذج: التحقق يبدأ عند
  // أول تعديل للرقم نفسه
  inputEl.value?.setCustomValidity("");
};

syncFromModel();
watch(() => props.modelValue, syncFromModel);
// تغيّر الدولة الافتراضية (اختيار الدولة في نموذج التسجيل) ينقل المفتاح معه
watch(defaultCountry, (next) => {
  countryCode.value = next;
  commit();
});
</script>

<style lang="scss" scoped>
.phone-input {
  display: flex;
  gap: $space-2;

  &__country {
    flex: 0 0 auto;
    width: auto;
    max-width: 46%;
  }

  &__number {
    flex: 1 1 auto;
    min-width: 0;
    text-align: left;
  }
}
</style>
