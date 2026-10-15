<!-- pages/dashboard/delivery/settlements.vue — تسويات الطيارين وشركات الشحن -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>تسويات التوصيل</h1>
        <p>
          استلام ما حصّله الطيار أو حوّلته شركة الشحن، بعد خصم أجرتها، مقابل
          الأوردرات المنتهية
        </p>
      </div>
      <div class="page-header__actions">
        <button v-can="'settle_delivery'" class="btn btn--primary" @click="openSettle()">
          <HandCoins :size="18" />
          <span>تسوية جديدة</span>
        </button>
      </div>
    </div>

    <div class="card doc-filters">
      <select v-model="filterAgentId" class="form-select" @change="list.load(1)">
        <option value="">كل الطيارين والشركات</option>
        <option v-for="a in store.agents" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <HandCoins :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد تسويات بعد</div>
        <div class="empty-state__text">
          بعد تسليم الأوردرات، سوِّ حساب الطيار أو كشف شركة الشحن من هنا
        </div>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>الجهة</th>
                <th>الأوردرات</th>
                <th>المحصّل</th>
                <th>الرسوم</th>
                <th>المستلم</th>
                <th>الفرق</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in list.rows.value" :key="s.id">
                <td>
                  <div class="doc-cell">
                    <code class="doc-code">{{ s.number }}</code>
                    <span class="doc-cell__sub">{{ formatDateTime(s.settledAt) }}</span>
                  </div>
                </td>
                <td><span class="doc-cell__main">{{ s.agent?.name }}</span></td>
                <td><span class="doc-num">{{ formatNumber(s.ordersCount) }}</span></td>
                <td><span class="doc-money">{{ formatCurrency(s.collectedTotal) }}</span></td>
                <td><span class="doc-money">{{ formatCurrency(s.feesTotal) }}</span></td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-money doc-money--strong">{{ formatCurrency(s.receivedAmount) }}</span>
                    <span class="doc-cell__sub">{{ PUBLIC_SALES_PAYMENT_METHOD_LABELS[s.method] }}</span>
                  </div>
                </td>
                <td>
                  <span class="doc-money" :class="differenceClass(s.difference)">
                    {{ differenceLabel(s.difference) }}
                  </span>
                </td>
                <td>
                  <button class="btn btn--sm btn--ghost btn--icon" title="التفاصيل" @click="openDetails(s.id)">
                    <Eye :size="14" />
                  </button>
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
        label="تسوية"
        @change="list.load"
      />
    </template>

    <!-- ══ تسوية جديدة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSettle" class="modal-overlay" @click.self="closeSettle">
          <div class="modal doc-modal invoice-modal">
            <div class="modal__header">
              <h3>
                <HandCoins :size="20" class="doc-modal__icon" />
                تسوية جديدة
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="closeSettle">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="submitSettle">
              <div class="form-group">
                <label>الطيار / شركة الشحن *</label>
                <select v-model="settleForm.agentId" class="form-select" required @change="loadOrders">
                  <option value="" disabled>اختر...</option>
                  <option v-for="a in store.agents" :key="a.id" :value="a.id">
                    {{ a.name }}
                    <template v-if="a.unsettledCount">
                      — {{ a.unsettledCount }} أوردر · معه {{ formatCurrency(a.heldAmount) }}
                    </template>
                  </option>
                </select>
              </div>

              <div v-if="loadingOrders" class="empty-state"><div class="spinner" /></div>
              <div v-else-if="settleForm.agentId && !orders.length" class="doc-note">
                <Info :size="16" />
                <span>لا توجد أوردرات منتهية (مسلَّمة أو راجعة) لم تُسوَّ مع هذه الجهة.</span>
              </div>

              <template v-else-if="orders.length">
                <div class="doc-lines" :style="{ '--doc-cols': 'auto 1fr 1.6fr 1fr 1fr 1fr' }">
                  <div class="doc-lines__head">
                    <span>
                      <input
                        type="checkbox"
                        :checked="selected.size === orders.length"
                        aria-label="تحديد الكل"
                        @change="toggleAll"
                      />
                    </span>
                    <span>الأوردر</span>
                    <span>المستلم</span>
                    <span>الحالة</span>
                    <span>المحصّل</span>
                    <span>التكلفة</span>
                  </div>
                  <label v-for="o in orders" :key="o.id" class="doc-lines__row dlv-pick">
                    <input type="checkbox" :checked="selected.has(o.id)" @change="toggle(o.id)" />
                    <span class="doc-cell">
                      <code class="doc-code">{{ o.number }}</code>
                      <span v-if="o.trackingNumber" class="doc-cell__sub" dir="ltr">{{ o.trackingNumber }}</span>
                    </span>
                    <span class="doc-cell__main">{{ o.recipientName }}</span>
                    <span>
                      <span :class="['badge', o.status === 'delivered' ? 'doc-status--done' : 'doc-status--cancelled']">
                        {{ o.status === "delivered" ? "سُلّم" : "راجع" }}
                      </span>
                    </span>
                    <span class="doc-money">{{ formatCurrency(collectedOf(o)) }}</span>
                    <span class="doc-money">{{ formatCurrency(o.agentFee) }}</span>
                  </label>
                </div>

                <div class="doc-grid">
                  <div class="form-group">
                    <label>رسوم الجهة الفعلية</label>
                    <StbNumberInput
                      v-model.number="settleForm.feesTotal"
                      class="form-input"
                      min="0"
                      :step="moneyStep()"
                      :placeholder="String(figures.fees)"
                    />
                    <small class="doc-hint">فارغ = مجموع تكلفة الأوردرات ({{ formatCurrency(figures.fees) }})</small>
                  </div>
                  <div class="form-group">
                    <label>المستلم فعلاً *</label>
                    <StbNumberInput
                      v-model.number="settleForm.receivedAmount"
                      class="form-input"
                      :step="moneyStep()"
                      required
                    />
                    <small class="doc-hint">سالب = دفعنا للجهة (رسوم أكبر من المحصّل)</small>
                  </div>
                  <div class="form-group">
                    <label>طريقة الاستلام *</label>
                    <select v-model="settleForm.method" class="form-select">
                      <option v-for="(label, m) in PUBLIC_SALES_PAYMENT_METHOD_LABELS" :key="m" :value="m">
                        {{ label }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>ملاحظة</label>
                    <input v-model.trim="settleForm.note" class="form-input" maxlength="500" placeholder="رقم الكشف أو التحويل..." />
                  </div>
                </div>

                <div class="doc-totals doc-totals--box">
                  <div>
                    <span>المحصّل ({{ formatNumber(selected.size) }} أوردر)</span>
                    <span class="doc-money">{{ formatCurrency(figures.collected) }}</span>
                  </div>
                  <div>
                    <span>− الرسوم</span>
                    <span class="doc-money">{{ formatCurrency(figures.feesUsed) }}</span>
                  </div>
                  <div>
                    <span>المتوقع</span>
                    <span class="doc-money">{{ formatCurrency(figures.expected) }}</span>
                  </div>
                  <div class="is-grand">
                    <span>الفرق</span>
                    <span class="doc-money" :class="differenceClass(figures.difference)">
                      {{ differenceLabel(figures.difference) }}
                    </span>
                  </div>
                </div>
              </template>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeSettle">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting || !selected.size"
                >
                  اعتماد التسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ تفاصيل تسوية ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="details" class="modal-overlay" @click.self="details = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <HandCoins :size="20" class="doc-modal__icon" />
                {{ details.number }} — {{ details.agent?.name }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="details = null">
                <X :size="20" />
              </button>
            </div>
            <div class="doc-form">
              <div class="doc-lines" :style="{ '--doc-cols': '1fr 1.6fr 1fr 1fr 1fr' }">
                <div class="doc-lines__head">
                  <span>الأوردر</span>
                  <span>المستلم</span>
                  <span>الحالة</span>
                  <span>المحصّل</span>
                  <span>التكلفة</span>
                </div>
                <div v-for="o in details.orders ?? []" :key="o.id" class="doc-lines__row">
                  <code class="doc-code">{{ o.number }}</code>
                  <span>{{ o.recipientName }}</span>
                  <span>{{ o.status === "delivered" ? "سُلّم" : "راجع" }}</span>
                  <span class="doc-money">{{ formatCurrency(collectedOf(o)) }}</span>
                  <span class="doc-money">{{ formatCurrency(o.agentFee) }}</span>
                </div>
              </div>
              <div class="doc-totals doc-totals--box">
                <div><span>المحصّل</span><span class="doc-money">{{ formatCurrency(details.collectedTotal) }}</span></div>
                <div><span>− الرسوم</span><span class="doc-money">{{ formatCurrency(details.feesTotal) }}</span></div>
                <div><span>المتوقع</span><span class="doc-money">{{ formatCurrency(details.expectedAmount) }}</span></div>
                <div>
                  <span>المستلم ({{ PUBLIC_SALES_PAYMENT_METHOD_LABELS[details.method] }})</span>
                  <span class="doc-money">{{ formatCurrency(details.receivedAmount) }}</span>
                </div>
                <div class="is-grand">
                  <span>الفرق</span>
                  <span class="doc-money" :class="differenceClass(details.difference)">
                    {{ differenceLabel(details.difference) }}
                  </span>
                </div>
              </div>
              <p v-if="details.note" class="doc-hint">ملاحظة: {{ details.note }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Eye, HandCoins, Info, X } from "lucide-vue-next";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { useDeliveryStore } from "@/stores/delivery";
import type { DeliveryOrder, DeliverySettlement } from "@/types/delivery";
import type { PublicSalesPaymentMethod } from "@/types/sales";

definePageMeta({ middleware: "auth" });

const store = useDeliveryStore();
const toast = useToast();
const route = useRoute();

const filterAgentId = ref("");
const list = usePagedList(
  (page) => store.fetchSettlements({ agentId: filterAgentId.value || undefined, page }),
  "تعذر تحميل التسويات",
);

const differenceLabel = (value: number) =>
  value === 0
    ? "مطابق"
    : value < 0
      ? `عجز ${formatCurrency(-value)}`
      : `زيادة ${formatCurrency(value)}`;

const differenceClass = (value: number) =>
  value < 0 ? "text-danger" : value > 0 ? "text-success" : "";

/** ما حصّلته الجهة من الأوردر: المسلَّم بالتحصيل فقط */
const collectedOf = (o: DeliveryOrder) => (o.status === "delivered" ? o.codAmount : 0);

// ─── تسوية جديدة ──────────────────────────────────────────────────────────────
const showSettle = ref(false);
const submitting = ref(false);
const loadingOrders = ref(false);
const orders = ref<DeliveryOrder[]>([]);
const selected = ref(new Set<string>());
const settleForm = reactive({
  agentId: "",
  feesTotal: "" as number | "",
  receivedAmount: "" as number | "",
  method: "cash" as PublicSalesPaymentMethod,
  note: "",
});

const figures = computed(() => {
  const picked = orders.value.filter((o) => selected.value.has(o.id));
  const collected = sumMoney(picked.map(collectedOf));
  const fees = sumMoney(picked.map((o) => o.agentFee));
  const feesUsed = settleForm.feesTotal === "" ? fees : Number(settleForm.feesTotal);
  const expected = sumMoney([collected, -feesUsed]);
  const received = Number(settleForm.receivedAmount) || 0;
  return { collected, fees, feesUsed, expected, difference: sumMoney([received, -expected]) };
});

const loadOrders = async () => {
  orders.value = [];
  selected.value = new Set();
  if (!settleForm.agentId) return;
  loadingOrders.value = true;
  try {
    const res = await store.fetchOrders({
      agentId: settleForm.agentId,
      unsettled: "true",
      limit: 200,
    });
    orders.value = res.data;
    selected.value = new Set(res.data.map((o) => o.id));
    settleForm.feesTotal = "";
    settleForm.receivedAmount = figures.value.expected;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الأوردرات"));
  } finally {
    loadingOrders.value = false;
  }
};

const toggle = (id: string) => {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
};

const toggleAll = () => {
  selected.value =
    selected.value.size === orders.value.length
      ? new Set()
      : new Set(orders.value.map((o) => o.id));
};

const openSettle = async (agentId = "") => {
  Object.assign(settleForm, {
    agentId,
    feesTotal: "",
    receivedAmount: "",
    method: "cash",
    note: "",
  });
  orders.value = [];
  selected.value = new Set();
  showSettle.value = true;
  if (agentId) await loadOrders();
};

const closeSettle = () => {
  if (!submitting.value) showSettle.value = false;
};

const submitSettle = async () => {
  submitting.value = true;
  try {
    const settlement = await store.settle({
      agentId: settleForm.agentId,
      orderIds: [...selected.value],
      ...(settleForm.feesTotal !== "" ? { feesTotal: Number(settleForm.feesTotal) } : {}),
      receivedAmount: Number(settleForm.receivedAmount) || 0,
      method: settleForm.method,
      note: settleForm.note || null,
    });
    toast.success(`تم اعتماد التسوية ${settlement.number}`);
    showSettle.value = false;
    await Promise.all([list.load(1), store.fetchAgents()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر اعتماد التسوية"));
  } finally {
    submitting.value = false;
  }
};

const details = ref<DeliverySettlement | null>(null);
const openDetails = async (id: string) => {
  try {
    details.value = await store.getSettlement(id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل التسوية"));
  }
};

onMounted(async () => {
  list.load(1);
  await store.fetchAgents().catch(() => {});
  // من صفحة الطيارين: "تسوية" تفتح النموذج على الجهة مباشرة
  const agentId = typeof route.query.agentId === "string" ? route.query.agentId : "";
  if (agentId) openSettle(agentId);
});
</script>

<style scoped lang="scss">
.dlv-pick {
  cursor: pointer;
}
</style>
