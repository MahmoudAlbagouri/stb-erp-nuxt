<!--
  PosTablesModal — طاولات الصالة: الفارغة والمشغولة (بطلبها ومدتها، وما جهز
  لها في المطبخ). اختيار طاولة يفتح طلبها (والجاري يُحفظ مكانه)، و"سفري"
  يرجع للبيع بلا طاولة، و"نقل" ينقل الطلب الجاري لطاولة فارغة.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal pos-tables">
          <div class="modal__header">
            <h3>
              <Armchair :size="20" class="doc-modal__icon" />
              {{ moving ? `نقل طلب ${pos.order.tableName} إلى…` : "الطاولات" }}
            </h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="doc-form">
            <div v-if="areas.length > 1" class="doc-tabs">
              <button class="doc-tab" :class="{ 'is-active': !area }" @click="area = ''">
                الكل
              </button>
              <button
                v-for="a in areas"
                :key="a"
                class="doc-tab"
                :class="{ 'is-active': area === a }"
                @click="area = a"
              >
                {{ a }}
              </button>
            </div>

            <p v-if="!pos.tables.length" class="pos-rows__empty">
              لا طاولات معرّفة لهذا الفرع — تُضاف من لوحة التحكم (الكاشير ← المطعم)
            </p>

            <div class="pos-tables__grid">
              <button
                v-for="table in shown"
                :key="table.id"
                type="button"
                class="pos-tables__table"
                :class="{
                  'is-busy': !!statusOf(table.id),
                  'is-current': statusOf(table.id)?.current,
                  'is-ready': (statusOf(table.id)?.ready ?? 0) > 0,
                }"
                :disabled="moving && !!statusOf(table.id)"
                @click="pick(table)"
              >
                <span class="pos-tables__name">{{ table.name }}</span>
                <template v-if="statusOf(table.id)">
                  <strong class="doc-money">{{ formatCurrency(statusOf(table.id)!.total) }}</strong>
                  <span class="pos-tables__meta">
                    <Clock :size="12" /> {{ minutesSince(statusOf(table.id)!.openedAt) }} د
                    · {{ formatNumber(statusOf(table.id)!.items) }} صنف
                  </span>
                  <span v-if="statusOf(table.id)!.ready" class="badge doc-status--done">
                    جاهز في المطبخ
                  </span>
                </template>
                <span v-else class="pos-tables__meta">
                  <Users :size="12" /> {{ table.seats }} · فارغة
                </span>
              </button>
            </div>
          </div>

          <div class="modal__footer">
            <button
              v-if="pos.order.type === 'dine_in' && pos.cart.length"
              type="button"
              class="btn btn--ghost"
              :class="{ 'is-on': moving }"
              @click="moving = !moving"
            >
              <ArrowLeftRight :size="16" /> {{ moving ? "إلغاء النقل" : "نقل الطلب" }}
            </button>
            <button type="button" class="btn btn--primary" @click="emit('takeaway')">
              <ShoppingBag :size="16" /> سفري (بلا طاولة)
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { ArrowLeftRight, Armchair, Clock, ShoppingBag, Users, X } from "lucide-vue-next";
import type { DiningTableInfo } from "@/pos/types";
import { usePosStore } from "@/stores/pos";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  open: [table: DiningTableInfo];
  move: [table: DiningTableInfo];
  takeaway: [];
}>();

const pos = usePosStore();
const area = ref("");
const moving = ref(false);
const close = () => emit("update:modelValue", false);

const areas = computed(() => [
  ...new Set(pos.tables.map((t) => t.area).filter((a): a is string => !!a)),
]);
const shown = computed(() =>
  area.value ? pos.tables.filter((t) => t.area === area.value) : pos.tables,
);
const statusOf = (id: string) => pos.tableStatus.get(id);

// مدة جلوس الطاولة تتحدث والنافذة مفتوحة
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;
watch(
  () => props.modelValue,
  (open) => {
    moving.value = false;
    if (timer) clearInterval(timer);
    timer = open ? setInterval(() => (now.value = Date.now()), 30_000) : null;
    now.value = Date.now();
  },
);
onBeforeUnmount(() => timer && clearInterval(timer));

const minutesSince = (iso: string) =>
  Math.max(0, Math.floor((now.value - new Date(iso).getTime()) / 60_000));

const pick = (table: DiningTableInfo) => {
  if (moving.value) emit("move", table);
  else emit("open", table);
};
</script>

<style lang="scss" scoped>
.modal.pos-tables {
  max-width: 980px;
}
.pos-tables__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: $space-3;
  max-height: min(62vh, 640px);
  overflow-y: auto;
  padding: 2px;
}
.pos-tables__table {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-1;
  min-height: 104px;
  padding: $space-3;
  font-family: inherit;
  color: $stb-text-primary;
  background: $stb-surface-2;
  border: 2px dashed $stb-border-light;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;

  &:hover:not(:disabled) {
    border-color: $stb-primary-light;
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &.is-busy {
    border-style: solid;
    border-color: $stb-warning;
    background: rgba($stb-warning, 0.1);
  }
  &.is-ready {
    border-color: $stb-success;
    background: rgba($stb-success, 0.12);
  }
  &.is-current {
    box-shadow: 0 0 0 3px rgba($stb-primary-light, 0.45);
  }
}
.pos-tables__name {
  font-size: $font-size-lg;
  font-weight: 800;
}
.pos-tables__meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: $font-size-xs;
  color: $stb-text-secondary;
}
</style>
