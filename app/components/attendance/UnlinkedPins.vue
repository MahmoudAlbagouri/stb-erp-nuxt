<!-- components/attendance/UnlinkedPins.vue -->
<!-- أرقام وصلت منها بصمات ولا يقابلها موظف: موظفون سُجّلوا على الجهاز بأرقام
     غير أكوادهم. ربط الرقم بموظف ينسب له كل بصماته السابقة واللاحقة. -->
<template>
  <div v-if="store.unlinkedPins.length" class="card unlinked-card">
    <button class="unlinked-card__head" type="button" @click="open = !open">
      <span class="unlinked-card__title">
        <Link2Off :size="18" />
        بصمات لأرقام غير مربوطة بموظفين ({{ store.unlinkedPins.length }})
      </span>
      <ChevronDown :size="18" :class="['chevron', { 'chevron--open': open }]" />
    </button>

    <div v-if="open" class="unlinked-card__body">
      <p class="unlinked-card__hint">
        موظفون مسجّلون على الجهاز بأرقام غير أكوادهم، أو لم يُضافوا للنظام بعد.
        اربط كل رقم بموظفه: تُنسب له كل بصماته السابقة، وما يصل بعد ذلك.
      </p>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الرقم على الجهاز</th>
              <th>البصمات</th>
              <th>آخر بصمة</th>
              <th>الجهاز</th>
              <th>الموظف</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in store.unlinkedPins" :key="row.pin">
              <td><b dir="ltr">{{ row.pin }}</b></td>
              <td>{{ row.punches }}</td>
              <td>{{ formatDateTime(row.lastPunch) }}</td>
              <td>{{ row.devices.join("، ") || "ملف مستورد" }}</td>
              <td>
                <div class="link-row">
                  <select v-model="choice[row.pin]" class="form-select">
                    <option value="">اختر الموظف…</option>
                    <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                      {{ emp.fullName }} ({{ emp.employeeCode }})
                    </option>
                  </select>
                  <button
                    v-can="'update_attendance_log'"
                    class="btn btn--sm btn--primary"
                    :disabled="!choice[row.pin] || linking === row.pin"
                    @click="link(row.pin)"
                  >
                    <span v-if="linking === row.pin" class="spinner spinner--sm" />
                    <span v-else>ربط</span>
                  </button>
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
import { reactive, ref } from "vue";
import { ChevronDown, Link2Off } from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useToast } from "@/composables/useToast";
import type { Employee } from "@/types";

defineProps<{ employees: Employee[] }>();
const emit = defineEmits<{ linked: [] }>();

const store = useAttendanceStore();
const toast = useToast();
const open = ref(true);
const linking = ref<string | null>(null);
const choice = reactive<Record<string, string>>({});

const link = async (pin: string) => {
  const employeeId = choice[pin];
  if (!employeeId) return;
  linking.value = pin;
  try {
    const { linked } = await store.linkPin(pin, employeeId);
    toast.success(`تم الربط، ونُسبت للموظف ${linked} بصمة`);
    delete choice[pin];
    emit("linked");
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    linking.value = null;
  }
};
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.unlinked-card {
  margin-bottom: $space-4;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba($stb-warning, 0.35);

  &__head {
    @include flex(row, center, space-between);
    width: 100%;
    padding: $space-3 $space-5;
    background: rgba($stb-warning, 0.08);
    border: none;
    cursor: pointer;
    font-family: inherit;
    color: $stb-text-primary;
  }
  &__title {
    @include flex(row, center, flex-start, $space-2);
    font-weight: 700;
    font-size: $font-size-sm;
    svg {
      color: $stb-warning;
    }
  }
  &__hint {
    margin: 0;
    padding: $space-3 $space-5;
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
}
.chevron {
  transition: transform $transition-fast;
  &--open {
    transform: rotate(180deg);
  }
}
.table-responsive {
  overflow-x: auto;
  @include scrollbar;
}
.link-row {
  @include flex(row, center, flex-start, $space-2);
  min-width: 260px;
  .form-select {
    flex: 1;
  }
}
</style>
