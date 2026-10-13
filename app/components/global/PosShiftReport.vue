<!--
  PosShiftReport — تقرير الوردية المطبوع على الورق الحراري:
  X = ملخص حتى اللحظة (الوردية تبقى مفتوحة)، Z = تقرير التقفيل (مع المعدود والفرق).
  مخفي على الشاشة ويظهر وحده عند الطباعة (.print-area). الاستخدام: ref ثم print(data).
-->
<template>
  <Teleport to="body">
    <div v-if="report" class="print-area shift-report" dir="rtl">
      <h1>{{ report.company }}</h1>
      <p v-if="report.branch">{{ report.branch }}</p>
      <h2>
        {{ report.kind === "Z" ? "تقرير تقفيل الوردية (Z)" : "ملخص الوردية (X)" }}
      </h2>

      <div class="shift-report__rows">
        <div><span>الجهاز</span><span>{{ report.device }}</span></div>
        <div><span>الكاشير</span><span>{{ report.cashier || "—" }}</span></div>
        <div>
          <span>فُتحت</span><span dir="ltr">{{ formatDateTime(report.openedAt) }}</span>
        </div>
        <div>
          <span>{{ report.kind === "Z" ? "قُفّلت" : "وقت التقرير" }}</span>
          <span dir="ltr">{{ formatDateTime(report.printedAt) }}</span>
        </div>
      </div>

      <div class="shift-report__section">المبيعات</div>
      <div class="shift-report__rows">
        <div>
          <span>عدد الفواتير</span><span>{{ formatNumber(report.invoicesCount) }}</span>
        </div>
        <div><span>نقداً</span><span dir="ltr">{{ formatMoney(report.cash) }}</span></div>
        <div>
          <span>شبكة / بطاقة</span><span dir="ltr">{{ formatMoney(report.card) }}</span>
        </div>
        <div v-if="report.credit">
          <span>آجل (على الحساب)</span>
          <span dir="ltr">{{ formatMoney(report.credit) }}</span>
        </div>
        <div class="is-strong">
          <span>إجمالي المبيعات ({{ currencyLabel() }})</span>
          <span dir="ltr">{{ formatMoney(report.salesTotal) }}</span>
        </div>
        <div v-if="report.discounts">
          <span>خصومات مُنحت</span>
          <span dir="ltr">{{ formatMoney(report.discounts) }}</span>
        </div>
        <div v-if="report.returnsCount">
          <span>مرتجعات ({{ formatNumber(report.returnsCount) }})</span>
          <span dir="ltr">{{ formatMoney(report.returnsTotal) }}</span>
        </div>
      </div>

      <div class="shift-report__section">الدرج</div>
      <div class="shift-report__rows">
        <div>
          <span>العهدة عند الفتح</span>
          <span dir="ltr">{{ formatMoney(report.openingCash) }}</span>
        </div>
        <div>
          <span>+ مبيعات نقدية</span><span dir="ltr">{{ formatMoney(report.cash) }}</span>
        </div>
        <div v-if="report.cashRefunds">
          <span>− رُدّ نقداً</span>
          <span dir="ltr">{{ formatMoney(report.cashRefunds) }}</span>
        </div>
        <div v-if="report.cashIn">
          <span>+ إيداعات</span><span dir="ltr">{{ formatMoney(report.cashIn) }}</span>
        </div>
        <div v-if="report.cashOut">
          <span>− مسحوبات</span><span dir="ltr">{{ formatMoney(report.cashOut) }}</span>
        </div>
        <div class="is-strong">
          <span>المفترض في الدرج</span>
          <span dir="ltr">{{ formatMoney(report.expectedCash) }}</span>
        </div>
        <template v-if="report.kind === 'Z' && report.closingCash !== null">
          <div>
            <span>المعدود فعلاً</span>
            <span dir="ltr">{{ formatMoney(report.closingCash) }}</span>
          </div>
          <div class="is-strong">
            <span>{{ differenceLabel }}</span>
            <span dir="ltr">{{ formatMoney(Math.abs(difference)) }}</span>
          </div>
        </template>
        <div v-if="report.drawerOpens">
          <span>فتح الدرج بلا بيع</span>
          <span>{{ formatNumber(report.drawerOpens) }} مرة</span>
        </div>
      </div>

      <template v-if="report.moves.length">
        <div class="shift-report__section">حركات الدرج</div>
        <div class="shift-report__rows">
          <div v-for="move in report.moves" :key="move.id">
            <span>{{ move.type === "in" ? "+" : "−" }} {{ move.reason }}</span>
            <span dir="ltr">{{ formatMoney(move.amount) }}</span>
          </div>
        </div>
      </template>

      <p v-if="report.note" class="shift-report__rows">ملاحظة: {{ report.note }}</p>

      <div v-if="report.kind === 'Z'" class="shift-report__sign">
        <span>الكاشير</span>
        <span>المستلم</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { sumAmounts } from "@/pos/calc";
import type { CashMove } from "@/pos/types";

export interface ShiftReportData {
  kind: "X" | "Z";
  company: string;
  branch: string;
  device: string;
  cashier: string;
  openedAt: string;
  printedAt: string;
  openingCash: number;
  invoicesCount: number;
  salesTotal: number;
  cash: number;
  card: number;
  credit: number;
  discounts: number;
  returnsCount: number;
  returnsTotal: number;
  cashRefunds: number;
  cashIn: number;
  cashOut: number;
  drawerOpens: number;
  expectedCash: number;
  /** المعدود عند التقفيل (Z فقط) */
  closingCash: number | null;
  note: string;
  moves: CashMove[];
}

const report = ref<ShiftReportData | null>(null);

const difference = computed(() =>
  report.value?.closingCash == null
    ? 0
    : sumAmounts([report.value.closingCash, -report.value.expectedCash]),
);
const differenceLabel = computed(() =>
  difference.value < 0 ? "عجز" : difference.value > 0 ? "زيادة" : "مطابق",
);

/** يطبع التقرير على الورق الحراري */
const print = async (data: ShiftReportData) => {
  report.value = data;
  const style = document.createElement("style");
  // الارتفاع تلقائي: الورق الحراري يُقطع بطول التقرير
  style.textContent = "@page { size: 80mm auto; margin: 3mm; }";
  document.head.appendChild(style);
  await nextTick();
  window.print();
  style.remove();
  // لا يبقى في الصفحة: الإيصال التالي يُطبع وحده
  report.value = null;
};

defineExpose({ print });
</script>
