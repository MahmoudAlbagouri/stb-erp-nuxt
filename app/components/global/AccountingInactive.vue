<!-- صفحات المحاسبة قبل تفعيلها: دعوة لصفحة الإعداد -->
<template>
  <div class="card">
    <div class="empty-state">
      <Landmark :size="44" class="empty-state__icon" />
      <div class="empty-state__title">المحاسبة غير مفعّلة بعد</div>
      <div class="empty-state__text">
        فعّلها مرة واحدة: تُنشأ شجرة حسابات دولتك ويُقيَّد القيد الافتتاحي بأرصدتك
        الحالية، ومن بعدها تُرحَّل كل المستندات تلقائياً.
      </div>
      <NuxtLink to="/dashboard/accounting" class="btn btn--primary">
        إعداد المحاسبة
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Landmark } from "lucide-vue-next";
</script>
