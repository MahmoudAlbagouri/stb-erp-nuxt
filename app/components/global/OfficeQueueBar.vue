<!--
  شريط طابور المكتب (stores/office): يظهر ما دام على الجهاز ما حُفظ في المبيعات
  والمشتريات والمخزون ولم يصل السيرفر، أو ما رفضه السيرفر. يُرفع وحده حين يعود
  الاتصال؛ "عرض" يفتح العمليات لإعادة رفع المرفوض بعد تصحيحه أو إلغائه.
  (الحالة نفسها دائماً في زر "المكتب": OfficeMenu)
-->
<template>
  <Transition name="fade">
    <div
      v-if="office.ops.length"
      class="office-bar"
      :class="{ 'office-bar--failed': office.failed.length }"
      role="status"
    >
      <CloudUpload v-if="!office.failed.length" :size="18" class="office-bar__icon" />
      <CircleAlert v-else :size="18" class="office-bar__icon" />
      <span class="office-bar__text">
        <strong v-if="office.pending.length">
          {{ office.pending.length }} عملية على هذا الجهاز تنتظر الرفع
        </strong>
        <strong v-if="office.failed.length">
          {{ office.pending.length ? " · " : "" }}{{ office.failed.length }} رفضها
          السيرفر وتحتاج مراجعتك
        </strong>
        — تُرفع وحدها بترتيبها حين يعود الاتصال، ولا تتكرر.
      </span>
      <button
        class="btn btn--sm office-bar__action"
        :disabled="office.syncing"
        @click="office.sync()"
      >
        <RefreshCw :size="14" :class="{ 'is-spinning': office.syncing }" />
        رفع الآن
      </button>
      <button class="btn btn--sm office-bar__action" @click="open = true">
        عرض
      </button>
    </div>
  </Transition>
  <OfficeQueueModal v-model="open" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { CircleAlert, CloudUpload, RefreshCw } from "lucide-vue-next";
import { useOfficeStore } from "@/stores/office";

const office = useOfficeStore();
const open = ref(false);
</script>

<style lang="scss" scoped>
.office-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-2 $space-3;
  padding: $space-2 $space-4;
  font-size: $font-size-sm;
  color: $stb-text-primary;
  background: rgba($stb-warning, 0.14);
  border-bottom: 1px solid rgba($stb-warning, 0.45);

  &--failed {
    background: rgba($stb-danger, 0.14);
    border-bottom-color: rgba($stb-danger, 0.45);
  }
  &__icon {
    flex-shrink: 0;
  }
  &__text {
    flex: 1;
    min-width: 220px;
  }
  &__action {
    color: $stb-text-primary;
    background: transparent;
    border: 1px solid $stb-border;
  }
}

.is-spinning {
  animation: office-bar-spin 0.8s linear infinite;
}

@keyframes office-bar-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
