<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>الملف الشخصي</h1>
        <p>نظرة شاملة على بياناتك الوظيفية والمالية</p>
      </div>
      <button
        class="btn btn--accent"
        @click="refreshData"
        :disabled="store.loading"
      >
        <span v-if="store.loading" class="spinner spinner--sm" />
        <RefreshCw v-else :size="16" class="btn-icon" />
        <span>تحديث البيانات</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading && !store.data" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="store.data" class="profile-grid">
      <!-- ... (الأقسام السابقة: البطاقة الشخصية، العقد، الراتب، الإجازات) تبقى كما هي ... -->

      <!-- 1. البطاقة الشخصية -->
      <div class="card profile-card--main">
        <!-- ... محتوى البطاقة الشخصية ... -->
        <div class="profile-avatar-section">
          <div class="profile-avatar-lg">{{ store.avatarInitials }}</div>
          <div class="profile-info-main">
            <h2>{{ store.fullName }}</h2>
            <span class="badge badge--system">{{
              store.data.personal.user.role
            }}</span>
            <p class="text-muted">
              {{ store.data.personal.employee?.jobTitle || "-" }} |
              {{ store.data.personal.employee?.department || "-" }}
            </p>
          </div>
        </div>
        <div class="profile-details-grid">
          <!-- ... تفاصيل الموظف ... -->
          <div class="detail-item">
            <span class="label"
              ><Hash :size="12" class="label-icon" /> كود الموظف</span
            >
            <span class="value">{{
              store.data.personal.employee?.employeeCode || "-"
            }}</span>
          </div>
          <div class="detail-item">
            <span class="label"
              ><Phone :size="12" class="label-icon" /> رقم الهاتف</span
            >
            <span class="value">{{
              store.data.personal.employee?.phone || "-"
            }}</span>
          </div>
          <div class="detail-item">
            <span class="label"
              ><Calendar :size="12" class="label-icon" /> تاريخ التعيين</span
            >
            <span class="value">{{
              formatDate(store.data.personal.employee?.createdAt)
            }}</span>
          </div>
          <div class="detail-item">
            <span class="label"
              ><Globe :size="12" class="label-icon" /> الجنسية</span
            >
            <span class="value">{{ nationalityLabel }}</span>
          </div>
        </div>
      </div>

      <!-- 2. حالة العقد -->
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">
            <FileSignature :size="18" class="title-icon" /> حالة العقد
          </h3>
        </div>
        <div v-if="store.data.hr?.contract" class="contract-status">
          <div
            class="status-indicator"
            :class="{ expiring: store.data.hr.contract.isExpiringSoon }"
          >
            <span class="dot"></span>
            <span>{{ store.data.hr.contract.statusLabel }}</span>
          </div>
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill"
              :style="{ width: contractProgress + '%' }"
            ></div>
          </div>
          <p class="text-sm text-muted mt-2">
            يتبقى {{ store.data.hr.contract.daysUntilExpiry ?? "-" }} يوم على
            انتهاء العقد
          </p>
        </div>
        <div v-else class="empty-state--mini">لا يوجد عقد نشط</div>
      </div>

      <!-- 3. الراتب والمديونية -->
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">
            <Wallet :size="18" class="title-icon" /> الراتب والمديونية
          </h3>
        </div>
        <div v-if="store.data.financial?.salary" class="salary-breakdown">
          <div class="salary-row total">
            <span>إجمالي الراتب</span>
            <span class="amount">{{
              formatCurrency(store.data.financial.salary.total)
            }}</span>
          </div>
          <div class="divider"></div>
          <div class="salary-row">
            <span>الأساسي</span>
            <span>{{ formatCurrency(store.data.financial.salary.basic) }}</span>
          </div>
          <div class="salary-row">
            <span>البدلات</span>
            <span>{{
              formatCurrency(store.data.financial.salary.allowances)
            }}</span>
          </div>
        </div>
        <div v-else class="empty-state--mini">لا يوجد راتب مسجل</div>
        <div class="debt-summary mt-4">
          <div class="debt-stat">
            <span class="label">إجمالي المديونية</span>
            <span class="value text-danger">{{
              formatCurrency(store.totalDebt)
            }}</span>
          </div>
          <div class="debt-stat">
            <span class="label">نسبة المديوينة الى الراتب</span>
            <span
              class="value"
              :class="
                store.debtToSalaryRatio > 50 ? 'text-danger' : 'text-success'
              "
            >
              {{ store.debtToSalaryRatio }}%
            </span>
          </div>
        </div>
      </div>

      <!-- 4. رصيد الإجازات -->
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">
            <CalendarDays :size="18" class="title-icon" /> رصيد الإجازات ({{
              store.data.hr?.leaveBalance?.year || "-"
            }})
          </h3>
        </div>
        <div v-if="store.data.hr?.leaveBalance" class="leave-circle-container">
          <div class="circular-progress">
            <svg viewBox="0 0 36 36" class="circular-chart">
              <path
                class="circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="circle"
                :stroke-dasharray="`${store.data.hr.leaveBalance.usagePercentage}, 100`"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" class="percentage">
                {{ store.data.hr.leaveBalance.remaining }}
              </text>
            </svg>
          </div>
          <div class="leave-stats">
            <div class="stat-row">
              <span>الرصيد الكلي:</span>
              <b>{{ store.data.hr.leaveBalance.totalAllowance }}</b>
            </div>
            <div class="stat-row">
              <span>المستهلك:</span>
              <b>{{ store.data.hr.leaveBalance.consumedDays }}</b>
            </div>
            <div class="stat-row text-accent">
              <span>المتبقي:</span> <b>{{ store.currentLeaveRemaining }}</b>
            </div>
          </div>
        </div>
        <div v-else class="empty-state--mini">لا يوجد رصيد مسجل لهذه السنة</div>
      </div>

      <!-- 5. المعاملات المالية النشطة -->
      <div class="card full-width">
        <div class="card__header">
          <h3 class="card__title">
            <CreditCard :size="18" class="title-icon" /> المعاملات المالية
            النشطة
          </h3>
        </div>
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'advances' }"
            @click="activeTab = 'advances'"
          >
            <HandCoins :size="14" class="tab-icon" /> السلف ({{
              store.pendingAdvancesCount
            }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'loans' }"
            @click="activeTab = 'loans'"
          >
            <Landmark :size="14" class="tab-icon" /> القروض ({{
              store.activeLoansCount
            }})
          </button>
        </div>
        <div class="table-responsive mt-4">
          <table class="data-table" v-if="activeTab === 'advances'">
            <thead>
              <tr>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>تاريخ الطلب</th>
                <th>تاريخ السداد</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in store.recentAdvances" :key="item.id">
                <td class="text-primary font-bold">
                  {{ formatCurrency(item.amount) }}
                </td>
                <td>
                  <span class="badge badge--pending">{{ item.status }}</span>
                </td>
                <td>{{ formatDate(item.requestedAt) }}</td>
                <td>{{ formatDate(item.repaymentDate) }}</td>
              </tr>
              <tr v-if="!store.recentAdvances.length">
                <td colspan="4" class="text-center">لا توجد سلف نشطة</td>
              </tr>
            </tbody>
          </table>
          <table class="data-table" v-else>
            <thead>
              <tr>
                <th>إجمالي القرض</th>
                <th>القسط الشهري</th>
                <th>الأقساط المتبقية</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in store.recentLoans" :key="item.id">
                <td class="text-primary font-bold">
                  {{ formatCurrency(item.totalAmount) }}
                </td>
                <td>{{ formatCurrency(item.monthlyInstallment) }}</td>
                <td>{{ item.remainingInstallments }}</td>
                <td>
                  <span class="badge badge--trial">{{ item.status }}</span>
                </td>
              </tr>
              <tr v-if="!store.recentLoans.length">
                <td colspan="4" class="text-center">لا توجد قروض نشطة</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ✅ 6. سجل الإجازات (جديد) -->
      <div class="card full-width">
        <div class="card__header">
          <h3 class="card__title">
            <History :size="18" class="title-icon" /> سجل طلبات الإجازات
          </h3>
        </div>
        <div class="table-responsive mt-2">
          <table class="data-table">
            <thead>
              <tr>
                <th>النوع</th>
                <th>من تاريخ</th>
                <th>إلى تاريخ</th>
                <th>المدة</th>
                <th>الحالة</th>
                <th>السبب</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="leave in store.leaveHistory" :key="leave.id">
                <td>
                  <span class="badge" :class="getLeaveTypeBadge(leave.type)">
                    {{ getLeaveTypeLabel(leave.type) }}
                  </span>
                </td>
                <td>{{ formatDate(leave.startDate) }}</td>
                <td>{{ formatDate(leave.endDate) }}</td>
                <td>{{ leave.durationDays }} يوم</td>
                <td>
                  <span class="badge" :class="getStatusBadge(leave.status)">
                    {{ getStatusLabel(leave.status) }}
                  </span>
                </td>
                <td class="text-muted text-sm">{{ leave.reason || "-" }}</td>
              </tr>
              <tr v-if="!store.leaveHistory.length">
                <td colspan="6" class="text-center">لا يوجد سجل إجازات</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ✅ 7. المعاملات المرفوضة (جديد) -->
      <div class="card full-width">
        <div class="card__header">
          <h3 class="card__title">
            <XCircle :size="18" class="title-icon text-danger" /> المعاملات
            المرفوضة
          </h3>
        </div>
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: rejectedTab === 'advances' }"
            @click="rejectedTab = 'advances'"
          >
            <HandCoins :size="14" class="tab-icon" /> السلف المرفوضة ({{
              store.rejectedAdvances.length
            }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: rejectedTab === 'loans' }"
            @click="rejectedTab = 'loans'"
          >
            <Landmark :size="14" class="tab-icon" /> القروض المرفوضة ({{
              store.rejectedLoans.length
            }})
          </button>
        </div>

        <div class="table-responsive mt-4">
          <!-- جدول السلف المرفوضة -->
          <table class="data-table" v-if="rejectedTab === 'advances'">
            <thead>
              <tr>
                <th>المبلغ المطلوب</th>
                <th>تاريخ السداد المتوقع</th>
                <th>تاريخ الرفض</th>
                <th>السبب</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in store.rejectedAdvances" :key="item.id">
                <td class="font-bold">{{ formatCurrency(item.amount) }}</td>
                <td>{{ formatDate(item.repaymentDate) }}</td>
                <td>{{ formatDate(item.rejectedAt) }}</td>
                <td class="text-muted">{{ item.reason || "غير محدد" }}</td>
              </tr>
              <tr v-if="!store.rejectedAdvances.length">
                <td colspan="4" class="text-center">لا توجد سلف مرفوضة</td>
              </tr>
            </tbody>
          </table>

          <!-- جدول القروض المرفوضة -->
          <table class="data-table" v-else>
            <thead>
              <tr>
                <th>مبلغ القرض</th>
                <th>القسط الشهري</th>
                <th>عدد الأقساط</th>
                <th>تاريخ الرفض</th>
                <th>السبب</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in store.rejectedLoans" :key="item.id">
                <td class="font-bold">
                  {{ formatCurrency(item.totalAmount) }}
                </td>
                <td>{{ formatCurrency(item.monthlyInstallment) }}</td>
                <td>{{ item.installmentsCount }} قسط</td>
                <td>{{ formatDate(item.rejectedAt) }}</td>
                <td class="text-muted">{{ item.reason || "غير محدد" }}</td>
              </tr>
              <tr v-if="!store.rejectedLoans.length">
                <td colspan="5" class="text-center">لا توجد قروض مرفوضة</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

import { ref, computed, onMounted } from "vue";
import { useProfileStore } from "@/stores/profile";
import { useToast } from "../../composables/useToast";

// ✅ استيراد أيقونات Lucide الجديدة
import {
  RefreshCw,
  Hash,
  Phone,
  Calendar,
  Globe,
  FileSignature,
  Wallet,
  CalendarDays,
  CreditCard,
  HandCoins,
  Landmark,
  History,
  XCircle,
} from "lucide-vue-next";

const store = useProfileStore();
const toast = useToast();

const activeTab = ref<"advances" | "loans">("advances");
const rejectedTab = ref<"advances" | "loans">("advances"); // ✅ تبويب جديد للمرفوضات

const nationalityLabel = computed(() => {
  const type = store.data?.personal.employee?.nationalityType;
  if (type === "saudi") return "سعودي";
  if (type === "non_saudi") return "غير سعودي (تحت الكفالة)";
  if (type === "outside_sponsorship") return "غير سعودي (خارج الكفالة)";
  return "-";
});

const contractProgress = computed(() => {
  const days = store.data?.hr?.contract?.daysUntilExpiry;
  if (days == null) return 0;
  return Math.min(100, Math.max(0, ((365 - days) / 365) * 100));
});

// ✅ دوال مساعدة لتنسيق الحالات والأنواع
const getLeaveTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    annual: "سنوية",
    unpaid: "بدون راتب",
    other: "أخرى",
  };
  return types[type] || type;
};

const getLeaveTypeBadge = (type: string) => {
  if (type === "annual") return "badge--success";
  if (type === "unpaid") return "badge--warning";
  return "badge--system";
};

const getStatusLabel = (status: string) => {
  const statuses: Record<string, string> = {
    approved: "موافق",
    pending: "معلق",
    rejected: "مرفوض",
  };
  return statuses[status] || status;
};

const getStatusBadge = (status: string) => {
  if (status === "approved") return "badge--success";
  if (status === "pending") return "badge--pending";
  if (status === "rejected") return "badge--danger";
  return "badge--system";
};

const refreshData = async () => {
  try {
    await store.refreshProfile();
    toast.success("تم تحديث البيانات بنجاح");
  } catch (e: any) {
    toast.error(e.message || "فشل تحديث البيانات");
  }
};

const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString("ar-SA") : "-";

const formatCurrency = (val?: number) =>
  val ? `${val.toLocaleString("ar-SA")} ر.س` : "0 ر.س";

onMounted(() => {
  if (!store.isLoaded) store.fetchProfile();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

/* ... (نفس الـ CSS السابق) ... */

.profile-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: $space-4;
}

.profile-card--main {
  grid-column: span 12;
}
.card:nth-child(2),
.card:nth-child(3),
.card:nth-child(4) {
  grid-column: span 4;
}
.full-width {
  grid-column: span 12;
}

@include respond-to("lg") {
  .card:nth-child(2),
  .card:nth-child(3),
  .card:nth-child(4) {
    grid-column: span 6;
  }
}
@include respond-to("md") {
  .profile-grid {
    display: flex;
    flex-direction: column;
  }
}

.profile-avatar-section {
  @include flex(row, center, flex-start, $space-4);
  margin-bottom: $space-6;
  padding-bottom: $space-4;
  border-bottom: 1px solid $stb-border;
}

.profile-avatar-lg {
  width: 80px;
  height: 80px;
  border-radius: $radius-xl;
  background: $gradient-primary;
  @include flex(row, center, center);
  font-size: $font-size-3xl;
  font-weight: 800;
  color: #fff;
  box-shadow: $shadow-glow;
}

.profile-details-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-4;
}
.detail-item {
  @include flex(column, flex-start, flex-start, $space-1);
}
.detail-item .label {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  @include flex(row, center, flex-start, 4px);
  .label-icon {
    flex-shrink: 0;
    opacity: 0.7;
  }
}
.detail-item .value {
  font-size: $font-size-base;
  font-weight: 600;
  color: $stb-text-primary;
}

.card__title {
  @include flex(row, center, flex-start, $space-2);
  .title-icon {
    color: $stb-accent;
    flex-shrink: 0;
  }
}

.status-indicator {
  @include flex(row, center, flex-start, $space-2);
  font-weight: 700;
  margin-bottom: $space-3;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: $stb-success;
}
.expiring .dot {
  background: $stb-warning;
  animation: pulse 1.5s infinite;
}
.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: $stb-surface;
  border-radius: $radius-full;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: $gradient-accent;
  transition: width 0.5s ease;
}

.salary-row {
  @include flex(row, center, space-between);
  padding: $space-2 0;
  font-size: $font-size-sm;
}
.salary-row.total {
  font-weight: 800;
  font-size: $font-size-lg;
  color: $stb-accent;
}
.debt-summary {
  @include flex(row, center, space-between);
  background: $stb-surface;
  padding: $space-3;
  border-radius: $radius-md;
}
.debt-stat {
  @include flex(column, center, center, $space-1);
}

.leave-circle-container {
  @include flex(row, center, center, $space-6);
}
.circular-chart {
  display: block;
  margin: 0 auto;
  max-width: 100px;
  max-height: 100px;
}
.circle-bg {
  fill: none;
  stroke: $stb-surface;
  stroke-width: 3;
}
.circle {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke: $stb-accent;
  transition: stroke-dasharray 0.5s ease;
}
.percentage {
  fill: $stb-text-primary;
  font-family: $font-family;
  font-weight: 800;
  font-size: 0.5em;
  text-anchor: middle;
}
.leave-stats {
  @include flex(column, flex-start, flex-start, $space-2);
}
.stat-row {
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  span {
    margin-left: $space-2;
  }
}

.tabs {
  @include flex(row, center, flex-start, $space-2);
  border-bottom: 1px solid $stb-border;
  padding-bottom: $space-2;
}
.tab-btn {
  background: transparent;
  border: none;
  color: $stb-text-muted;
  padding: $space-2 $space-4;
  cursor: pointer;
  font-family: $font-family;
  font-weight: 600;
  transition: all $transition-fast;
  border-radius: $radius-md;
  @include flex(row, center, center, $space-2);
  .tab-icon {
    flex-shrink: 0;
  }
}
.tab-btn.active {
  background: rgba($stb-accent, 0.1);
  color: $stb-accent;
}
.tab-btn:hover:not(.active) {
  color: $stb-text-primary;
  background: $stb-surface-2;
}

.btn-icon {
  margin-left: $space-2;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}
</style>
