<!--
  PosKitchenTicket — بون المطبخ المطبوع على الورق الحراري: رقم الطلب كبيراً،
  الطاولة أو سفري، والأصناف بكمياتها وملاحظاتها (الإلغاء واضح). بلا أسعار.
  مخفي على الشاشة ويظهر وحده عند الطباعة (.print-area). الاستخدام: ref ثم print(ticket).
-->
<template>
  <Teleport to="body">
    <div v-if="ticket" class="print-area kitchen-ticket" dir="rtl">
      <div class="kitchen-ticket__no">#{{ ticket.ticketNo }}</div>
      <div class="kitchen-ticket__type">
        {{ typeLabel }}
        <template v-if="ticket.round > 1"> · إضافة ({{ ticket.round }})</template>
      </div>
      <p v-if="ticket.label">{{ ticket.label }}</p>
      <p dir="ltr">{{ formatDateTime(ticket.sentAt) }}</p>
      <p v-if="ticket.cashierName">الكاشير: {{ ticket.cashierName }}</p>

      <div class="kitchen-ticket__lines">
        <div
          v-for="(line, index) in ticket.lines"
          :key="index"
          :class="{ 'is-cancel': line.quantity < 0 }"
        >
          <div class="kitchen-ticket__line">
            <strong dir="ltr">{{ formatNumber(Math.abs(line.quantity)) }} ×</strong>
            <span>
              <template v-if="line.quantity < 0">إلغاء: </template>{{ line.name }}
              <small v-if="line.unitName"> ({{ line.unitName }})</small>
            </span>
          </div>
          <div v-if="line.note" class="kitchen-ticket__note">← {{ line.note }}</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { LocalKitchenTicket } from "@/pos/types";

const ticket = ref<LocalKitchenTicket | null>(null);

const typeLabel = computed(() => {
  if (!ticket.value) return "";
  if (ticket.value.orderType === "dine_in") {
    return ticket.value.tableName ? `صالة — ${ticket.value.tableName}` : "صالة";
  }
  return ticket.value.orderType === "delivery" ? "توصيل" : "سفري";
});

/** يطبع البون على الورق الحراري */
const print = async (data: LocalKitchenTicket) => {
  ticket.value = data;
  const style = document.createElement("style");
  style.textContent = "@page { size: 80mm auto; margin: 3mm; }";
  document.head.appendChild(style);
  await nextTick();
  window.print();
  style.remove();
  // لا يبقى في الصفحة: الإيصال التالي يُطبع وحده
  ticket.value = null;
};

defineExpose({ print });
</script>
