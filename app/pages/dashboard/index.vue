<!--
  pages/dashboard/index.vue — الصفحة الرئيسية: أرقام الشركة وتحليلاتها.

  كل ما هنا من طلب واحد (‎GET /dashboard/overview) يحسب في السيرفر. القسم الذي
  لا تشمله خطة الشركة أو لا يملك المستخدم صلاحيته يعود null فيُحذف من الصفحة.
-->
<template>
  <!-- مالك النظام بلا شركة: لوحته الخاصة بدل لوحة شركة فارغة -->
  <OwnerHome v-if="auth.isSystemAdmin" />
  <div v-else class="page-container home">
    <!-- ══ الترحيب ══ -->
    <div class="page-header">
      <div class="page-header__title home-welcome">
        <div v-if="profileReady" class="welcome-box">
          <h1 class="welcome-title">
            <template v-if="auth.isSuperAdmin">
              مرحباً شريكنا {{ username }}<br />
              <span class="text-accent">أهلاً بك في STB HR</span><br />
              نتمنى لك يومًا مثمرًا وإدارة ناجحة لمواردك البشرية.
            </template>
            <template v-else>
              مرحباً، {{ profileStore.fullName || username }} 👋<br />
              <span class="text-accent">أهلاً بك في نظام STB HR</span><br />
              نتمنى لك يوماً سعيداً ومثمراً.
            </template>
          </h1>
          <div class="date-time-wrapper">
            <p class="welcome-date">{{ currentDate }}</p>
            <span class="time-badge">
              <Clock :size="14" />
              <span dir="ltr">{{ localTime }}</span>
            </span>
          </div>
        </div>
        <div v-else class="welcome-skeleton">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-30"></div>
        </div>
      </div>
    </div>

    <!-- ══ الفلاتر: صف واحد فوق كل ما يتأثر بها ══ -->
    <div v-if="hasRangedData" class="home-filters">
      <div class="home-range" role="group" aria-label="الفترة">
        <button
          v-for="option in RANGES"
          :key="option.days"
          type="button"
          class="home-range__item"
          :class="{ 'is-active': !customOpen && !isCustom && days === option.days }"
          @click="setPreset(option.days)"
        >
          {{ option.label }}
        </button>
        <button
          type="button"
          class="home-range__item"
          :class="{ 'is-active': customOpen || isCustom }"
          :aria-expanded="customOpen"
          @click="toggleCustom"
        >
          <CalendarRange :size="14" /> فترة مخصصة
        </button>
      </div>

      <form v-if="customOpen" class="home-custom" @submit.prevent="applyCustom">
        <label>
          <span>من</span>
          <StbDateInput
            v-model="customFrom"
            type="date"
            class="form-input"
            :max="customTo || undefined"
            required
          />
        </label>
        <label>
          <span>إلى</span>
          <StbDateInput
            v-model="customTo"
            type="date"
            class="form-input"
            :min="customFrom || undefined"
            required
          />
        </label>
        <button type="submit" class="btn btn--primary btn--sm">تطبيق</button>
      </form>

      <label v-if="branchOptions.length > 1" class="home-branch">
        <Building2 :size="15" />
        <select
          class="form-select"
          aria-label="الفرع"
          :value="warehouseId"
          @change="setBranch(($event.target as HTMLSelectElement).value)"
        >
          <option value="">كل الفروع</option>
          <option v-for="b in branchOptions" :key="b.id" :value="b.id">
            {{ b.name }}
          </option>
        </select>
      </label>

      <p v-if="overview" class="home-filters__note">
        {{ dayLabel(overview.range.from) }} – {{ dayLabel(overview.range.to) }}
        · المقارنة مع {{ formatNumber(overview.range.days) }}
        {{ overview.range.days === 1 ? "يوم" : "يوماً" }} قبلها
      </p>
    </div>

    <!-- ══ أول تحميل ══ -->
    <div v-if="!overview && loading" class="home-kpis">
      <div v-for="n in 8" :key="n" class="home-skeleton" />
    </div>

    <div v-else-if="!overview" class="card">
      <div class="empty-state">
        <CloudOff :size="40" class="empty-state__icon" />
        <div class="empty-state__title">تعذر تحميل الإحصائيات</div>
        <div class="empty-state__text">{{ loadError }}</div>
        <button class="btn btn--primary" @click="load">إعادة المحاولة</button>
      </div>
    </div>

    <div v-else-if="!hasAnySection" class="card">
      <div class="empty-state">
        <LayoutDashboard :size="40" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد إحصائيات متاحة لحسابك</div>
        <div class="empty-state__text">
          تظهر هنا أرقام الأقسام التي تملك صلاحية عرضها وتشملها خطة الشركة.
        </div>
      </div>
    </div>

    <!-- إعادة التحميل تُبقي الصفحة كما هي بشفافية أقل: بلا وميض ولا قفز -->
    <div v-else class="home-body" :class="{ 'is-refreshing': loading }">
      <!-- ════════════════ المبيعات ════════════════ -->
      <section v-if="overview.sales" class="home-section">
        <h2 class="home-section__title">
          <TrendingUp :size="18" /> المبيعات
          <span v-if="branchName" class="home-section__tag">{{ branchName }}</span>
        </h2>

        <div class="home-kpis">
          <StatTile v-for="tile in salesTiles" :key="tile.label" v-bind="tile" />
        </div>

        <div class="home-grid home-grid--wide">
          <ChartCard
            title="المبيعات اليومية"
            :subtitle="`إجمالي الفواتير الصادرة، شامل الضريبة (${currencyLabel()})`"
            :table="salesTrendTable"
            :empty="overview.sales.total === 0 && previousTotal === 0"
            empty-text="لا مبيعات في هذه الفترة ولا التي قبلها"
          >
            <div class="home-legend">
              <span><i class="home-legend__line" :style="{ background: palette.series[0] }" /> هذه الفترة</span>
              <span><i class="home-legend__line" :style="{ background: palette.neutral }" /> الفترة السابقة</span>
            </div>
            <ChartBox :option="salesTrendOption" :height="270" />
          </ChartCard>

          <ChartCard
            title="طرق الدفع"
            subtitle="المقبوض من العملاء في الفترة"
            :table="paymentsTable"
            :empty="!paymentSlices.length"
            empty-text="لا مقبوضات في هذه الفترة"
          >
            <DonutChart
              :slices="paymentSlices"
              center-label="المقبوض"
              :format="formatMoney"
            />
          </ChartCard>
        </div>

        <div class="home-grid">
          <ChartCard
            v-if="overview.sales.branches.length > 1"
            title="مقارنة الفروع"
            :subtitle="`مبيعات كل فرع في الفترة (${currencyLabel()})`"
            :table="branchesTable"
            :empty="!overview.sales.branches.some((b) => b.total > 0)"
            empty-text="لا مبيعات لأي فرع في هذه الفترة"
          >
            <ChartBox
              :option="rankBars(overview.sales.branches)"
              :height="rankHeight(overview.sales.branches.length)"
            />
          </ChartCard>

          <ChartCard
            title="المبيعات حسب التصنيف"
            subtitle="حصة كل تصنيف من مبيعات الفترة"
            :table="categoriesTable"
            :empty="!categorySlices.length"
            empty-text="لا مبيعات في هذه الفترة"
          >
            <DonutChart
              :slices="categorySlices"
              center-label="الإجمالي"
              :format="formatMoney"
            />
          </ChartCard>

          <ChartCard
            title="ساعات الذروة"
            :subtitle="peakHourText"
            :table="hoursTable"
            :empty="overview.sales.total === 0"
            empty-text="لا مبيعات في هذه الفترة"
          >
            <ChartBox :option="hoursOption" :height="250" />
          </ChartCard>
        </div>

        <div class="home-grid">
          <ChartCard
            title="الأصناف الأكثر مبيعاً"
            :subtitle="`حسب قيمة المبيعات (${currencyLabel()})`"
            :table="topProductsTable"
            :empty="!overview.sales.topProducts.length"
            empty-text="لا مبيعات في هذه الفترة"
          >
            <ChartBox
              :option="rankBars(overview.sales.topProducts)"
              :height="rankHeight(overview.sales.topProducts.length)"
            />
          </ChartCard>

          <ChartCard
            title="أكبر العملاء"
            :subtitle="`مشتريات العملاء المسجّلين في الفترة (${currencyLabel()})`"
            :table="customersTable"
            :empty="!overview.sales.topCustomers.length"
            empty-text="لا مبيعات لعملاء مسجّلين في هذه الفترة"
          >
            <ChartBox
              :option="rankBars(overview.sales.topCustomers)"
              :height="rankHeight(overview.sales.topCustomers.length)"
            />
          </ChartCard>

          <ChartCard
            v-if="overview.sales.cashiers"
            title="أداء الكاشيرات"
            :subtitle="`مبيعات كل كاشير عبر ورديّاته (${currencyLabel()})`"
            :table="cashiersTable"
            :empty="!overview.sales.cashiers.length"
            empty-text="لا مبيعات من شاشات الكاشير في هذه الفترة"
          >
            <ChartBox
              :option="rankBars(overview.sales.cashiers)"
              :height="rankHeight(overview.sales.cashiers.length)"
            />
          </ChartCard>
        </div>

        <div class="home-grid">
          <ChartCard
            title="أحدث الفواتير"
            subtitle="آخر ما صدر"
            :empty="!overview.sales.recentInvoices.length"
            empty-text="لم تصدر فواتير بعد"
          >
            <template #actions>
              <NuxtLink to="/dashboard/sales" class="home-more">
                الكل <ArrowLeft :size="14" />
              </NuxtLink>
            </template>
            <ul class="home-list">
              <li v-for="invoice in overview.sales.recentInvoices" :key="invoice.id">
                <div class="home-list__main">
                  <code class="doc-code">{{ invoice.number || "—" }}</code>
                  <span class="home-list__sub">
                    {{ invoice.customer || "عميل نقدي" }} ·
                    {{ formatDateTime(invoice.issuedAt) }}
                  </span>
                </div>
                <div class="home-list__end">
                  <strong>{{ formatCurrency(invoice.total) }}</strong>
                  <!-- الحالة بنص، لا باللون وحده -->
                  <span
                    class="home-chip"
                    :class="invoice.remaining > 0 ? 'home-chip--warn' : 'home-chip--good'"
                  >
                    {{ invoice.remaining > 0 ? `متبقٍ ${formatMoney(invoice.remaining)}` : "مدفوعة" }}
                  </span>
                </div>
              </li>
            </ul>
          </ChartCard>

          <ChartCard
            title="أكبر المديونيات"
            subtitle="عملاء عليهم مبالغ لم تُحصَّل حتى الآن"
            :empty="!overview.sales.topDebtors.length"
            empty-text="لا مديونيات على العملاء"
            :empty-icon="CircleCheck"
          >
            <template #actions>
              <NuxtLink to="/dashboard/sales/customers" class="home-more">
                العملاء <ArrowLeft :size="14" />
              </NuxtLink>
            </template>
            <ul class="home-list">
              <li v-for="debtor in debtors" :key="debtor.name">
                <div class="home-list__main">
                  <span class="home-list__name">{{ debtor.name }}</span>
                  <span class="home-meter">
                    <span class="home-meter__fill" :style="{ width: `${debtor.share}%` }" />
                  </span>
                </div>
                <div class="home-list__end">
                  <strong>{{ formatCurrency(debtor.total) }}</strong>
                </div>
              </li>
            </ul>
          </ChartCard>
        </div>
      </section>

      <!-- ════════════════ المشتريات والمخزون ════════════════ -->
      <section v-if="overview.purchasing || overview.inventory" class="home-section">
        <h2 class="home-section__title">
          <Boxes :size="18" /> المشتريات والمخزون
          <span v-if="branchName" class="home-section__tag">{{ branchName }}</span>
        </h2>

        <div class="home-kpis">
          <StatTile v-for="tile in stockTiles" :key="tile.label" v-bind="tile" />
        </div>

        <div class="home-grid">
          <ChartCard
            v-if="overview.purchasing"
            title="أكبر الموردين"
            :subtitle="`مشتريات الفترة حسب المورد (${currencyLabel()})`"
            :table="suppliersTable"
            :empty="!overview.purchasing.topSuppliers.length"
            empty-text="لا مشتريات معتمدة في هذه الفترة"
          >
            <ChartBox
              :option="rankBars(overview.purchasing.topSuppliers)"
              :height="rankHeight(overview.purchasing.topSuppliers.length)"
            />
          </ChartCard>

          <ChartCard
            v-if="overview.inventory"
            title="أصناف تحتاج إعادة طلب"
            subtitle="رصيدها عند حدها الأدنى أو تحته"
            :empty="!overview.inventory.lowStock.length"
            empty-text="كل الأصناف فوق حدها الأدنى"
            :empty-icon="CircleCheck"
          >
            <template #actions>
              <NuxtLink to="/dashboard/inventory" class="home-more">
                المخزون <ArrowLeft :size="14" />
              </NuxtLink>
            </template>
            <ul class="home-list">
              <li
                v-for="item in overview.inventory.lowStock"
                :key="`${item.product}-${item.warehouse}`"
              >
                <div class="home-list__main">
                  <span class="home-list__name">{{ item.product }}</span>
                  <span class="home-list__sub">{{ item.warehouse }}</span>
                </div>
                <div class="home-list__end">
                  <strong :class="{ 'home-negative': item.quantity < 0 }" dir="ltr">
                    {{ formatNumber(item.quantity) }}
                  </strong>
                  <span class="home-list__sub">
                    الحد {{ formatNumber(item.minQuantity) }}
                  </span>
                </div>
              </li>
            </ul>
          </ChartCard>
        </div>
      </section>

      <!-- ════════════════ الموارد البشرية ════════════════ -->
      <section v-if="overview.hr || overview.attendance" class="home-section">
        <h2 class="home-section__title">
          <Users :size="18" /> الموارد البشرية
        </h2>

        <div v-if="overview.hr" class="home-kpis">
          <StatTile v-for="tile in hrTiles" :key="tile.label" v-bind="tile" />
        </div>

        <div class="home-grid home-grid--three">
          <ChartCard
            v-if="overview.hr"
            title="الموظفون حسب القسم"
            subtitle="النشطون فقط"
            :table="departmentsTable"
            :empty="!departmentSlices.length"
            empty-text="لا يوجد موظفون نشطون"
          >
            <DonutChart :slices="departmentSlices" center-label="موظف" />
          </ChartCard>

          <ChartCard
            v-if="overview.attendance"
            title="حضور اليوم"
            :subtitle="dayLabel(overview.attendance.date)"
            :table="attendanceTable"
            :empty="!attendanceSlices.length"
            empty-text="لا يوجد موظفون نشطون"
          >
            <DonutChart
              :slices="attendanceSlices"
              center-label="حضروا"
              :center-value="attendedText"
            />
          </ChartCard>

          <ChartCard
            v-if="overview.hr"
            title="بانتظار الموافقة"
            subtitle="طلبات لم يُبتّ فيها"
          >
            <ul class="home-pending">
              <li v-for="item in pendingItems" :key="item.label">
                <NuxtLink :to="item.to" class="home-pending__row">
                  <span class="home-pending__icon">
                    <component :is="item.icon" :size="16" />
                  </span>
                  <span class="home-pending__label">{{ item.label }}</span>
                  <!-- شريط بطول نسبي: المقارنة بين الأنواع بنظرة -->
                  <span class="home-meter">
                    <span class="home-meter__fill" :style="{ width: `${item.share}%` }" />
                  </span>
                  <strong class="home-pending__count">
                    {{ formatNumber(item.count) }}
                  </strong>
                </NuxtLink>
              </li>
            </ul>
          </ChartCard>
        </div>

        <div v-if="overview.hr?.payroll" class="home-grid">
          <ChartCard
            title="مسيرات الرواتب"
            :subtitle="`صافي آخر المسيرات (${currencyLabel()})`"
            :table="payrollTable"
            :empty="!overview.hr.payroll.length"
            empty-text="لم يُعدّ أي مسير رواتب بعد"
          >
            <ChartBox :option="payrollOption" :height="270" />
          </ChartCard>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Component } from "vue";
import type { EChartsOption } from "echarts";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Boxes,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  ClipboardList,
  Clock,
  CloudOff,
  FileClock,
  Gift,
  HandCoins,
  IdCard,
  Landmark,
  LayoutDashboard,
  MinusCircle,
  PackageMinus,
  Percent,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-vue-next";
import ChartBox from "@/components/dashboard/ChartBox.vue";
import ChartCard, { type ChartTable } from "@/components/dashboard/ChartCard.vue";
import DonutChart, { type DonutSlice } from "@/components/dashboard/DonutChart.vue";
import StatTile from "@/components/dashboard/StatTile.vue";
import { useApi } from "@/composables/useApi";
import { useTheme } from "@/composables/useTheme";
import { useAuthStore } from "@/stores/auth";
import { useProfileStore } from "@/stores/profile";
import type {
  DashboardOverview,
  DashboardRangeDays,
  NamedAmount,
} from "@/types/dashboard";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const profileStore = useProfileStore();
const api = useApi();
const { theme } = useTheme();
const palette = computed(() => chartPalette(theme.value));

// ─── الفلاتر والتحميل ─────────────────────────────────────────────────────────
const RANGES: { days: DashboardRangeDays; label: string }[] = [
  { days: 7, label: "آخر 7 أيام" },
  { days: 30, label: "آخر 30 يوماً" },
  { days: 90, label: "آخر 90 يوماً" },
];

const days = ref<DashboardRangeDays>(30);
/** فترة مخصصة مطبّقة (كلاهما) — لها الأولوية على `days` */
const appliedFrom = ref("");
const appliedTo = ref("");
const isCustom = computed(() => !!appliedFrom.value && !!appliedTo.value);
const customOpen = ref(false);
const customFrom = ref("");
const customTo = ref("");
const warehouseId = ref("");

const overview = ref<DashboardOverview | null>(null);
const loading = ref(false);
const loadError = ref("");

const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const res = await api.get<DashboardOverview>(
      `/dashboard/overview${toQueryString({
        ...(isCustom.value
          ? { from: appliedFrom.value, to: appliedTo.value }
          : { days: days.value }),
        warehouseId: warehouseId.value || undefined,
      })}`,
    );
    overview.value = res.data;
  } catch (e) {
    loadError.value = getErrorMessage(e, "تحقق من الاتصال ثم أعد المحاولة");
    // فترة أو فرع رفضه السيرفر: الصفحة تبقى على آخر أرقامها مع التنبيه
    if (overview.value) useToast().error(loadError.value);
  } finally {
    loading.value = false;
  }
};

const setPreset = (next: DashboardRangeDays) => {
  customOpen.value = false;
  if (!isCustom.value && days.value === next) return;
  appliedFrom.value = "";
  appliedTo.value = "";
  days.value = next;
  void load();
};

const toggleCustom = () => {
  customOpen.value = !customOpen.value;
  if (customOpen.value && overview.value) {
    // يبدأ من الفترة المعروضة حالياً
    customFrom.value ||= overview.value.range.from;
    customTo.value ||= overview.value.range.to;
  }
};

const applyCustom = () => {
  if (!customFrom.value || !customTo.value) return;
  appliedFrom.value = customFrom.value;
  appliedTo.value = customTo.value;
  customOpen.value = false;
  void load();
};

const setBranch = (id: string) => {
  warehouseId.value = id;
  void load();
};

const branchOptions = computed(() => overview.value?.branches ?? []);
const branchName = computed(
  () => branchOptions.value.find((b) => b.id === warehouseId.value)?.name ?? "",
);

const hasAnySection = computed(() => {
  const o = overview.value;
  return !!o && !!(o.sales || o.purchasing || o.inventory || o.hr || o.attendance);
});

/** الفترة والفرع يؤثران في المبيعات والمشتريات والمخزون: بدونها لا معنى لهما */
const hasRangedData = computed(
  () =>
    !overview.value ||
    !!(overview.value.sales || overview.value.purchasing || overview.value.inventory),
);

// ─── الترحيب والساعة ──────────────────────────────────────────────────────────
const profileReady = ref(false);
const username = computed(
  () => profileStore.data?.personal?.user?.username || "شريكنا",
);

const localTime = ref("");
const currentDate = ref("");
let timeInterval: ReturnType<typeof setInterval> | null = null;

const updateLocalTime = () => {
  const now = new Date();
  // توقيت دولة الشركة لا توقيت جهاز المستخدم
  localTime.value = now.toLocaleTimeString(DISPLAY_LOCALE, {
    timeZone: auth.timezone,
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  // أسماء اليوم/الشهر بالعربية، والأرقام لاتينية بالتقويم الميلادي
  currentDate.value = now.toLocaleDateString("ar-u-nu-latn-ca-gregory", {
    timeZone: auth.timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ─── بطاقات الأرقام ───────────────────────────────────────────────────────────
interface Tile {
  label: string;
  value: string;
  icon: Component;
  change?: number | null;
  upIsGood?: boolean | null;
  hint?: string;
  trend?: number[];
  tone?: "accent" | "good" | "warning" | "critical";
  to?: string;
}

const previousTotal = computed(() => overview.value?.sales?.previousTotal ?? 0);

const salesTiles = computed<Tile[]>(() => {
  const s = overview.value?.sales;
  if (!s) return [];
  const average = s.invoices ? s.total / s.invoices : 0;
  const previousAverage = s.previousInvoices
    ? s.previousTotal / s.previousInvoices
    : 0;
  const margin = s.subtotal > 0 ? s.grossProfit / s.subtotal : 0;

  const list: Tile[] = [
    {
      label: "المبيعات",
      value: formatCurrency(s.total),
      icon: TrendingUp,
      change: changeRatio(s.total, s.previousTotal),
      trend: s.daily.map((d) => d.total),
      to: "/dashboard/sales",
    },
    {
      label: "عدد الفواتير",
      value: formatNumber(s.invoices),
      icon: ReceiptText,
      change: changeRatio(s.invoices, s.previousInvoices),
      trend: s.daily.map((d) => d.invoices),
    },
    {
      label: "متوسط الفاتورة",
      value: formatCurrency(average),
      icon: ShoppingCart,
      change: changeRatio(average, previousAverage),
    },
    {
      label: "مجمل الربح",
      value: formatCurrency(s.grossProfit),
      icon: Banknote,
      change: changeRatio(s.grossProfit, s.previousGrossProfit),
      hint: "قبل الضريبة − التكلفة",
      tone: "good",
    },
    {
      label: "هامش الربح",
      value: `${formatNumber(margin * 100, 1)}%`,
      icon: Percent,
      hint: "من المبيعات قبل الضريبة",
      tone: "good",
    },
    {
      label: "مستحق على العملاء",
      value: formatCurrency(s.receivables),
      icon: Wallet,
      hint: "لم يُحصَّل حتى الآن",
      tone: s.receivables > 0 ? "warning" : "accent",
      to: "/dashboard/sales/customers",
    },
    {
      label: "مرتجعات المبيعات",
      value: formatCurrency(s.returnsTotal),
      icon: RotateCcw,
      hint: s.total > 0
        ? `${formatNumber((s.returnsTotal / s.total) * 100, 1)}% من المبيعات`
        : "في الفترة",
      to: "/dashboard/sales/returns",
    },
  ];
  if (s.openShifts !== null) {
    list.push({
      label: "ورديات كاشير مفتوحة",
      value: formatNumber(s.openShifts),
      icon: Store,
      hint: "الآن",
      to: "/dashboard/pos/shifts",
    });
  }
  return list;
});

const stockTiles = computed<Tile[]>(() => {
  const o = overview.value;
  if (!o) return [];
  const list: Tile[] = [];

  if (o.purchasing) {
    list.push(
      {
        label: "المشتريات",
        value: formatCurrency(o.purchasing.total),
        icon: Truck,
        change: changeRatio(o.purchasing.total, o.purchasing.previousTotal),
        // زيادة الشراء ليست جيدة ولا سيئة بذاتها
        upIsGood: null,
        hint: `${formatNumber(o.purchasing.invoices)} فاتورة`,
        to: "/dashboard/purchasing",
      },
      {
        label: "مستحق للموردين",
        value: formatCurrency(o.purchasing.payables),
        icon: HandCoins,
        hint: "لم يُسدَّد حتى الآن",
        tone: o.purchasing.payables > 0 ? "warning" : "accent",
        to: "/dashboard/purchasing/suppliers",
      },
    );
  }

  if (o.inventory) {
    list.push(
      {
        label: "قيمة المخزون",
        value: formatCurrency(o.inventory.value),
        icon: Boxes,
        hint: `${formatNumber(o.inventory.items)} رصيد · بمتوسط التكلفة`,
        to: "/dashboard/inventory",
      },
      {
        label: "أصناف تحت الحد الأدنى",
        value: formatNumber(o.inventory.low),
        icon: AlertTriangle,
        hint: o.inventory.low ? "تحتاج إعادة طلب" : "لا شيء",
        tone: o.inventory.low ? "warning" : "good",
        to: "/dashboard/inventory",
      },
      {
        label: "أرصدة سالبة",
        value: formatNumber(o.inventory.negative),
        icon: PackageMinus,
        hint: o.inventory.negative ? "بيع أكثر من الرصيد" : "لا شيء",
        tone: o.inventory.negative ? "critical" : "good",
        to: "/dashboard/inventory",
      },
    );
  }
  return list;
});

const hrTiles = computed<Tile[]>(() => {
  const hr = overview.value?.hr;
  if (!hr) return [];
  const { active, inactive } = hr.employees;
  const { alerts } = hr;
  return [
    {
      label: "الموظفون النشطون",
      value: formatNumber(active),
      icon: UserCog,
      hint: inactive ? `${formatNumber(inactive)} غير نشط` : undefined,
      to: "/dashboard/employees",
    },
    {
      label: "بانتظار الموافقة",
      value: formatNumber(pendingTotal.value),
      icon: ClipboardList,
      hint: pendingTotal.value ? "طلبات معلّقة" : "لا شيء",
      tone: pendingTotal.value ? "warning" : "good",
    },
    {
      label: "في إجازة اليوم",
      value: formatNumber(alerts.onLeaveToday),
      icon: CalendarClock,
      hint: "إجازات معتمدة",
      to: "/dashboard/leaves",
    },
    {
      label: "انضموا حديثاً",
      value: formatNumber(alerts.newHires),
      icon: UserPlus,
      hint: "آخر 30 يوماً",
      to: "/dashboard/employees",
    },
    {
      label: "عقود تنتهي قريباً",
      value: formatNumber(alerts.contractsEnding),
      icon: FileClock,
      hint: alerts.contractsEnding ? "خلال 30 يوماً" : "لا شيء",
      tone: alerts.contractsEnding ? "warning" : "good",
      to: "/dashboard/contracts",
    },
    {
      label: "إقامات تحتاج تجديداً",
      value: formatNumber(alerts.residencyExpiring),
      icon: IdCard,
      hint: alerts.residencyExpiring ? "منتهية أو تنتهي خلال 30 يوماً" : "لا شيء",
      tone: alerts.residencyExpiring ? "critical" : "good",
      to: "/dashboard/employees",
    },
  ];
});

// ─── أدوات الرسوم المشتركة ────────────────────────────────────────────────────
const FONT = "Cairo, sans-serif";

/** إطار التلميح بألوان الواجهة لا بألوان المكتبة الافتراضية */
const tooltipBase = computed(() => ({
  confine: true,
  backgroundColor: palette.value.surface,
  borderColor: palette.value.axis,
  textStyle: { color: palette.value.text, fontFamily: FONT, fontSize: 12 },
}));

const axisText = computed(() => ({
  color: palette.value.textMuted,
  fontFamily: FONT,
  fontSize: 11,
}));

const gridLine = computed(() => ({
  lineStyle: { color: palette.value.grid, type: "solid" as const },
}));

const barPointer = computed(() => ({
  type: "shadow" as const,
  shadowStyle: { color: palette.value.grid, opacity: 0.5 },
}));

/** ارتفاع رسم أعمدة أفقية حسب عدد صفوفه */
const rankHeight = (rows: number) => Math.max(180, rows * 40 + 28);

/**
 * أعمدة أفقية مرتبة (الأصناف، الفروع، العملاء…): لون واحد للكل — العناصر بلا
 * ترتيب طبيعي، والطول هو ما يُقارن. تبدأ من اليمين مع اتجاه الواجهة.
 */
const rankBars = (items: NamedAmount[]): EChartsOption => {
  const color = palette.value.series[0]!;
  return {
    aria: { enabled: true },
    // يسار الرسم: مساحة لقيمة أطول عمود (تُكتب عند طرفه)
    grid: { top: 4, right: 4, bottom: 4, left: 64, containLabel: true },
    tooltip: {
      ...tooltipBase.value,
      trigger: "axis",
      axisPointer: barPointer.value,
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    xAxis: {
      type: "value",
      inverse: true,
      splitNumber: 4,
      splitLine: gridLine.value,
      axisLabel: { ...axisText.value, hideOverlap: true, formatter: compactNumber },
    },
    yAxis: {
      type: "category",
      inverse: true,
      position: "right",
      data: items.map((item) => item.name),
      axisLine: { lineStyle: { color: palette.value.axis } },
      axisTick: { show: false },
      axisLabel: {
        color: palette.value.textSecondary,
        fontFamily: FONT,
        fontSize: 12,
        width: 130,
        overflow: "truncate",
      },
    },
    series: [
      {
        name: "القيمة",
        type: "bar",
        data: items.map((item) => item.total),
        barMaxWidth: 18,
        itemStyle: { color, borderRadius: [4, 0, 0, 4] },
        label: {
          show: true,
          position: "left",
          color: palette.value.textSecondary,
          fontFamily: FONT,
          fontSize: 11,
          formatter: (params) => formatMoney(Number(params.value)),
        },
      },
    ],
  };
};

const amountTable = (
  first: string,
  rows: (NamedAmount & { invoices?: number })[],
): ChartTable => {
  const withCount = rows.some((row) => row.invoices !== undefined);
  return {
    headers: [
      first,
      ...(withCount ? ["الفواتير"] : []),
      `القيمة (${currencyLabel()})`,
    ],
    rows: rows.map((row) => [
      row.name,
      ...(withCount ? [formatNumber(row.invoices ?? 0)] : []),
      formatMoney(row.total),
    ]),
  };
};

// ─── المبيعات اليومية (مع الفترة السابقة) ─────────────────────────────────────
const salesTrendOption = computed<EChartsOption>(() => {
  const sales = overview.value?.sales;
  const daily = sales?.daily ?? [];
  const color = palette.value.series[0]!;
  return {
    aria: { enabled: true },
    grid: { top: 12, right: 12, bottom: 4, left: 4, containLabel: true },
    tooltip: {
      ...tooltipBase.value,
      trigger: "axis",
      // خط رأسي يلتقط اليوم الأقرب: لا حاجة لإصابة الخط نفسه بالمؤشر
      axisPointer: {
        type: "line",
        lineStyle: { color: palette.value.axis, width: 1, type: "solid" },
      },
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: daily.map((d) => dayLabel(d.date)),
      axisLine: { lineStyle: { color: palette.value.axis } },
      axisTick: { show: false },
      axisLabel: {
        ...axisText.value,
        hideOverlap: true,
        formatter: (_value: string, index: number) =>
          shortDayLabel(daily[index]?.date ?? ""),
      },
    },
    yAxis: {
      type: "value",
      splitLine: gridLine.value,
      axisLabel: { ...axisText.value, formatter: compactNumber },
    },
    series: [
      {
        // السياق أولاً وبلون محايد: الفترة الحالية هي الموضوع
        name: "الفترة السابقة",
        type: "line",
        data: sales?.previousDaily ?? [],
        showSymbol: false,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 1.5, color: palette.value.neutral },
        itemStyle: {
          color: palette.value.neutral,
          borderColor: palette.value.surface,
          borderWidth: 2,
        },
      },
      {
        name: "هذه الفترة",
        type: "line",
        data: daily.map((d) => d.total),
        showSymbol: false,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 2, color, cap: "round", join: "round" },
        // النقطة المحددة بحلقة بلون الخلفية فتبقى واضحة فوق الخط
        itemStyle: { color, borderColor: palette.value.surface, borderWidth: 2 },
        areaStyle: { color, opacity: 0.1 },
      },
    ],
  };
});

const salesTrendTable = computed<ChartTable>(() => {
  const sales = overview.value?.sales;
  return {
    headers: ["اليوم", "المبيعات", "الفواتير", "الفترة السابقة"],
    rows: (sales?.daily ?? [])
      .map((d, index) => [
        dayLabel(d.date),
        formatMoney(d.total),
        formatNumber(d.invoices),
        formatMoney(sales?.previousDaily[index] ?? 0),
      ])
      .reverse(),
  };
});

// ─── طرق الدفع ────────────────────────────────────────────────────────────────
// اللون يتبع الطريقة نفسها لا ترتيبها: "نقدي" بنفس اللون مهما تغيرت الفترة
const PAYMENT_METHODS: Record<string, { label: string; slot: number }> = {
  cash: { label: "نقدي", slot: 0 },
  card: { label: "شبكة / بطاقة", slot: 1 },
  bank_transfer: { label: "تحويل بنكي", slot: 2 },
  cheque: { label: "شيك", slot: 3 },
};

const paymentSlices = computed<DonutSlice[]>(() =>
  (overview.value?.sales?.paymentMethods ?? [])
    .filter((m) => m.amount > 0)
    .map((m) => {
      const known = PAYMENT_METHODS[m.method];
      return {
        name: known?.label ?? m.method,
        value: m.amount,
        color: known ? palette.value.series[known.slot]! : palette.value.neutral,
      };
    }),
);

const paymentsTable = computed<ChartTable>(() => ({
  headers: ["الطريقة", `المبلغ (${currencyLabel()})`],
  rows: paymentSlices.value.map((s) => [s.name, formatMoney(s.value)]),
}));

// ─── شرائح بأسماء حرة (تصنيفات، أقسام) ───────────────────────────────────────
/**
 * يطوي الشرائح الصغيرة في "أخرى"، ويلوّن الظاهرة بترتيب أبجدي ثابت: لا يتبدل
 * لون تصنيف إذا تغيّر ترتيبه بالقيمة بين فترة وأخرى.
 */
const namedSlices = (items: { name: string; value: number }[]): DonutSlice[] => {
  const folded = foldSlices(items.filter((item) => item.value > 0));
  const order = folded
    .filter((slice) => !slice.isOther)
    .map((slice) => slice.name)
    .sort((a, b) => a.localeCompare(b, "ar"));
  return folded.map((slice) => ({
    name: slice.name,
    value: slice.value,
    color: slice.isOther
      ? palette.value.neutral
      : palette.value.series[order.indexOf(slice.name)]!,
  }));
};

const categorySlices = computed(() =>
  namedSlices(
    (overview.value?.sales?.byCategory ?? []).map((c) => ({
      name: c.name,
      value: c.total,
    })),
  ),
);

const categoriesTable = computed(() =>
  amountTable("التصنيف", overview.value?.sales?.byCategory ?? []),
);

// ─── ساعات الذروة ─────────────────────────────────────────────────────────────
const hourLabel = (hour: number) => {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? "ص" : "م"}`;
};

const hours = computed(() => overview.value?.sales?.byHour ?? []);
const peakHour = computed(() =>
  hours.value.reduce(
    (best, h) => (h.total > best.total ? h : best),
    { hour: 0, total: 0, invoices: 0 },
  ),
);

const peakHourText = computed(() =>
  peakHour.value.total > 0
    ? `الأعلى مبيعاً: ${hourLabel(peakHour.value.hour)} – ${hourLabel((peakHour.value.hour + 1) % 24)}`
    : "مبيعات كل ساعة من اليوم",
);

const hoursOption = computed<EChartsOption>(() => {
  const color = palette.value.series[0]!;
  return {
    aria: { enabled: true },
    grid: { top: 12, right: 8, bottom: 4, left: 4, containLabel: true },
    tooltip: {
      ...tooltipBase.value,
      trigger: "axis",
      axisPointer: barPointer.value,
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    xAxis: {
      type: "category",
      data: hours.value.map((h) => hourLabel(h.hour)),
      axisLine: { lineStyle: { color: palette.value.axis } },
      axisTick: { show: false },
      axisLabel: { ...axisText.value, interval: 2 },
    },
    yAxis: {
      type: "value",
      splitLine: gridLine.value,
      axisLabel: { ...axisText.value, formatter: compactNumber },
    },
    series: [
      {
        name: "المبيعات",
        type: "bar",
        // ساعة الذروة باللون، والبقية سياق محايد: الرسم يجيب "متى الزحام؟"
        data: hours.value.map((h) => ({
          value: h.total,
          itemStyle: {
            color:
              peakHour.value.total > 0 && h.hour === peakHour.value.hour
                ? color
                : palette.value.neutral,
          },
        })),
        barMaxWidth: 14,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
    ],
  };
});

const hoursTable = computed<ChartTable>(() => ({
  headers: ["الساعة", `المبيعات (${currencyLabel()})`, "الفواتير"],
  rows: hours.value
    .filter((h) => h.invoices > 0)
    .map((h) => [hourLabel(h.hour), formatMoney(h.total), formatNumber(h.invoices)]),
}));

// ─── جداول القوائم المرتبة ────────────────────────────────────────────────────
const topProductsTable = computed<ChartTable>(() => ({
  headers: ["الصنف", "الكمية", `القيمة (${currencyLabel()})`],
  rows: (overview.value?.sales?.topProducts ?? []).map((p) => [
    p.name,
    formatNumber(p.quantity),
    formatMoney(p.total),
  ]),
}));

const branchesTable = computed<ChartTable>(() => ({
  headers: ["الفرع", "الفواتير", `المبيعات (${currencyLabel()})`, "مجمل الربح"],
  rows: (overview.value?.sales?.branches ?? []).map((b) => [
    b.name,
    formatNumber(b.invoices),
    formatMoney(b.total),
    formatMoney(b.grossProfit),
  ]),
}));

const customersTable = computed(() =>
  amountTable("العميل", overview.value?.sales?.topCustomers ?? []),
);
const cashiersTable = computed(() =>
  amountTable("الكاشير", overview.value?.sales?.cashiers ?? []),
);
const suppliersTable = computed(() =>
  amountTable("المورد", overview.value?.purchasing?.topSuppliers ?? []),
);

const debtors = computed(() => {
  const list = overview.value?.sales?.topDebtors ?? [];
  const max = Math.max(...list.map((d) => d.total), 1);
  return list.map((d) => ({ ...d, share: (d.total / max) * 100 }));
});

// ─── مسيرات الرواتب ───────────────────────────────────────────────────────────
const payroll = computed(() => overview.value?.hr?.payroll ?? []);

const payrollOption = computed<EChartsOption>(() => {
  const color = palette.value.series[0]!;
  return {
    aria: { enabled: true },
    grid: { top: 24, right: 8, bottom: 4, left: 4, containLabel: true },
    tooltip: {
      ...tooltipBase.value,
      trigger: "axis",
      axisPointer: barPointer.value,
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    xAxis: {
      type: "category",
      data: payroll.value.map((p) => `${monthName(p.month)} ${p.year}`),
      axisLine: { lineStyle: { color: palette.value.axis } },
      axisTick: { show: false },
      axisLabel: {
        ...axisText.value,
        hideOverlap: true,
        formatter: (_value: string, index: number) =>
          monthName(payroll.value[index]?.month ?? 0),
      },
    },
    yAxis: {
      type: "value",
      splitLine: gridLine.value,
      axisLabel: { ...axisText.value, formatter: compactNumber },
    },
    series: [
      {
        name: "صافي المسير",
        type: "bar",
        data: payroll.value.map((p) => p.total),
        barMaxWidth: 24,
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: "top",
          color: palette.value.textSecondary,
          fontFamily: FONT,
          fontSize: 11,
          formatter: (params) => compactNumber(Number(params.value)),
        },
      },
    ],
  };
});

const payrollTable = computed<ChartTable>(() => ({
  headers: ["الشهر", `الصافي (${currencyLabel()})`, "الصرف"],
  rows: payroll.value
    .slice()
    .reverse()
    .map((p) => [
      `${monthName(p.month)} ${p.year}`,
      formatMoney(p.total),
      p.paid ? "صُرف" : "لم يُصرف",
    ]),
}));

// ─── الموظفون حسب القسم ───────────────────────────────────────────────────────
const departmentSlices = computed(() =>
  namedSlices(
    (overview.value?.hr?.departments ?? []).map((d) => ({
      name: d.name,
      value: d.count,
    })),
  ),
);

const departmentsTable = computed<ChartTable>(() => ({
  headers: ["القسم", "الموظفون"],
  rows: (overview.value?.hr?.departments ?? []).map((d) => [
    d.name,
    formatNumber(d.count),
  ]),
}));

// ─── حضور اليوم ───────────────────────────────────────────────────────────────
// هنا اللون يعني حالة (جيد/تنبيه/سيئ) لا هوية، ومعه دائماً نص يسمّيها
const attendanceSlices = computed<DonutSlice[]>(() => {
  const a = overview.value?.attendance;
  if (!a) return [];
  return [
    { name: "حضر في موعده", value: a.present, color: palette.value.status.good },
    { name: "حضر متأخراً", value: a.late, color: palette.value.status.warning },
    { name: "لم يسجّل حضوراً", value: a.absent, color: palette.value.status.critical },
    { name: "في إجازة", value: a.onLeave, color: palette.value.neutral },
  ].filter((slice) => slice.value > 0);
});

const attendedText = computed(() => {
  const a = overview.value?.attendance;
  return a ? formatNumber(a.present + a.late) : "0";
});

const attendanceTable = computed<ChartTable>(() => ({
  headers: ["الحالة", "الموظفون"],
  rows: attendanceSlices.value.map((s) => [s.name, formatNumber(s.value)]),
}));

// ─── بانتظار الموافقة ─────────────────────────────────────────────────────────
const pendingItems = computed(() => {
  const p = overview.value?.hr?.pending;
  if (!p) return [];
  const items = [
    { label: "إجازات", count: p.leaves, icon: CalendarDays, to: "/dashboard/leaves" },
    { label: "سلف", count: p.advances, icon: HandCoins, to: "/dashboard/advances" },
    { label: "قروض", count: p.loans, icon: Landmark, to: "/dashboard/loans" },
    { label: "مكافآت", count: p.bonuses, icon: Gift, to: "/dashboard/bonuses" },
    { label: "خصومات", count: p.deductions, icon: MinusCircle, to: "/dashboard/deductions" },
  ];
  const max = Math.max(...items.map((item) => item.count), 1);
  return items.map((item) => ({ ...item, share: (item.count / max) * 100 }));
});

const pendingTotal = computed(() =>
  pendingItems.value.reduce((sum, item) => sum + item.count, 0),
);

// ─── التشغيل ──────────────────────────────────────────────────────────────────
onMounted(() => {
  // لوحة مالك النظام تحمّل بياناتها بنفسها: لا طلبات لبيانات شركة غير موجودة
  if (auth.isSystemAdmin) return;

  updateLocalTime();
  timeInterval = setInterval(updateLocalTime, 1000);
  void profileStore
    .fetchProfile()
    .catch(() => {})
    .finally(() => {
      profileReady.value = true;
    });
  void load();
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/mixins" as *;

// ─── الترحيب ─────────────────────────────────────────────────────────────────
.home-welcome {
  width: 100%;
}

.welcome-box {
  display: flex;
  justify-content: space-between;
  gap: $space-4;
  animation: home-slide-up 0.6s ease-out forwards;
}

.welcome-title {
  margin-bottom: $space-2;
  font-size: $font-size-2xl;
  font-weight: 800;
  line-height: 1.4;
  color: $stb-text-primary;

  .text-accent {
    color: $stb-accent;
    text-shadow: 0 0 15px rgba($stb-accent, 0.3);
  }
}

.date-time-wrapper {
  @include flex(column, center, flex-start, $space-3);
  flex-shrink: 0;
}

.welcome-date {
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}

.time-badge {
  @include flex(row, center, center, 4px);
  padding: 2px 8px;
  border: 1px solid rgba($stb-accent, 0.2);
  border-radius: $radius-md;
  background: rgba($stb-accent, 0.1);
  color: $stb-accent;
  font-family: monospace;
  font-size: $font-size-xs;
  font-weight: 600;
}

.welcome-skeleton {
  display: flex;
  flex-direction: column;
  gap: $space-2;

  .skeleton-line {
    height: 1.5rem;
    border-radius: $radius-md;
    background: $stb-surface-3;
    animation: home-pulse 1.5s infinite ease-in-out;

    &.w-60 {
      width: 60%;
    }
    &.w-30 {
      width: 30%;
    }
  }
}

@keyframes home-slide-up {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ─── الفلاتر ─────────────────────────────────────────────────────────────────
.home-filters {
  @include flex(row, center, flex-start, $space-3);
  flex-wrap: wrap;
  margin-bottom: $space-5;

  &__note {
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
}

.home-range {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 3px;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  background: $stb-surface;

  &__item {
    @include flex(row, center, center, 6px);
    padding: 6px $space-4;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: $stb-text-secondary;
    font-family: inherit;
    font-size: $font-size-sm;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(.is-active) {
      color: $stb-text-primary;
    }

    &.is-active {
      background: $stb-accent;
      color: $stb-on-accent;
    }
  }
}

.home-custom {
  @include flex(row, flex-end, flex-start, $space-2);
  flex-wrap: wrap;

  label {
    @include flex(row, center, flex-start, $space-2);
    font-size: $font-size-sm;
    color: $stb-text-secondary;
  }

  .form-input {
    width: 160px;
  }
}

.home-branch {
  @include flex(row, center, flex-start, $space-2);
  color: $stb-text-secondary;

  .form-select {
    width: auto;
    min-width: 150px;
    padding-block: 6px;
  }
}

// ─── الأقسام والشبكات ────────────────────────────────────────────────────────
.home-body {
  display: flex;
  flex-direction: column;
  gap: $space-8;
  transition: opacity $transition-fast;

  &.is-refreshing {
    opacity: 0.55;
    pointer-events: none;
  }
}

.home-section {
  display: flex;
  flex-direction: column;
  gap: $space-5;

  &__title {
    @include flex(row, center, flex-start, $space-2);
    padding-bottom: $space-2;
    border-bottom: 1px solid $stb-border;
    font-size: $font-size-lg;
    font-weight: 800;
    color: $stb-text-primary;

    svg {
      color: $stb-accent;
    }
  }

  &__tag {
    padding: 2px $space-2;
    border-radius: 999px;
    background: rgba($stb-accent, 0.12);
    color: $stb-accent;
    font-size: $font-size-xs;
    font-weight: 600;
  }
}

.home-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
  gap: $space-4;
}

.home-skeleton {
  height: 118px;
  border-radius: $radius-lg;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  animation: home-pulse 1.4s ease-in-out infinite;
}

@keyframes home-pulse {
  50% {
    opacity: 0.5;
  }
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: $space-5;

  // الرسم الزمني أعرض من الدائرة بجانبه
  &--wide {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }

  &--three {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  }
}

// مفتاح السلاسل: خط قصير بلون السلسلة، والنص بلون النص
.home-legend {
  @include flex(row, center, flex-start, $space-4);
  margin-bottom: $space-2;
  font-size: $font-size-xs;
  color: $stb-text-secondary;

  span {
    @include flex(row, center, flex-start, 6px);
  }

  &__line {
    width: 16px;
    height: 2px;
    border-radius: 2px;
  }
}

.home-more {
  @include flex(row, center, center, 2px);
  font-size: $font-size-xs;
  color: $stb-accent;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

// ─── القوائم ─────────────────────────────────────────────────────────────────
.home-list {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    @include flex(row, center, space-between, $space-3);
    padding: $space-2 0;

    & + li {
      border-top: 1px solid $stb-border;
    }
  }

  &__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  // رقم الفاتورة بعرض نصه لا بعرض السطر
  .doc-code {
    align-self: flex-start;
  }

  &__name {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $stb-text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__sub {
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }

  &__end {
    @include flex(column, flex-end, center, 4px);
    flex-shrink: 0;
    font-size: $font-size-sm;
    color: $stb-text-primary;
    font-variant-numeric: tabular-nums;
  }
}

.home-negative {
  color: $stb-danger;
}

.home-chip {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: $font-size-xs;
  font-weight: 600;

  &--good {
    background: rgba($stb-success, 0.12);
    color: $stb-success;
  }

  &--warn {
    background: rgba($stb-warning, 0.14);
    color: $stb-warning;
  }
}

// شريط نسبي: مسار بدرجة أفتح من نفس اللون
.home-meter {
  display: block;
  height: 6px;
  border-radius: 3px;
  background: rgba($stb-accent, 0.14);
  overflow: hidden;

  &__fill {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: $stb-accent;
  }
}

// ─── بانتظار الموافقة ────────────────────────────────────────────────────────
.home-pending {
  margin: 0;
  padding: 0;
  list-style: none;

  &__row {
    display: grid;
    grid-template-columns: auto 72px 1fr auto;
    align-items: center;
    gap: $space-3;
    padding: $space-2 0;
    color: inherit;
    text-decoration: none;
    border-radius: $radius-md;
    transition: background $transition-fast;

    &:hover {
      background: $stb-surface-3;
    }
  }

  &__icon {
    @include flex(row, center, center);
    width: 30px;
    height: 30px;
    border-radius: $radius-md;
    background: rgba($stb-accent, 0.12);
    color: $stb-accent;
  }

  &__label {
    font-size: $font-size-sm;
    color: $stb-text-secondary;
  }

  &__count {
    min-width: 28px;
    text-align: end;
    font-weight: 800;
    color: $stb-text-primary;
    font-variant-numeric: tabular-nums;
  }
}

@media (max-width: 900px) {
  .home-grid--wide {
    grid-template-columns: minmax(0, 1fr);
  }
}

// فون: الترحيب فوق التاريخ، وبطاقتا أرقام في الصف
@media (max-width: 640px) {
  .welcome-box {
    flex-direction: column;
    gap: $space-3;
  }

  .welcome-title {
    font-size: $font-size-xl;
  }

  .date-time-wrapper {
    flex-direction: row;
    justify-content: flex-start;
  }

  .home-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $space-3;
  }
}
</style>
