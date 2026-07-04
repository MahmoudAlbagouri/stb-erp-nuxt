<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>تسوية مستحقات بدل الإجازة</h1>
        <p>احتساب وأرشفة مستحقات الإجازات غير المستخدمة عند إنهاء الخدمة</p>
      </div>

      <!-- ✅ أزرار التصدير والعمليات -->
      <div class="page-header__actions">
        <button
          class="btn btn--outline"
          @click="handleExport('excel')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
          <FileSpreadsheet v-else :size="18" />
          <span>Excel</span>
        </button>

        <button
          class="btn btn--outline"
          @click="handleExport('pdf')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
          <FileText v-else :size="18" />
          <span>PDF</span>
        </button>

        <button class="btn btn--primary" @click="openCalculatorModal">
          <Calculator :size="18" />
          <span>احتساب تسوية</span>
        </button>
      </div>
    </div>

    <!-- ══ Stats Cards ═════════════════════════════════════════════════════ -->
    <div class="grid-3 stats-row">
      <div class="stat-card stat-total">
        <div class="stat-card__icon">
          <Wallet :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatCurrency(totalSettled) }}</div>
          <div class="stat-card__label">إجمالي المبالغ المسوّاة</div>
        </div>
      </div>

      <div class="stat-card stat-count">
        <div class="stat-card__icon">
          <Users :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ store.settlements.length }}</div>
          <div class="stat-card__label">إجمالي التسويات المؤرشفة</div>
        </div>
      </div>

      <div class="stat-card stat-avg">
        <div class="stat-card__icon">
          <CalendarOff :size="24" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ totalUnusedDays }}</div>
          <div class="stat-card__label">إجمالي الأيام المُسوّاة</div>
        </div>
      </div>
    </div>

    <!-- ══ Loading State ════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!store.settlements.length" class="card empty-card">
      <div class="empty-state">
        <div class="empty-state__icon">
          <FileCheck :size="48" />
        </div>
        <div class="empty-state__title">لا توجد تسويات مؤرشفة</div>
        <div class="empty-state__text">
          ابدأ باحتساب مستحقات بدل الإجازة لأحد الموظفين
        </div>
        <button class="btn btn--primary mt-4" @click="openCalculatorModal">
          <Calculator :size="16" />
          احتساب تسوية جديدة
        </button>
      </div>
    </div>

    <!-- ══ Settlements Table ════════════════════════════════════════════════ -->
    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>تاريخ التسوية</th>
              <th>الأيام غير المستخدمة</th>
              <!-- <th>أجر اليوم</th> -->
              <th>إجمالي المستحق</th>
              <th>ملاحظات</th>
              <th>تاريخ الأرشفة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in store.settlements" :key="s.id">
              <td>
                <div class="employee-cell">
                  <div class="employee-avatar">
                    {{ s.employee?.fullName?.[0] ?? "—" }}
                  </div>
                  <div class="employee-info">
                    <span class="employee-name">{{
                      s.employee?.fullName ?? "—"
                    }}</span>
                    <span class="employee-meta">
                      {{
                        [s.employee?.employeeCode, s.employee?.jobTitle]
                          .filter(Boolean)
                          .join(" · ")
                      }}
                    </span>
                  </div>
                </div>
              </td>
              <td>{{ formatDate(s.settlementDate) }}</td>
              <td>
                <span class="days-badge">
                  <CalendarOff :size="13" />
                  {{ s.unusedLeaveDays }} يوم
                </span>
              </td>
              <!-- <td class="text-accent">{{ formatCurrency(s.dailyRate) }}</td> -->
              <td class="total-cell">{{ formatCurrency(s.totalAmount) }}</td>
              <td class="notes-cell">{{ s.notes || "—" }}</td>
              <td>{{ formatDate(s.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         STEP 1 — Modal: اختيار الموظف وبدء الاحتساب
    ════════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCalculatorModal"
          class="modal-overlay"
          @click.self="closeAll"
        >
          <div class="modal modal-md">
            <div class="modal__header">
              <h3>
                <Calculator :size="20" class="modal-icon" />
                احتساب مستحقات بدل الإجازة
              </h3>
              <button class="btn btn--icon btn--ghost" @click="closeAll">
                <X :size="20" />
              </button>
            </div>

            <div class="modal-form">
              <div class="form-group">
                <label>الموظف *</label>
                <select
                  v-model="selectedEmployeeId"
                  class="form-select"
                  :disabled="store.calculating"
                >
                  <option value="">اختر الموظف لاحتساب مستحقاته...</option>
                  <option
                    v-for="emp in activeEmployees"
                    :key="emp.id"
                    :value="emp.id"
                    :disabled="emp.alreadySettled"
                  >
                    {{ emp.fullName }}
                    ({{ emp.employeeCode }})
                    {{ emp.alreadySettled ? "— تسوية مسبقة" : "" }}
                  </option>
                </select>
              </div>

              <div class="info-banner">
                <Info :size="16" />
                <p>
                  يتم احتساب البدل المالي بناءً على البيانات المسجلة واللوائح
                  المعتمدة في النظام.
                </p>
              </div>
              <div class="modal__footer">
                <button class="btn btn--ghost" @click="closeAll">إلغاء</button>
                <button
                  class="btn btn--primary"
                  :disabled="!selectedEmployeeId || store.calculating"
                  @click="runCalculation"
                >
                  <span v-if="store.calculating" class="spinner spinner--sm" />
                  <span v-else>
                    <Search :size="16" />
                    احتساب المستحقات
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════════════════════════════════════════════════════════════════
         STEP 2 — Modal: عرض نتائج الحساب والتأكيد (مع دعم التسوية الجزئية)
    ════════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPreviewModal && preview"
          class="modal-overlay"
          @click.self="closeAll"
        >
          <div class="modal modal-preview">
            <div class="modal__header">
              <h3>
                <FileCheck :size="20" class="modal-icon" />
                مراجعة وتأكيد التسوية
              </h3>
              <button class="btn btn--icon btn--ghost" @click="closeAll">
                <X :size="20" />
              </button>
            </div>

            <div class="modal-form">
              <!-- بطاقة الموظف -->
              <div class="employee-preview-card">
                <div class="ep-avatar">
                  {{ selectedEmployee?.fullName?.[0] }}
                </div>
                <div class="ep-info">
                  <span class="ep-name">{{ selectedEmployee?.fullName }}</span>
                  <span class="ep-meta">
                    {{ selectedEmployee?.employeeCode }}
                    <span v-if="selectedEmployee?.jobTitle">
                      · {{ selectedEmployee.jobTitle }}
                    </span>
                  </span>
                </div>
                <div class="ep-year">
                  <CalendarDays :size="14" />
                  سنة {{ preview.year }}
                </div>
              </div>

              <!-- جدول الحساب التفصيلي -->
              <div class="calc-breakdown">
                <div class="calc-row">
                  <span class="calc-label">
                    <CalendarOff :size="15" />
                    الرصيد المتاح فعلياً
                  </span>
                  <span class="calc-value"
                    >{{ preview.availableDays.toFixed(2) }} يوم</span
                  >
                </div>
                <div class="calc-row">
                  <span class="calc-label">
                    <Banknote :size="15" />
                    أجر اليوم الواحد
                  </span>
                  <span class="calc-value text-accent">
                    {{ formatCurrency(preview.dailyRate) }}
                  </span>
                </div>

                <!-- خيار التسوية الجزئية -->
                <div class="form-group full-width mt-4">
                  <label>نوع التسوية</label>
                  <div class="radio-group">
                    <label class="radio-label">
                      <input
                        type="radio"
                        v-model="confirmForm.settlementType"
                        :value="SettlementType.FULL"
                      />
                      تسوية كاملة (نهاية خدمة)
                    </label>
                    <label class="radio-label">
                      <input
                        type="radio"
                        v-model="confirmForm.settlementType"
                        :value="SettlementType.PARTIAL"
                      />
                      تسوية جزئية (صرف جزء من الرصيد)
                    </label>
                  </div>
                </div>

                <div
                  v-if="confirmForm.settlementType === SettlementType.PARTIAL"
                  class="form-group full-width"
                >
                  <label>عدد الأيام المراد صرفها *</label>
                  <input
                    type="number"
                    v-model.number="confirmForm.daysToSettle"
                    class="form-input"
                    :max="Math.ceil(preview.availableDays)"
                    min="1"
                    placeholder="أدخل عدد الأيام"
                  />
                  <small class="text-muted"
                    >الحد الأقصى:
                    {{ Math.ceil(preview.availableDays) }} يوم</small
                  >
                </div>

                <div class="calc-row calc-row--total">
                  <span class="calc-label">
                    <Wallet :size="15" />
                    إجمالي المستحق للصرف
                  </span>
                  <span class="calc-total">{{
                    formatCurrency(calculateTotalAmount())
                  }}</span>
                </div>
              </div>

              <!-- حقول التأكيد -->
              <div class="grid-2">
                <div class="form-group">
                  <label>تاريخ التسوية *</label>
                  <input
                    v-model="confirmForm.settlementDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>ملاحظات</label>
                  <input
                    v-model="confirmForm.notes"
                    type="text"
                    class="form-input"
                    placeholder="سبب إنهاء الخدمة أو أي ملاحظة..."
                  />
                </div>
              </div>

              <!-- تحذير لا رجعة -->
              <div class="warning-banner">
                <AlertTriangle :size="16" />
                <p>
                  بعد التأكيد سيتم <strong>خصم الرصيد المحدد</strong>
                  ولا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              <div class="modal__footer">
                <button
                  class="btn btn--ghost"
                  @click="
                    showPreviewModal = false;
                    showCalculatorModal = true;
                  "
                >
                  <ChevronRight :size="16" />
                  رجوع
                </button>
                <button
                  class="btn btn--primary"
                  :disabled="!isFormValid || confirming"
                  @click="handleConfirm"
                >
                  <span v-if="confirming" class="spinner spinner--sm" />
                  <span v-else>
                    <Check :size="16" />
                    تأكيد وأرشفة التسوية
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useSettlementsStore } from "@/stores/settlements";
import { useEmployeesStore } from "@/stores/employees";
import { useToast } from "@/composables/useToast";
import { SettlementType, type SettlementPreview } from "@/types";

// ✅ استيراد الأيقونات الجديدة للتصدير
import {
  Calculator,
  Wallet,
  Users,
  CalendarOff,
  CalendarDays,
  FileCheck,
  Banknote,
  Search,
  X,
  Info,
  AlertTriangle,
  Check,
  ChevronRight,
  FileSpreadsheet, // Excel Icon
  FileText, // PDF Icon
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useSettlementsStore();
const employeesStore = useEmployeesStore();
const toast = useToast();

// ─── Export State ───────────────────────────────────────────────────────────
const exporting = ref<"excel" | "pdf" | null>(null);

const handleExport = async (type: "excel" | "pdf") => {
  exporting.value = type;
  try {
    await store.exportData(type);
    toast.success(`تم تصدير تقرير ${type === "excel" ? "Excel" : "PDF"} بنجاح`);
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  } finally {
    exporting.value = null;
  }
};

// ─── UI State ────────────────────────────────────────────────────────────────
const showCalculatorModal = ref(false);
const showPreviewModal = ref(false);
const selectedEmployeeId = ref("");
const preview = ref<SettlementPreview | null>(null);
const confirming = ref(false);

const confirmForm = reactive({
  settlementDate: new Date().toISOString().split("T")[0],
  notes: "",
  settlementType: SettlementType.FULL,
  daysToSettle: undefined as number | undefined,
});

// ─── Computed ───────────────────────────────────────────────────────────────
const totalSettled = computed(() =>
  store.settlements.reduce((sum, s) => sum + Number(s.totalAmount), 0),
);

const totalUnusedDays = computed(() =>
  store.settlements.reduce((sum, s) => sum + s.unusedLeaveDays, 0),
);

const activeEmployees = computed(() => {
  // تجميع إجمالي الأيام التي تم تسويتها لكل موظف
  const settledDaysMap = new Map<string, number>();
  store.settlements.forEach((s) => {
    const current = settledDaysMap.get(s.employeeId) || 0;
    settledDaysMap.set(s.employeeId, current + s.unusedLeaveDays);
  });

  return employeesStore.employees
    .filter((e) => e.status === "active" || e.status === "terminated")
    .map((e) => {
      // هنا نفترض أن الـ Backend يرسل الرصيد الحالي في كائن الموظف
      // أو يمكنك حسابها بناءً على العقود والإجازات إذا لم تكن متوفرة
      // للتبسيط الآن، سنسمح للجميع بالظهور وسيعتمد التحقق على الرصيد الفعلي عند الاحتساب
      const totalSettledForEmp = settledDaysMap.get(e.id) || 0;

      // ملاحظة: لتحديد "alreadySettled" بدقة، يفضل الاعتماد على الرصيد المتاح
      // لكن بما أننا لا نجلب الرصيد هنا، سنعتمد على منطق بسيط:
      // إذا كان الموظف "terminated" ولديه تسويات، نفترض أنه انتهى إلا إذا كان الرصيد > 0
      // الأفضل هو إزالة خاصية alreadySettled من الـ select والاعتماد على رسالة خطأ عند الاحتساب
      // أو جلب الرصيد ديناميكياً.

      // الحل العملي للفرونت إند حالياً: السماح بالاختيار والتحقق عند الضغط على "احتساب"
      return {
        ...e,
        alreadySettled: false, // ✅ تم إلغاء المنع المطلق
      };
    });
});
const selectedEmployee = computed(() =>
  employeesStore.employees.find((e) => e.id === selectedEmployeeId.value),
);

const isFormValid = computed(() => {
  if (!confirmForm.settlementDate) return false;
  if (confirmForm.settlementType === SettlementType.PARTIAL) {
    return !!confirmForm.daysToSettle && confirmForm.daysToSettle > 0;
  }
  return true;
});

// ─── Actions ─────────────────────────────────────────────────────────────────
const openCalculatorModal = () => {
  selectedEmployeeId.value = "";
  preview.value = null;
  showCalculatorModal.value = true;
};

const closeAll = () => {
  showCalculatorModal.value = false;
  showPreviewModal.value = false;
  preview.value = null;
  selectedEmployeeId.value = "";
  confirmForm.settlementType = SettlementType.FULL;
  confirmForm.daysToSettle = undefined;
};

const runCalculation = async () => {
  if (!selectedEmployeeId.value) return;
  try {
    preview.value = await store.calculate(selectedEmployeeId.value);
    // Reset form
    confirmForm.settlementDate = new Date().toISOString().split("T")[0];
    confirmForm.notes = "";
    confirmForm.settlementType = SettlementType.FULL;
    confirmForm.daysToSettle = undefined;

    showCalculatorModal.value = false;
    showPreviewModal.value = true;
  } catch (e: any) {
    toast.error(e.message || "فشل في احتساب المستحقات");
  }
};

const calculateTotalAmount = () => {
  if (!preview.value) return 0;

  let days = 0;
  if (confirmForm.settlementType === SettlementType.FULL) {
    days = Math.ceil(preview.value.availableDays);
  } else {
    days = confirmForm.daysToSettle || 0;
  }

  return days * preview.value.dailyRate;
};

const handleConfirm = async () => {
  if (!preview.value || !confirmForm.settlementDate) return;

  // Validation for partial
  if (confirmForm.settlementType === SettlementType.PARTIAL) {
    if (!confirmForm.daysToSettle || confirmForm.daysToSettle <= 0) {
      toast.error("يرجى إدخال عدد أيام صحيح للتسوية الجزئية");
      return;
    }
    if (confirmForm.daysToSettle > Math.ceil(preview.value.availableDays)) {
      toast.error("عدد الأيام يتجاوز الرصيد المتاح");
      return;
    }
  }

  confirming.value = true;
  try {
    await store.confirm({
      employeeId: preview.value.employeeId,
      settlementDate: confirmForm.settlementDate,
      settlementType: confirmForm.settlementType,
      daysToSettle:
        confirmForm.settlementType === SettlementType.PARTIAL
          ? confirmForm.daysToSettle
          : undefined,
      notes: confirmForm.notes || undefined,
    });
    toast.success(
      `✅ تمت أرشفة تسوية "${selectedEmployee.value?.fullName}" بنجاح`,
    );
    closeAll();
  } catch (e: any) {
    toast.error(e.message || "فشل في تأكيد التسوية");
  } finally {
    confirming.value = false;
  }
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (val: number | string | null | undefined) => {
  const n = Number(val) || 0;
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(n);
};

const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("ar-SA") : "—";

// ─── Init ────────────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchAll();
  if (!employeesStore.employees.length) employeesStore.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

// ✅ تنسيق أزرار الهيدر مثل صفحة الموظفين
.page-header__actions {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
  @include respond-to("md") {
    width: 100%;
    justify-content: space-between;
  }
}

.stats-row {
  margin-bottom: $space-6;
}
.stat-card {
  &.stat-total .stat-card__icon {
    background: rgba($stb-success, 0.12);
    color: $stb-success;
  }
  &.stat-count .stat-card__icon {
    background: rgba($stb-info, 0.12);
    color: $stb-info;
  }
  &.stat-avg .stat-card__icon {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
  }
}
.empty-card .empty-state {
  padding: $space-16 $space-8;
}
.mt-4 {
  margin-top: $space-4 !important;
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
  @include flex(row, center, flex-start, $space-3);
}
.employee-avatar {
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  background: $gradient-primary;
  @include flex(row, center, center);
  font-weight: 700;
  font-size: $font-size-sm;
  color: #fff;
  flex-shrink: 0;
  box-shadow: $shadow-glow;
}
.employee-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.employee-name {
  font-weight: 600;
  color: $stb-text-primary;
  font-size: $font-size-sm;
  @include truncate;
}
.employee-meta {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.days-badge {
  @include flex(row, center, flex-start, $space-1);
  display: inline-flex;
  padding: $space-1 $space-3;
  border-radius: $radius-full;
  background: rgba($stb-warning, 0.1);
  color: $stb-warning;
  font-size: $font-size-xs;
  font-weight: 700;
  border: 1px solid rgba($stb-warning, 0.25);
}
.total-cell {
  font-weight: 800;
  color: $stb-success;
  font-size: $font-size-base;
}
.notes-cell {
  max-width: 180px;
  @include truncate;
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.modal-md {
  max-width: 520px;
}
.modal-preview {
  max-width: 600px;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-5;
  padding: $space-5;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $stb-text-secondary;
  }
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}
.full-width {
  grid-column: span 2;
  @include respond-to("md") {
    grid-column: span 1;
  }
}

.info-banner {
  @include flex(row, flex-start, flex-start, $space-3);
  padding: $space-3 $space-4;
  background: rgba($stb-info, 0.07);
  border: 1px solid rgba($stb-info, 0.2);
  border-radius: $radius-md;
  color: $stb-info;
  font-size: $font-size-xs;
  line-height: 1.7;
  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
  p {
    color: $stb-text-secondary;
  }
  strong {
    color: $stb-text-primary;
  }
  .formula {
    display: inline-block;
    margin-top: $space-1;
    padding: 1px $space-2;
    background: rgba($stb-accent, 0.1);
    border-radius: $radius-sm;
    color: $stb-accent;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.03em;
  }
}

.warning-banner {
  @include flex(row, flex-start, flex-start, $space-3);
  padding: $space-3 $space-4;
  background: rgba($stb-danger, 0.07);
  border: 1px solid rgba($stb-danger, 0.25);
  border-radius: $radius-md;
  color: $stb-danger;
  font-size: $font-size-xs;
  line-height: 1.7;
  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
  p {
    color: $stb-text-secondary;
  }
  strong {
    color: $stb-danger;
  }
}

.employee-preview-card {
  @include flex(row, center, flex-start, $space-4);
  padding: $space-4;
  background: rgba($stb-primary, 0.08);
  border: 1px solid rgba($stb-primary-light, 0.2);
  border-radius: $radius-lg;
}
.ep-avatar {
  width: 48px;
  height: 48px;
  border-radius: $radius-lg;
  background: $gradient-primary;
  @include flex(row, center, center);
  font-size: $font-size-xl;
  font-weight: 900;
  color: #fff;
  flex-shrink: 0;
  box-shadow: $shadow-glow;
}
.ep-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ep-name {
  font-size: $font-size-base;
  font-weight: 700;
  color: $stb-text-primary;
}
.ep-meta {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.ep-year {
  @include flex(row, center, center, $space-1);
  padding: $space-1 $space-3;
  background: rgba($stb-accent, 0.1);
  border: 1px solid rgba($stb-accent, 0.2);
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 700;
  color: $stb-accent;
  flex-shrink: 0;
}

.calc-breakdown {
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-lg;
  overflow: hidden;
}
.calc-row {
  @include flex(row, center, space-between, $space-3);
  padding: $space-3 $space-5;
  border-bottom: 1px solid rgba($stb-border, 0.6);
  &:last-child {
    border-bottom: none;
  }
  &--total {
    background: rgba($stb-success, 0.05);
    border-top: 1px solid rgba($stb-success, 0.2) !important;
    padding: $space-4 $space-5;
  }
}
.calc-label {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  font-weight: 500;
}
.calc-value {
  font-size: $font-size-sm;
  font-weight: 700;
  color: $stb-text-primary;
}
.calc-total {
  font-size: $font-size-xl;
  font-weight: 800;
  color: $stb-success;
  text-shadow: 0 0 20px rgba($stb-success, 0.3);
}
.text-accent {
  color: $stb-accent !important;
}

.radio-group {
  display: flex;
  gap: $space-4;
  margin-top: $space-2;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: $space-2;
  cursor: pointer;
  font-size: $font-size-sm;
  color: $stb-text-primary;
}
.text-muted {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  margin-top: $space-1;
  display: block;
}
</style>
