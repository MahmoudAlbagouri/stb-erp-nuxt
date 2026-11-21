<!--
  PosModifiersModal — إضافات الصنف قبل إضافته للسلة (المطاعم): لكل مجموعة حدّا
  اختيارها (إلزامية أو اختيارية)، والسعر الإضافي يظهر قبل التأكيد. يعمل بلا
  إنترنت: المجموعات نزلت مع إعدادات المطعم.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="product" class="modal-overlay" @click.self="emit('close')">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><SquarePlus :size="20" class="doc-modal__icon" /> {{ product.name }}</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="emit('close')"><X :size="20" /></button>
          </div>
          <div class="doc-form">
            <section v-for="group in groups" :key="group.id" class="group">
              <div class="group__title">
                <strong>{{ group.name }}</strong>
                <small :class="{ required: group.minSelect > 0 }">
                  {{ group.minSelect > 0 ? `إلزامية — اختر ${group.minSelect}` : "اختيارية" }}{{ group.maxSelect ? ` · حتى ${group.maxSelect}` : "" }}
                </small>
              </div>
              <div class="options">
                <button
                  v-for="option in group.options"
                  :key="option.id"
                  type="button"
                  class="option"
                  :class="{ 'is-selected': chosen[group.id]?.has(option.id) }"
                  @click="toggle(group, option.id)"
                >
                  <span>{{ option.name }}</span>
                  <small v-if="option.priceDelta">+{{ formatMoney(option.priceDelta) }}</small>
                </button>
              </div>
            </section>
            <p v-if="problem" class="problem">{{ problem }}</p>
            <div class="modal__footer">
              <span class="total">{{ formatCurrency(total) }}</span>
              <button type="button" class="btn btn--ghost" @click="emit('close')">إلغاء</button>
              <button type="button" class="btn btn--primary" :disabled="!!problem" @click="confirm">إضافة للسلة</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { SquarePlus, X } from "lucide-vue-next";
import type { LineModifier, PosModifierGroup, PosProduct } from "@/pos/types";

const props = defineProps<{
  product: PosProduct | null;
  groups: PosModifierGroup[];
  /** سعر الوحدة كما يُباع (بأساس الشاشة) */
  basePrice: number;
}>();
const emit = defineEmits<{ close: []; confirm: [modifiers: LineModifier[]] }>();

const chosen = reactive<Record<string, Set<string>>>({});

watch(
  () => props.product,
  (product) => {
    if (!product) return;
    for (const key of Object.keys(chosen)) delete chosen[key];
    for (const group of props.groups) {
      chosen[group.id] = new Set(group.options.filter((o) => o.isDefault).map((o) => o.id));
    }
  },
  { immediate: true },
);

const toggle = (group: PosModifierGroup, optionId: string) => {
  const set = chosen[group.id] ?? (chosen[group.id] = new Set());
  if (set.has(optionId)) {
    set.delete(optionId);
    return;
  }
  // اختيار واحد: الجديد يحل محل القديم
  if (group.maxSelect === 1) set.clear();
  else if (group.maxSelect > 0 && set.size >= group.maxSelect) return;
  set.add(optionId);
};

const selected = computed<LineModifier[]>(() =>
  props.groups.flatMap((group) =>
    group.options
      .filter((o) => chosen[group.id]?.has(o.id))
      .map((o) => ({ optionId: o.id, name: o.name, priceDelta: o.priceDelta, quantity: 1 })),
  ),
);

const total = computed(
  () => props.basePrice + selected.value.reduce((sum, m) => sum + m.priceDelta, 0),
);

const problem = computed(() => {
  const missing = props.groups.find((g) => (chosen[g.id]?.size ?? 0) < g.minSelect);
  return missing ? `اختر من "${missing.name}"` : "";
});

const confirm = () => {
  if (!problem.value) emit("confirm", selected.value);
};
</script>

<style lang="scss" scoped>
.group {
  margin-bottom: $space-3;

  &__title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: $space-2;

    small {
      color: $stb-text-muted;

      &.required {
        color: $stb-danger;
      }
    }
  }
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: $space-2;
}

.option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: $space-2 $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  background: $stb-surface;
  color: inherit;
  cursor: pointer;
  text-align: start;

  small {
    color: $stb-text-muted;
  }

  &.is-selected {
    border-color: $stb-accent;
    background: $stb-surface-3;
    font-weight: 600;
  }
}

.problem {
  color: $stb-danger;
  font-size: $font-size-sm;
}

.total {
  margin-inline-end: auto;
  font-weight: 700;
}
</style>
