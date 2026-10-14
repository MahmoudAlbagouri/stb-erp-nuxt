<!-- pages/dashboard/sales/index.vue — فواتير البيع -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>فواتير البيع</h1>
        <p>الإصدار يعطي الفاتورة رقمها التسلسلي ورمز QR ويُخرج بضاعتها من المخزن</p>
      </div>
      <div class="page-header__actions">
        <button v-can="'manage_sales'" class="btn btn--primary" @click="openCreate">
          <Plus :size="18" />
          <span>فاتورة بيع</span>
        </button>
      </div>
    </div>

    <!-- ══ الأرقام ══ -->
    <div class="doc-stats">
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--success"><Banknote :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatCurrency(summary.todaySales) }}</div>
          <div class="stat-card__label">مبيعات اليوم</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--accent">
          <TrendingUp :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatCurrency(summary.monthSales) }}</div>
          <div class="stat-card__label">
            مبيعات الشهر
            <template v-if="summary.monthProfit !== null">
              · ربح {{ formatCurrency(summary.monthProfit) }}
            </template>
          </div>
        </div>
      </div>
      <button
        class="stat-card"
        :class="{ 'is-active': filters.payment === 'due' }"
        @click="togglePayment('due')"
      >
        <div class="stat-card__icon doc-tone--warning">
          <HandCoins :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatCurrency(summary.receivables) }}</div>
          <div class="stat-card__label">على العملاء</div>
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
          <div class="stat-card__label">متأخر التحصيل</div>
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
        <template v-if="tab.value === 'draft' && summary.draftInvoices">
          ({{ formatNumber(summary.draftInvoices) }})
        </template>
      </button>
    </div>

    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="filters.search"
          class="form-input"
          placeholder="بحث برقم الفاتورة أو اسم العميل أو هاتفه..."
          @input="onSearchInput"
        />
      </div>
      <select
        v-model="filters.customerId"
        class="form-select"
        @change="list.load(1)"
      >
        <option value="">كل العملاء</option>
        <option v-for="c in store.customerOptions" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select>
      <select v-model="filters.payment" class="form-select" @change="list.load(1)">
        <option value="">كل حالات التحصيل</option>
        <option value="due">عليها متبقٍ</option>
        <option value="overdue">متأخرة التحصيل</option>
      </select>
    </div>

    <!-- ══ القائمة ══ -->
    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <ReceiptText :size="44" class="empty-state__icon" />
        <div class="empty-state__title">
          {{ hasFilters ? "لا توجد فواتير مطابقة" : "لا توجد فواتير بيع بعد" }}
        </div>
        <div class="empty-state__text">
          {{
            hasFilters
              ? "جرّب تغيير كلمة البحث أو الفلاتر"
              : "أصدر أول فاتورة بيع لعملائك"
          }}
        </div>
        <button
          v-if="!hasFilters"
          v-can="'manage_sales'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> فاتورة بيع
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
                <th>العميل</th>
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
                  <code v-if="inv.number" class="doc-code">{{ inv.number }}</code>
                  <span v-else class="doc-cell__sub">بلا رقم بعد</span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">
                      {{ customerLabel(inv.customer) }}
                    </span>
                    <span class="doc-cell__sub">{{ inv.warehouse?.name }}</span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-num">{{ formatDate(inv.invoiceDate) }}</span>
                    <span
                      v-if="inv.dueDate && inv.status === 'issued' && inv.remaining > 0"
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
                  <span v-if="inv.status === 'issued'" class="doc-money">
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
                          `doc-status--${SALES_INVOICE_STATUS[inv.status].tone}`,
                        ]"
                      >
                        {{ SALES_INVOICE_STATUS[inv.status].label }}
                      </span>
                    </span>
                    <span v-if="inv.status === 'issued'" class="doc-cell__sub">
                      {{ PAYMENT_STATUS[inv.paymentStatus].label }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="doc-actions">
                    <template v-if="inv.status === 'draft'">
                      <button
                        v-can="'issue_sales'"
                        v-quota="'max_invoices'"
                        class="btn btn--sm btn--primary"
                        @click="openIssue(inv)"
                      >
                        <CheckCheck :size="14" /> إصدار
                      </button>
                      <button
                        v-can="'manage_sales'"
                        class="btn btn--sm btn--ghost"
                        @click="openForm(inv)"
                      >
                        <Pencil :size="14" /> تعديل
                      </button>
                      <button
                        v-can="'manage_sales'"
                        class="btn btn--sm btn--danger btn--icon"
                        title="إلغاء المسودة"
                        @click="askCancel(inv)"
                      >
                        <Ban :size="14" />
                      </button>
                    </template>
                    <template v-else>
                      <button
                        v-if="inv.status === 'issued' && inv.remaining > 0"
                        v-can="'manage_customer_payments'"
                        class="btn btn--sm btn--success"
                        @click="openPayment(inv)"
                      >
                        <CircleDollarSign :size="14" /> قبض
                      </button>
                      <button
                        class="btn btn--sm btn--ghost btn--icon"
                        title="عرض"
                        @click="openForm(inv)"
                      >
                        <Eye :size="14" />
                      </button>
                      <template v-if="inv.status === 'issued'">
                        <button
                          class="btn btn--sm btn--ghost btn--icon"
                          title="طباعة"
                          @click="printInvoice(inv, 'a4')"
                        >
                          <Printer :size="14" />
                        </button>
                        <button
                          v-can="'manage_sales_returns'"
                          class="btn btn--sm btn--ghost btn--icon"
                          title="مرتجع بيع"
                          @click="openReturn(inv.id)"
                        >
                          <RotateCcw :size="14" />
                        </button>
                      </template>
                    </template>
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
                <ReceiptText :size="20" class="doc-modal__icon" />
                <template v-if="viewing">
                  {{ SALES_INVOICE_TYPE_LABELS[viewing.invoiceType] }}
                  {{ viewing.number }}
                </template>
                <template v-else>
                  {{ form.id ? "تعديل مسودة فاتورة بيع" : "فاتورة بيع جديدة" }}
                </template>
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeForm"
              >
                <X :size="20" />
              </button>
            </div>

            <!-- ── عرض فاتورة صادرة / ملغاة ── -->
            <div v-if="viewing" class="doc-form">
              <div class="doc-info">
                <div class="doc-cell">
                  <span class="doc-cell__sub">العميل</span>
                  <span class="doc-cell__main">
                    {{ customerLabel(viewing.customer) }}
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">المخزن</span>
                  <span class="doc-cell__main">{{ viewing.warehouse?.name }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">
                    {{ viewing.issuedAt ? "وقت الإصدار" : "تاريخ الفاتورة" }}
                  </span>
                  <span class="doc-num">
                    {{
                      viewing.issuedAt
                        ? formatDateTime(viewing.issuedAt)
                        : formatDate(viewing.invoiceDate)
                    }}
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">تاريخ الاستحقاق</span>
                  <span class="doc-num">
                    {{ viewing.dueDate ? formatDate(viewing.dueDate) : "—" }}
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">الحالة</span>
                  <span>
                    <span
                      :class="[
                        'badge',
                        `doc-status--${SALES_INVOICE_STATUS[viewing.status].tone}`,
                      ]"
                    >
                      {{ SALES_INVOICE_STATUS[viewing.status].label }}
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
                    <span class="doc-cell__main">{{ line.productName }}</span>
                    <span class="doc-cell__sub">
                      {{ line.sku }}
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
                      <span class="doc-cell__sub">{{ line.unitName }}</span>
                    </span>
                  </div>
                  <div>
                    <span class="doc-lines__label">السعر</span>
                    <span class="doc-money">
                      {{ formatCurrency(line.unitPrice) }}
                    </span>
                    <span
                      v-if="line.listPrice !== null && line.listPrice !== undefined"
                      class="doc-cell__sub"
                      :title="line.priceReason || ''"
                    >
                      سعر معدّل من {{ formatMoney(line.listPrice) }}
                      <template v-if="line.priceReason">· {{ line.priceReason }}</template>
                    </span>
                    <span v-if="line.discount > 0" class="doc-cell__sub">
                      خصم {{ formatMoney(line.discount) }}
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
                <template v-if="viewing.status === 'issued'">
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
                    <span>المتبقي على العميل</span>
                    <span class="doc-money">
                      {{ formatCurrency(viewing.remaining) }}
                    </span>
                  </div>
                  <div v-if="viewing.overpaid > 0">
                    <span>رصيد للعميل (مدفوع زائد)</span>
                    <span class="doc-money doc-money--in">
                      {{ formatCurrency(viewing.overpaid) }}
                    </span>
                  </div>
                  <!-- التكلفة والربح: السيرفر يرسلهما فقط لمن له الصلاحية -->
                  <div v-if="access.can('view_sales_profit') && viewing.costTotal > 0">
                    <span>مجمل الربح</span>
                    <span class="doc-money doc-money--in">
                      {{ formatCurrency(viewing.subtotal - viewing.costTotal) }}
                    </span>
                  </div>
                </template>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeForm">
                  إغلاق
                </button>
                <template v-if="viewing.status === 'issued'">
                  <button
                    type="button"
                    class="btn btn--ghost"
                    @click="printInvoice(viewing, 'thermal')"
                  >
                    <Printer :size="16" /> حراري
                  </button>
                  <button
                    type="button"
                    class="btn btn--ghost"
                    @click="printInvoice(viewing, 'a4')"
                  >
                    <Printer :size="16" /> A4
                  </button>
                  <button
                    v-can="'manage_sales_returns'"
                    type="button"
                    class="btn btn--secondary"
                    @click="openReturn(viewing.id)"
                  >
                    <RotateCcw :size="16" /> مرتجع
                  </button>
                  <button
                    v-if="viewing.remaining > 0"
                    v-can="'manage_customer_payments'"
                    type="button"
                    class="btn btn--success"
                    @click="openPayment(viewing)"
                  >
                    <CircleDollarSign :size="16" /> قبض
                  </button>
                </template>
              </div>
            </div>

            <!-- ── إدخال / تعديل مسودة ── -->
            <form v-else class="doc-form" @submit.prevent="submitForm(false)">
              <div class="doc-grid">
                <div class="form-group">
                  <label>العميل</label>
                  <select
                    v-model="form.customerId"
                    class="form-select"
                    @change="suggestDueDate"
                  >
                    <option value="">عميل نقدي (بدون حساب)</option>
                    <option
                      v-for="c in store.customerOptions"
                      :key="c.id"
                      :value="c.id"
                    >
                      {{ c.name }}
                    </option>
                  </select>
                  <small class="doc-hint">
                    البيع الآجل والفاتورة الضريبية باسم العميل يحتاجان عميلاً
                  </small>
                </div>
                <div class="form-group">
                  <label>يخرج من مخزن *</label>
                  <select
                    v-model="form.warehouseId"
                    class="form-select"
                    required
                    :disabled="form.lines.length > 0"
                  >
                    <option value="" disabled>اختر المخزن...</option>
                    <option v-for="w in activeWarehouses" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                  <small v-if="form.lines.length" class="doc-hint">
                    احذف الأصناف لتغيير المخزن
                  </small>
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
                    :disabled="!form.customerId"
                  />
                </div>
                <div class="form-group doc-grid__full">
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
                        {{ line.sku }}
                        <template v-if="line.available !== null">
                          · المتاح
                          <span
                            class="doc-num"
                            :class="{ 'doc-num--out': exceeds(line) }"
                          >
                            {{ formatNumber(line.available) }}
                          </span>
                        </template>
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">الوحدة</span>
                      <select
                        v-model="line.unitId"
                        class="form-select"
                        @change="line.unitPrice = priceFor(line)"
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
                        :step="moneyStep()"
                        placeholder="0"
                        :disabled="!line.allowDiscount"
                        :title="line.allowDiscount ? '' : 'هذا الصنف لا يُسمح بالخصم عليه'"
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
                  v-can="'issue_sales'"
                  v-quota="'max_invoices'"
                  type="button"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting || !form.lines.length"
                  @click="submitAndIssue"
                >
                  <CheckCheck :size="16" /> حفظ وإصدار
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ الإصدار والقبض ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="issuing" class="modal-overlay" @click.self="closeIssue">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <CheckCheck :size="20" class="doc-modal__icon" />
                إصدار الفاتورة
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeIssue"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="submitIssue">
              <div class="doc-totals">
                <span>{{ customerLabel(issuing.customer) }}</span>
                <strong class="doc-money">{{ formatCurrency(issuing.total) }}</strong>
              </div>

              <div class="doc-grid">
                <div class="form-group">
                  <label>مقبوض نقداً</label>
                  <StbNumberInput
                    v-model.number="tender.cash"
                    class="form-input"
                    min="0"
                    :step="moneyStep()"
                    placeholder="0"
                  />
                </div>
                <div class="form-group">
                  <label>مقبوض شبكة / بطاقة</label>
                  <StbNumberInput
                    v-model.number="tender.card"
                    class="form-input"
                    min="0"
                    :step="moneyStep()"
                    placeholder="0"
                  />
                </div>
                <div v-if="Number(tender.card) > 0" class="form-group doc-grid__full">
                  <label>رقم عملية الشبكة</label>
                  <input
                    v-model.trim="tender.cardReference"
                    class="form-input"
                    dir="ltr"
                    maxlength="80"
                    placeholder="اختياري"
                  />
                </div>
              </div>

              <div class="doc-actions">
                <button type="button" class="btn btn--sm btn--ghost" @click="payAll('cash')">
                  الكل نقداً
                </button>
                <button type="button" class="btn btn--sm btn--ghost" @click="payAll('card')">
                  الكل شبكة
                </button>
                <button
                  v-if="issuing.customerId"
                  type="button"
                  class="btn btn--sm btn--ghost"
                  @click="payAll(null)"
                >
                  الكل آجل
                </button>
              </div>

              <div
                class="doc-totals"
                :class="{ 'issue-error': issueError }"
              >
                <span>
                  {{ creditAmount < 0 ? "زيادة عن الإجمالي" : "يبقى آجلاً على العميل" }}
                </span>
                <strong class="doc-money">
                  {{ formatCurrency(Math.abs(creditAmount)) }}
                </strong>
              </div>
              <p v-if="issueError" class="form-error">{{ issueError }}</p>

              <div class="doc-note">
                <Info :size="16" />
                <span>
                  بعد الإصدار لا تُعدَّل الفاتورة ولا تُلغى — تصحيحها يكون بمرتجع
                  بيع.
                </span>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeIssue">
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting || !!issueError"
                >
                  إصدار الفاتورة
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <CustomerPaymentModal
      v-model="showPayment"
      :invoice="paymentInvoice"
      @saved="afterChange"
    />
    <SalesReturnModal
      v-model="showReturn"
      :invoice-id="returnInvoiceId"
      @saved="afterChange"
    />
    <SalesInvoicePrint
      ref="printer"
      :invoice="printTarget"
      :settings="store.settings"
    />

    <ConfirmDialog
      v-model="showConfirm"
      title="إلغاء المسودة"
      message="هل تريد إلغاء هذه المسودة؟ لم تصدر بعد فلا أثر لها على المخزون أو العميل."
      confirm-text="إلغاء المسودة"
      :loading="acting"
      @confirm="doCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import {
  Ban,
  Banknote,
  CalendarClock,
  CheckCheck,
  CircleDollarSign,
  Eye,
  HandCoins,
  Info,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-vue-next";
import { useAccess } from "@/composables/useAccess";
import { useAccessStore } from "@/stores/access";
import { useCatalogStore } from "@/stores/catalog";
import { useInventoryStore } from "@/stores/inventory";
import { useSalesStore } from "@/stores/sales";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type { StockLookupRow } from "@/types/inventory";
import type {
  SalesInvoice,
  SalesInvoicePayload,
  SalesInvoiceStatus,
  SalesSummary,
  Tender,
} from "@/types/sales";

definePageMeta({ middleware: "auth" });

const store = useSalesStore();
const inventory = useInventoryStore();
const catalog = useCatalogStore();
const accessStore = useAccessStore();
const access = useAccess();
const toast = useToast();

const FORM_COLS = "2fr 1fr 0.9fr 1fr 0.8fr 1fr auto";
const VIEW_COLS = "2fr 1fr 1fr 0.6fr 1fr";

const STATUS_TABS: { value: SalesInvoiceStatus | ""; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "issued", label: "صادرة" },
  { value: "cancelled", label: "ملغاة" },
];

// ─── الفلاتر والقائمة ─────────────────────────────────────────────────────────
const filters = reactive({
  search: "",
  status: "" as SalesInvoiceStatus | "",
  customerId: "",
  payment: "" as "due" | "overdue" | "",
});

const hasFilters = computed(
  () =>
    !!filters.search ||
    !!filters.status ||
    !!filters.customerId ||
    !!filters.payment,
);

const list = usePagedList(
  (page) => store.fetchInvoices({ ...filters, page }),
  "تعذر تحميل فواتير البيع",
);

const summary = ref<SalesSummary>({
  todaySales: 0,
  monthSales: 0,
  monthProfit: null,
  receivables: 0,
  overdue: 0,
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

const setStatus = (status: SalesInvoiceStatus | "") => {
  filters.status = status;
  list.load(1);
};

const togglePayment = (payment: "due" | "overdue") => {
  filters.payment = filters.payment === payment ? "" : payment;
  list.load(1);
};

const isOverdue = (invoice: SalesInvoice) =>
  !!invoice.dueDate && invoice.dueDate < todayStamp();

const activeWarehouses = computed(() =>
  inventory.warehouses.filter((w) => w.isActive),
);

// ─── النموذج ──────────────────────────────────────────────────────────────────
interface UnitOption {
  id: string;
  name: string;
  factor: number;
  /** سعر الوحدة كما هو معرّف على الصنف (بأساس سعر الصنف) */
  price: number;
}

interface FormLine {
  key: number;
  productId: string;
  name: string;
  sku: string;
  taxRate: number;
  /** سعر الصنف المعرّف شامل الضريبة؟ (للتحويل إلى أساس الفاتورة) */
  productPriceIncludesTax: boolean;
  allowDiscount: boolean;
  units: UnitOption[];
  unitId: string;
  /** رصيد وحدة الأساس في المخزن وقت الإضافة. null = غير معروف (تعديل مسودة) */
  available: number | null;
  quantity: number | "";
  unitPrice: number | "";
  discount: number | "";
}

let lineKey = 0;

const showForm = ref(false);
const submitting = ref(false);
/** فاتورة صادرة/ملغاة معروضة للقراءة فقط */
const viewing = ref<SalesInvoice | null>(null);
const form = reactive({
  id: null as string | null,
  customerId: "",
  warehouseId: "",
  invoiceDate: "",
  dueDate: "",
  note: "",
  pricesIncludeTax: true,
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

/** الكمية المطلوبة (بوحدة الأساس) أكبر من رصيد المخزن؟ */
const exceeds = (line: FormLine) => {
  if (line.available === null || line.quantity === "") return false;
  const factor = line.units.find((u) => u.id === line.unitId)?.factor ?? 1;
  return Number(line.quantity) * factor > line.available;
};

/** سعر الوحدة المختارة محوّلاً لأساس الفاتورة (شامل / قبل الضريبة) */
const priceFor = (line: FormLine): number => {
  const unit = line.units.find((u) => u.id === line.unitId);
  let price = unit?.price ?? 0;
  const rate = 1 + line.taxRate / 100;
  if (form.pricesIncludeTax && !line.productPriceIncludesTax) price *= rate;
  if (!form.pricesIncludeTax && line.productPriceIncludesTax) price /= rate;
  return Math.round(price * 10000) / 10000;
};

const addDays = (date: string, days: number) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};

/** تاريخ الاستحقاق = تاريخ الفاتورة + مهلة سداد العميل (النقدي: نفس اليوم) */
const suggestDueDate = () => {
  if (!form.invoiceDate) return;
  const customer = store.customerOptions.find((c) => c.id === form.customerId);
  form.dueDate = addDays(form.invoiceDate, customer?.paymentTermsDays ?? 0);
};

const openCreate = () => {
  viewing.value = null;
  Object.assign(form, {
    id: null,
    customerId: filters.customerId,
    warehouseId:
      activeWarehouses.value.find((w) => w.type === "main")?.id ??
      activeWarehouses.value[0]?.id ??
      "",
    invoiceDate: todayStamp(),
    dueDate: "",
    note: "",
    pricesIncludeTax: true,
    lines: [],
  });
  suggestDueDate();
  showForm.value = true;
};

/** مسودة ← نموذج التعديل، غيرها ← العرض */
const openForm = async (invoice: SalesInvoice) => {
  try {
    const full = await store.getInvoice(invoice.id);
    if (full.status !== "draft") {
      viewing.value = full;
      showForm.value = true;
      return;
    }

    viewing.value = null;
    Object.assign(form, {
      id: full.id,
      customerId: full.customerId ?? "",
      warehouseId: full.warehouseId,
      invoiceDate: full.invoiceDate,
      dueDate: full.dueDate ?? "",
      note: full.note ?? "",
      pricesIncludeTax: full.pricesIncludeTax,
      lines: (full.lines ?? []).map(
        (line): FormLine => ({
          key: ++lineKey,
          productId: line.productId,
          name: line.productName,
          sku: line.sku,
          taxRate: line.taxRate,
          productPriceIncludesTax: full.pricesIncludeTax,
          allowDiscount: true,
          // عند التعديل تبقى وحدة السطر كما هي (لتغييرها يُحذف ويُضاف من جديد)
          units: [
            {
              id: line.unitId,
              name: line.unitName,
              factor: line.factor,
              price: line.unitPrice,
            },
          ],
          unitId: line.unitId,
          available: null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount || "",
        }),
      ),
    });
    showForm.value = true;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الفاتورة"));
  }
};

const closeForm = () => {
  if (!submitting.value) showForm.value = false;
};

const addLine = async (row: StockLookupRow) => {
  try {
    // التفاصيل الكاملة: وحدات البيع وأسعارها ونسبة الضريبة وقواعد الخصم
    const product = await catalog.getProduct(row.productId);
    const line: FormLine = {
      key: ++lineKey,
      productId: product.id,
      name: product.name,
      sku: product.sku,
      taxRate: product.taxRate?.rate ?? 0,
      productPriceIncludesTax: product.priceIncludesTax,
      allowDiscount: product.allowDiscount,
      units: [
        {
          id: product.baseUnitId,
          name: product.baseUnit?.name ?? "وحدة الأساس",
          factor: 1,
          price: product.salePrice,
        },
        ...(product.units ?? []).map((u) => ({
          id: u.unitId,
          name: u.unit?.name ?? "",
          factor: u.factor,
          price: u.salePrice ?? product.salePrice * u.factor,
        })),
      ],
      unitId: product.baseUnitId,
      available: row.quantity,
      quantity: 1,
      unitPrice: "",
      discount: "",
    };
    line.unitPrice = priceFor(line);
    form.lines.push(line);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إضافة الصنف"));
  }
};

const buildPayload = (): SalesInvoicePayload => ({
  customerId: form.customerId || null,
  warehouseId: form.warehouseId,
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

/** يحفظ المسودة، ثم يفتح نافذة الإصدار إن طُلب */
const submitForm = async (issue: boolean) => {
  submitting.value = true;
  try {
    const saved = form.id
      ? await store.updateInvoice(form.id, buildPayload())
      : await store.createInvoice(buildPayload());
    form.id = saved.id;
    showForm.value = false;

    if (issue) {
      openIssue(saved);
    } else {
      toast.success("تم حفظ الفاتورة كمسودة");
    }
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الفاتورة"));
  } finally {
    submitting.value = false;
    await Promise.all([list.load(), loadSummary()]);
  }
};

const submitAndIssue = (event: MouseEvent) => {
  const formEl = (event.currentTarget as HTMLElement).closest("form");
  if (formEl && !formEl.reportValidity()) return;
  submitForm(true);
};

// ─── الإصدار والقبض ───────────────────────────────────────────────────────────
const issuing = ref<SalesInvoice | null>(null);
const tender = reactive({
  cash: "" as number | "",
  card: "" as number | "",
  cardReference: "",
});

/** ما يبقى آجلاً بعد المقبوض (سالب = المقبوض أكبر من الإجمالي) */
const creditAmount = computed(() =>
  issuing.value
    ? sumMoney([
        issuing.value.total,
        -(Number(tender.cash) || 0),
        -(Number(tender.card) || 0),
      ])
    : 0,
);

const issueError = computed(() => {
  if (!issuing.value) return "";
  if (creditAmount.value < 0) return "المقبوض أكبر من إجمالي الفاتورة";
  if (!issuing.value.customerId && creditAmount.value > 0) {
    return "بيع نقدي بلا عميل: يجب قبض كامل المبلغ";
  }
  return "";
});

const payAll = (method: "cash" | "card" | null) => {
  const total = issuing.value?.total ?? 0;
  tender.cash = method === "cash" ? total : "";
  tender.card = method === "card" ? total : "";
};

const openIssue = (invoice: SalesInvoice) => {
  issuing.value = invoice;
  tender.cardReference = "";
  // العميل العابر يدفع كاملاً نقداً، وصاحب الحساب آجل افتراضياً
  payAll(invoice.customerId ? null : "cash");
};

const closeIssue = () => {
  if (!submitting.value) issuing.value = null;
};

const submitIssue = async () => {
  if (!issuing.value || issueError.value) return;
  submitting.value = true;
  try {
    const payments: Tender[] = [];
    if (Number(tender.cash) > 0) {
      payments.push({ method: "cash", amount: Number(tender.cash) });
    }
    if (Number(tender.card) > 0) {
      payments.push({
        method: "card",
        amount: Number(tender.card),
        reference: tender.cardReference || undefined,
      });
    }

    const issued = await store.issueInvoice(issuing.value.id, payments);
    toast.success(`صدرت الفاتورة ${issued.number}`);
    issuing.value = null;
    accessStore.fetch(true); // تحديث عدّاد حد الفواتير في الخطة
    await Promise.all([list.load(), loadSummary()]);

    // تُعرض الفاتورة الصادرة مباشرة لطباعتها
    viewing.value = issued;
    showForm.value = true;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إصدار الفاتورة"));
  } finally {
    submitting.value = false;
  }
};

// ─── القبض والمرتجع والطباعة ──────────────────────────────────────────────────
const showPayment = ref(false);
const paymentInvoice = ref<SalesInvoice | null>(null);
const showReturn = ref(false);
const returnInvoiceId = ref<string | null>(null);

const openPayment = (invoice: SalesInvoice) => {
  paymentInvoice.value = invoice;
  showPayment.value = true;
};

const openReturn = (invoiceId: string) => {
  returnInvoiceId.value = invoiceId;
  showReturn.value = true;
};

const printer = ref<{ print: (size: "a4" | "thermal") => Promise<void> } | null>(
  null,
);
const printTarget = ref<SalesInvoice | null>(null);

const printInvoice = async (invoice: SalesInvoice, size: "a4" | "thermal") => {
  try {
    // القائمة لا تحمل أسطر الفاتورة: نحمّلها كاملة قبل الطباعة
    printTarget.value = invoice.lines
      ? invoice
      : await store.getInvoice(invoice.id);
    await store.fetchSettings();
    await nextTick();
    await printer.value?.print(size);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تجهيز الفاتورة للطباعة"));
  }
};

// ─── إلغاء مسودة ──────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const acting = ref(false);
const cancelTarget = ref<SalesInvoice | null>(null);

const askCancel = (invoice: SalesInvoice) => {
  cancelTarget.value = invoice;
  showConfirm.value = true;
};

const doCancel = async () => {
  if (!cancelTarget.value) return;
  acting.value = true;
  try {
    await store.cancelInvoice(cancelTarget.value.id);
    toast.success("تم إلغاء المسودة");
    showConfirm.value = false;
    await Promise.all([list.load(), loadSummary()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إلغاء المسودة"));
  } finally {
    acting.value = false;
  }
};

onMounted(() => {
  store.fetchCustomerOptions(true).catch(() => {});
  store.fetchSettings().catch(() => {});
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

.issue-error {
  border-color: $stb-danger;

  strong {
    color: $stb-danger;
  }
}
</style>
