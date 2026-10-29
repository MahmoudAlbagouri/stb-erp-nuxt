<!-- components/attendance/DailySummary.vue -->
<!-- حضور كل الموظفين في يوم: أول بصمة وآخرها، التأخير والإضافي، والحالة —
     بأيام الراحة والعطلات والإجازات المعتمدة. -->
<template>
  <div>
    <div class="card filters-card">
      <div class="filters-row">
        <div class="form-group">
          <label>اليوم</label>
          <StbDateInput v-model="day" type="date" class="form-input" />
        </div>
        <div class="counts">
          <span v-for="c in counts" :key="c.label" :class="['badge', c.badge]">
            {{ c.label }}: {{ c.value }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>
    <div v-else-if="!rows.length" class="card empty-card">
      <div class="empty-state">
        <CalendarX :size="40" class="empty-icon" />
        <div class="empty-state__title">لا يوجد حضور لهذا اليوم</div>
      </div>
    </div>
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الوردية</th>
              <th>أول بصمة</th>
              <th>آخر بصمة</th>
              <th>ساعات العمل</th>
              <th>تأخير</th>
              <th>انصراف مبكر</th>
              <th>إضافي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.employeeId ?? `pin:${row.employeeCode}`">
              <td>
                <div class="employee-cell">
                  <span class="employee-name">
                    {{ row.employeeName || "رقم غير مربوط" }}
                  </span>
                  <span class="employee-pin">PIN: {{ row.employeeCode }}</span>
                </div>
              </td>
              <td>{{ row.shiftName || "—" }}</td>
              <td>{{ row.firstPunch ? formatTime(row.firstPunch) : "—" }}</td>
              <td>
                {{
                  row.lastPunch && row.lastPunch !== row.firstPunch
                    ? formatTime(row.lastPunch)
                    : "—"
                }}
              </td>
              <td>{{ minutesText(row.totalMinutes) }}</td>
              <td :class="{ warn: row.lateMinutes }">
                {{ minutesText(row.lateMinutes) }}
              </td>
              <td :class="{ warn: row.earlyLeaveMinutes }">
                {{ minutesText(row.earlyLeaveMinutes) }}
              </td>
              <td :class="{ extra: row.overtimeMinutes }">
                {{ minutesText(row.overtimeMinutes) }}
              </td>
              <td>
                <span :class="['badge', ATTENDANCE_STATUS[row.status].badge]">
                  {{ ATTENDANCE_STATUS[row.status].label }}
                </span>
                <div v-if="row.leaveReason || row.holidayName" class="note">
                  {{ row.leaveReason || row.holidayName }}
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
import { computed, onMounted, ref, watch } from "vue";
import { CalendarX } from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useToast } from "@/composables/useToast";
import type { AttendanceStatus, DailySummaryRow } from "@/types";

const store = useAttendanceStore();
const toast = useToast();

const day = ref(companyToday());
const rows = ref<DailySummaryRow[]>([]);
const loading = ref(false);

const countOf = (...statuses: AttendanceStatus[]) =>
  rows.value.filter((r) => r.employeeId && statuses.includes(r.status)).length;

const counts = computed(() => [
  {
    label: "حاضر",
    badge: "badge--active",
    value: countOf("present", "early_leave", "incomplete", "unclassified"),
  },
  { label: "متأخر", badge: "badge--pending", value: countOf("late", "late_and_early_leave") },
  { label: "غائب", badge: "badge--terminated", value: countOf("absent") },
  { label: "إجازة", badge: "badge--trial", value: countOf("on_leave") },
  { label: "راحة / عطلة", badge: "badge--inactive", value: countOf("off_day", "holiday") },
]);

const load = async () => {
  if (!day.value) return;
  loading.value = true;
  try {
    rows.value = await store.fetchDailySummary(day.value);
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    loading.value = false;
  }
};

watch(day, load);
onMounted(load);
defineExpose({ reload: load });
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.filters-card {
  padding: $space-4 $space-5;
  margin-bottom: $space-4;
}
.filters-row {
  @include flex(row, flex-end, space-between, $space-4);
  flex-wrap: wrap;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  min-width: 200px;
  label {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $stb-text-secondary;
  }
}
.counts {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;
}
.empty-card .empty-state {
  padding: $space-10 $space-4;
}
.empty-icon {
  color: $stb-text-muted;
  opacity: 0.4;
  margin-bottom: $space-3;
}
.table-card {
  padding: 0;
  overflow: hidden;
}
.table-responsive {
  overflow-x: auto;
  @include scrollbar;
}
.employee-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.employee-name {
  font-weight: 600;
  font-size: $font-size-sm;
  color: $stb-text-primary;
}
.employee-pin,
.note {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.warn {
  color: $stb-warning;
  font-weight: 600;
}
.extra {
  color: $stb-success;
  font-weight: 600;
}
</style>
