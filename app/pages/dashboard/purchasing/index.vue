<!-- pages/dashboard/purchasing/index.vue — فواتير الشراء -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>فواتير الشراء</h1>
        <p>اعتماد الفاتورة يُدخل البضاعة المخزن بتكلفتها ويُسجّل المبلغ للمورد</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_purchases'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>فاتورة شراء</span>
        </button>
      </div>
    </div>

    <!-- ══ الأرقام ══ -->
    <div class="doc-stats">
      <button
        class="stat-card"
        :class="{ 'is-active': filters.payment === 'due' }"
        @click="togglePayment('due')"
      >
        <div class="stat-card__icon doc-tone--accent"><Banknote :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatCurrency(summary.payables) }}</div>
          <div class="stat-card__label">مستحق للموردين</div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ 'is-active': filters.payment === 'overdue' }"
        @click="togglePayment('overdue')"
      >
        <div class="stat-card__icon doc-tone--danger">
          <CalendarClock :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatCurrency(summary.overdue) }}</div>
          <div class="stat-card__label">متأخر السداد</div>
        </div>
      </button>
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--success">
          <ShoppingCart :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            {{ formatCurrency(summary.monthPurchases) }}
          </div>
          <div class="stat-card__label">مشتريات هذا الشهر</div>
        </div>
      </div>
      <button
        class="stat-card"
        :class="{ 'is-active': filters.status === 'draft' }"
        @click="setStatus(filters.status === 'draft' ? '' : 'draft')"
      >
        <div class="stat-card__icon doc-tone--warning">
          <FilePen :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            {{ formatNumber(summary.draftInvoices) }}
          </div>
          <div class="stat-card__label">مسودات لم تُعتمد</div>
        </div>
      </button>
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

    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="filters.search"
          class="form-input"
          placeholder="بحث برقم الفاتورة أو رقم فاتورة المورد أو اسم المورد..."
          @input="onSearchInput"
        />
      </div>
      <select
        v-model="filters.supplierId"
        class="form-select"
        @change="list.load(1)"
      >
        <option value="">كل الموردين</option>
        <option v-for="s in store.supplierOptions" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
      <select v-model="filters.payment" class="form-select" @change="list.load(1)">
        <option value="">كل حالات السداد</option>
        <option value="due">عليها متبقٍ</option>
        <option value="overdue">متأخرة السداد</option>
      </select>
    </div>

    <!-- ══ القائمة ══ -->
    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <ShoppingCart :size="44" class="empty-state__icon" />
        <div class="empty-state__title">
          {{ hasFilters ? "لا توجد فواتير مطابقة" : "لا توجد فواتير شراء بعد" }}
        </div>
        <div class="empty-state__text">
          {{
            hasFilters
              ? "جرّب تغيير كلمة البحث أو الفلاتر"
              : "سجّل أول فاتورة شراء لتدخل بضاعتها المخزن"
          }}
        </div>
        <button
          v-if="!hasFilters"
          v-can="'manage_purchases'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> فاتورة شراء
        </button>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>المورد</th>
                <th>التاريخ</th>
                <th>الإجمالي</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in list.rows.value" :key="inv.id">
                <td>
                  <div class="doc-cell">
                    <span><code class="doc-code">{{ inv.number }}</code></span>
                    <span v-if="inv.supplierReference" class="doc-cell__sub">
                      فاتورة المورد: {{ inv.supplierReference }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ inv.supplier?.name }}</span>
                    <span class="doc-cell__sub">{{ inv.warehouse?.name }}</span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-num">{{ formatDate(inv.invoiceDate) }}</span>
                    <span
                      v-if="inv.dueDate && inv.status === 'posted' && inv.remaining > 0"
                      class="doc-cell__sub"
                      :class="{ 'text-danger': isOverdue(inv) }"
                    >
                      يستحق {{ formatDate(inv.dueDate) }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="doc-money doc-money--strong">
                    {{ formatCurrency(inv.total) }}
                  </span>
                </td>
                <td>
                  <span v-if="inv.status === 'posted'" class="doc-money">
                    {{ formatCurrency(inv.remaining) }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span>
                      <span
                        :class="[
                          'badge',
                          `doc-status--${PURCHASE_INVOICE_STATUS[inv.status].tone}`,
                        ]"
                      >
                        {{ PURCHASE_INVOICE_STATUS[inv.status].label }}
                      </span>
                    </span>
                    <span v-if="inv.status === 'posted'" class="doc-cell__sub">
                      {{ PAYMENT_STATUS[inv.paymentStatus].label }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="doc-actions">
                    <template v-if="inv.status === 'draft'">
                      <button
                        v-can="'post_purchases'"
                        class="btn btn--sm btn--primary"
                        @click="askAction('post', inv)"
                      >
                        <CheckCheck :size="14" /> اعتماد
                      </button>
                      <button
                        v-can="'manage_purchases'"
                        class="btn btn--sm btn--ghost"
                        @click="openForm(inv)"
                      >
                        <Pencil :size="14" /> تعديل
                      </button>
                    </template>
                    <template v-else>
                      <button
                        v-if="inv.status === 'posted' && inv.remaining > 0"
                        v-can="'manage_supplier_payments'"
                        class="btn btn--sm btn--success"
                        @click="openPayment(inv)"
                      >
                        <Wallet :size="14" /> سداد
                      </button>
                      <button
                        class="btn btn--sm btn--ghost btn--icon"
                        title="عرض"
                        @click="openForm(inv)"
                      >
                        <Eye :size="14" />
                      </button>
                      <button
                        v-if="inv.status === 'posted'"
                        v-can="'manage_purchase_returns'"
                        class="btn btn--sm btn--ghost btn--icon"
                        title="مرتجع شراء"
                        @click="openReturn(inv.id)"
                      >
                        <Undo2 :size="14" />
                      </button>
                    </template>
                    <button
                      v-if="inv.status !== 'cancelled'"
                      v-can="'post_purchases'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="إلغاء الفاتورة"
                      @click="askAction('cancel', inv)"
                    >
                      <Ban :size="14" />
                    </button>
                  </div>
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
        label="فاتورة"
        @change="list.load"
      />
    </template>

    <!-- ══ نموذج الفاتورة (مسودة قابلة للتعديل، أو عرض فقط) ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal doc-modal invoice-modal">
            <div class="modal__header">
              <h3>
                <ShoppingCart :size="20" class="doc-modal__icon" />
                {{ form.number ? `فاتورة شراء ${form.number}` : "فاتورة شراء جديدة" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeForm"
              >
                <X :size="20" />
              </button>
            </div>

            <!-- ── عرض فاتورة معتمدة / ملغاة ── -->
            <div v-if="viewing" class="doc-form">
              <div class="doc-info">
                <div class="doc-cell">
                  <span class="doc-cell__sub">المورد</span>
                  <span class="doc-cell__main">{{ viewing.supplier?.name }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">المخزن</span>
                  <span class="doc-cell__main">{{ viewing.warehouse?.name }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">تاريخ الفاتورة</span>
                  <span class="doc-num">{{ formatDate(viewing.invoiceDate) }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">تاريخ الاستحقاق</span>
                  <span class="doc-num">
                    {{ viewing.dueDate ? formatDate(viewing.dueDate) : "—" }}
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">رقم فاتورة المورد</span>
                  <span>{{ viewing.supplierReference || "—" }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">الحالة</span>
                  <span>
                    <span
                      :class="[
                        'badge',
                        `doc-status--${PURCHASE_INVOICE_STATUS[viewing.status].tone}`,
                      ]"
                    >
                      {{ PURCHASE_INVOICE_STATUS[viewing.status].label }}
                    </span>
                  </span>
                </div>
              </div>
              <p v-if="viewing.note" class="doc-hint">{{ viewing.note }}</p>

              <div class="doc-lines" :style="{ '--doc-cols': VIEW_COLS }">
                <div class="doc-lines__head">
                  <span>الصنف</span>
                  <span>الكمية</span>
                  <span>السعر</span>
                  <span>الضريبة</span>
                  <span>الإجمالي</span>
                </div>
                <div
                  v-for="line in viewing.lines"
                  :key="line.id"
                  class="doc-lines__row"
                >
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ line.product?.name }}</span>
                    <span class="doc-cell__sub">
                      {{ line.product?.sku }}
                      <template v-if="line.returnedQuantity > 0">
                        · أُرجع {{ formatNumber(line.returnedQuantity) }}
                      </template>
                    </span>
                  </div>
                  <div>
                    <span class="doc-lines__label">الكمية</span>
                    <span class="doc-qty">
                      <span class="doc-num doc-num--strong">
                        {{ formatNumber(line.quantity) }}
                      </span>
                      <span class="doc-cell__sub">{{ line.unit?.name }}</span>
                    </span>
                  </div>
                  <div>
                    <span class="doc-lines__label">السعر</span>
                    <span class="doc-money">
                      {{ formatCurrency(line.unitPrice) }}
                    </span>
                    <span v-if="line.discount > 0" class="doc-cell__sub">
                      خصم {{ formatNumber(line.discount, 2) }}
                    </span>
                  </div>
                  <div>
                    <span class="doc-lines__label">الضريبة</span>
                    <span class="doc-num">{{ formatNumber(line.taxRate) }}%</span>
                  </div>
                  <div>
                    <span class="doc-lines__label">الإجمالي</span>
                    <span class="doc-money doc-money--strong">
                      {{ formatCurrency(line.total) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="doc-totals doc-totals--box">
                <div>
                  <span>قبل الضريبة</span>
                  <span class="doc-money">{{ formatCurrency(viewing.subtotal) }}</span>
                </div>
                <div>
                  <span>الضريبة</span>
                  <span class="doc-money">{{ formatCurrency(viewing.taxTotal) }}</span>
                </div>
                <div class="is-grand">
                  <span>الإجمالي</span>
                  <span class="doc-money">{{ formatCurrency(viewing.total) }}</span>
                </div>
                <template v-if="viewing.status === 'posted'">
                  <div v-if="viewing.returnedAmount > 0">
                    <span>مرتجع</span>
                    <span class="doc-money">
                      {{ formatCurrency(viewing.returnedAmount) }}
                    </span>
                  </div>
                  <div>
                    <span>مدفوع</span>
                    <span class="doc-money">
                      {{ formatCurrency(viewing.paidAmount) }}
                    </span>
                  </div>
                  <div class="is-grand">
                    <span>المتبقي للمورد</span>
                    <span class="doc-money">
                      {{ formatCurrency(viewing.remaining) }}
                    </span>
                  </div>
                </template>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeForm">
                  إغلاق
                </button>
                <template v-if="viewing.status === 'posted'">
                  <button
                    v-can="'manage_purchase_returns'"
                    type="button"
                    class="btn btn--secondary"
                    @click="openReturn(viewing.id)"
                  >
                    <Undo2 :size="16" /> مرتجع
                  </button>
                  <button
                    v-if="viewing.remaining > 0"
                    v-can="'manage_supplier_payments'"
                    type="button"
                    class="btn btn--success"
                    @click="openPayment(viewing)"
                  >
                    <Wallet :size="16" /> سداد
                  </button>
                </template>
              </div>
            </div>

            <!-- ── إدخال / تعديل مسودة ── -->
            <form v-else class="doc-form" @submit.prevent="submitForm(false)">
              <div class="doc-grid">
                <div class="form-group">
                  <label>المورد *</label>
                  <select
                    v-model="form.supplierId"
                    class="form-select"
                    required
                    @change="onSupplierChange"
                  >
                    <option value="" disabled>اختر المورد...</option>
                    <option
                      v-for="s in store.supplierOptions"
                      :key="s.id"
                      :value="s.id"
                    >
                      {{ s.name }}
                    </option>
                  </select>
                  <small v-if="!store.supplierOptions.length" class="doc-hint">
                    لا يوجد موردون —
                    <NuxtLink to="/dashboard/purchasing/suppliers">أضف مورداً</NuxtLink>
                  </small>
                </div>
                <div class="form-group">
                  <label>يدخل مخزن *</label>
                  <select
                    v-model="form.warehouseId"
                    class="form-select"
                    required
                  >
                    <option value="" disabled>اختر المخزن...</option>
                    <option v-for="w in activeWarehouses" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>تاريخ الفاتورة *</label>
                  <StbDateInput
                    v-model="form.invoiceDate"
                    class="form-input"
                    required
                    @update:model-value="suggestDueDate"
                  />
                </div>
                <div class="form-group">
                  <label>تاريخ الاستحقاق</label>
                  <StbDateInput
                    v-model="form.dueDate"
                    class="form-input"
                    :min="form.invoiceDate"
                  />
                </div>
                <div class="form-group">
                  <label>رقم فاتورة المورد</label>
                  <input
                    v-model.trim="form.supplierReference"
                    class="form-input"
                    dir="ltr"
                    maxlength="60"
                    placeholder="كما هو مطبوع على فاتورته"
                  />
                </div>
                <div class="form-group">
                  <label>ملاحظة</label>
                  <input
                    v-model.trim="form.note"
                    class="form-input"
                    maxlength="500"
                    placeholder="اختياري"
                  />
                </div>
              </div>

              <section class="doc-section">
                <div class="section-head">
                  <h4 class="doc-section__title">الأصناف</h4>
                  <label class="checkbox-label">
                    <input v-model="form.pricesIncludeTax" type="checkbox" />
                    <span>الأسعار شاملة الضريبة</span>
                  </label>
                </div>

                <StockProductPicker
                  :warehouse-id="form.warehouseId"
                  @pick="addLine"
                />

                <div class="doc-lines" :style="{ '--doc-cols': FORM_COLS }">
                  <div class="doc-lines__head">
                    <span>الصنف</span>
                    <span>الوحدة</span>
                    <span>الكمية</span>
                    <span>السعر</span>
                    <span>خصم</span>
                    <span>الإجمالي</span>
                    <span />
                  </div>
                  <div v-if="!form.lines.length" class="doc-lines__empty">
                    لم تُضف أصناف بعد — ابحث عن صنف بالأعلى أو امسح الباركود
                  </div>
                  <div
                    v-for="(line, index) in form.lines"
                    :key="line.key"
                    class="doc-lines__row"
                  >
                    <div class="doc-cell">
                      <span class="doc-cell__main">{{ line.name }}</span>
                      <span class="doc-cell__sub">
                        {{ line.sku }} · ضريبة {{ formatNumber(line.taxRate) }}%
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">الوحدة</span>
                      <select
                        v-model="line.unitId"
                        class="form-select"
                        @change="onUnitChange(line)"
                      >
                        <option v-for="u in line.units" :key="u.id" :value="u.id">
                          {{ u.name }}
                        </option>
                      </select>
                    </div>
                    <div>
                      <span class="doc-lines__label">الكمية</span>
                      <StbNumberInput
                        v-model.number="line.quantity"
                        class="form-input"
                        min="0.0001"
                        step="any"
                        required
                      />
                    </div>
                    <div>
                      <span class="doc-lines__label">السعر</span>
                      <StbNumberInput
                        v-model.number="line.unitPrice"
                        class="form-input"
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                    <div>
                      <span class="doc-lines__label">خصم</span>
                      <StbNumberInput
                        v-model.number="line.discount"
                        class="form-input"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <span class="doc-lines__label">الإجمالي</span>
                      <span class="doc-money doc-money--strong">
                        {{ formatCurrency(amountsOf(line).total) }}
                      </span>
                    </div>
                    <button
                      type="button"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="form.lines.splice(index, 1)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>

                <div class="doc-totals doc-totals--box">
                  <div>
                    <span>قبل الضريبة</span>
                    <span class="doc-money">{{ formatCurrency(totals.subtotal) }}</span>
                  </div>
                  <div>
                    <span>الضريبة</span>
                    <span class="doc-money">{{ formatCurrency(totals.tax) }}</span>
                  </div>
                  <div class="is-grand">
                    <span>الإجمالي</span>
                    <span class="doc-money">{{ formatCurrency(totals.total) }}</span>
                  </div>
                </div>
              </section>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeForm">
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--secondary"
                  :disabled="submitting || !form.lines.length"
                >
                  حفظ كمسودة
                </button>
                <button
                  v-can="'post_purchases'"
                  type="button"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting || !form.lines.length"
                  @click="submitAndPost"
                >
                  <CheckCheck :size="16" /> حفظ واعتماد
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <SupplierPaymentModal
      v-model="showPayment"
      :invoice="paymentInvoice"
      @saved="afterChange"
    />
    <PurchaseReturnModal
      v-model="showReturn"
      :invoice-id="returnInvoiceId"
      @saved="afterChange"
    />

    <ConfirmDialog
      v-model="showConfirm"
      :title="pendingAction === 'post' ? 'اعتماد الفاتورة' : 'إلغاء الفاتورة'"
      :message="confirmMessage"
      :confirm-text="pendingAction === 'post' ? 'اعتماد' : 'إلغاء الفاتورة'"
      :loading="acting"
      @confirm="runAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  Ban,
  Banknote,
  CalendarClock,
  CheckCheck,
  Eye,
  FilePen,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Undo2,
  Wallet,
  X,
} from "lucide-vue-next";
import { useCatalogStore } from "@/stores/catalog";
import { useInventoryStore } from "@/stores/inventory";
import { usePurchasingStore } from "@/stores/purchasing";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type { StockLookupRow } from "@/types/inventory";
import type {
  PurchaseInvoice,
  PurchaseInvoicePayload,
  PurchaseInvoiceStatus,
  PurchasingSummary,
} from "@/types/purchasing";

definePageMeta({ middleware: "auth" });

const store = usePurchasingStore();
const inventory = useInventoryStore();
const catalog = useCatalogStore();
const toast = useToast();

const FORM_COLS = "2fr 1fr 0.9fr 1fr 0.8fr 1fr auto";
const VIEW_COLS = "2fr 1fr 1fr 0.6fr 1fr";

const STATUS_TABS: { value: PurchaseInvoiceStatus | ""; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "posted", label: "معتمدة" },
  { value: "cancelled", label: "ملغاة" },
];

// ─── الفلاتر والقائمة ─────────────────────────────────────────────────────────
const filters = reactive({
  search: "",
  status: "" as PurchaseInvoiceStatus | "",
  supplierId: "",
  payment: "" as "due" | "overdue" | "",
});

const hasFilters = computed(
  () =>
    !!filters.search ||
    !!filters.status ||
    !!filters.supplierId ||
    !!filters.payment,
);

const list = usePagedList(
  (page) => store.fetchInvoices({ ...filters, page }),
  "تعذر تحميل فواتير الشراء",
);

const summary = ref<PurchasingSummary>({
  payables: 0,
  overdue: 0,
  monthPurchases: 0,
  draftInvoices: 0,
});

const loadSummary = async () => {
  try {
    summary.value = await store.fetchSummary();
  } catch {
    // الأرقام العلوية مكمّلة: فشلها لا يمنع عرض القائمة
  }
};

/** بعد أي عملية تغيّر المبالغ: القائمة + الأرقام + الفاتورة المعروضة */
const afterChange = async () => {
  await Promise.all([list.load(), loadSummary()]);
  if (viewing.value) {
    try {
      viewing.value = await store.getInvoice(viewing.value.id);
    } catch {
      showForm.value = false;
    }
  }
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => list.load(1), 350);
};

const setStatus = (status: PurchaseInvoiceStatus | "") => {
  filters.status = status;
  list.load(1);
};

const togglePayment = (payment: "due" | "overdue") => {
  filters.payment = filters.payment === payment ? "" : payment;
  list.load(1);
};

const isOverdue = (invoice: PurchaseInvoice) =>
  !!invoice.dueDate && invoice.dueDate < todayStamp();

const activeWarehouses = computed(() =>
  inventory.warehouses.filter((w) => w.isActive),
);

// ─── النموذج ──────────────────────────────────────────────────────────────────
interface UnitOption {
  id: string;
  name: string;
  factor: number;
}

interface FormLine {
  key: number;
  productId: string;
  name: string;
  sku: string;
  taxRate: number;
  units: UnitOption[];
  unitId: string;
  /** متوسط تكلفة وحدة الأساس (لاقتراح السعر) — 0 إن لم يُشترَ من قبل */
  baseCost: number;
  quantity: number | "";
  unitPrice: number | "";
  discount: number | "";
}

let lineKey = 0;

const showForm = ref(false);
const submitting = ref(false);
/** فاتورة معتمدة/ملغاة معروضة للقراءة فقط */
const viewing = ref<PurchaseInvoice | null>(null);
const form = reactive({
  id: null as string | null,
  number: "",
  supplierId: "",
  warehouseId: "",
  invoiceDate: "",
  dueDate: "",
  supplierReference: "",
  note: "",
  pricesIncludeTax: false,
  lines: [] as FormLine[],
});

const amountsOf = (line: FormLine) =>
  previewPurchaseLine({
    quantity: Number(line.quantity) || 0,
    unitPrice: Number(line.unitPrice) || 0,
    discount: Number(line.discount) || 0,
    taxRate: line.taxRate,
    pricesIncludeTax: form.pricesIncludeTax,
  });

const totals = computed(() => {
  const amounts = form.lines.map(amountsOf);
  return {
    subtotal: sumMoney(amounts.map((a) => a.subtotal)),
    tax: sumMoney(amounts.map((a) => a.taxAmount)),
    total: sumMoney(amounts.map((a) => a.total)),
  };
});

const addDays = (date: string, days: number) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};

/** تاريخ الاستحقاق = تاريخ الفاتورة + مهلة سداد المورد */
const suggestDueDate = () => {
  const supplier = store.supplierOptions.find((s) => s.id === form.supplierId);
  if (supplier && form.invoiceDate) {
    form.dueDate = addDays(form.invoiceDate, supplier.paymentTermsDays);
  }
};

const onSupplierChange = () => suggestDueDate();

const openCreate = () => {
  viewing.value = null;
  Object.assign(form, {
    id: null,
    number: "",
    supplierId: filters.supplierId,
    warehouseId:
      activeWarehouses.value.find((w) => w.type === "main")?.id ?? "",
    invoiceDate: todayStamp(),
    dueDate: "",
    supplierReference: "",
    note: "",
    pricesIncludeTax: false,
    lines: [],
  });
  suggestDueDate();
  showForm.value = true;
};

/** مسودة ← نموذج التعديل، غيرها ← العرض */
const openForm = async (invoice: PurchaseInvoice) => {
  try {
    const full = await store.getInvoice(invoice.id);
    if (full.status !== "draft") {
      viewing.value = full;
      form.number = full.number;
      showForm.value = true;
      return;
    }

    viewing.value = null;
    Object.assign(form, {
      id: full.id,
      number: full.number,
      supplierId: full.supplierId,
      warehouseId: full.warehouseId,
      invoiceDate: full.invoiceDate,
      dueDate: full.dueDate ?? "",
      supplierReference: full.supplierReference ?? "",
      note: full.note ?? "",
      pricesIncludeTax: full.pricesIncludeTax,
      lines: (full.lines ?? []).map((line): FormLine => {
        // الوحدات المتاحة عند التعديل: الأساس + وحدة السطر (لتغييرها إلى
        // وحدة أخرى يُحذف السطر ويُضاف من جديد)
        const baseUnitId = line.product?.baseUnitId ?? line.unitId;
        const units: UnitOption[] = [
          {
            id: baseUnitId,
            name: line.product?.baseUnit?.name ?? line.unit?.name ?? "",
            factor: 1,
          },
        ];
        if (line.unitId !== baseUnitId) {
          units.push({
            id: line.unitId,
            name: line.unit?.name ?? "",
            factor: line.factor,
          });
        }
        return {
          key: ++lineKey,
          productId: line.productId,
          name: line.product?.name ?? "",
          sku: line.product?.sku ?? "",
          taxRate: line.taxRate,
          units,
          unitId: line.unitId,
          baseCost: 0,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount || "",
        };
      }),
    });
    showForm.value = true;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الفاتورة"));
  }
};

const closeForm = () => {
  if (!submitting.value) showForm.value = false;
};

/** السعر المقترح للوحدة = متوسط التكلفة × معامل الوحدة (إن وُجد متوسط) */
const suggestedPrice = (line: FormLine): number | "" => {
  if (line.baseCost <= 0) return "";
  const factor = line.units.find((u) => u.id === line.unitId)?.factor ?? 1;
  return Math.round(line.baseCost * factor * 10000) / 10000;
};

const onUnitChange = (line: FormLine) => {
  const price = suggestedPrice(line);
  if (price !== "") line.unitPrice = price;
};

const addLine = async (row: StockLookupRow) => {
  try {
    // التفاصيل الكاملة: وحدات الشراء ونسبة الضريبة
    const product = await catalog.getProduct(row.productId);
    const line: FormLine = {
      key: ++lineKey,
      productId: product.id,
      name: product.name,
      sku: product.sku,
      taxRate: product.taxRate?.rate ?? 0,
      units: [
        {
          id: product.baseUnitId,
          name: product.baseUnit?.name ?? "وحدة الأساس",
          factor: 1,
        },
        ...(product.units ?? []).map((u) => ({
          id: u.unitId,
          name: u.unit?.name ?? "",
          factor: u.factor,
        })),
      ],
      unitId: product.baseUnitId,
      baseCost: row.avgCost,
      quantity: "",
      unitPrice: "",
      discount: "",
    };
    line.unitPrice = suggestedPrice(line);
    form.lines.push(line);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إضافة الصنف"));
  }
};

const buildPayload = (): PurchaseInvoicePayload => ({
  supplierId: form.supplierId,
  warehouseId: form.warehouseId,
  supplierReference: form.supplierReference || undefined,
  invoiceDate: form.invoiceDate,
  dueDate: form.dueDate || undefined,
  pricesIncludeTax: form.pricesIncludeTax,
  note: form.note || undefined,
  lines: form.lines.map((l) => ({
    productId: l.productId,
    unitId: l.unitId,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    discount: Number(l.discount) || 0,
  })),
});

/** يحفظ المسودة، ثم يعتمدها إن طُلب */
const submitForm = async (post: boolean) => {
  submitting.value = true;
  try {
    const saved = form.id
      ? await store.updateInvoice(form.id, buildPayload())
      : await store.createInvoice(buildPayload());
    // من هنا فشل الاعتماد يُبقي المسودة محفوظة: نكمل عليها
    form.id = saved.id;
    form.number = saved.number;

    if (post) {
      await store.postInvoice(saved.id);
      toast.success(`تم اعتماد الفاتورة ${saved.number} ودخلت بضاعتها المخزن`);
    } else {
      toast.success(`تم حفظ الفاتورة ${saved.number} كمسودة`);
    }
    showForm.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الفاتورة"));
  } finally {
    submitting.value = false;
    await Promise.all([list.load(), loadSummary()]);
  }
};

const submitAndPost = (event: MouseEvent) => {
  const formEl = (event.currentTarget as HTMLElement).closest("form");
  if (formEl && !formEl.reportValidity()) return;
  submitForm(true);
};

// ─── السداد والمرتجع ──────────────────────────────────────────────────────────
const showPayment = ref(false);
const paymentInvoice = ref<PurchaseInvoice | null>(null);
const showReturn = ref(false);
const returnInvoiceId = ref<string | null>(null);

const openPayment = (invoice: PurchaseInvoice) => {
  paymentInvoice.value = invoice;
  showPayment.value = true;
};

const openReturn = (invoiceId: string) => {
  returnInvoiceId.value = invoiceId;
  showReturn.value = true;
};

// ─── اعتماد / إلغاء من القائمة ────────────────────────────────────────────────
const showConfirm = ref(false);
const acting = ref(false);
const pendingAction = ref<"post" | "cancel">("post");
const actionTarget = ref<PurchaseInvoice | null>(null);

const confirmMessage = computed(() => {
  const invoice = actionTarget.value;
  if (!invoice) return "";
  if (pendingAction.value === "post") {
    return `اعتماد الفاتورة ${invoice.number} يُدخل بضاعتها "${invoice.warehouse?.name}" ويُسجّل ${formatCurrency(invoice.total)} مستحقة للمورد "${invoice.supplier?.name}".`;
  }
  return invoice.status === "posted"
    ? `إلغاء الفاتورة ${invoice.number} يُخرج بضاعتها من "${invoice.warehouse?.name}" ويلغي المستحق للمورد.`
    : `هل تريد إلغاء المسودة ${invoice.number}؟`;
});

const askAction = (action: "post" | "cancel", invoice: PurchaseInvoice) => {
  pendingAction.value = action;
  actionTarget.value = invoice;
  showConfirm.value = true;
};

const runAction = async () => {
  if (!actionTarget.value) return;
  acting.value = true;
  try {
    if (pendingAction.value === "post") {
      await store.postInvoice(actionTarget.value.id);
      toast.success("تم اعتماد الفاتورة");
    } else {
      await store.cancelInvoice(actionTarget.value.id);
      toast.success("تم إلغاء الفاتورة");
    }
    showConfirm.value = false;
    await Promise.all([list.load(), loadSummary()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تنفيذ العملية"));
  } finally {
    acting.value = false;
  }
};

onMounted(() => {
  store.fetchSupplierOptions(true).catch(() => {});
  inventory.fetchWarehouses().catch(() => {});
  list.load(1);
  loadSummary();
});
</script>

<style lang="scss" scoped>
.modal.invoice-modal {
  max-width: 980px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $space-2 $space-4;
}
</style>
