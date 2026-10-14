<!-- pages/dashboard/pos/audit.vue — سجل تدقيق الكاشير وحركات الدرج النقدية -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>تدقيق الكاشير</h1>
        <p>
          ما لا يترك أثراً في الفواتير: حذف سطور، إفراغ سلة، فتح الدرج بلا بيع،
          خصومات، موافقات المشرفين، وحركات الدرج النقدية
        </p>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        class="doc-tab"
        :class="{ 'is-active': view === tab.value }"
        @click="view = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="card doc-filters doc-filters--even">
      <select v-model="filters.deviceId" class="form-select" @change="reload">
        <option value="">كل الأجهزة</option>
        <option v-for="d in devices" :key="d.id" :value="d.id">
          {{ d.name }} ({{ d.code }})
        </option>
      </select>
      <template v-if="view === 'audit'">
        <select v-model="filters.action" class="form-select" @change="reload">
          <option value="">كل الأحداث</option>
          <option v-for="(label, action) in ACTION_LABELS" :key="action" :value="action">
            {{ label }}
          </option>
        </select>
        <StbDateInput v-model="filters.from" />
        <StbDateInput v-model="filters.to" />
      </template>
    </div>

    <!-- ══ سجل التدقيق ══ -->
    <template v-if="view === 'audit'">
      <div v-if="!audit.ready.value" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <div v-else-if="!audit.rows.value.length" class="card">
        <div class="empty-state">
          <ScrollText :size="44" class="empty-state__icon" />
          <div class="empty-state__title">لا أحداث</div>
          <div class="empty-state__text">
            تظهر الأحداث هنا عندما ترفعها أجهزة الكاشير عند اتصالها
          </div>
        </div>
      </div>
      <template v-else>
        <div class="card doc-table-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>الحدث</th>
                  <th>الجهاز والكاشير</th>
                  <th>التفاصيل</th>
                  <th>المبلغ</th>
                  <th>موافقة المشرف</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in audit.rows.value" :key="row.id">
                  <td><span class="doc-num">{{ formatDateTime(row.occurredAt) }}</span></td>
                  <td>
                    <span :class="['badge', ACTION_TONES[row.action]]">
                      {{ ACTION_LABELS[row.action] }}
                    </span>
                  </td>
                  <td>
                    <div class="doc-cell">
                      <span class="doc-cell__main">{{ row.deviceName || "—" }}</span>
                      <span class="doc-cell__sub">{{ row.cashierName || "—" }}</span>
                    </div>
                  </td>
                  <td>{{ row.details || "—" }}</td>
                  <td>
                    <span v-if="row.amount !== null" class="doc-money">
                      {{ formatCurrency(row.amount) }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ row.approvedBy || "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <DocPager
          :total="audit.total.value"
          :page="audit.page.value"
          :total-pages="audit.totalPages.value"
          label="حدث"
          @change="audit.load"
        />
      </template>
    </template>

    <!-- ══ حركات الدرج ══ -->
    <template v-else>
      <div v-if="!moves.ready.value" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <div v-else-if="!moves.rows.value.length" class="card">
        <div class="empty-state">
          <Wallet :size="44" class="empty-state__icon" />
          <div class="empty-state__title">لا حركات نقدية</div>
          <div class="empty-state__text">
            إيداعات وسحوبات الدرج التي يسجّلها الكاشير خلال ورديته
          </div>
        </div>
      </div>
      <template v-else>
        <div class="card doc-table-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>السبب</th>
                  <th>الكاشير</th>
                  <th>موافقة المشرف</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in moves.rows.value" :key="row.id">
                  <td><span class="doc-num">{{ formatDateTime(row.occurredAt) }}</span></td>
                  <td>
                    <span
                      :class="[
                        'badge',
                        row.type === 'in' ? 'doc-status--done' : 'doc-status--progress',
                      ]"
                    >
                      {{ row.type === "in" ? "إيداع" : "سحب" }}
                    </span>
                  </td>
                  <td>
                    <span class="doc-money doc-money--strong">
                      {{ formatCurrency(row.amount) }}
                    </span>
                  </td>
                  <td>{{ row.reason }}</td>
                  <td>{{ row.cashierName || "—" }}</td>
                  <td>{{ row.approvedBy || "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <DocPager
          :total="moves.total.value"
          :page="moves.page.value"
          :total-pages="moves.totalPages.value"
          label="حركة"
          @change="moves.load"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { ScrollText, Wallet } from "lucide-vue-next";
import { usePagedList } from "@/composables/usePagedList";
import type { AuditAction, PosDevice, ServerAuditAction } from "@/pos/types";
import { usePosAdminStore } from "@/stores/posAdmin";
import { useAuthStore } from "@/stores/auth";
import { fromZonedInput } from "@/utils/timezone";

definePageMeta({ middleware: "auth" });

const store = usePosAdminStore();
const auth = useAuthStore();

type View = "audit" | "cash";
const TABS: { value: View; label: string }[] = [
  { value: "audit", label: "سجل التدقيق" },
  { value: "cash", label: "حركات الدرج" },
];
const view = ref<View>("audit");

type Action = AuditAction | ServerAuditAction;

const ACTION_LABELS: Record<Action, string> = {
  line_removed: "حذف سطر",
  cart_cleared: "إفراغ سلة",
  sale_held: "تعليق فاتورة",
  held_deleted: "حذف فاتورة معلّقة",
  drawer_opened: "فتح الدرج بلا بيع",
  cash_in: "إيداع نقدي",
  cash_out: "سحب نقدي",
  discount: "خصم",
  price_below_min: "بيع تحت أقل سعر",
  price_changed: "تغيير سعر في فاتورة",
  credit_over_limit: "تجاوز حد ائتمان",
  approval_denied: "طلب موافقة أُلغي",
  // يسجّلها السيرفر عند رفع عمليات الجهاز
  stock_overdrawn: "بيع بأكثر من الرصيد",
  sale_anomaly: "مخالفة في فاتورة",
  late_after_close: "عملية بعد تقفيل الوردية",
};

// ما يستحق نظرة المدير أولاً يأخذ لون التنبيه
const ACTION_TONES: Record<Action, string> = {
  line_removed: "doc-status--progress",
  cart_cleared: "doc-status--progress",
  sale_held: "doc-status--draft",
  held_deleted: "doc-status--progress",
  drawer_opened: "doc-status--progress",
  cash_in: "doc-status--done",
  cash_out: "doc-status--progress",
  discount: "doc-status--info",
  price_below_min: "badge--inactive",
  price_changed: "doc-status--info",
  credit_over_limit: "badge--inactive",
  approval_denied: "badge--inactive",
  stock_overdrawn: "badge--inactive",
  sale_anomaly: "badge--inactive",
  late_after_close: "badge--inactive",
};

const filters = reactive({
  deviceId: "",
  action: "" as Action | "",
  from: "",
  to: "",
});

/** حدود اليوم بتوقيت الشركة: "إلى" تشمل اليوم كله */
const dayStart = (day: string) =>
  day ? fromZonedInput(`${day}T00:00`, auth.timezone) : undefined;
const dayEnd = (day: string) =>
  day ? fromZonedInput(`${day}T23:59`, auth.timezone) : undefined;

const audit = usePagedList(
  (page) =>
    store.fetchAudit({
      deviceId: filters.deviceId || undefined,
      action: filters.action || undefined,
      from: dayStart(filters.from),
      to: dayEnd(filters.to),
      page,
    }),
  "تعذر تحميل سجل التدقيق",
);

const moves = usePagedList(
  (page) =>
    store.fetchCashMovements({ deviceId: filters.deviceId || undefined, page }),
  "تعذر تحميل حركات الدرج",
);

const reload = () => (view.value === "audit" ? audit.load(1) : moves.load(1));
watch(view, reload);
watch(() => [filters.from, filters.to], reload);

const devices = ref<PosDevice[]>([]);

onMounted(() => {
  store
    .fetchDevices()
    .then((list) => (devices.value = list))
    .catch(() => {});
  void audit.load(1);
});
</script>
