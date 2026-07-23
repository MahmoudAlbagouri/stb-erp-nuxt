<!-- pages/employees/[id]/index.vue -->
<template>
  <div class="page-container" v-if="employee">
    <!-- ══ Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <button
          class="btn btn--ghost btn--sm back-btn"
          @click="navigateTo('/dashboard/employees')"
        >
          <ChevronRight :size="16" /> رجوع للقائمة
        </button>
        <h1>{{ employee.fullName }}</h1>
        <p class="emp-code">
          {{ employee.employeeCode }} •
          {{ getNationalityLabel(employee.nationalityType) }}
        </p>
      </div>
      <div class="page-header__actions">
        <span :class="`badge badge--lg badge--${employee.status}`">{{
          empStatusLabel(employee.status)
        }}</span>

        <!-- ✅ زر التصدير في صفحة التفاصيل -->
        <div class="export-dropdown" ref="exportDropdownRef">
          <button class="btn btn--outline" @click="toggleExportMenu">
            <Download :size="16" /> تصدير الملف
          </button>
          <Transition name="fade">
            <div v-if="showExportMenu" class="dropdown-menu">
              <button @click="downloadProfile('pdf')">
                <FileText :size="14" /> ملف PDF
              </button>
              <button @click="downloadProfile('excel')">
                <FileSpreadsheet :size="14" /> ملف Excel
              </button>
            </div>
          </Transition>
        </div>

        <!-- <button class="btn btn--outline" @click="openEditModal">
          <Pencil :size="16" /> تعديل البيانات
        </button> -->
      </div>
    </div>

    <div class="details-grid">
      <!-- ═ 1. المعلومات الشخصية ══════════════════════════════════════ -->
      <div class="card detail-card">
        <div class="card-header">
          <User :size="18" /> <span>البيانات الأساسية</span>
        </div>
        <div class="card-body grid-2">
          <div class="info-item">
            <label>رقم الهوية / الإقامة</label
            ><span dir="ltr">{{ employee.nationalId || "—" }}</span>
          </div>
          <div class="info-item">
            <label>رقم الهاتف</label
            ><span dir="ltr">{{ employee.phone || "—" }}</span>
          </div>
          <div class="info-item full-width">
            <label>تاريخ انتهاء الإقامة</label>
            <span :class="{ 'text-danger': isExpiringSoon }">
              {{ formatDate(employee.iqamaExpiryDate) }}
              <span v-if="isExpiringSoon" class="warning-icon"
                >⚠️ قريب الانتهاء</span
              >
            </span>
          </div>
          <div class="info-item full-width" v-if="employee.nationalIdCardPath">
            <label>صورة الهوية</label>
            <a
              :href="employee.nationalIdCardPath"
              target="_blank"
              class="file-link"
              ><Eye :size="14" /> عرض صورة الهوية</a
            >
          </div>
        </div>
      </div>

      <!-- ══ 2. الوظيفة والمناوبة ═══════════════════════════════════════ -->
      <div class="card detail-card">
        <div class="card-header">
          <Briefcase :size="18" /> <span>البيانات الوظيفية</span>
        </div>
        <div class="card-body grid-2">
          <div class="info-item">
            <label>المسمى الوظيفي</label
            ><span>{{ employee.jobTitle || "—" }}</span>
          </div>
          <div class="info-item">
            <label>القسم</label><span>{{ employee.department || "—" }}</span>
          </div>
          <div class="info-item full-width">
            <label>المناوبة</label
            ><span>{{ employee.shift?.alias || "غير محدد" }}</span>
          </div>
        </div>
      </div>

      <!-- ══ 3. حساب النظام ════════════════════════════════════════════ -->
      <div class="card detail-card" v-if="employee.user">
        <div class="card-header">
          <ShieldCheck :size="18" /> <span>حساب المستخدم</span>
        </div>
        <div class="card-body grid-2">
          <div class="info-item">
            <label>اسم المستخدم</label><span>{{ employee.user.username }}</span>
          </div>
          <div class="info-item">
            <label>البريد الإلكتروني</label
            ><span dir="ltr">{{ employee.user.email }}</span>
          </div>
          <div class="info-item full-width">
            <label>الدور والصلاحيات</label
            ><span class="role-badge">{{
              employee.user.role?.name || "بدون دور"
            }}</span>
          </div>
        </div>
      </div>

      <!-- ══ 4. الراتب الحالي ══════════════════════════════════════════ -->
      <div class="card detail-card highlight-card" v-if="currentSalary">
        <div class="card-header">
          <Banknote :size="18" /> <span>الراتب الحالي</span>
        </div>
        <div class="salary-breakdown">
          <div class="salary-row">
            <span>الأساسي</span
            ><strong>{{ formatCurrency(currentSalary.basicSalary) }}</strong>
          </div>
          <div class="salary-row">
            <span>السكن</span
            ><strong>{{
              formatCurrency(currentSalary.housingAllowance)
            }}</strong>
          </div>
          <div class="salary-row">
            <span>النقل</span
            ><strong>{{
              formatCurrency(currentSalary.transportAllowance)
            }}</strong>
          </div>
          <div class="salary-row">
            <span>أخرى</span
            ><strong>{{
              formatCurrency(currentSalary.otherAllowances)
            }}</strong>
          </div>
          <div class="salary-total">
            <span>الإجمالي الشهري</span
            ><strong>{{ formatCurrency(currentSalary.totalSalary) }}</strong>
          </div>
        </div>
      </div>

      <!-- ══ 5. العقد ══════════════════════════════════════════════════ -->
      <div class="card detail-card full-width-card" v-if="employee.contract">
        <div class="card-header">
          <FileText :size="18" /> <span>تفاصيل العقد</span
          ><span class="contract-type-badge">{{
            employee.contract.contractType
          }}</span>
        </div>
        <div class="card-body grid-3">
          <div class="info-item">
            <label>تاريخ البداية</label
            ><span>{{ formatDate(employee.contract.startDate) }}</span>
          </div>
          <div class="info-item">
            <label>مدة العقد</label
            ><span>{{ employee.contract.contractDurationYears }} سنوات</span>
          </div>
          <div class="info-item">
            <label>الإجازة السنوية</label
            ><span>{{ employee.contract.annualLeaveDays }} يوم</span>
          </div>
          <div class="info-item">
            <label>التأمين الطبي</label
            ><span>{{ employee.contract.medicalInsurance }}</span>
          </div>
          <div class="info-item">
            <label>التذكرة</label
            ><span>{{ employee.contract.ticketType }}</span>
          </div>
          <div class="info-item">
            <label>فترة التجربة</label
            ><span>{{ employee.contract.probationPeriod }}</span>
          </div>
          <div
            class="info-item full-width"
            v-if="employee.contract.attachmentPaths?.length"
          >
            <label>مرفقات العقد</label>
            <div class="attachments-list">
              <a
                v-for="(path, i) in employee.contract.attachmentPaths"
                :key="i"
                :href="path"
                target="_blank"
                class="file-link"
                ><Paperclip :size="14" /> مرفق {{ Number(i) + 1 }}</a
              >
            </div>
          </div>
        </div>
      </div>

      <!--  6. المؤهلات العلمية ═══════════════════════════════════════ -->
      <div
        class="card detail-card full-width-card"
        v-if="employee.educations?.length"
      >
        <div class="card-header">
          <GraduationCap :size="18" /> <span>المؤهلات العلمية</span>
        </div>
        <div class="table-responsive">
          <table class="simple-table">
            <thead>
              <tr>
                <th>الدرجة العلمية</th>
                <th>جهة الإصدار</th>
                <th>رقم الشهادة</th>
                <th>تاريخ الانتهاء</th>
                <th>المرفق</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="edu in employee.educations" :key="edu.id">
                <td>
                  <strong>{{ edu.degree }}</strong>
                </td>
                <td>{{ edu.issuingAuthority || "—" }}</td>
                <td dir="ltr">{{ edu.certificateNumber || "—" }}</td>
                <td>{{ formatDate(edu.expiryDate) }}</td>
                <td>
                  <a
                    v-if="edu.attachmentPath"
                    :href="edu.attachmentPath"
                    target="_blank"
                    class="icon-link"
                    ><Download :size="16"
                  /></a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ 7. السلف المالية ═════════════════════════════════════════ -->
      <div
        class="card detail-card full-width-card"
        v-if="employee.advances?.length"
      >
        <div class="card-header">
          <WalletCards :size="18" /> <span>السلف المالية</span>
        </div>
        <div class="table-responsive">
          <table class="simple-table">
            <thead>
              <tr>
                <th>المبلغ</th>
                <th>السبب</th>
                <th>الحالة</th>
                <th>تاريخ السداد</th>
                <th>تاريخ الطلب</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="adv in employee.advances" :key="adv.id">
                <td>
                  <strong class="text-primary">{{
                    formatCurrency(adv.amount)
                  }}</strong>
                </td>
                <td>{{ adv.reason || "—" }}</td>
                <td>
                  <span :class="`status-dot status-${adv.status}`">{{
                    advanceStatusMap[adv.status]
                  }}</span>
                </td>
                <td>{{ formatDate(adv.repaymentDate) }}</td>
                <td>{{ formatDate(adv.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ 8. القروض ═════════════════════════════════════════════════ -->
      <div
        class="card detail-card full-width-card"
        v-if="employee.loans?.length"
      >
        <div class="card-header">
          <Landmark :size="18" /> <span>القروض البنكية</span>
        </div>
        <div class="table-responsive">
          <table class="simple-table">
            <thead>
              <tr>
                <th>إجمالي القرض</th>
                <th>عدد الأقساط</th>
                <th>القسط الشهري</th>
                <th>الحالة</th>
                <th>بداية السداد</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="loan in employee.loans" :key="loan.id">
                <td>
                  <strong class="text-primary">{{
                    formatCurrency(loan.totalAmount)
                  }}</strong>
                </td>
                <td>{{ loan.installmentsCount }} قسط</td>
                <td>{{ formatCurrency(loan.monthlyInstallment) }}</td>
                <td>
                  <span :class="`status-dot status-${loan.status}`">{{
                    loanStatusMap[loan.status]
                  }}</span>
                </td>
                <td>{{ formatDate(loan.startDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═ 9. المكافآت ══════════════════════════════════════════════ -->
      <div
        class="card detail-card full-width-card"
        v-if="employee.bonuses?.length"
      >
        <div class="card-header">
          <Gift :size="18" /> <span>سجل المكافآت</span>
        </div>
        <div class="table-responsive">
          <table class="simple-table">
            <thead>
              <tr>
                <th>قيمة المكافأة</th>
                <th>تاريخ الصرف</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bonus in employee.bonuses" :key="bonus.id">
                <td>
                  <strong class="text-success">{{
                    formatCurrency(bonus.amount)
                  }}</strong>
                </td>
                <td>{{ formatDate(bonus.payoutDate) }}</td>
                <td>{{ bonus.notes || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ 10. الخصومات ══════════════════════════════════════════════ -->
      <div
        class="card detail-card full-width-card"
        v-if="employee.deductions?.length"
      >
        <div class="card-header">
          <MinusCircle :size="18" /> <span>الخصومات والاستقطاعات</span>
        </div>
        <div class="table-responsive">
          <table class="simple-table">
            <thead>
              <tr>
                <th>نوع الخصم</th>
                <th>إجمالي المبلغ</th>
                <th>القسط الشهري</th>
                <th>المدفوع / المتبقي</th>
                <th>بداية الخصم</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ded in employee.deductions" :key="ded.id">
                <td>
                  <strong>{{ ded.name }}</strong>
                </td>
                <td>{{ formatCurrency(ded.totalAmount) }}</td>
                <td>{{ formatCurrency(ded.monthlyAmount) }}</td>
                <td dir="ltr">
                  {{ ded.paidInstallments }} / {{ ded.installmentsCount }}
                </td>
                <td>{{ formatDate(ded.startDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ 11. طلبات الإجازة ═════════════════════════════════════════ -->
      <div
        class="card detail-card full-width-card"
        v-if="employee.leaveRequests?.length"
      >
        <div class="card-header">
          <CalendarDays :size="18" /> <span>سجل الإجازات</span>
        </div>
        <div class="table-responsive">
          <table class="simple-table">
            <thead>
              <tr>
                <th>النوع</th>
                <th>من تاريخ</th>
                <th>إلى تاريخ</th>
                <th>الحالة</th>
                <th>السبب</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="leave in employee.leaveRequests" :key="leave.id">
                <td>{{ leaveTypeMap[leave.type] }}</td>
                <td>{{ formatDate(leave.startDate) }}</td>
                <td>{{ formatDate(leave.endDate) }}</td>
                <td>
                  <span :class="`status-dot status-${leave.status}`">{{
                    leaveStatusMap[leave.status]
                  }}</span>
                </td>
                <td>{{ leave.reason || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- حالة التحميل -->
  <div v-else-if="loading" class="loading-state">
    <div class="spinner spinner--lg"></div>
    <p>جاري جلب بيانات الموظف الشاملة...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, navigateTo } from "#app";
import { useEmployeesStore } from "@/stores/employees";
import { useToast } from "@/composables/useToast";
import type { Employee } from "@/types";
import {
  User,
  Briefcase,
  ShieldCheck,
  Banknote,
  FileText,
  GraduationCap,
  WalletCards,
  ChevronRight,
  Pencil,
  Eye,
  Paperclip,
  Download,
  Landmark,
  Gift,
  MinusCircle,
  CalendarDays,
  FileSpreadsheet,
} from "lucide-vue-next";

const route = useRoute();
const store = useEmployeesStore();
const toast = useToast();
const employee = ref<Employee | null>(null);
const loading = ref(true);

// ✅ منطق التصدير في صفحة التفاصيل
const showExportMenu = ref(false);
const toggleExportMenu = () => {
  showExportMenu.value = !showExportMenu.value;
};

const downloadProfile = async (type: "excel" | "pdf") => {
  try {
    await store.exportSingle(employee.value!.id, type);
    toast.success(`تم تصدير ملف الموظف بصيغة ${type.toUpperCase()} بنجاح`);
    showExportMenu.value = false;
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  }
};

// إغلاق القائمة عند النقر خارجها
onMounted(() => {
  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest(".export-dropdown")) {
      showExportMenu.value = false;
    }
  });
});

const advanceStatusMap: Record<string, string> = {
  pending: "معلق",
  approved: "معتمد",
  rejected: "مرفوض",
  paid: "مسدد",
};
const loanStatusMap: Record<string, string> = {
  pending: "معلق",
  approved: "معتمد",
  rejected: "مرفوض",
  completed: "مكتمل",
};
const leaveTypeMap: Record<string, string> = {
  annual: "سنوية",
  unpaid: "بدون راتب",
  other: "أخرى",
};
const leaveStatusMap: Record<string, string> = {
  pending: "معلقة",
  approved: "معتمدة",
  rejected: "مرفوضة",
};

onMounted(async () => {
  try {
    const id = route.params.id as string;
    employee.value = await store.getById(id);
  } catch (error) {
    console.error("Failed to fetch employee:", error);
  } finally {
    loading.value = false;
  }
});

const currentSalary = computed(() => employee.value?.salaries?.[0] || null);
const isExpiringSoon = computed(() => {
  if (!employee.value?.iqamaExpiryDate) return false;
  const diff = new Date(employee.value.iqamaExpiryDate).getTime() - Date.now();
  return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
});

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ar-SA");
};
const formatCurrency = (val?: string | number) => {
  if (!val) return "0 ر.س";
  return `${Number(val).toLocaleString("ar-SA")} ر.س`;
};
const empStatusLabel = (s: string) =>
  ({ active: "نشط", inactive: "غير نشط", terminated: "منتهي" })[s] ?? s;
const getNationalityLabel = (type?: string) =>
  ({
    saudi: "🇸🇦 سعودي",
    non_saudi: "🌍 غير سعودي",
    outside_sponsorship: "📄 خارج الكفالة",
  })[type ?? ""] ?? "—";
const openEditModal = () => console.log("Edit:", employee.value?.id);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $space-5;
}
.page-header__title .back-btn {
  margin-bottom: $space-2;
  color: $stb-text-muted;
}
.page-header__title h1 {
  font-size: $font-size-2xl;
  margin: 0 0 $space-1;
}
.emp-code {
  color: $stb-text-muted;
  font-size: $font-size-sm;
  margin: 0;
}

// ✅ تنسيق قائمة التصدير في الهيدر
.page-header__actions {
  display: flex;
  gap: $space-2;
  align-items: center;
  flex-wrap: wrap;
}
.export-dropdown {
  position: relative;
  display: inline-block;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: $space-2;
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  z-index: 10;
  min-width: 160px;
  overflow: hidden;

  button {
    display: flex;
    align-items: center;
    gap: $space-2;
    width: 100%;
    padding: $space-2 $space-3;
    border: none;
    background: transparent;
    color: $stb-text-primary;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: rgba($stb-accent, 0.08);
      color: $stb-accent;
    }
    svg {
      color: $stb-text-muted;
    }
  }
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: $space-4;
}
.card {
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-lg;
  overflow: hidden;
}
.full-width-card {
  grid-column: 1 / -1;
}
.highlight-card {
  border-color: rgba($stb-accent, 0.3);
  box-shadow: 0 4px 12px rgba($stb-accent, 0.05);
}
.card-header {
  padding: $space-4;
  background: $stb-surface-2;
  border-bottom: 1px solid $stb-border;
  display: flex;
  align-items: center;
  gap: $space-2;
  font-weight: 700;
  color: $stb-text-primary;
  svg {
    color: $stb-accent;
  }
}
.contract-type-badge {
  margin-right: auto;
  font-size: 11px;
  padding: 2px 8px;
  background: rgba($stb-success, 0.1);
  color: $stb-success;
  border-radius: $radius-full;
}
.card-body {
  padding: $space-4;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-4;
}
.full-width {
  grid-column: 1 / -1;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  label {
    font-size: $font-size-xs;
    color: $stb-text-muted;
    font-weight: 600;
  }
  span {
    font-size: $font-size-sm;
    color: $stb-text-primary;
    word-break: break-word;
  }
}
.text-danger {
  color: $stb-danger !important;
}
.warning-icon {
  font-size: 11px;
  margin-right: $space-1;
  color: $stb-warning;
}
.role-badge {
  background: $stb-surface-3;
  padding: 2px 8px;
  border-radius: $radius-sm;
  width: fit-content;
}
.file-link,
.icon-link {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  color: $stb-accent;
  text-decoration: none;
  font-size: $font-size-xs;
  &:hover {
    text-decoration: underline;
  }
}
.attachments-list {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
}
.simple-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;
  th {
    text-align: right;
    padding: $space-2;
    color: $stb-text-muted;
    border-bottom: 1px solid $stb-border;
    font-weight: 600;
  }
  td {
    padding: $space-3 $space-2;
    border-bottom: 1px solid $stb-border;
  }
  tr:last-child td {
    border-bottom: none;
  }
}
.salary-breakdown {
  padding: $space-4;
  .salary-row {
    display: flex;
    justify-content: space-between;
    padding: $space-2 0;
    font-size: $font-size-sm;
    color: $stb-text-secondary;
  }
  .salary-total {
    margin-top: $space-3;
    padding-top: $space-3;
    border-top: 1px dashed $stb-border;
    display: flex;
    justify-content: space-between;
    font-weight: 800;
    color: $stb-accent;
    font-size: $font-size-base;
  }
}
.status-dot {
  display: inline-block;
  padding: 2px 8px;
  border-radius: $radius-sm;
  font-size: 11px;
  font-weight: 600;
}
.status-pending {
  background: rgba($stb-warning, 0.1);
  color: $stb-warning;
}
.status-approved {
  background: rgba($stb-success, 0.1);
  color: $stb-success;
}
.status-rejected {
  background: rgba($stb-danger, 0.1);
  color: $stb-danger;
}
.status-paid,
.status-completed {
  background: rgba($stb-info, 0.1);
  color: $stb-info;
}
.text-primary {
  color: $stb-accent !important;
}
.text-success {
  color: $stb-success !important;
}
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: $stb-text-muted;
  gap: $space-3;
}

@include respond-to("md") {
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
    gap: $space-3;
  }
}
</style>
