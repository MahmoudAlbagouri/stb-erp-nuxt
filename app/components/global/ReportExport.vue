<!-- زرا تصدير تقرير (Excel / PDF) من مسار تصدير في الباك إند (يظهران لباقة فيها تصدير التقارير) -->
<template>
  <button
    v-feature="'reports_export'"
    type="button"
    class="btn btn--outline"
    :disabled="!!exporting || disabled"
    @click="run('excel')"
  >
    <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
    <FileSpreadsheet v-else :size="16" /><span>Excel</span>
  </button>
  <button
    v-feature="'reports_export'"
    type="button"
    class="btn btn--outline"
    :disabled="!!exporting || disabled"
    @click="run('pdf')"
  >
    <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
    <FileText v-else :size="16" /><span>PDF</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { FileSpreadsheet, FileText } from "lucide-vue-next";
import { useApi } from "@/composables/useApi";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  /** مسار التصدير بلا الصيغة: /accounting/reports/trial-balance/export */
  path: string;
  /** فلاتر التقرير المعروض (تُرسل كما هي) */
  query?: object;
  /** اسم الملف بلا امتداد */
  filename: string;
  disabled?: boolean;
}>();

const api = useApi();
const toast = useToast();
const exporting = ref<ReportFormat | null>(null);

const run = async (type: ReportFormat) => {
  exporting.value = type;
  try {
    await api.download(
      `${props.path}/${type}${toQueryString(props.query)}`,
      `${props.filename}.${reportExtension(type)}`,
    );
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تصدير التقرير"));
  } finally {
    exporting.value = null;
  }
};
</script>
