<!-- PosShortcutsModal — اختصارات لوحة المفاتيح في شاشة الكاشير -->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><Keyboard :size="20" class="doc-modal__icon" /> اختصارات لوحة المفاتيح</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>
          <div class="doc-form">
            <div class="pos-rows">
              <div v-for="item in shortcuts" :key="item.keys" class="pos-rows__row">
                <span class="pos-rows__main">{{ item.label }}</span>
                <span>
                  <kbd v-for="key in item.keys.split(' ')" :key="key" class="pos-key">
                    {{ key }}
                  </kbd>
                </span>
              </div>
            </div>
            <p class="doc-hint">
              + و − و Delete تعمل على السطر المحدد في السلة (المظلَّل)، حين لا يكون
              المؤشر داخل حقل كتابة.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Keyboard, X } from "lucide-vue-next";
import type { PosFeatureKey } from "@/pos/types";
import { usePosStore } from "@/stores/pos";

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const close = () => emit("update:modelValue", false);

const pos = usePosStore();
/** اختصارات المميزات المفعّلة فقط */
const shortcuts = computed(() =>
  POS_SHORTCUTS.filter(
    (item) => !("feature" in item) || pos.features[item.feature as PosFeatureKey],
  ),
);
</script>

<script lang="ts">
/** المصدر الوحيد لقائمة الاختصارات: تعرضها النافذة وتنفّذها الصفحة */
export const POS_SHORTCUTS = [
  { keys: "F1", label: "هذه القائمة" },
  { keys: "F2", label: "البحث / مسح الباركود" },
  { keys: "F3", label: "لوحة الأرقام (تُسحب لأي مكان)", feature: "numpad" },
  { keys: "F4", label: "الدفع — وداخل نافذة الدفع: نقداً بالضبط" },
  { keys: "F6", label: "تعليق الفاتورة", feature: "holdSales" },
  { keys: "F7", label: "الفواتير المعلّقة", feature: "holdSales" },
  { keys: "F8", label: "خصم على الفاتورة", feature: "invoiceDiscount" },
  { keys: "F9", label: "حركة نقدية في الدرج", feature: "cashMoves" },
  { keys: "F10", label: "بيع توصيل (طيار أو شركة شحن)", feature: "delivery" },
  { keys: "↑ ↓", label: "تحديد سطر في السلة" },
  { keys: "+ −", label: "زيادة / إنقاص كمية السطر المحدد" },
  { keys: "*", label: "كتابة كمية السطر المحدد" },
  { keys: "/", label: "كتابة خصم السطر المحدد", feature: "lineDiscount" },
  { keys: "=", label: "تغيير سعر السطر المحدد في هذه الفاتورة", feature: "priceChange" },
  { keys: "Delete", label: "حذف السطر المحدد" },
  { keys: "Esc", label: "إغلاق النافذة المفتوحة" },
] as const;
</script>
