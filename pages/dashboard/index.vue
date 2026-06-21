<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>لوحة التحكم</h1>
        <p>
          مرحباً بك في نظام STB ERP —
          {{
            new Date().toLocaleDateString("ar-SA", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          }}
        </p>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom: 2rem">
      <div
        class="stat-card"
        v-for="stat in stats"
        :key="stat.label"
        :style="`--accent: ${stat.color}`"
      >
        <div
          class="stat-card__icon"
          :style="`background: rgba(${stat.colorRgb}, 0.12)`"
        >
          {{ stat.icon }}
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value" v-if="!loading">{{ stat.value }}</div>
          <div class="stat-card__value" v-else>
            <span class="spinner" />
          </div>
          <div class="stat-card__label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Recent Users -->
    <div class="card">
      <div class="card__header">
        <h2 class="card__title">أحدث المستخدمين</h2>
        <NuxtLink to="/dashboard/users" class="btn btn--ghost btn--sm"
          >عرض الكل</NuxtLink
        >
      </div>
      <div v-if="usersStore.loading" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>المستخدم</th>
            <th>البريد الإلكتروني</th>
            <th>الحالة</th>
            <th>الدور</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in usersStore.users.slice(0, 5)" :key="user.id">
            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem">
                <div class="user-avatar">
                  {{ user.username[0].toUpperCase() }}
                </div>
                {{ user.username }}
              </div>
            </td>
            <td>{{ user.email }}</td>
            <td>
              <span :class="`badge badge--${user.status}`">{{
                statusLabel(user.status)
              }}</span>
            </td>
            <td>
              <span v-if="user.isSuperAdmin" class="badge badge--system"
                >مدير</span
              >
              <span v-else-if="user.role">{{ user.role.name }}</span>
              <span v-else class="text-muted">—</span>
            </td>
          </tr>
          <tr v-if="!usersStore.users.length">
            <td colspan="4">
              <div class="empty-state" style="padding: 2rem">
                <div class="empty-state__icon">👤</div>
                <div class="empty-state__title">لا يوجد مستخدمون بعد</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUsersStore } from "../../stores/users";
import { useEmployeesStore } from "../../stores/employees";
import { useLeavesStore } from "../../stores/leaves";
import { useAdvancesStore } from "../../stores/advances";
import { useLoansStore } from "../../stores/loans";
import { computed, onMounted, ref } from "vue";

definePageMeta({ middleware: "auth" });

const usersStore = useUsersStore();
const employeesStore = useEmployeesStore();
const leavesStore = useLeavesStore();
const advancesStore = useAdvancesStore();
const loansStore = useLoansStore();

const loading = ref(true);

onMounted(async () => {
  await Promise.all([
    usersStore.fetchAll(),
    employeesStore.fetchAll(),
    leavesStore.fetchAll(),
    advancesStore.fetchAll(),
    loansStore.fetchAll(),
  ]);
  loading.value = false;
});

// دالة مساعدة لحساب العناصر المعلقة
const countPending = (items: any[]) => {
  return items.filter((item) => item.status === "pending").length;
};

const stats = computed(() => [
  {
    icon: "👤",
    label: "المستخدمون",
    value: usersStore.users.length,
    color: "#00aaff",
    colorRgb: "0,170,255",
  },
  {
    icon: "👥",
    label: "الموظفون",
    value: employeesStore.employees.length,
    color: "#10b981",
    colorRgb: "16,185,129",
  },
  {
    icon: "🏖️",
    label: "الإجازات المعلقة",
    value: countPending(leavesStore.requests),
    color: "#f59e0b",
    colorRgb: "245,158,11",
  },
  {
    icon: "💰",
    label: "السلف المعلقة",
    value: countPending(advancesStore.advances),
    color: "#ef4444",
    colorRgb: "239,68,68",
  },
  {
    icon: "🏦",
    label: "القروض المعلقة",
    value: countPending(loansStore.loans),
    color: "#a855f7",
    colorRgb: "168,85,247",
  },
]);

const statusLabel = (s: string) =>
  ({ active: "نشط", inactive: "غير نشط", suspended: "موقوف" })[s] ?? s;
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: $gradient-primary;
  @include flex(row, center, center);
  font-size: $font-size-xs;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
</style>
