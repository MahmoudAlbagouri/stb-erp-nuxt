<!--
  PosKitchenModal — طلبات هذه الشاشة في المطبخ: الجاهز (يُستلم)، وما يُحضَّر،
  وآخر البونات المرسلة (لإعادة طباعتها، وما لم يصل المطبخ بعد بلا إنترنت).
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><ChefHat :size="20" class="doc-modal__icon" /> المطبخ</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="doc-form">
            <p v-if="!pos.online" class="pos-note">
              بلا إنترنت: حالة المطبخ آخر ما عُرف، والبونات الجديدة تُطبع ورقاً وتصل
              شاشة المطبخ عند عودة الاتصال.
            </p>

            <div class="pos-rows">
              <p v-if="!pos.kitchenOrders.length" class="pos-rows__empty">
                لا طلبات في المطبخ الآن
              </p>
              <div v-for="o in sorted" :key="o.id" class="pos-rows__row">
                <div class="doc-cell pos-rows__main">
                  <span class="doc-cell__main">
                    #{{ o.ticketNo }} · {{ o.tableName || o.label || "سفري" }}
                  </span>
                  <span class="doc-cell__sub">{{ STATUS[o.status] }}</span>
                </div>
                <span class="badge" :class="BADGE[o.status]">{{ STATUS[o.status] }}</span>
                <button
                  v-if="o.status === 'ready'"
                  class="btn btn--sm btn--primary"
                  :disabled="!pos.online"
                  @click="emit('served', o.id)"
                >
                  تم الاستلام
                </button>
              </div>
            </div>

            <template v-if="recent.length">
              <h4 class="pos-kitchen__title">آخر البونات المرسلة</h4>
              <div class="pos-rows">
                <div v-for="t in recent" :key="t.id" class="pos-rows__row">
                  <div class="doc-cell pos-rows__main">
                    <span class="doc-cell__main">
                      #{{ t.ticketNo }} · {{ t.tableName || t.label || "سفري" }}
                    </span>
                    <span class="doc-cell__sub">
                      {{ formatDateTime(t.sentAt) }} · {{ formatNumber(t.lines.length) }} صنف
                      <template v-if="queued(t.id)"> · لم يصل المطبخ بعد</template>
                    </span>
                  </div>
                  <button
                    class="btn btn--sm btn--ghost btn--icon"
                    title="إعادة طباعة البون"
                    @click="emit('reprint', t)"
                  >
                    <Printer :size="14" />
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ChefHat, Printer, X } from "lucide-vue-next";
import type { DeviceKitchenOrder, LocalKitchenTicket } from "@/pos/types";
import { usePosStore } from "@/stores/pos";

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  served: [id: string];
  reprint: [ticket: LocalKitchenTicket];
}>();

const STATUS: Record<DeviceKitchenOrder["status"], string> = {
  new: "وصل المطبخ",
  preparing: "قيد التحضير",
  ready: "جاهز",
};
const BADGE: Record<DeviceKitchenOrder["status"], string> = {
  new: "doc-status--draft",
  preparing: "doc-status--progress",
  ready: "doc-status--done",
};
const ORDER: Record<DeviceKitchenOrder["status"], number> = {
  ready: 0,
  preparing: 1,
  new: 2,
};

const pos = usePosStore();
const close = () => emit("update:modelValue", false);

/** الجاهز أولاً */
const sorted = computed(() =>
  [...pos.kitchenOrders].sort((a, b) => ORDER[a.status] - ORDER[b.status]),
);
const recent = computed(() => [...pos.kitchenTickets].reverse().slice(0, 15));
const queued = (id: string) => pos.outbox.some((entry) => entry.id === `kitchen-${id}`);
</script>

<style lang="scss" scoped>
.pos-kitchen__title {
  margin: $space-3 0 0;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}
</style>
