<!-- pages/dashboard/inventory/movements.vue — دفتر حركات المخزون (للقراءة فقط) -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>حركات المخزون</h1>
        <p>كل دخول وخروج للبضاعة بالترتيب — سجل لا يُعدَّل ولا يُحذف</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/dashboard/inventory" class="btn btn--ghost">
          <ArrowRight :size="16" />
          <span>الأرصدة</span>
        </NuxtLink>
      </div>
    </div>

    <!-- حركات صنف محدد (قادماً من صفحة الأرصدة) -->
    <div v-if="filters.productId" class="doc-tabs">
      <button class="doc-tab is-active" @click="clearProduct">
        {{ productName || "صنف محدد" }} ✕
      </button>
    </div>

    <div class="card doc-filters doc-filters--even">
      <select
        v-model="filters.warehouseId"
        class="form-select"
        @change="list.load(1)"
      >
        <option value="">كل المخازن</option>
        <option v-for="w in store.warehouses" :key="w.id" :value="w.id">
          {{ w.name }}
        </option>
      </select>
      <select v-model="filters.type" class="form-select" @change="list.load(1)">
        <option value="">كل أنواع الحركات</option>
        <option v-for="(label, type) in MOVEMENT_TYPE_LABELS" :key="type" :value="type">
          {{ label }}
        </option>
      </select>
      <StbDateInput
        v-model="filters.fromDate"
        class="form-input"
        title="من تاريخ"
      />
      <StbDateInput
        v-model="filters.toDate"
        class="form-input"
        title="إلى تاريخ"
      />
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <History :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد حركات</div>
        <div class="empty-state__text">
          تظهر هنا الحركات عند تسجيل رصيد افتتاحي أو تحويل أو جرد أو بيع
        </div>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الصنف</th>
                <th>المخزن</th>
                <th>الحركة</th>
                <th>الكمية</th>
                <th>الرصيد بعدها</th>
                <th>تكلفة الوحدة</th>
                <th>ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in list.rows.value" :key="m.id">
                <td>
                  <span class="doc-num">{{ formatDateTime(m.occurredAt) }}</span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ m.product?.name || "—" }}</span>
                    <span class="doc-cell__sub">{{ m.product?.sku }}</span>
                  </div>
                </td>
                <td>{{ m.warehouse?.name || "—" }}</td>
                <td>
                  <span class="badge doc-status--info">
                    {{ MOVEMENT_TYPE_LABELS[m.type] }}
                  </span>
                </td>
                <td>
                  <span
                    class="doc-num"
                    :class="m.quantity > 0 ? 'doc-num--in' : 'doc-num--out'"
                  >
                    {{ formatSigned(m.quantity) }}
                  </span>
                </td>
                <td>
                  <span
                    class="doc-num"
                    :class="m.balanceAfter < 0 ? 'doc-num--out' : 'doc-num--strong'"
                  >
                    {{ formatNumber(m.balanceAfter) }}
                  </span>
                </td>
                <td>
                  <span class="doc-money">{{ formatCurrency(m.unitCost) }}</span>
                </td>
                <td>{{ m.note || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DocPager
        :total="list.total.value"
        :page="list.page.value"
        :total-pages="list.totalPages.value"
        label="حركة"
        @change="list.load"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { ArrowRight, History } from "lucide-vue-next";
import { useInventoryStore } from "@/stores/inventory";
import { usePagedList } from "@/composables/usePagedList";
import type { StockMovementType } from "@/types/inventory";

definePageMeta({ middleware: "auth" });

const store = useInventoryStore();
const route = useRoute();
const router = useRouter();

const queryValue = (key: string) => {
  const value = route.query[key];
  return typeof value === "string" ? value : "";
};

const productName = ref(queryValue("name"));

const filters = reactive({
  productId: queryValue("productId"),
  warehouseId: queryValue("warehouseId"),
  type: "" as StockMovementType | "",
  fromDate: "",
  toDate: "",
});

const list = usePagedList(
  (page) =>
    store.fetchMovements({
      productId: filters.productId,
      warehouseId: filters.warehouseId,
      type: filters.type,
      // اليوم كاملاً بتوقيت المستخدم
      from: filters.fromDate
        ? new Date(`${filters.fromDate}T00:00:00`).toISOString()
        : undefined,
      to: filters.toDate
        ? new Date(`${filters.toDate}T23:59:59.999`).toISOString()
        : undefined,
      page,
    }),
  "تعذر تحميل الحركات",
);

watch(
  () => [filters.fromDate, filters.toDate],
  () => list.load(1),
);

const clearProduct = () => {
  filters.productId = "";
  productName.value = "";
  router.replace({ query: {} });
  list.load(1);
};

onMounted(() => {
  store.fetchWarehouses().catch(() => {});
  list.load(1);
});
</script>
