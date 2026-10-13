<!--
  PosCustomerModal — إضافة عميل من شاشة الكاشير. يُحفظ على الجهاز ويُختار للفاتورة
  فوراً (حتى بلا إنترنت)، ويُرفع للسيرفر قبل فواتيره.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><UserPlus :size="20" class="doc-modal__icon" /> عميل جديد</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="submit">
            <div class="form-group">
              <label>اسم العميل *</label>
              <input
                ref="nameEl"
                v-model.trim="form.name"
                class="form-input"
                maxlength="200"
                required
              />
            </div>
            <div class="form-group">
              <label>الهاتف</label>
              <StbPhoneInput v-model="form.phone" />
            </div>
            <div class="form-group">
              <label>الرقم الضريبي</label>
              <input
                v-model.trim="form.taxNumber"
                class="form-input"
                dir="ltr"
                inputmode="numeric"
                maxlength="15"
                placeholder="15 رقماً — لفاتورة ضريبية باسمه"
              />
            </div>
            <p class="doc-hint">
              حد الائتمان ومهلة السداد يُحدَّدان من صفحة العملاء في لوحة التحكم.
            </p>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">إلغاء</button>
              <button
                type="submit"
                class="btn btn--primary"
                :class="{ 'btn--loading': saving }"
                :disabled="saving"
              >
                إضافة واختيار
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref, watch } from "vue";
import { UserPlus, X } from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import { usePosStore } from "@/stores/pos";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const pos = usePosStore();
const toast = useToast();
const nameEl = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const form = reactive({ name: "", phone: "", taxNumber: "" });

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    Object.assign(form, { name: "", phone: "", taxNumber: "" });
    await nextTick();
    nameEl.value?.focus();
  },
);

const close = () => emit("update:modelValue", false);

const submit = async () => {
  saving.value = true;
  try {
    const customer = await pos.addCustomer(form);
    toast.success(`تمت إضافة العميل "${customer.name}"`);
    close();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إضافة العميل"));
  } finally {
    saving.value = false;
  }
};
</script>
