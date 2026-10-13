<!-- PosHeldModal — الفواتير المعلّقة: استرجاع أو حذف -->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><PauseCircle :size="20" class="doc-modal__icon" /> فواتير معلّقة</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="doc-form">
            <div class="pos-rows">
              <p v-if="!pos.held.length" class="pos-rows__empty">
                لا توجد فواتير معلّقة
              </p>
              <div v-for="h in pos.held" :key="h.id" class="pos-rows__row">
                <div class="doc-cell pos-rows__main">
                  <span class="doc-cell__main">
                    {{ h.label || customerName(h.customerId) || "فاتورة معلّقة" }}
                  </span>
                  <span class="doc-cell__sub">
                    {{ formatNumber(h.items) }} قطعة ·
                    {{ formatDateTime(h.heldAt) }}
                  </span>
                </div>
                <strong class="doc-money">{{ formatCurrency(h.total) }}</strong>
                <button class="btn btn--sm btn--primary" @click="emit('resume', h.id)">
                  استرجاع
                </button>
                <button
                  class="btn btn--sm btn--danger btn--icon"
                  title="حذف"
                  @click="emit('remove', h.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
            <p v-if="pos.cart.length && pos.held.length" class="doc-hint">
              استرجاع فاتورة يعلّق السلة الحالية مكانها.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { PauseCircle, Trash2, X } from "lucide-vue-next";
import { usePosStore } from "@/stores/pos";

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  resume: [id: string];
  remove: [id: string];
}>();

const pos = usePosStore();
const close = () => emit("update:modelValue", false);
const customerName = (id: string) =>
  pos.customers.find((c) => c.id === id)?.name ?? "";
</script>
