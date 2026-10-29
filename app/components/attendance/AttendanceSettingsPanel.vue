<!-- components/attendance/AttendanceSettingsPanel.vue -->
<!-- سياسة الحضور للشركة: أيام الراحة، العطلات الرسمية، أثر الحضور في مسير
     الرواتب، ونسخ البصمات بين أجهزة ZKTeco. -->
<template>
  <div v-if="loading" class="empty-state">
    <div class="spinner spinner--lg" />
  </div>

  <div v-else-if="form" class="settings">
    <!-- أيام الراحة -->
    <section class="card section">
      <h3><CalendarOff :size="18" /> أيام الراحة الأسبوعية</h3>
      <p class="hint">
        لا يُحسب فيها غياب، والعمل فيها إضافي كله. لوردية معينة أيام راحة مختلفة
        (حراسة تعمل الجمعة مثلاً)؟ حددها من صفحة أوقات الدوام.
      </p>
      <div class="days">
        <label v-for="d in WEEKDAYS" :key="d.value" class="checkbox-label day">
          <input
            v-model="form.weeklyOffDays"
            type="checkbox"
            :value="d.value"
            :disabled="!canManage"
          />
          {{ d.label }}
        </label>
      </div>
    </section>

    <!-- العطلات الرسمية -->
    <section class="card section">
      <div class="section__head">
        <h3><PartyPopper :size="18" /> العطلات الرسمية</h3>
        <select v-model.number="holidayYear" class="form-select year">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <p class="hint">لا يُحسب فيها غياب على أحد، والعمل فيها إضافي كله.</p>

      <form v-if="canManage" class="holiday-form" @submit.prevent="addHoliday">
        <input
          v-model="holidayForm.name"
          class="form-input"
          required
          maxlength="100"
          placeholder="مثال: عيد الفطر"
        />
        <StbDateInput v-model="holidayForm.startDate" type="date" class="form-input" required />
        <StbDateInput v-model="holidayForm.endDate" type="date" class="form-input" />
        <button class="btn btn--primary" :disabled="addingHoliday">
          <span v-if="addingHoliday" class="spinner spinner--sm" />
          <Plus v-else :size="16" />
          إضافة
        </button>
      </form>
      <small v-if="canManage" class="hint">
        تاريخ النهاية لعطلة أكثر من يوم؛ اتركه فارغاً ليوم واحد.
      </small>

      <ul v-if="holidays.length" class="holidays">
        <li v-for="h in holidays" :key="h.id">
          <span class="holidays__name">{{ h.name }}</span>
          <span class="holidays__dates" dir="ltr">
            {{ h.startDate }}{{ h.endDate !== h.startDate ? ` → ${h.endDate}` : "" }}
          </span>
          <button
            v-if="canManage"
            class="btn btn--sm btn--ghost"
            aria-label="حذف"
            @click="removeHoliday(h)"
          >
            <Trash2 :size="14" />
          </button>
        </li>
      </ul>
      <p v-else class="hint">لا توجد عطلات مسجلة لهذه السنة.</p>
    </section>

    <!-- المسير -->
    <section class="card section">
      <h3><Wallet :size="18" /> الحضور في مسير الرواتب</h3>
      <p class="hint">
        يُحسب عند إعداد المسير لموظفي الورديات فقط (من لا وردية له لا يُقاس
        بالبصمة). الإجازات المعتمدة والراحة والعطلات ليست غياباً.
      </p>
      <label class="checkbox-label">
        <input v-model="form.deductAbsence" type="checkbox" :disabled="!canManage" />
        خصم أيام الغياب (أجر اليوم = الأساسي ÷ 30)
      </label>
      <label class="checkbox-label">
        <input v-model="form.deductLateness" type="checkbox" :disabled="!canManage" />
        خصم التأخير والانصراف المبكر بعد فترة السماح (بأجر الدقيقة)
      </label>
      <label class="checkbox-label">
        <input v-model="form.payOvertime" type="checkbox" :disabled="!canManage" />
        صرف أجر الساعات الإضافية
      </label>
      <div class="grid-2">
        <div class="form-group">
          <label>أجر الساعة الإضافية (% من أجر الساعة)</label>
          <StbNumberInput
            v-model.number="form.overtimeRatePercent"
            min="100"
            max="300"
            class="form-input"
            :disabled="!canManage"
          />
        </div>
        <div class="form-group">
          <label>أقل إضافي يُحتسب في اليوم (دقائق)</label>
          <StbNumberInput
            v-model.number="form.overtimeMinMinutes"
            min="0"
            max="240"
            class="form-input"
            :disabled="!canManage"
          />
        </div>
      </div>
      <div v-if="form.deductAbsence" class="info-note info-note--warn">
        <AlertTriangle :size="15" />
        <span>
          تأكد أن كل موظفي الورديات يبصمون فعلاً قبل تفعيل خصم الغياب: من لا تصل
          بصماته يُخصم الشهر كله. راجع مسودة المسير قبل صرفها.
        </span>
      </div>
    </section>

    <!-- نسخ البصمات -->
    <section class="card section">
      <h3><Fingerprint :size="18" /> نسخ البصمات بين أجهزة ZKTeco</h3>
      <label class="checkbox-label">
        <input v-model="form.syncBiometrics" type="checkbox" :disabled="!canManage" />
        الموظف يسجّل بصمته على جهاز واحد، فتصل لباقي أجهزة الشركة
      </label>
      <p class="hint">
        يحفظ السيرفر قوالب البصمات (لا صورها) مشفّرة، لموظفين مربوطين فقط، ويرسلها
        للأجهزة الأخرى. إيقافه يحذف كل القوالب من السيرفر فوراً. بصمات بين موديلات
        مختلفة قد لا تتوافق — الجهاز يرفض ما لا يقبله دون ضرر.
      </p>
    </section>

    <div v-if="canManage" class="save-bar">
      <button class="btn btn--primary" :disabled="saving || !dirty" @click="save">
        <span v-if="saving" class="spinner spinner--sm" />
        <span v-else>حفظ الإعدادات</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  AlertTriangle,
  CalendarOff,
  Fingerprint,
  PartyPopper,
  Plus,
  Trash2,
  Wallet,
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useToast } from "@/composables/useToast";
import type { AttendanceSettings, PublicHoliday } from "@/types";

const emit = defineEmits<{ saved: [] }>();

const store = useAttendanceStore();
const toast = useToast();
const access = useAccess();
const canManage = computed(() => access.can(PERMS.ATTENDANCE_SETTINGS_MANAGE));

const loading = ref(true);
const saving = ref(false);
const saved = ref<AttendanceSettings | null>(null);
const form = ref<AttendanceSettings | null>(null);

const thisYear = Number(companyToday().slice(0, 4));
const years = [thisYear - 1, thisYear, thisYear + 1];
const holidayYear = ref(thisYear);
const holidays = ref<PublicHoliday[]>([]);
const addingHoliday = ref(false);
const holidayForm = reactive({ name: "", startDate: "", endDate: "" });

const dirty = computed(
  () => JSON.stringify(form.value) !== JSON.stringify(saved.value),
);

const loadHolidays = async () => {
  try {
    holidays.value = await store.fetchHolidays(holidayYear.value);
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
};

const save = async () => {
  if (!form.value || !saved.value) return;
  if (form.value.weeklyOffDays.length === 7) {
    toast.error("لا بد من يوم عمل واحد على الأقل في الأسبوع");
    return;
  }
  if (
    saved.value.syncBiometrics &&
    !form.value.syncBiometrics &&
    !confirm("إيقاف النسخ يحذف كل قوالب البصمات المحفوظة على السيرفر. متابعة؟")
  ) {
    return;
  }
  saving.value = true;
  try {
    const { tenantId: _ignored, ...payload } = form.value as AttendanceSettings & {
      tenantId?: string;
    };
    const updated = await store.updateSettings(payload);
    saved.value = structuredClone(updated);
    form.value = structuredClone(updated);
    toast.success("تم حفظ إعدادات الحضور");
    emit("saved");
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    saving.value = false;
  }
};

const addHoliday = async () => {
  addingHoliday.value = true;
  try {
    await store.createHoliday({
      name: holidayForm.name.trim(),
      startDate: holidayForm.startDate,
      endDate: holidayForm.endDate || undefined,
    });
    holidayYear.value = Number(holidayForm.startDate.slice(0, 4));
    Object.assign(holidayForm, { name: "", startDate: "", endDate: "" });
    await loadHolidays();
    toast.success("تمت إضافة العطلة");
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    addingHoliday.value = false;
  }
};

const removeHoliday = async (holiday: PublicHoliday) => {
  if (!confirm(`حذف عطلة "${holiday.name}"؟`)) return;
  try {
    await store.deleteHoliday(holiday.id);
    await loadHolidays();
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
};

watch(holidayYear, loadHolidays);

onMounted(async () => {
  try {
    const settings = await store.fetchSettings();
    saved.value = structuredClone(settings);
    form.value = structuredClone(settings);
    await loadHolidays();
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.settings {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
.section {
  padding: $space-4 $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-3;

  h3 {
    @include flex(row, center, flex-start, $space-2);
    margin: 0;
    font-size: $font-size-base;
    svg {
      color: $stb-accent;
    }
  }
  &__head {
    @include flex(row, center, space-between, $space-3);
  }
}
.hint {
  margin: 0;
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.days {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}
.day {
  padding: $space-2 $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
}
.year {
  width: auto;
}
.holiday-form {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: $space-2;
  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}
.holidays {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;

  li {
    @include flex(row, center, space-between, $space-3);
    padding: $space-2 0;
    border-bottom: 1px solid $stb-border;
    font-size: $font-size-sm;
  }
  &__name {
    flex: 1;
    font-weight: 600;
  }
  &__dates {
    color: $stb-text-secondary;
  }
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-3;
  @include respond-to("sm") {
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
.info-note {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
  &--warn {
    background: rgba($stb-warning, 0.08);
    border: 1px solid rgba($stb-warning, 0.3);
    svg {
      color: $stb-warning;
    }
  }
}
.save-bar {
  @include flex(row, center, flex-end);
}
</style>
