<!-- components/attendance/ImportPunchesModal.vue -->
<!-- استيراد بصمات من ملف Excel/CSV صدّره برنامج أي جهاز بصمة: يُرفع الملف
     للمعاينة فيُخمَّن معنى أعمدته، ثم يؤكدها المستخدم ويستورد. إعادة استيراد
     نفس الملف لا تكرر بصماته. -->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal modal-lg">
          <div class="modal__header">
            <h3>
              <FileUp :size="20" class="modal-icon" />
              استيراد بصمات من ملف
            </h3>
            <button
              class="btn btn--icon btn--ghost"
              aria-label="إغلاق"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <div class="import-body">
            <!-- النتيجة -->
            <template v-if="result">
              <div class="result-grid">
                <div class="result-tile">
                  <span>{{ result.imported }}</span>بصمة جديدة
                </div>
                <div class="result-tile">
                  <span>{{ result.duplicates }}</span>موجودة من قبل
                </div>
                <div class="result-tile result-tile--warn">
                  <span>{{ result.unlinked }}</span>لأرقام غير مربوطة
                </div>
                <div class="result-tile result-tile--danger">
                  <span>{{ result.skipped }}</span>صف لم يُقرأ
                </div>
              </div>
              <p v-if="result.unlinked" class="hint">
                البصمات لأرقام غير مربوطة حُفظت، وتظهر في "بصمات لأرقام غير
                مربوطة" أعلى السجل لتربطها بموظفيها.
              </p>
              <ul v-if="result.errors.length" class="errors">
                <li v-for="err in result.errors" :key="err.row">
                  صف {{ err.row }}: {{ err.reason }}
                </li>
              </ul>
            </template>

            <template v-else>
              <div class="grid-2">
                <div class="form-group">
                  <label>الملف (xlsx أو csv) *</label>
                  <input
                    type="file"
                    accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    class="form-input"
                    @change="onFile"
                  />
                </div>
                <div class="form-group">
                  <label>الجهاز الذي صدرت منه</label>
                  <select v-model="mapping.deviceId" class="form-select">
                    <option value="">بدون جهاز (بتوقيت الشركة)</option>
                    <option v-for="d in devices" :key="d.id" :value="d.id">
                      {{ d.alias || d.serialNumber }}
                    </option>
                  </select>
                  <small class="hint">
                    اختياره يمنع تكرار بصمات أرسلها الجهاز نفسه من قبل.
                  </small>
                </div>
              </div>

              <div v-if="previewing" class="empty-state">
                <div class="spinner spinner--lg" />
              </div>

              <template v-else-if="preview">
                <div class="table-responsive preview">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th v-for="(h, i) in preview.headers" :key="i">{{ h }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, r) in preview.rows" :key="r">
                        <td v-for="(_, i) in preview.headers" :key="i" dir="auto">
                          {{ row[i] }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="hint">
                  {{ preview.totalRows }} صف. حدد معنى الأعمدة (خمّنها النظام):
                </p>

                <div class="grid-2">
                  <div class="form-group">
                    <label>رقم الموظف على الجهاز *</label>
                    <select v-model.number="mapping.pinColumn" class="form-select">
                      <option :value="-1" disabled>اختر العمود…</option>
                      <option v-for="o in columnOptions" :key="o.value" :value="o.value">
                        {{ o.label }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>الوقت في الملف</label>
                    <select v-model="timeMode" class="form-select">
                      <option value="single">عمود واحد للتاريخ والوقت</option>
                      <option value="split">عمود للتاريخ وآخر للوقت</option>
                    </select>
                  </div>
                  <div v-if="timeMode === 'single'" class="form-group">
                    <label>التاريخ والوقت *</label>
                    <select v-model.number="mapping.dateTimeColumn" class="form-select">
                      <option :value="-1" disabled>اختر العمود…</option>
                      <option v-for="o in columnOptions" :key="o.value" :value="o.value">
                        {{ o.label }}
                      </option>
                    </select>
                  </div>
                  <template v-else>
                    <div class="form-group">
                      <label>التاريخ *</label>
                      <select v-model.number="mapping.dateColumn" class="form-select">
                        <option :value="-1" disabled>اختر العمود…</option>
                        <option v-for="o in columnOptions" :key="o.value" :value="o.value">
                          {{ o.label }}
                        </option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>الوقت *</label>
                      <select v-model.number="mapping.timeColumn" class="form-select">
                        <option :value="-1" disabled>اختر العمود…</option>
                        <option v-for="o in columnOptions" :key="o.value" :value="o.value">
                          {{ o.label }}
                        </option>
                      </select>
                    </div>
                  </template>
                  <div class="form-group">
                    <label>نوع البصمة (اختياري)</label>
                    <select v-model.number="mapping.typeColumn" class="form-select">
                      <option :value="-1">لا يوجد</option>
                      <option v-for="o in columnOptions" :key="o.value" :value="o.value">
                        {{ o.label }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>ترتيب التاريخ في الملف</label>
                    <select v-model="mapping.dateOrder" class="form-select">
                      <option value="DMY">يوم/شهر/سنة (31/12/2026)</option>
                      <option value="MDY">شهر/يوم/سنة (12/31/2026)</option>
                      <option value="YMD">سنة-شهر-يوم (2026-12-31)</option>
                    </select>
                  </div>
                </div>
              </template>

              <p class="hint">
                صدّر البصمات من برنامج الجهاز (ZKTime، iVMS-4200، BioStar…) بصيغة
                Excel أو CSV. ملفات .xls القديمة: افتحها واحفظها xlsx.
              </p>
            </template>
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" @click="close">
              {{ result ? "إغلاق" : "إلغاء" }}
            </button>
            <button
              v-if="!result"
              v-can="'import_attendance_logs'"
              class="btn btn--primary"
              :disabled="!canImport || importing"
              @click="runImport"
            >
              <span v-if="importing" class="spinner spinner--sm" />
              <span v-else>استيراد</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { FileUp, X } from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useToast } from "@/composables/useToast";
import type {
  BiometricDevice,
  ImportDateOrder,
  ImportPreview,
  ImportResult,
} from "@/types";

const props = defineProps<{ modelValue: boolean; devices: BiometricDevice[] }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  imported: [];
}>();

const store = useAttendanceStore();
const toast = useToast();

const file = ref<File | null>(null);
const preview = ref<ImportPreview | null>(null);
const result = ref<ImportResult | null>(null);
const previewing = ref(false);
const importing = ref(false);
const timeMode = ref<"single" | "split">("single");

/** ‎-1 = لم يُختر */
const mapping = reactive({
  deviceId: "",
  pinColumn: -1,
  dateTimeColumn: -1,
  dateColumn: -1,
  timeColumn: -1,
  typeColumn: -1,
  dateOrder: "DMY" as ImportDateOrder,
});

const columnOptions = computed(() =>
  (preview.value?.headers ?? []).map((label, value) => ({
    value,
    label: label || `عمود ${value + 1}`,
  })),
);

const canImport = computed(
  () =>
    !!file.value &&
    !!preview.value &&
    mapping.pinColumn >= 0 &&
    (timeMode.value === "single"
      ? mapping.dateTimeColumn >= 0
      : mapping.dateColumn >= 0 && mapping.timeColumn >= 0),
);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    file.value = null;
    preview.value = null;
    result.value = null;
    Object.assign(mapping, {
      deviceId: "",
      pinColumn: -1,
      dateTimeColumn: -1,
      dateColumn: -1,
      timeColumn: -1,
      typeColumn: -1,
      dateOrder: "DMY",
    });
  },
);

const onFile = async (event: Event) => {
  const picked = (event.target as HTMLInputElement).files?.[0];
  if (!picked) return;
  file.value = picked;
  previewing.value = true;
  preview.value = null;
  try {
    const data = await store.previewImport(picked);
    preview.value = data;
    const g = data.guess;
    timeMode.value = g.dateTimeColumn === null && g.dateColumn !== null ? "split" : "single";
    Object.assign(mapping, {
      pinColumn: g.pinColumn ?? -1,
      dateTimeColumn: g.dateTimeColumn ?? -1,
      dateColumn: g.dateColumn ?? -1,
      timeColumn: g.timeColumn ?? -1,
      typeColumn: g.typeColumn ?? -1,
      dateOrder: g.dateOrder,
    });
  } catch (e) {
    file.value = null;
    toast.error(getErrorMessage(e, "تعذّرت قراءة الملف"));
  } finally {
    previewing.value = false;
  }
};

const runImport = async () => {
  if (!file.value || !preview.value) return;
  const column = (value: number) => (value >= 0 ? value : undefined);
  importing.value = true;
  try {
    result.value = await store.importPunches(file.value, {
      pinColumn: mapping.pinColumn,
      ...(timeMode.value === "single"
        ? { dateTimeColumn: column(mapping.dateTimeColumn) }
        : {
            dateColumn: column(mapping.dateColumn),
            timeColumn: column(mapping.timeColumn),
          }),
      typeColumn: column(mapping.typeColumn),
      headerRow: preview.value.headerRow,
      dateOrder: mapping.dateOrder,
      deviceId: mapping.deviceId || undefined,
    });
    if (result.value.imported > 0) emit("imported");
  } catch (e) {
    toast.error(getErrorMessage(e, "فشل الاستيراد"));
  } finally {
    importing.value = false;
  }
};

const close = () => emit("update:modelValue", false);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.modal-lg {
  max-width: 760px;
  padding: $space-5;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
.import-body {
  display: flex;
  flex-direction: column;
  gap: $space-4;
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
.hint {
  margin: 0;
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.preview {
  max-height: 240px;
  overflow: auto;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  @include scrollbar;
  td,
  th {
    white-space: nowrap;
    font-size: $font-size-xs;
  }
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-3;
  @include respond-to("sm") {
    grid-template-columns: 1fr 1fr;
  }
}
.result-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-1;
  padding: $space-3;
  border-radius: $radius-md;
  background: rgba($stb-success, 0.08);
  font-size: $font-size-xs;
  color: $stb-text-secondary;
  span {
    font-size: $font-size-xl;
    font-weight: 800;
    color: $stb-text-primary;
  }
  &--warn {
    background: rgba($stb-warning, 0.08);
  }
  &--danger {
    background: rgba($stb-danger, 0.08);
  }
}
.errors {
  margin: 0;
  padding-inline-start: $space-5;
  font-size: $font-size-xs;
  color: $stb-danger;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
