<!-- pages/dashboard/inventory/lots.vue — الدفعات وتواريخ الانتهاء وتتبعها -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الدفعات والصلاحية</h1>
        <p>رصيد كل دفعة وتاريخ انتهائها، والصرف من الأقرب انتهاءً — ورحلة الدفعة من مصدرها لكل عميل</p>
      </div>
    </div>

    <div v-if="summary" class="alerts">
      <button class="alert alert--danger" @click="setStatus('expired')">
        <strong>{{ summary.expired }}</strong> دفعة منتهية فيها رصيد
        <small>{{ formatCurrency(summary.expiredValue) }}</small>
      </button>
      <button class="alert alert--warn" @click="setStatus('expiring')">
        <strong>{{ summary.expiring }}</strong> تنتهي خلال 30 يوماً
        <small>{{ formatCurrency(summary.expiringValue) }}</small>
      </button>
      <button v-if="unassigned.length" class="alert" @click="showUnassigned = true">
        <strong>{{ unassigned.length }}</strong> صنف له رصيد بلا دفعة
      </button>
    </div>

    <div class="doc-tabs">
      <button v-for="t in TABS" :key="t.value" class="doc-tab" :class="{ 'is-active': filters.status === t.value }" @click="setStatus(t.value)">
        {{ t.label }}
      </button>
    </div>
    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input v-model="filters.search" class="form-input" placeholder="رقم الدفعة أو الصنف..." @input="onSearch" />
      </div>
      <select v-model="filters.warehouseId" class="form-select" @change="list.load(1)">
        <option value="">كل المخازن</option>
        <option v-for="w in inventory.warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!list.rows.value.length" class="card"><div class="empty-state">
      <CalendarClock :size="44" class="empty-state__icon" />
      <div class="empty-state__title">لا دفعات</div>
      <div class="empty-state__text">فعّل "تتبع الدفعات" على الصنف، وتُسجَّل الدفعات من فواتير الشراء وأوامر الإنتاج</div>
    </div></div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr><th>الدفعة</th><th>الصنف</th><th>الانتهاء</th><th>الرصيد</th><th>القيمة</th><th>المخازن</th><th>الحالة</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="l in list.rows.value" :key="l.id" class="is-clickable" @click="openTrace(l)">
              <td><code>{{ l.lotNumber }}</code></td>
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ l.productName }}</span>
                  <span class="doc-cell__sub">{{ l.sku }}</span>
                </div>
              </td>
              <td>
                <div class="doc-cell">
                  <span class="doc-num">{{ l.expiryDate ? formatDate(l.expiryDate) : "—" }}</span>
                  <span v-if="l.daysToExpiry !== null" class="doc-cell__sub" :class="{ 'doc-num--out': l.daysToExpiry < 0 }">
                    {{ l.daysToExpiry < 0 ? `منتهية منذ ${-l.daysToExpiry} يوم` : `بعد ${l.daysToExpiry} يوم` }}
                  </span>
                </div>
              </td>
              <td class="doc-num doc-num--strong">{{ formatNumber(l.quantity) }} {{ l.unit }}</td>
              <td class="doc-money">{{ formatCurrency(l.value) }}</td>
              <td class="doc-cell__sub">{{ l.warehouses.map((w) => `${w.name}: ${formatNumber(w.quantity)}`).join("، ") || "—" }}</td>
              <td><span :class="['badge', `doc-status--${LOT_STATUS[l.status].tone}`]">{{ LOT_STATUS[l.status].label }}</span></td>
              <td><ChevronLeft :size="16" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <DocPager v-if="list.ready.value" :total="list.total.value" :page="list.page.value" :total-pages="list.totalPages.value" label="دفعة" @change="list.load" />

    <!-- ══ تتبع الدفعة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="trace" class="modal-overlay" @click.self="trace = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3><Route :size="20" class="doc-modal__icon" /> الدفعة {{ trace.lot.lotNumber }} — {{ trace.lot.productName }}</h3>
              <button class="btn btn--icon btn--ghost" @click="trace = null"><X :size="20" /></button>
            </div>
            <div class="doc-form">
              <div class="doc-grid">
                <div class="doc-cell"><span class="doc-cell__sub">الانتهاء</span><span>{{ trace.lot.expiryDate ? formatDate(trace.lot.expiryDate) : "—" }}</span></div>
                <div class="doc-cell"><span class="doc-cell__sub">الإنتاج</span><span>{{ trace.lot.manufactureDate ? formatDate(trace.lot.manufactureDate) : "—" }}</span></div>
                <div class="doc-cell"><span class="doc-cell__sub">الرصيد الآن</span><span class="doc-num--strong">{{ formatNumber(trace.lot.quantity) }} {{ trace.lot.unit }}</span></div>
                <div class="doc-cell"><span class="doc-cell__sub">المصدر</span><span>{{ SOURCE[trace.lot.source] ?? trace.lot.source }}</span></div>
              </div>
              <div v-can="'manage_lots'" class="edit-expiry">
                <StbDateInput v-model="newExpiry" class="form-input" title="تصحيح تاريخ الانتهاء" />
                <button class="btn btn--sm btn--ghost" :disabled="busy" @click="saveExpiry">حفظ التاريخ</button>
              </div>
              <div class="table-responsive">
                <table class="data-table">
                  <thead><tr><th>الوقت</th><th>الحركة</th><th>المخزن</th><th>الكمية</th><th>المستند</th><th>العميل / المورد</th></tr></thead>
                  <tbody>
                    <tr v-for="m in trace.movements" :key="m.movementId">
                      <td class="doc-num">{{ formatDateTime(m.occurredAt) }}</td>
                      <td>{{ MOVEMENT_TYPE_LABELS[m.type as keyof typeof MOVEMENT_TYPE_LABELS] ?? m.type }}</td>
                      <td>{{ m.warehouseName }}</td>
                      <td class="doc-num" :class="m.quantity > 0 ? 'doc-num--in' : 'doc-num--out'">{{ formatSigned(m.quantity) }}</td>
                      <td>{{ m.referenceNumber || "—" }}</td>
                      <td>{{ m.partyName || "—" }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ الرصيد بلا دفعة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showUnassigned" class="modal-overlay" @click.self="showUnassigned = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3><CalendarClock :size="20" class="doc-modal__icon" /> رصيد بلا دفعة</h3>
              <button class="btn btn--icon btn--ghost" @click="showUnassigned = false"><X :size="20" /></button>
            </div>
            <div class="doc-form">
              <div class="doc-note"><Info :size="16" /><span>رصيد كان قبل تفعيل التتبع (يُصرف أولاً لأنه الأقدم). عيّنه لدفعة برقمها وتاريخ انتهائها — الرصيد لا يتغير.</span></div>
              <div v-for="row in unassigned" :key="`${row.warehouseId}-${row.productId}`" class="assign-row">
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ row.productName }}</span>
                  <span class="doc-cell__sub">{{ row.warehouseName }} · {{ formatNumber(row.unassigned) }}</span>
                </div>
                <template v-if="row.unassigned > 0">
                  <input v-model.trim="formOf(row).lotNumber" v-can="'manage_lots'" class="form-input" dir="ltr" placeholder="رقم الدفعة" />
                  <StbDateInput v-model="formOf(row).expiryDate" class="form-input" title="الانتهاء" />
                  <button v-can="'manage_lots'" class="btn btn--sm btn--primary" :disabled="busy || !formOf(row).lotNumber" @click="assign(row)">تعيين</button>
                </template>
                <span v-else class="doc-cell__sub">خرج منه أكثر مما دخل بدفعات (بيع تجاوز الرصيد)</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { CalendarClock, ChevronLeft, Info, Route, Search, X } from "lucide-vue-next";
import { useManufacturingStore } from "@/stores/manufacturing";
import { useInventoryStore } from "@/stores/inventory";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { LOT_STATUS } from "@/utils/manufacturing";
import type { LotRow, LotSummary, LotTrace, UnassignedRow } from "@/types/manufacturing";

definePageMeta({ middleware: "auth" });

const TABS = [
  { value: "in_stock", label: "بها رصيد" },
  { value: "expiring", label: "قاربت على الانتهاء" },
  { value: "expired", label: "منتهية" },
  { value: "all", label: "الكل (للتتبع)" },
];
const SOURCE: Record<string, string> = {
  purchase: "شراء",
  production: "إنتاج",
  adjustment: "تسوية",
  opening: "رصيد افتتاحي",
  other: "أخرى",
};

const store = useManufacturingStore();
const inventory = useInventoryStore();
const toast = useToast();
const filters = reactive({ status: "in_stock", search: "", warehouseId: "" });
let timer: ReturnType<typeof setTimeout> | null = null;

const list = usePagedList(
  (page) =>
    store.fetchLots({
      status: filters.status,
      search: filters.search || undefined,
      warehouseId: filters.warehouseId || undefined,
      page,
    }),
  "تعذر تحميل الدفعات",
);
const setStatus = (status: string) => {
  filters.status = status;
  list.load(1);
};
const onSearch = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => list.load(1), 300);
};

const summary = ref<LotSummary | null>(null);
const unassigned = ref<UnassignedRow[]>([]);
const showUnassigned = ref(false);
const assignForm = reactive<Record<string, { lotNumber: string; expiryDate: string }>>({});
const key = (row: UnassignedRow) => `${row.warehouseId}:${row.productId}`;
const formOf = (row: UnassignedRow) =>
  (assignForm[key(row)] ??= { lotNumber: "", expiryDate: "" });
const busy = ref(false);

const loadSide = async () => {
  try {
    [summary.value, unassigned.value] = await Promise.all([store.lotSummary(), store.unassigned()]);
    for (const row of unassigned.value) assignForm[key(row)] ??= { lotNumber: "", expiryDate: "" };
  } catch {
    // لوحة اختيارية
  }
};

const assign = async (row: UnassignedRow) => {
  const form = formOf(row);
  busy.value = true;
  try {
    await store.assignLot({
      warehouseId: row.warehouseId,
      productId: row.productId,
      quantity: row.unassigned,
      lotNumber: form.lotNumber,
      expiryDate: form.expiryDate || undefined,
    });
    toast.success("عُيّن الرصيد للدفعة");
    await Promise.all([loadSide(), list.load()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التعيين"));
  } finally {
    busy.value = false;
  }
};

const trace = ref<LotTrace | null>(null);
const newExpiry = ref("");
const openTrace = async (lot: LotRow) => {
  try {
    trace.value = await store.lotTrace(lot.id);
    newExpiry.value = trace.value.lot.expiryDate ?? "";
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الدفعة"));
  }
};
const saveExpiry = async () => {
  if (!trace.value) return;
  busy.value = true;
  try {
    await store.updateLot(trace.value.lot.id, { expiryDate: newExpiry.value || null });
    toast.success("حُفظ التاريخ");
    await openTrace(trace.value.lot);
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    busy.value = false;
  }
};

onMounted(() => {
  inventory.fetchWarehouses().catch(() => {});
  list.load(1);
  loadSide();
});
</script>

<style lang="scss" scoped>
.alerts {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
  margin-bottom: $space-4;
}

.alert {
  display: flex;
  align-items: baseline;
  gap: $space-2;
  padding: $space-3 $space-4;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  background: $stb-surface;
  cursor: pointer;
  color: inherit;

  strong {
    font-size: $font-size-lg;
  }

  small {
    color: $stb-text-muted;
  }

  &--danger strong {
    color: $stb-danger;
  }

  &--warn strong {
    color: $stb-warning;
  }
}

.is-clickable {
  cursor: pointer;
}

.edit-expiry {
  display: flex;
  gap: $space-2;
  align-items: center;
}

.assign-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr auto;
  gap: $space-2;
  align-items: center;
  padding: $space-2 0;
  border-bottom: 1px solid $stb-border;

  @include respond-to("sm") {
    grid-template-columns: 1fr;
  }
}
</style>
