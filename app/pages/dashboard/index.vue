<template>
  <div class="page-container">
    <!-- Header Section -->
    <div class="page-header">
      <div class="page-header__title tn">
        <!-- Welcome Message Area -->
        <div v-if="!loading" class="welcome-box">
          <h1 class="welcome-title" v-html="welcomeMessage"></h1>
          <div class="date-time-wrapper">
            <p class="welcome-date">
              {{ currentDate }}
            </p>
            <span class="time-badge">
              <!-- ✅ أيقونة الساعة من Lucide -->
              <Clock :size="14" />
              {{ saudiTime }}
            </span>
          </div>
        </div>
        <div v-else class="welcome-skeleton">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-30 mt-2"></div>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid-3 stats-grid">
      <!-- Stat 1: Users -->
      <div class="stat-card" :style="`--accent-color: ${stats[0].color}`">
        <div
          class="stat-card__icon"
          :style="`background: rgba(${stats[0].colorRgb}, 0.12); color: ${stats[0].color}`"
        >
          <!-- ✅ استخدام مكون الأيقونة مباشرة -->
          <component :is="stats[0].icon" :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            <span v-if="!loading">{{ stats[0].value }}</span>
            <span v-else class="spinner spinner--sm"></span>
          </div>
          <div class="stat-card__label">{{ stats[0].label }}</div>
        </div>
      </div>

      <!-- Stat 2: Employees -->
      <div class="stat-card" :style="`--accent-color: ${stats[1].color}`">
        <div
          class="stat-card__icon"
          :style="`background: rgba(${stats[1].colorRgb}, 0.12); color: ${stats[1].color}`"
        >
          <component :is="stats[1].icon" :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            <span v-if="!loading">{{ stats[1].value }}</span>
            <span v-else class="spinner spinner--sm"></span>
          </div>
          <div class="stat-card__label">{{ stats[1].label }}</div>
        </div>
      </div>

      <!-- Stat 3: Merged Pending Approvals -->
      <div
        class="stat-card stat-card--merged"
        :style="`--accent-color: #f59e0b`"
      >
        <div class="merged-header">
          <div
            class="stat-card__icon"
            style="background: rgba(245, 158, 11, 0.12); color: #f59e0b"
          >
            <!-- ✅ أيقونة الموافقات -->
            <ClipboardList :size="24" />
          </div>
          <div class="stat-card__info">
            <div class="stat-card__value">
              <span v-if="!loading">{{ totalPending }}</span>
              <span v-else class="spinner spinner--sm"></span>
            </div>
            <div class="stat-card__label">الموافقات المعلقة</div>
          </div>
        </div>

        <!-- Detailed Breakdown inside the card -->
        <div v-if="!loading" class="pending-breakdown">
          <div class="breakdown-item">
            <span> <CalendarDays :size="14" class="item-icon" /> إجازات </span>
            <span class="count">{{ countPending(leavesStore.requests) }}</span>
          </div>
          <div class="breakdown-item">
            <span> <HandCoins :size="14" class="item-icon" /> سلف </span>
            <span class="count">{{
              countPending(advancesStore.advances)
            }}</span>
          </div>
          <div class="breakdown-item">
            <span> <Landmark :size="14" class="item-icon" /> قروض </span>
            <span class="count">{{ countPending(loansStore.loans) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Users Table -->
    <div class="card mt-6">
      <div class="card__header">
        <h2 class="card__title">أحدث المستخدمين المسجلين</h2>
        <NuxtLink to="/dashboard/users" class="btn btn--ghost btn--sm">
          عرض الكل
          <!-- ✅ أيقونة السهم -->
          <ArrowLeft :size="16" />
        </NuxtLink>
      </div>

      <div v-if="usersStore.loading" class="empty-state py-8">
        <div class="spinner spinner--lg" />
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>الحالة</th>
              <th>الدور الوظيفي</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in usersStore.users.slice(0, 5)" :key="user.id">
              <td>
                <div class="user-cell">
                  <div class="user-avatar">
                    {{ (user.username?.[0] ?? "").toUpperCase() }}
                  </div>
                  <span class="font-bold text-sm">{{ user.username }}</span>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span :class="`badge badge--${user.status}`">
                  {{ statusLabel(user.status) }}
                </span>
              </td>
              <td>
                <span v-if="user.isSuperAdmin" class="badge badge--system">
                  مدير النظام
                </span>
                <span
                  v-else-if="user.isSystemAdmin"
                  class="badge badge--tenant"
                >
                  مالك النظام
                </span>
                <span v-else-if="user.role" class="text-secondary text-sm">
                  {{ user.role.name }}
                </span>
                <span v-else class="text-muted text-sm">—</span>
              </td>
            </tr>
            <tr v-if="!usersStore.users.length">
              <td colspan="4">
                <div class="empty-state">
                  <!-- ✅ أيقونة المستخدم الفارغ -->
                  <UserX :size="32" class="empty-icon" />
                  <div class="empty-state__title">لا يوجد مستخدمون بعد</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUsersStore } from "@/stores/users";
import { useEmployeesStore } from "@/stores/employees";
import { useLeavesStore } from "@/stores/leaves";
import { useAdvancesStore } from "@/stores/advances";
import { useLoansStore } from "@/stores/loans";
import { useProfileStore } from "@/stores/profile";
import { computed, onMounted, ref, onUnmounted, type Component } from "vue";

// ✅ استيراد جميع الأيقونات المستخدمة
import {
  Clock,
  Users,
  UserCog,
  ClipboardList,
  CalendarDays,
  HandCoins,
  Landmark,
  ArrowLeft,
  UserX,
} from "lucide-vue-next";

type StatItem = {
  icon: Component; // ✅ تغيير النوع إلى Component بدلاً من string
  label: string;
  value: number;
  color: string;
  colorRgb: string;
};

definePageMeta({ middleware: "auth" });

const usersStore = useUsersStore();
const employeesStore = useEmployeesStore();
const leavesStore = useLeavesStore();
const advancesStore = useAdvancesStore();
const loansStore = useLoansStore();
const profileStore = useProfileStore();

const loading = ref(true);
const saudiTime = ref("");
const currentDate = ref("");
let timeInterval: any = null;

const updateSaudiTime = () => {
  const now = new Date();
  saudiTime.value = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Riyadh",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  currentDate.value = now.toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

onMounted(async () => {
  updateSaudiTime();
  timeInterval = setInterval(updateSaudiTime, 1000);
  await profileStore.fetchProfile();
  await Promise.all([
    usersStore.fetchAll(),
    employeesStore.fetchAll(),
    leavesStore.fetchAll(),
    advancesStore.fetchAll(),
    loansStore.fetchAll(),
  ]);
  loading.value = false;
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});

const countPending = (items: any[]) => {
  return items.filter((item) => item.status === "pending").length;
};

const totalPending = computed(() => {
  return (
    countPending(leavesStore.requests) +
    countPending(advancesStore.advances) +
    countPending(loansStore.loans)
  );
});

const welcomeMessage = computed(() => {
  const user = profileStore.data?.personal?.user as
    | { username?: string; isSuperAdmin?: boolean; isSystemAdmin?: boolean }
    | undefined;
  if (!user) return "";

  const username = user.username || "شريكنا";

  if (user.isSuperAdmin) {
    return `مرحباً شريكنا ${username} 👋<br><span class="text-accent">أهلاً بك في STB HR</span><br>نتمنى لك يومًا مثمرًا وإدارة ناجحة لمواردك البشرية.`;
  }

  if (user.isSystemAdmin) {
    return `مرحباً سيد النظام ${username} 👋<br><span class="text-accent">لوحة تحكم STB ERP</span><br>لديك السيطرة الكاملة على إعدادات النظام والمستخدمين.`;
  }

  const displayName = profileStore.fullName || username;
  return `مرحباً، ${displayName} 👋<br><span class="text-accent">أهلاً بك في نظام STB HR</span><br>نتمنى لك يوماً سعيداً ومثمراً.`;
});

// ✅ تحديث مصفوفة الإحصائيات لاستخدام مكونات الأيقونات
const stats = computed<readonly [StatItem, StatItem]>(() => [
  {
    icon: Users,
    label: "المستخدمون",
    value: usersStore.users.length,
    color: "#00aaff",
    colorRgb: "0,170,255",
  },
  {
    icon: UserCog,
    label: "الموظفون",
    value: employeesStore.employees.length,
    color: "#10b981",
    colorRgb: "16,185,129",
  },
]);

const statusLabel = (s: string) =>
  ({ active: "نشط", inactive: "غير نشط", suspended: "موقوف" })[s] ?? s;
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.tn {
  width: 100%;
}

.welcome-box {
  animation: slideUpFade 0.6s ease-out forwards;
  display: flex;
  justify-content: space-between;
}

.welcome-title {
  font-size: $font-size-2xl;
  font-weight: 800;
  line-height: 1.4;
  margin-bottom: $space-2;
  color: $stb-text-primary;
  .text-accent {
    color: $stb-accent;
    text-shadow: 0 0 15px rgba($stb-accent, 0.3);
  }
}

.date-time-wrapper {
  @include flex(column, center, flex-start, $space-3);
  flex-wrap: wrap;
}

.welcome-date {
  color: $stb-text-secondary;
  font-size: $font-size-sm;
  display: flex;
  align-items: center;
  gap: $space-2;
}

.time-badge {
  background: rgba($stb-accent, 0.1);
  color: $stb-accent;
  padding: 2px 8px;
  border-radius: $radius-md;
  font-size: $font-size-xs;
  font-weight: 600;
  border: 1px solid rgba($stb-accent, 0.2);
  @include flex(row, center, center, 4px);
  font-family: monospace;
}

.welcome-skeleton {
  .skeleton-line {
    height: 1.5rem;
    background: $stb-surface-3;
    border-radius: $radius-md;
    animation: pulse 1.5s infinite ease-in-out;
    &.w-60 {
      width: 60%;
    }
    &.w-30 {
      width: 30%;
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-cell {
  @include flex(row, center, flex-start, $space-3);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $gradient-primary;
  @include flex(row, center, center);
  font-size: $font-size-xs;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba($stb-primary-dark, 0.3);
}

.stat-card--merged {
  display: grid !important;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 0 $space-4;
  align-items: start;

  .merged-header {
    display: contents;
  }
  .stat-card__icon {
    grid-column: 1;
    grid-row: 1;
    align-self: center;
  }
  .stat-card__info {
    grid-column: 2;
    grid-row: 1;
    width: 100%;
  }

  .pending-breakdown {
    grid-column: 1 / -1;
    grid-row: 2;
    padding-top: $space-3;
    border-top: 1px dashed rgba($stb-border, 0.5);
    @include flex(row, flex-start, flex-start, 6px);
    width: 100%;

    .breakdown-item {
      @include flex(column, space-between, center);
      width: 100%;
      font-size: $font-size-xs;
      color: $stb-text-secondary;
      padding: 0 $space-1;

      /* ✅ تنسيق الأيقونات الصغيرة داخل القائمة */
      .item-icon {
        vertical-align: middle;
        margin-left: 4px;
        color: inherit;
      }

      .count {
        font-weight: 700;
        color: $stb-text-primary;
        background: $stb-surface-3;
        padding: 2px 8px;
        border-radius: $radius-sm;
        min-width: 24px;
        text-align: center;
      }
    }
  }
}

.empty-state {
  text-align: center;
  .empty-icon {
    color: $stb-text-muted;
    margin-bottom: $space-2;
    opacity: 0.5;
  }
}

.mt-6 {
  margin-top: $space-6 !important;
}
.py-8 {
  padding-top: $space-8;
  padding-bottom: $space-8;
}
.text-secondary {
  color: $stb-text-secondary;
}
.spinner--sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}
</style>
