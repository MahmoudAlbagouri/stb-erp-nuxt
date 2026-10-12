<!-- تذييل القوائم المُرقَّمة: العدد + السابق/التالي -->
<template>
  <div class="doc-footer">
    <span class="doc-footer__count">{{ formatNumber(total) }} {{ label }}</span>
    <div v-if="totalPages > 1" class="doc-pager">
      <button
        class="btn btn--sm btn--ghost"
        :disabled="page <= 1"
        @click="$emit('change', page - 1)"
      >
        <ChevronRight :size="14" /> السابق
      </button>
      <span class="doc-pager__info">{{ page }} / {{ totalPages }}</span>
      <button
        class="btn btn--sm btn--ghost"
        :disabled="page >= totalPages"
        @click="$emit('change', page + 1)"
      >
        التالي <ChevronLeft :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

defineProps<{
  total: number;
  page: number;
  totalPages: number;
  /** اسم العنصر المعدود: "صنف"، "تحويل"... */
  label: string;
}>();

defineEmits<{ change: [page: number] }>();
</script>
