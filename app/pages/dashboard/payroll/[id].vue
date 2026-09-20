<template>
  <div class="page-container">
    <!-- Loading State -->
    <div v-if="store.loading" class="loading-full">
      <div class="spinner spinner--lg"></div>
      <p>جاري تحميل تفاصيل المسير...</p>
    </div>

    <!-- Data Loaded State -->
    <div v-else-if="payroll" class="content-wrapper">
      <!-- ═ Page Header ══════════════════════════════════════════════════════ -->
      <div class="page-header">
        <div class="page-header__title">
          <button
            class="btn btn--ghost btn--sm mb-2"
            @click="navigateTo('/dashboard/payroll')"
          >
            <ArrowLeft :size="16" /> العودة للقائمة
          </button>
          <h1>تفاصيل المسير</h1>
          <p>
            {{ getMonthName(payroll.month) }} {{ payroll.year }} —
            <span class="text-accent">{{
              formatCurrency(payroll.totalNetSalary)
            }}</span>
          </p>
        </div>
        <div class="page-header__actions">
          <!-- ✅ زر تأكيد الصرف -->
          <button
            v-if="!payroll.isDisbursed"
            class="btn btn--success"
            @click="handleDisburse"
            :disabled="disbursing"
          >
            <span v-if="disbursing" class="spinner spinner--sm" />
            <CheckCircle v-else :size="16" />
            {{ disbursing ? "جاري التأكيد..." : "تأكيد الصرف" }}
          </button>

          <!-- ✅ معلومات الصرف إذا تم بالفعل -->
          <div v-else class="disbursed-info">
            <CheckCircle :size="16" class="text-success" />
            <span
              >تم الصرف بواسطة:
              <strong>{{ payroll.disbursedBy?.username }}</strong></span
            >
            <span class="text-muted"
              >({{ formatDate(payroll.disbursedAt!) }})</span
            >
          </div>

          <button
            class="btn btn--outline"
            @click="handleExport('excel')"
            :disabled="!!exporting"
          >
            <FileSpreadsheet v-if="!exporting" :size="16" />
            <span v-else class="spinner spinner--sm" /> Excel
          </button>
          <button
            class="btn btn--outline"
            @click="handleExport('pdf')"
            :disabled="!!exporting"
          >
            <FileText v-if="!exporting" :size="16" />
            <span v-else class="spinner spinner--sm" /> PDF
          </button>
        </div>
      </div>

      <!-- ═ Stats Overview ═══════════════════════════════════════════════════ -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon--blue"><Users :size="20" /></div>
          <div class="stat-content">
            <span class="stat-label">عدد الموظفين</span>
            <span class="stat-value">{{ payroll.items?.length ?? 0 }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--green"><Banknote :size="20" /></div>
          <div class="stat-content">
            <span class="stat-label">إجمالي الرواتب الأساسية</span>
            <span class="stat-value">{{
              formatCurrency(stats.totalBasic)
            }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--amber">
            <PlusCircle :size="20" />
          </div>
          <div class="stat-content">
            <span class="stat-label">إجمالي البدلات والمستحقات</span>
            <span class="stat-value text-success">{{
              formatCurrency(stats.totalAllowances)
            }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--red"><MinusCircle :size="20" /></div>
          <div class="stat-content">
            <span class="stat-label">إجمالي الخصومات</span>
            <span class="stat-value text-danger">{{
              formatCurrency(stats.totalDeductions)
            }}</span>
          </div>
        </div>
      </div>

      <!-- ══ Info Card ════════════════════════════════════════════════════════ -->
      <div class="card info-card">
        <div class="info-row">
          <div class="info-item">
            <span class="label">تاريخ الإنشاء</span>
            <span class="value">{{ formatDate(payroll.generatedAt) }}</span>
          </div>
          <div class="info-item">
            <span class="label">{{
              payroll.isDisbursed
                ? "تاريخ الصرف الفعلي"
                : "تاريخ الصرف المستهدف"
            }}</span>
            <span class="value">{{
              formatDate(
                payroll.isDisbursed
                  ? payroll.disbursedAt!
                  : payroll.paymentDate,
              )
            }}</span>
          </div>
          <div class="info-item">
            <span class="label">معرف المسير</span>
            <span class="value font-mono text-xs opacity-70"
              >{{ payroll.id.slice(0, 8) }}...</span
            >
          </div>
        </div>
      </div>

      <!-- ══ Employees Table ══════════════════════════════════════════════════ -->
      <div class="card table-card">
        <div class="table-header">
          <h3>كشف تفصيلي للموظفين</h3>
          <div class="search-box">
            <Search :size="14" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="بحث باسم الموظف أو الكود..."
            />
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>الوظيفة / القسم</th>
                <th class="text-right">الراتب الأساسي</th>
                <th class="text-right">البدلات والمستحقات</th>
                <th class="text-right">الخصومات</th>
                <th class="text-right">الصافي</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.id">
                <td>
                  <div class="emp-cell">
                    <div class="avatar-wrapper">
                      <img
                        v-if="item.employee.nationalIdCardPath"
                        :src="item.employee.nationalIdCardPath"
                        alt="Avatar"
                        class="avatar-img"
                      />
                      <div v-else class="avatar-placeholder">
                        {{ item.employee.fullName.charAt(0) }}
                      </div>
                    </div>
                    <div class="emp-info">
                      <span class="name">{{ item.employee.fullName }}</span>
                      <span class="code"
                        >#{{ item.employee.employeeCode }}</span
                      >
                    </div>
                  </div>
                </td>
                <td>
                  <div class="dept-cell">
                    <span class="job">{{ item.employee.jobTitle }}</span>
                    <span class="dept">{{ item.employee.department }}</span>
                  </div>
                </td>
                <td class="text-right font-medium">
                  {{ formatCurrency(item.basicSalary) }}
                </td>
                <td class="text-right text-success">
                  {{ formatCurrency(calculateItemAllowances(item)) }}
                  <!-- ✅ إشارة صغيرة لو جزء منها مصروف سلفاً -->
                  <span
                    v-if="calculateItemPrepaid(item) > 0"
                    class="prepaid-hint"
                    :title="`منها ${formatCurrency(calculateItemPrepaid(item))} مصروفة سلفاً`"
                    >*</span
                  >
                </td>
                <td class="text-right text-danger">
                  {{ formatCurrency(calculateItemDeductions(item)) }}
                </td>
                <td class="text-right font-bold text-accent">
                  {{ formatCurrency(item.netSalary) }}
                </td>
              </tr>
              <tr v-if="filteredItems.length === 0">
                <td colspan="6" class="empty-table">
                  لا توجد بيانات مطابقة للبحث
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty/Error State -->
    <div v-else class="loading-full">
      <p>لم يتم العثور على بيانات المسير.</p>
      <button
        class="btn btn--primary mt-4"
        @click="navigateTo('/dashboard/payroll')"
      >
        العودة للقائمة
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, navigateTo } from "#app";
import { usePayrollStore } from "@/stores/payroll";
import { useToast } from "@/composables/useToast";
import type { PayrollDetail, PayrollItem } from "@/stores/payroll";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Users,
  Banknote,
  PlusCircle,
  MinusCircle,
  Search,
  CheckCircle,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const store = usePayrollStore();
const toast = useToast();

const payroll = ref<PayrollDetail | null>(null);
const searchQuery = ref("");
const exporting = ref<"excel" | "pdf" | null>(null);
const disbursing = ref(false);

onMounted(async () => {
  const id = route.params.id as string;
  if (id) {
    try {
      payroll.value = await store.fetchById(id);
    } catch (e: any) {
      console.error("Fetch Error:", e);
      toast.error(e.message || "فشل في تحميل تفاصيل المسير");
    }
  }
});

const filteredItems = computed(() => {
  if (!payroll.value?.items) return [];
  if (!searchQuery.value) return payroll.value.items;
  const q = searchQuery.value.toLowerCase();
  return payroll.value.items.filter(
    (item) =>
      item.employee?.fullName?.toLowerCase().includes(q) ||
      item.employee?.employeeCode?.includes(q),
  );
});

// ✅ البدلات + المستحقات الإضافية (بدلات ثابتة + مكافآت + تسويات + نهاية خدمة)
const calculateItemAllowances = (item: PayrollItem) =>
  Number(item.housingAllowance) +
  Number(item.transportAllowance) +
  Number(item.otherAllowances) +
  Number(item.overtimeAmount) +
  Number(item.bonusesAmount) +
  Number(item.settlementsAmount) +
  Number(item.eosAmount);

// ✅ الجزء المصروف سلفاً ضمن البدلات أعلاه (للتوضيح فقط)
const calculateItemPrepaid = (item: PayrollItem) =>
  Number(item.prepaidBonuses) +
  Number(item.prepaidSettlements) +
  Number(item.prepaidAllowances);

// ✅ إجمالي الخصومات — شامل المبالغ المصروفة سلفاً (لمنع ازدواجية الصرف)
const calculateItemDeductions = (item: PayrollItem) =>
  Number(item.loanDeduction) +
  Number(item.advanceDeduction) +
  Number(item.unpaidLeaveDeduction) +
  Number(item.otherDeductions) +
  calculateItemPrepaid(item);

const stats = computed(() => {
  if (!payroll.value?.items)
    return { totalBasic: 0, totalAllowances: 0, totalDeductions: 0 };
  let totalBasic = 0,
    totalAllowances = 0,
    totalDeductions = 0;
  payroll.value.items.forEach((item) => {
    totalBasic += Number(item.basicSalary);
    totalAllowances += calculateItemAllowances(item);
    totalDeductions += calculateItemDeductions(item);
  });
  return { totalBasic, totalAllowances, totalDeductions };
});

// ✅ دالة تأكيد الصرف
const handleDisburse = async () => {
  if (!payroll.value) return;
  disbursing.value = true;
  try {
    const updated = await store.disburse(payroll.value.id);
    payroll.value = { ...payroll.value, ...updated };
    toast.success("✅ تم تأكيد صرف المسير بنجاح");
  } catch (e: any) {
    toast.error(e.message || "فشل في تأكيد الصرف");
  } finally {
    disbursing.value = false;
  }
};

const handleExport = async (type: "excel" | "pdf") => {
  if (!payroll.value) return;
  exporting.value = type;
  try {
    await store.exportData(type, payroll.value.month, payroll.value.year);
    toast.success("تم التصدير بنجاح");
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    exporting.value = null;
  }
};

const getMonthName = (m: number) =>
  [
    "",
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ][m] ?? "";
const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("ar-SA") : "—";
const formatCurrency = (val: string | number) =>
  Number(val).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ر.س";
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.content-wrapper {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $space-4;
  margin-bottom: $space-5;
}
.stat-card {
  @include glass-card;
  padding: $space-4;
  @include flex(row, center, flex-start, $space-3);
}
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: $radius-md;
  @include flex(row, center, center);
  &--blue {
    background: rgba($stb-primary, 0.15);
    color: $stb-accent;
  }
  &--green {
    background: rgba($stb-success, 0.15);
    color: $stb-success;
  }
  &--amber {
    background: rgba($stb-warning, 0.15);
    color: $stb-warning;
  }
  &--red {
    background: rgba($stb-danger, 0.15);
    color: $stb-danger;
  }
}
.stat-content {
  display: flex;
  flex-direction: column;
}
.stat-label {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.stat-value {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $stb-text-primary;
}
.info-card {
  padding: $space-4 $space-5;
  margin-bottom: $space-5;
}
.info-row {
  @include flex(row, center, space-between);
  flex-wrap: wrap;
  gap: $space-4;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-item .label {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.info-item .value {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $stb-text-secondary;
}
.table-card {
  padding: 0;
  overflow: hidden;
}
.table-header {
  @include flex(row, center, space-between);
  padding: $space-4 $space-5;
  border-bottom: 1px solid $stb-border;
  h3 {
    font-size: $font-size-base;
    font-weight: 700;
  }
}
.search-box {
  position: relative;
  width: 250px;
}
.search-box svg {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: $stb-text-muted;
}
.search-box input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  color: $stb-text-primary;
  font-size: $font-size-sm;
  &:focus {
    outline: none;
    border-color: $stb-accent;
  }
}
.table-wrapper {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th {
  text-align: right;
  padding: $space-3 $space-5;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $stb-text-muted;
  background: rgba($stb-dark, 0.2);
  border-bottom: 1px solid $stb-border;
}
.data-table td {
  padding: $space-4 $space-5;
  border-bottom: 1px solid rgba($stb-border, 0.5);
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  &:last-child {
    border-bottom: none;
  }
}
.data-table tr:hover td {
  background: rgba($stb-accent, 0.03);
}
.emp-cell {
  @include flex(row, center, flex-start, $space-3);
}
.avatar-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: $gradient-accent;
  color: white;
  @include flex(row, center, center);
  font-weight: 700;
  font-size: $font-size-xs;
}
.emp-info {
  display: flex;
  flex-direction: column;
}
.emp-info .name {
  font-weight: 600;
  color: $stb-text-primary;
}
.emp-info .code {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.dept-cell {
  display: flex;
  flex-direction: column;
}
.dept-cell .job {
  font-weight: 500;
  color: $stb-text-secondary;
}
.dept-cell .dept {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.empty-table {
  text-align: center;
  padding: $space-8 !important;
  color: $stb-text-muted;
}
.text-accent {
  color: $stb-accent;
}
.text-success {
  color: $stb-success;
}
.text-danger {
  color: $stb-danger;
}
.font-mono {
  font-family: monospace;
}
.opacity-70 {
  opacity: 0.7;
}
.mb-2 {
  margin-bottom: $space-2;
}
.mt-4 {
  margin-top: $space-4;
}
.loading-full {
  min-height: 400px;
  @include flex(column, center, center, $space-4);
  color: $stb-text-muted;
}

// ✅ تنسيق زر ومعلومات الصرف
.btn--success {
  background: $stb-success;
  color: #fff;
  border: none;
  &:hover:not(:disabled) {
    background: rgba($stb-success, 8%);
  }
}
.disbursed-info {
  @include flex(row, center, flex-start, $space-2);
  padding: $space-2 $space-3;
  background: rgba($stb-success, 0.08);
  border: 1px solid rgba($stb-success, 0.2);
  border-radius: $radius-md;
  font-size: $font-size-xs;
  color: $stb-text-secondary;

  strong {
    color: $stb-success;
    font-weight: 700;
  }
  .text-muted {
    color: $stb-text-muted;
    margin-right: $space-1;
  }
}

// ✅ إشارة المبلغ المصروف سلفاً
.prepaid-hint {
  color: $stb-warning;
  font-weight: 700;
  cursor: help;
  margin-right: 2px;
}
</style>
