<!-- components/attendance/MonthlyReport.vue -->
<!-- حضور موظف في شهر: أيام العمل والغياب والإجازات والراحة، والتأخير
     والإضافي يوماً بيوم — نفس الأرقام التي يأخذها مسير الرواتب. -->
<template>
  <div>
    <div class="card filters-card">
      <div class="filters-grid">
        <div class="form-group">
          <label>الموظف</label>
          <select v-model="employeeId" class="form-select">
            <option value="" disabled>اختر الموظف…</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.fullName }} ({{ emp.employeeCode }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>الشهر</label>
          <select v-model.number="month" class="form-select">
            <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>السنة</label>
          <select v-model.number="year" class="form-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>
    <div v-else-if="!report" class="card empty-card">
      <div class="empty-state">
        <CalendarRange :size="40" class="empty-icon" />
        <div class="empty-state__title">اختر موظفاً لعرض تقريره</div>
      </div>
    </div>

    <template v-else>
      <div class="tiles">
        <div v-for="t in tiles" :key="t.label" :class="['tile', t.tone]">
          <span class="tile__value">{{ t.value }}</span>
          <span class="tile__label">{{ t.label }}</span>
        </div>
      </div>
      <p class="hint">
        الوردية: {{ report.shiftName || "بلا وردية (لا يُقاس تأخير ولا غياب في المسير)" }}
        — {{ report.elapsedDays }} يوماً مرّت من الشهر.
      </p>

      <div class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>اليوم</th>
                <th>الحضور</th>
                <th>الانصراف</th>
                <th>ساعات العمل</th>
                <th>تأخير</th>
                <th>انصراف مبكر</th>
                <th>إضافي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in report.dailyBreakdown" :key="d.date" :class="rowClass(d.status)">
                <td>
                  {{ d.date }}
                  <span class="weekday">{{ weekdayOf(d.date) }}</span>
                </td>
                <td>{{ d.checkIn ? formatTime(d.checkIn) : "—" }}</td>
                <td>
                  {{ d.checkOut && d.checkOut !== d.checkIn ? formatTime(d.checkOut) : "—" }}
                </td>
                <td>{{ minutesText(d.minutes) }}</td>
                <td>{{ minutesText(d.lateMinutes) }}</td>
                <td>{{ minutesText(d.earlyLeaveMinutes) }}</td>
                <td>{{ minutesText(d.overtimeMinutes) }}</td>
                <td>
                  <span :class="['badge', ATTENDANCE_STATUS[d.status].badge]">
                    {{ ATTENDANCE_STATUS[d.status].label }}
                  </span>
                  <div v-if="d.leaveReason || d.holidayName" class="note">
                    {{ d.leaveReason || d.holidayName }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { CalendarRange } from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useToast } from "@/composables/useToast";
import type { AttendanceStatus, Employee, MonthlyReport } from "@/types";

defineProps<{ employees: Employee[] }>();

const store = useAttendanceStore();
const toast = useToast();

const today = companyToday();
const thisYear = Number(today.slice(0, 4));
const thisMonth = Number(today.slice(5, 7));
const employeeId = ref("");
const month = ref(thisMonth);
const year = ref(thisYear);
const years = Array.from({ length: 4 }, (_, i) => thisYear - i);
const report = ref<MonthlyReport | null>(null);
const loading = ref(false);

const tiles = computed(() => {
  const r = report.value;
  if (!r) return [];
  return [
    { label: "أيام العمل", value: r.workingDays, tone: "" },
    { label: "حضور", value: r.presentDays, tone: "tile--ok" },
    { label: "غياب", value: r.absentDays, tone: "tile--bad" },
    { label: "إجازة", value: r.leaveDays, tone: "" },
    { label: "راحة وعطلات", value: r.offDays + r.holidayDays, tone: "" },
    { label: "ساعات العمل", value: r.totalWorkHours, tone: "" },
    {
      label: "تأخير وانصراف مبكر",
      value: minutesText(r.totalLateMinutes + r.totalEarlyLeaveMinutes),
      tone: "tile--warn",
    },
    { label: "إضافي", value: minutesText(r.totalOvertimeMinutes), tone: "tile--ok" },
  ];
});

const weekdayOf = (day: string) =>
  WEEKDAYS.find((w) => w.value === new Date(`${day}T00:00:00Z`).getUTCDay())?.label;

const rowClass = (status: AttendanceStatus) => ({
  "row--muted": ["off_day", "holiday", "not_employed"].includes(status),
  "row--absent": status === "absent",
});

const load = async () => {
  if (!employeeId.value) return;
  loading.value = true;
  try {
    report.value = await store.fetchMonthlyReport(
      employeeId.value,
      month.value,
      year.value,
    );
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    loading.value = false;
  }
};

watch([employeeId, month, year], load);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.filters-card {
  padding: $space-4 $space-5;
  margin-bottom: $space-4;
}
.filters-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: $space-3;
  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  label {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $stb-text-secondary;
  }
}
.empty-card .empty-state {
  padding: $space-10 $space-4;
}
.empty-icon {
  color: $stb-text-muted;
  opacity: 0.4;
  margin-bottom: $space-3;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-3;
  margin-bottom: $space-3;
  @include respond-to("md") {
    grid-template-columns: 1fr 1fr;
  }
}
.tile {
  @include glass-card;
  padding: $space-3 $space-4;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__value {
    font-size: $font-size-xl;
    font-weight: 800;
    color: $stb-text-primary;
  }
  &__label {
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
  &--ok .tile__value {
    color: $stb-success;
  }
  &--bad .tile__value {
    color: $stb-danger;
  }
  &--warn .tile__value {
    color: $stb-warning;
  }
}
.hint {
  margin: 0 0 $space-3;
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.table-card {
  padding: 0;
  overflow: hidden;
}
.table-responsive {
  overflow-x: auto;
  @include scrollbar;
}
.weekday,
.note {
  display: block;
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.row--muted td {
  opacity: 0.6;
}
.row--absent td:first-child {
  box-shadow: inset -3px 0 0 $stb-danger;
}
</style>
