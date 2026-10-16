<!--
  نسخة غير محفوظة من النموذج وُجدت على هذا الجهاز (انظر useFormDraft):
  تُعرض أعلى النافذة ليختار المستخدم استرجاعها أو تجاهلها. الكتابة في النموذج
  دون اختيار تعني تجاهلها.
-->
<template>
  <div v-if="draft.offer.value" class="draft-notice" role="status">
    <History :size="18" class="draft-notice__icon" />
    <span class="draft-notice__text">
      لديك نسخة لم تُحفظ من هذا النموذج على هذا الجهاز
      <span class="draft-notice__time">
        ({{ formatDateTime(draft.offer.value.savedAt) }})
      </span>
      <strong v-if="draft.offer.value.outdated">
        — عُدّل المستند بعدها، واسترجاعها يستبدل ذلك التعديل.
      </strong>
    </span>
    <div class="draft-notice__actions">
      <button
        type="button"
        class="btn btn--sm btn--primary"
        @click="draft.restore()"
      >
        <RotateCcw :size="14" /> استرجاعها
      </button>
      <button
        type="button"
        class="btn btn--sm btn--ghost"
        @click="draft.discard()"
      >
        تجاهلها
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { History, RotateCcw } from "lucide-vue-next";
import type { FormDraft } from "@/composables/useFormDraft";

defineProps<{ draft: FormDraft }>();
</script>

<style lang="scss" scoped>
.draft-notice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-2 $space-3;
  margin-bottom: $space-4;
  padding: $space-3 $space-4;
  font-size: $font-size-sm;
  color: $stb-text-primary;
  background: rgba($stb-warning, 0.1);
  border: 1px solid rgba($stb-warning, 0.4);
  border-radius: $radius-lg;

  &__icon {
    flex-shrink: 0;
    color: $stb-warning;
  }
  &__text {
    flex: 1;
    min-width: 220px;
  }
  &__time {
    color: $stb-text-secondary;
  }
  &__actions {
    display: flex;
    gap: $space-2;
  }
}
</style>
