<!-- pages/dashboard/pos/shifts.vue — ورديات الكاشير وتقفيل الدرج -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>ورديات الكاشير</h1>
        <p>مبيعات كل وردية وما قُبض فيها، والفرق بين المفترض في الدرج والمعدود</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/dashboard/pos/devices" class="btn btn--ghost">
          <MonitorSmartphone :size="16" />
          <span>أجهزة الكاشير</span>
        </NuxtLink>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        class="doc-tab"
        :class="{ 'is-active': filters.status === tab.value }"
        @click="setStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="card doc-filters doc-filters--even">
      <select v-model="filters.deviceId" class="form-select" @change="list.load(1)">
        <option value="">كل الأجهزة</option>
        <option v-for="d in devices" :key="d.id" :value="d.id">
          {{ d.name }} ({{ d.code }})
        </option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <ClipboardList :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد ورديات</div>
        <div class="empty-state__text">
          تظهر الوردية هنا عندما يفتحها الكاشير ويرفعها الجهاز للسيرفر
        </div>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الجهاز والكاشير</th>
                <th>الفتح / التقفيل</th>
                <th>الفواتير</th>
                <th>المبيعات</th>
                <th>نقدي / شبكة</th>
                <th>المفترض في الدرج</th>
                <th>المعدود والفرق</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in list.rows.value" :key="s.id">
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ s.device?.name || "—" }}</span>
                    <span class="doc-cell__sub">{{ s.cashierName || "—" }}</span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-num">{{ formatDateTime(s.openedAt) }}</span>
                    <span v-if="s.closedAt" class="doc-cell__sub doc-num">
                      {{ formatDateTime(s.closedAt) }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="doc-num">{{ formatNumber(s.invoicesCount) }}</span>
                </td>
                <td>
                  <span class="doc-money doc-money--strong">
                    {{ formatCurrency(s.salesTotal) }}
                  </span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-money">{{ formatCurrency(s.cashTotal) }}</span>
                    <span class="doc-cell__sub doc-money">
                      {{ formatCurrency(s.cardTotal) }}
                    </span>
                    <span v-if="s.returnsCount" class="doc-cell__sub text-danger">
                      مرتجعات {{ formatNumber(s.returnsCount) }} ·
                      {{ formatMoney(s.returnsTotal) }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-money">{{ formatCurrency(s.expectedCash) }}</span>
                    <span class="doc-cell__sub">
                      عهدة {{ formatMoney(s.openingCash) }}
                    </span>
                    <span v-if="s.cashRefunds" class="doc-cell__sub">
                      رُدّ نقداً {{ formatMoney(s.cashRefunds) }}
                    </span>
                    <span v-if="s.drawerOpens" class="doc-cell__sub">
                      فتح الدرج بلا بيع: {{ formatNumber(s.drawerOpens) }}
                    </span>
                  </div>
                </td>
                <td>
                  <div v-if="s.status === 'closed'" class="doc-cell">
                    <span class="doc-money">
                      {{ formatCurrency(s.closingCash ?? 0) }}
                    </span>
                    <span
                      class="doc-cell__sub"
                      :class="{
                        'text-danger': s.cashDifference < 0,
                        'text-success': s.cashDifference > 0,
                      }"
                    >
                      {{
                        s.cashDifference === 0
                          ? "مطابق"
                          : `${s.cashDifference < 0 ? "عجز" : "زيادة"} ${formatMoney(Math.abs(s.cashDifference))}`
                      }}
                    </span>
                  </div>
                  <span v-else>—</span>
                </td>
                <td>
                  <span
                    :class="[
                      'badge',
                      s.status === 'open' ? 'doc-status--progress' : 'doc-status--done',
                    ]"
                  >
                    {{ s.status === "open" ? "مفتوحة" : "مقفّلة" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DocPager
        :total="list.total.value"
        :page="list.page.value"
        :total-pages="list.totalPages.value"
        label="وردية"
        @change="list.load"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ClipboardList, MonitorSmartphone } from "lucide-vue-next";
import { usePagedList } from "@/composables/usePagedList";
import type { PosDevice } from "@/pos/types";
import { usePosAdminStore } from "@/stores/posAdmin";

definePageMeta({ middleware: "auth" });

const store = usePosAdminStore();
const route = useRoute();

type ShiftStatus = "open" | "closed" | "";

const STATUS_TABS: { value: ShiftStatus; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "open", label: "مفتوحة" },
  { value: "closed", label: "مقفّلة" },
];

const filters = reactive({
  status: "" as ShiftStatus,
  // قادماً من صفحة الأجهزة: ‎?deviceId=...
  deviceId: typeof route.query.deviceId === "string" ? route.query.deviceId : "",
});

const list = usePagedList(
  (page) => store.fetchShifts({ ...filters, page }),
  "تعذر تحميل الورديات",
);

const setStatus = (status: ShiftStatus) => {
  filters.status = status;
  list.load(1);
};

const devices = ref<PosDevice[]>([]);

onMounted(() => {
  store
    .fetchDevices()
    .then((rows) => {
      devices.value = rows;
    })
    .catch(() => {});
  list.load(1);
});
</script>
