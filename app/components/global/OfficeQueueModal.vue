<!--
  عمليات المكتب على هذا الجهاز (stores/office): بترتيب رفعها، وما رفضه
  السيرفر بسببه — "إعادة الرفع" بعد التصحيح أو "إلغاؤها".
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal">
          <div class="modal__header">
            <h3>عمليات المكتب على هذا الجهاز</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>
          <div class="office-ops">
            <p class="office-ops__hint">
              ما يُحفظ في المبيعات والمشتريات والمخزون بلا اتصال يبقى هنا ويُرفع
              وحده بترتيبه حين يعود الاتصال، ولا يتكرر لو أُعيد رفعه.
            </p>
            <button
              class="btn btn--sm btn--primary office-ops__sync"
              :disabled="office.syncing || !office.ops.length"
              @click="office.sync()"
            >
              <RefreshCw :size="14" :class="{ 'is-spinning': office.syncing }" />
              رفع الآن
            </button>
            <p v-if="!office.ops.length" class="office-ops__empty">
              <CloudCheck :size="18" /> كل عمليات المكتب وصلت السيرفر
            </p>
            <ul v-else class="office-ops__list">
              <li
                v-for="op in office.ops"
                :key="op.seq"
                class="office-ops__item"
                :class="{ 'office-ops__item--failed': op.error }"
              >
                <div class="office-ops__head">
                  <strong>{{ op.label }}</strong>
                  <span class="office-ops__time">{{ formatDateTime(op.createdAt) }}</span>
                </div>
                <p v-if="op.error" class="office-ops__error">{{ op.error }}</p>
                <div v-if="op.error" class="office-ops__actions">
                  <button class="btn btn--sm btn--ghost" @click="discard(op)">
                    إلغاؤها
                  </button>
                  <button class="btn btn--sm btn--primary" @click="office.retry(op)">
                    إعادة الرفع
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { CloudCheck, RefreshCw, X } from "lucide-vue-next";
import type { OfficeOp } from "@/offline/office-db";
import { useOfficeStore } from "@/stores/office";

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const office = useOfficeStore();
const close = () => emit("update:modelValue", false);

const discard = async (op: OfficeOp) => {
  if (!window.confirm(`«${op.label}» لن تُرفع للسيرفر. إلغاؤها؟`)) return;
  await office.discard(op);
};
</script>

<style lang="scss" scoped>
.office-ops {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-4;

  &__hint {
    margin: 0;
    color: $stb-text-secondary;
    font-size: $font-size-sm;
  }
  &__sync {
    align-self: flex-start;
  }
  &__empty {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin: 0;
    color: $stb-success;
  }
  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: $space-2;
    max-height: 55vh;
    overflow-y: auto;
  }
  &__item {
    padding: $space-3;
    border: 1px solid $stb-border;
    border-radius: $radius-md;

    &--failed {
      border-color: $stb-danger;
    }
  }
  &__head {
    display: flex;
    justify-content: space-between;
    gap: $space-2;
  }
  &__time {
    color: $stb-text-secondary;
    font-size: $font-size-xs;
  }
  &__error {
    margin: $space-1 0 0;
    color: $stb-danger;
  }
  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
    margin-top: $space-2;
  }
}

.is-spinning {
  animation: office-spin 0.8s linear infinite;
}

@keyframes office-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
