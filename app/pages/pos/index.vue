<!--
  pages/pos/index.vue — شاشة الكاشير (نقطة البيع)
  تعمل بلا إنترنت: كل البيانات من قاعدة بيانات الجهاز (stores/pos)، والاتصال
  بالسيرفر في الخلفية فقط لرفع المبيعات وسحب تحديث الأسعار.
-->
<template>
  <div class="pos">
    <!-- ══ الشريط العلوي ══ -->
    <header class="pos-bar">
      <div class="pos-bar__title">
        <Store :size="20" />
        <div class="doc-cell">
          <span class="doc-cell__main">
            {{ pos.device ? pos.device.name : "شاشة الكاشير" }}
          </span>
          <span v-if="pos.shift" class="doc-cell__sub">
            {{ pos.shift.cashierName || "وردية مفتوحة" }} ·
            {{ formatNumber(pos.shiftSummary.invoicesCount) }} فاتورة
          </span>
        </div>
      </div>

      <div class="pos-bar__actions">
        <!-- حالة الاتصال والطابور -->
        <button
          class="pos-status"
          :class="`pos-status--${connection.tone}`"
          :title="connection.hint"
          @click="pos.sync({ pull: true })"
        >
          <component
            :is="connection.icon"
            :size="15"
            :class="{ 'is-spinning': pos.syncing }"
          />
          <span>{{ connection.label }}</span>
          <span v-if="pos.pendingCount" class="pos-status__count">
            {{ formatNumber(pos.pendingCount) }}
          </span>
        </button>
        <button
          v-if="pos.failedEntries.length"
          class="pos-status pos-status--danger"
          @click="showFailed = true"
        >
          <AlertTriangle :size="15" />
          <span>{{ formatNumber(pos.failedEntries.length) }} مرفوضة</span>
        </button>

        <button
          v-if="pos.shift && canReturn"
          class="btn btn--sm btn--ghost pos-return-btn"
          @click="showReturn = true"
        >
          <Undo2 :size="15" /> <span class="pos-hide-sm">مرتجع</span>
        </button>
        <button
          v-if="pos.shift && pos.drawer.mode !== 'off'"
          class="btn btn--sm btn--ghost pos-drawer-btn"
          title="فتح الدرج بلا بيع — يُسجَّل على الوردية"
          @click="kickDrawer(true)"
        >
          <Inbox :size="15" /> <span class="pos-hide-sm">الدرج</span>
        </button>
        <button
          v-if="pos.shift"
          class="btn btn--sm btn--ghost"
          @click="showRecent = true"
        >
          <ReceiptText :size="15" /> <span class="pos-hide-sm">المبيعات</span>
        </button>
        <button
          v-if="pos.shift"
          class="btn btn--sm btn--ghost"
          @click="openCloseShift"
        >
          <LockKeyhole :size="15" /> <span class="pos-hide-sm">تقفيل الوردية</span>
        </button>
        <button
          class="btn btn--sm btn--ghost btn--icon pos-settings-btn"
          title="إعدادات الشاشة (الدرج والتثبيت كتطبيق)"
          @click="showSettings = true"
        >
          <Settings :size="15" />
        </button>
        <ThemeToggle />
        <NuxtLink
          to="/dashboard"
          class="btn btn--sm btn--ghost btn--icon"
          title="لوحة التحكم"
        >
          <LogOut :size="15" />
        </NuxtLink>
      </div>
    </header>

    <div v-if="pos.sessionExpired" class="pos-banner">
      <AlertTriangle :size="16" />
      <span>
        انتهت جلسة الدخول. البيع مستمر ومحفوظ على الجهاز، لكن الرفع للسيرفر
        ينتظر تسجيل الدخول.
      </span>
      <NuxtLink to="/auth/login" class="btn btn--sm btn--primary">
        تسجيل الدخول
      </NuxtLink>
    </div>

    <div v-if="pos.device && pos.bindError" class="pos-banner">
      <AlertTriangle :size="16" />
      <span>
        {{ pos.bindError }} — البيع هنا محفوظ على هذه الشاشة فقط ولن يُرفع حتى
        تُربط بجهاز كاشير خاص بها.
      </span>
      <button class="btn btn--sm btn--primary" @click="pos.rebind()">
        إعادة المحاولة
      </button>
    </div>

    <!-- ══ الحالات قبل البيع ══ -->
    <div v-if="!pos.ready" class="pos-center">
      <div class="spinner spinner--lg" />
    </div>

    <AccessState
      v-else-if="accessState !== 'allowed'"
      :state="accessState"
      title="شاشة الكاشير"
      feature="pos_module"
    />

    <!-- ربط المتصفح بجهاز كاشير (مرة واحدة، يحتاج إنترنت) -->
    <div v-else-if="!pos.device" class="pos-center">
      <div class="card pos-setup">
        <MonitorSmartphone :size="40" class="pos-setup__icon" />
        <h2>اختر جهاز الكاشير</h2>
        <p class="doc-hint">
          يُربط هذا المتصفح بالجهاز مرة واحدة، وتُنزَّل الأصناف والأسعار ليعمل
          بعدها بلا إنترنت. لكل شاشة بيع (لابتوب، تابلت، موبايل) جهاز كاشير
          خاص بها وورديتها.
        </p>

        <div v-if="devicesLoading" class="spinner" />
        <template v-else-if="devicesError">
          <p class="form-error">{{ devicesError }}</p>
          <NuxtLink to="/auth/login" class="btn btn--primary btn--sm">
            تسجيل الدخول
          </NuxtLink>
        </template>
        <p v-else-if="!devices.length" class="doc-hint">
          لا توجد أجهزة كاشير — أضف جهازاً من
          <NuxtLink to="/dashboard/pos/devices">أجهزة الكاشير</NuxtLink>.
        </p>
        <div v-else class="pos-setup__list">
          <button
            v-for="d in devices"
            :key="d.id"
            class="pos-setup__device"
            :disabled="!d.isActive || binding || boundElsewhere(d)"
            @click="bind(d)"
          >
            <span class="doc-cell">
              <span class="doc-cell__main">{{ d.name }}</span>
              <span class="doc-cell__sub">
                {{ d.code }} · {{ d.warehouse?.name }}
                <template v-if="!d.isActive"> · موقوف</template>
                <template v-else-if="boundElsewhere(d)">
                  · مربوط بشاشة أخرى
                </template>
                <template v-else-if="d.hasOpenShift"> · عليه وردية مفتوحة</template>
              </span>
            </span>
            <ChevronLeft :size="18" />
          </button>
        </div>
        <button class="btn btn--ghost btn--sm" @click="loadDevices">
          <RefreshCw :size="14" /> تحديث القائمة
        </button>
      </div>
    </div>

    <!-- فتح وردية -->
    <div v-else-if="!pos.shift" class="pos-center">
      <form class="card pos-setup" @submit.prevent="submitOpenShift">
        <Unlock :size="40" class="pos-setup__icon" />
        <h2>فتح وردية</h2>
        <p class="doc-hint">
          {{ pos.device.name }} · {{ pos.device.warehouse?.name }} ·
          {{ formatNumber(pos.products.length) }} صنف على الجهاز
        </p>
        <div class="form-group">
          <label>اسم الكاشير</label>
          <input
            v-model.trim="shiftForm.name"
            class="form-input"
            maxlength="150"
            required
          />
        </div>
        <div class="form-group">
          <label>العهدة النقدية في الدرج (ر.س)</label>
          <StbNumberInput
            v-model.number="shiftForm.openingCash"
            class="form-input"
            min="0"
            step="0.01"
            placeholder="0"
          />
        </div>
        <p v-if="!pos.products.length" class="form-error">
          لم تُنزَّل الأصناف بعد — اتصل بالإنترنت واضغط زر المزامنة بالأعلى.
        </p>
        <button type="submit" class="btn btn--primary btn--full">
          فتح الوردية وبدء البيع
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--sm"
          :disabled="pos.outbox.length > 0"
          :title="pos.outbox.length ? 'ارفع ما في الجهاز أولاً' : ''"
          @click="changeDevice"
        >
          تغيير الجهاز
        </button>
      </form>
    </div>

    <!-- ══ البيع ══ -->
    <main v-else class="pos-main">
      <!-- الأصناف -->
      <section class="pos-products">
        <div class="search-bar pos-search">
          <ScanBarcode :size="18" class="search-bar__icon" />
          <input
            ref="searchEl"
            v-model="search"
            class="form-input"
            placeholder="امسح الباركود أو ابحث بالاسم / الكود..."
            autocomplete="off"
            @keydown.enter.prevent="onSearchEnter"
          />
        </div>

        <div v-if="pos.categories.length" class="doc-tabs pos-categories">
          <button
            class="doc-tab"
            :class="{ 'is-active': !categoryId }"
            @click="categoryId = ''"
          >
            الكل
          </button>
          <button
            v-for="c in pos.categories"
            :key="c.id"
            class="doc-tab"
            :class="{ 'is-active': categoryId === c.id }"
            @click="categoryId = c.id"
          >
            {{ c.name }}
          </button>
        </div>

        <div class="pos-grid">
          <button
            v-for="p in visibleProducts"
            :key="p.id"
            class="pos-tile"
            @click="pos.addProduct(p)"
          >
            <span class="pos-tile__name">{{ p.name }}</span>
            <span class="pos-tile__price">
              {{ formatNumber(unitPriceOf(p, null), 2) }}
            </span>
          </button>
          <p v-if="!visibleProducts.length" class="doc-lines__empty">
            لا توجد أصناف مطابقة
          </p>
        </div>
        <p v-if="filteredCount > visibleProducts.length" class="doc-hint">
          يظهر أول {{ visibleProducts.length }} من
          {{ formatNumber(filteredCount) }} — ضيّق البحث للوصول للباقي
        </p>
      </section>

      <!-- السلة -->
      <section class="pos-cart card">
        <select v-model="pos.customerId" class="form-select pos-cart__customer">
          <option value="">عميل نقدي</option>
          <option v-for="c in pos.customers" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>

        <div class="pos-cart__lines">
          <p v-if="!pos.cart.length" class="doc-lines__empty">
            السلة فارغة — امسح باركود أو اضغط على صنف
          </p>
          <div v-for="line in pos.cart" :key="line.key" class="pos-line">
            <div class="pos-line__head">
              <span class="doc-cell__main">{{ line.product.name }}</span>
              <button
                class="btn btn--sm btn--danger btn--icon"
                title="حذف"
                @click="pos.removeLine(line.key)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
            <div class="pos-line__body">
              <div class="pos-qty">
                <button type="button" @click="step(line, -1)">
                  <Minus :size="14" />
                </button>
                <StbNumberInput
                  v-model.number="line.quantity"
                  class="form-input"
                  min="0"
                  :step="
                    line.product.allowsFractions && !line.unitId ? 'any' : '1'
                  "
                />
                <button type="button" @click="step(line, 1)">
                  <Plus :size="14" />
                </button>
              </div>
              <select
                v-if="line.product.units.length"
                class="form-select pos-line__unit"
                :value="line.unitId ?? ''"
                @change="changeUnit(line, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ line.product.baseUnitName }}</option>
                <option
                  v-for="u in line.product.units"
                  :key="u.unitId"
                  :value="u.unitId"
                >
                  {{ u.name }}
                </option>
              </select>
              <span v-else class="doc-cell__sub">{{ line.unitName }}</span>
              <span class="doc-cell__sub">
                × {{ formatNumber(line.unitPrice, 2) }}
              </span>
              <strong class="doc-money pos-line__total">
                {{ formatNumber(amountOf(line), 2) }}
              </strong>
            </div>
            <div v-if="line.product.allowDiscount" class="pos-line__discount">
              <label>خصم</label>
              <StbNumberInput
                v-model.number="line.discount"
                class="form-input"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div class="pos-cart__totals">
          <div>
            <span>قبل الضريبة</span>
            <span class="doc-money">
              {{ formatCurrency(pos.cartTotals.subtotal) }}
            </span>
          </div>
          <div>
            <span>الضريبة</span>
            <span class="doc-money">
              {{ formatCurrency(pos.cartTotals.taxTotal) }}
            </span>
          </div>
        </div>

        <div class="pos-cart__actions">
          <button
            class="btn btn--ghost"
            :disabled="!pos.cart.length"
            @click="pos.clearCart()"
          >
            إفراغ
          </button>
          <button
            class="btn btn--primary pos-pay"
            :disabled="!pos.cart.length"
            @click="openPay"
          >
            <span>دفع</span>
            <strong>{{ formatCurrency(pos.cartTotals.total) }}</strong>
          </button>
        </div>
      </section>
    </main>

    <!-- ══ الدفع ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPay" class="modal-overlay" @click.self="showPay = false">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3><Banknote :size="20" class="doc-modal__icon" /> الدفع</h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="showPay = false"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="submitPay">
              <div class="doc-totals">
                <span>المطلوب</span>
                <strong class="doc-money">
                  {{ formatCurrency(pos.cartTotals.total) }}
                </strong>
              </div>

              <div class="doc-grid">
                <div class="form-group">
                  <label>نقداً (المستلَم من العميل)</label>
                  <StbNumberInput
                    ref="cashEl"
                    v-model.number="pay.cash"
                    class="form-input"
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                </div>
                <div class="form-group">
                  <label>شبكة / بطاقة</label>
                  <StbNumberInput
                    v-model.number="pay.card"
                    class="form-input"
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                </div>
              </div>

              <div class="doc-actions">
                <button type="button" class="btn btn--sm btn--ghost" @click="payAll('cash')">
                  نقداً بالضبط
                </button>
                <button type="button" class="btn btn--sm btn--ghost" @click="payAll('card')">
                  الكل شبكة
                </button>
                <button
                  v-for="note in quickCash"
                  :key="note"
                  type="button"
                  class="btn btn--sm btn--ghost"
                  @click="pay.cash = note"
                >
                  {{ note }}
                </button>
              </div>

              <div class="doc-totals" :class="{ 'pos-short': payState.short > 0 }">
                <span>{{ payState.short > 0 ? "المتبقي" : "الباقي للعميل" }}</span>
                <strong class="doc-money">
                  {{
                    formatCurrency(
                      payState.short > 0 ? payState.short : payState.change,
                    )
                  }}
                </strong>
              </div>
              <p v-if="payState.error" class="form-error">{{ payState.error }}</p>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showPay = false">
                  رجوع
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': paying }"
                  :disabled="paying || payState.short > 0 || !!payState.error"
                >
                  <Printer :size="16" /> إتمام وطباعة
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ تم البيع ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="doneSale" class="modal-overlay" @click.self="finishSale">
          <div class="modal doc-modal doc-modal--sm pos-done">
            <CircleCheck :size="48" class="pos-done__icon" />
            <h3>تم البيع</h3>
            <code class="doc-code">{{ doneSale.number }}</code>
            <div v-if="doneSale.change > 0" class="doc-totals">
              <span>الباقي للعميل</span>
              <strong class="doc-money">{{ formatCurrency(doneSale.change) }}</strong>
            </div>
            <p v-if="!pos.online" class="doc-hint">
              حُفظت على الجهاز وستُرفع تلقائياً عند عودة الإنترنت.
            </p>
            <div class="modal__footer">
              <button class="btn btn--ghost" @click="printSale(doneSale)">
                <Printer :size="16" /> طباعة مرة أخرى
              </button>
              <button ref="nextEl" class="btn btn--primary" @click="finishSale">
                فاتورة جديدة
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ تقفيل الوردية ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showClose" class="modal-overlay" @click.self="showClose = false">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <LockKeyhole :size="20" class="doc-modal__icon" /> تقفيل الوردية
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="showClose = false"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="submitCloseShift">
              <div class="doc-totals doc-totals--box pos-close__summary">
                <div>
                  <span>عدد الفواتير</span>
                  <span class="doc-num">
                    {{ formatNumber(pos.shiftSummary.invoicesCount) }}
                  </span>
                </div>
                <div>
                  <span>إجمالي المبيعات</span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.salesTotal) }}
                  </span>
                </div>
                <div>
                  <span>شبكة / بطاقة</span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.card) }}
                  </span>
                </div>
                <div v-if="pos.shiftSummary.returnsCount">
                  <span>
                    مرتجعات ({{ formatNumber(pos.shiftSummary.returnsCount) }})
                  </span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.returnsTotal) }}
                  </span>
                </div>
                <div v-if="pos.shiftSummary.cashRefunds">
                  <span>رُدّ نقداً من الدرج</span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.cashRefunds) }}
                  </span>
                </div>
                <div v-if="pos.shiftSummary.drawerOpens">
                  <span>فتح الدرج بلا بيع</span>
                  <span class="doc-num">
                    {{ formatNumber(pos.shiftSummary.drawerOpens) }} مرة
                  </span>
                </div>
                <div>
                  <span>المفترض في الدرج</span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.expectedCash) }}
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label>النقد المعدود في الدرج (ر.س) *</label>
                <StbNumberInput
                  v-model.number="closeForm.closingCash"
                  class="form-input"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div
                v-if="closeForm.closingCash !== ''"
                class="doc-totals"
                :class="{ 'pos-short': closeDifference < 0 }"
              >
                <span>
                  {{
                    closeDifference < 0
                      ? "عجز"
                      : closeDifference > 0
                        ? "زيادة"
                        : "مطابق"
                  }}
                </span>
                <strong class="doc-money">
                  {{ formatCurrency(Math.abs(closeDifference)) }}
                </strong>
              </div>
              <div class="form-group">
                <label>ملاحظة</label>
                <input v-model.trim="closeForm.note" class="form-input" maxlength="500" />
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showClose = false">
                  رجوع
                </button>
                <button type="submit" class="btn btn--primary">تقفيل الوردية</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ مبيعات الوردية (إعادة الطباعة) ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRecent" class="modal-overlay" @click.self="showRecent = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <ReceiptText :size="20" class="doc-modal__icon" /> مبيعات الوردية
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="showRecent = false"
              >
                <X :size="20" />
              </button>
            </div>
            <div class="doc-lines" :style="{ '--doc-cols': '1.2fr 1fr 1fr 0.8fr auto' }">
              <div class="doc-lines__head">
                <span>الرقم</span>
                <span>الوقت</span>
                <span>الإجمالي</span>
                <span>الرفع</span>
                <span />
              </div>
              <p v-if="!shiftSales.length" class="doc-lines__empty">
                لا مبيعات في هذه الوردية بعد
              </p>
              <div v-for="sale in shiftSales" :key="sale.uuid" class="doc-lines__row">
                <span><code class="doc-code">{{ sale.number }}</code></span>
                <span class="doc-num">{{ formatDateTime(sale.issuedAt) }}</span>
                <span class="doc-money doc-money--strong">
                  {{ formatCurrency(sale.total) }}
                </span>
                <span>
                  <span
                    :class="[
                      'badge',
                      isPending(sale) ? 'doc-status--progress' : 'doc-status--done',
                    ]"
                  >
                    {{ isPending(sale) ? "بانتظار" : "رُفعت" }}
                  </span>
                </span>
                <button
                  class="btn btn--sm btn--ghost btn--icon"
                  title="طباعة"
                  @click="printSale(sale)"
                >
                  <Printer :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ عمليات رفضها السيرفر ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showFailed" class="modal-overlay" @click.self="showFailed = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <AlertTriangle :size="20" class="doc-modal__icon" />
                عمليات لم يقبلها السيرفر
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="showFailed = false"
              >
                <X :size="20" />
              </button>
            </div>
            <div class="doc-form">
              <p class="doc-hint">
                هذه العمليات محفوظة على الجهاز ولم تُسجَّل في السيرفر. راجع السبب
                مع المسؤول ثم أعد المحاولة.
              </p>
              <div class="doc-lines" :style="{ '--doc-cols': '1fr 2fr' }">
                <div
                  v-for="entry in pos.failedEntries"
                  :key="entry.id"
                  class="doc-lines__row"
                >
                  <span>
                    {{ OUTBOX_LABELS[entry.type] }}
                    <code
                      v-if="entry.payload.number || entry.payload.invoiceNumber"
                      class="doc-code"
                    >
                      {{ entry.payload.number || entry.payload.invoiceNumber }}
                    </code>
                  </span>
                  <span class="form-error">{{ entry.error }}</span>
                </div>
              </div>
              <div class="modal__footer">
                <button class="btn btn--ghost" @click="showFailed = false">إغلاق</button>
                <button class="btn btn--primary" @click="retryFailed">
                  <RefreshCw :size="16" /> إعادة المحاولة
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <PosReturnModal v-model="showReturn" @done="onReturned" />
    <PosScreenSettings v-model="showSettings" />

    <SalesInvoicePrint ref="printer" :invoice="printTarget" :settings="pos.settings" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  CircleCheck,
  Inbox,
  CloudOff,
  CloudUpload,
  LockKeyhole,
  LogOut,
  Minus,
  MonitorSmartphone,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  ScanBarcode,
  Settings,
  Store,
  Trash2,
  Undo2,
  Unlock,
  Wifi,
  X,
} from "lucide-vue-next";
import { useAccess } from "@/composables/useAccess";
// الاسم مستعار: AccessState في القالب هو المكوّن لا النوع
import type { AccessState as AccessStatus } from "@/composables/useAccess";
import { useToast } from "@/composables/useToast";
import { lineAmounts, sum2, unitPriceOf } from "@/pos/calc";
import { posDb } from "@/pos/db";
import type {
  CartLine,
  LocalReturn,
  LocalSale,
  OutboxType,
  PosDevice,
  SalePayment,
} from "@/pos/types";
import { useAccessStore } from "@/stores/access";
import { usePosStore } from "@/stores/pos";
import type { PrintableInvoice } from "@/types/sales";
import { FEATURES, PERMS } from "@/utils/access";

// بلا middleware "auth": الكاشير يدخل ويبيع حتى لو انتهت جلسته أو انقطع النت
definePageMeta({ layout: "pos" });
useHead({
  title: "شاشة الكاشير",
  // تثبيت الشاشة كتطبيق: أيقونة على الجهاز ونافذة كاملة بلا شريط المتصفح
  link: [
    { rel: "manifest", href: "/manifest.webmanifest" },
    { rel: "apple-touch-icon", href: "/icons/pos-180.png" },
  ],
  meta: [
    { name: "theme-color", content: "#0d1117" },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-title", content: "كاشير STB" },
  ],
});

const pos = usePosStore();
const accessStore = useAccessStore();
const { resolve } = useAccess();
const toast = useToast();

/** أقصى عدد بلاطات أصناف تُرسم (الباقي يوصل له بالبحث) */
const MAX_TILES = 60;

const OUTBOX_LABELS: Record<OutboxType, string> = {
  "shift.open": "فتح وردية",
  sale: "فاتورة",
  return: "مرتجع",
  "shift.close": "تقفيل وردية",
};

// ─── الصلاحية والخطة (تُفحص فقط إذا عرفنا الجواب؛ بلا إنترنت نثق بالجهاز) ────
const accessKnown = ref(false);
const accessState = computed<AccessStatus>(() =>
  accessKnown.value
    ? resolve({
        permissions: [PERMS.POS_USE],
        feature: FEATURES.POS_MODULE,
        tenantOnly: true,
      })
    : "allowed",
);

/**
 * المرتجع صلاحية مستقلة عن البيع. بلا إنترنت نعتمد آخر ما عرفناه عن هذا
 * المستخدم على هذه الشاشة — والافتراضي المنع: مرتجع يرفضه السيرفر لاحقاً
 * معناه نقد خرج من الدرج بلا مستند.
 */
const cachedCanReturn = ref(false);
const canReturn = computed(() =>
  accessKnown.value
    ? resolve({ permissions: [PERMS.POS_RETURN], tenantOnly: true }) === "allowed"
    : cachedCanReturn.value,
);

// ─── حالة الاتصال ─────────────────────────────────────────────────────────────
const connection = computed(() => {
  if (pos.syncing) {
    return { tone: "info", icon: RefreshCw, label: "مزامنة...", hint: "" };
  }
  if (!pos.online) {
    return {
      tone: "warning",
      icon: CloudOff,
      label: "بلا إنترنت",
      hint: "البيع مستمر ومحفوظ على الجهاز — اضغط لإعادة المحاولة",
    };
  }
  if (pos.pendingCount) {
    return {
      tone: "info",
      icon: CloudUpload,
      label: "بانتظار الرفع",
      hint: "اضغط للرفع الآن",
    };
  }
  return {
    tone: "success",
    icon: Wifi,
    label: "متصل",
    hint: pos.lastError || "اضغط لتحديث الأصناف والأسعار",
  };
});

// ─── ربط الجهاز ───────────────────────────────────────────────────────────────
const devices = ref<PosDevice[]>([]);
const devicesLoading = ref(false);
const devicesError = ref("");
const binding = ref(false);

const loadDevices = async () => {
  devicesLoading.value = true;
  devicesError.value = "";
  try {
    devices.value = await pos.fetchDevices();
    // قبل ربط الجهاز لا يوجد نبض اتصال: نجاح هذا الطلب هو الدليل
    pos.online = true;
  } catch (e) {
    devicesError.value = getErrorMessage(
      e,
      "تعذر تحميل الأجهزة — ربط الجهاز لأول مرة يحتاج إنترنت",
    );
  } finally {
    devicesLoading.value = false;
  }
};

/** الجهاز تعمل عليه شاشة أخرى: لا يُختار هنا */
const boundElsewhere = (d: PosDevice) =>
  !!d.installationId && d.installationId !== pos.installationId;

const bind = async (target: PosDevice) => {
  binding.value = true;
  try {
    await pos.bindDevice(target);
    pos.start();
    toast.success(`تم ربط الجهاز "${target.name}" وتنزيل ${pos.products.length} صنف`);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر ربط الجهاز"));
  } finally {
    binding.value = false;
  }
};

const changeDevice = async () => {
  pos.stop();
  pos.device = null;
  await loadDevices();
};

// ─── الوردية ──────────────────────────────────────────────────────────────────
const shiftForm = reactive({ name: "", openingCash: "" as number | "" });

const submitOpenShift = async () => {
  try {
    await pos.openShift(Number(shiftForm.openingCash) || 0, shiftForm.name);
    await nextTick();
    searchEl.value?.focus();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فتح الوردية"));
  }
};

const showClose = ref(false);
const closeForm = reactive({ closingCash: "" as number | "", note: "" });

const closeDifference = computed(() =>
  sum2([Number(closeForm.closingCash) || 0, -pos.shiftSummary.expectedCash]),
);

const openCloseShift = () => {
  if (pos.cart.length) {
    toast.warning("في السلة أصناف — أتمّ البيع أو أفرغ السلة قبل التقفيل");
    return;
  }
  closeForm.closingCash = "";
  closeForm.note = "";
  showClose.value = true;
};

const submitCloseShift = async () => {
  try {
    await pos.closeShift(Number(closeForm.closingCash) || 0, closeForm.note);
    showClose.value = false;
    shiftForm.name = pos.cashierName;
    shiftForm.openingCash = "";
    toast.success(
      pos.online
        ? "تم تقفيل الوردية"
        : "تم تقفيل الوردية على الجهاز — ستُرفع عند عودة الإنترنت",
    );
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تقفيل الوردية"));
  }
};

// ─── الأصناف ──────────────────────────────────────────────────────────────────
const searchEl = ref<HTMLInputElement | null>(null);
const search = ref("");
const categoryId = ref("");

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return pos.products.filter(
    (p) =>
      (!categoryId.value || p.categoryId === categoryId.value) &&
      (!term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)),
  );
});
const filteredCount = computed(() => filtered.value.length);
const visibleProducts = computed(() => filtered.value.slice(0, MAX_TILES));

/** Enter: باركود (ما يرسله القارئ) أولاً، وإلا الصنف الوحيد المطابق للبحث */
const onSearchEnter = () => {
  const term = search.value.trim();
  if (!term) return;

  if (pos.scan(term)) {
    search.value = "";
    return;
  }
  if (filtered.value.length === 1) {
    pos.addProduct(filtered.value[0]!);
    search.value = "";
    return;
  }
  toast.warning(
    filtered.value.length
      ? "أكثر من صنف مطابق — اختر من القائمة"
      : `لا يوجد صنف بالباركود أو الاسم "${term}"`,
  );
};

// ─── السلة ────────────────────────────────────────────────────────────────────
const amountOf = (line: CartLine) =>
  lineAmounts({ ...line, taxRate: line.product.taxRate }).total;

const step = (line: CartLine, delta: number) => {
  const next = (Number(line.quantity) || 0) + delta;
  if (next <= 0) pos.removeLine(line.key);
  else line.quantity = next;
};

const changeUnit = (line: CartLine, unitId: string) => {
  const unit = line.product.units.find((u) => u.unitId === unitId);
  line.unitId = unit ? unit.unitId : null;
  line.unitName = unit ? unit.name : line.product.baseUnitName;
  line.factor = unit ? unit.factor : 1;
  line.unitPrice = unitPriceOf(line.product, line.unitId);
  line.discount = 0;
};

// ─── الدفع ────────────────────────────────────────────────────────────────────
const showPay = ref(false);
const paying = ref(false);
const cashEl = ref<{ $el: HTMLInputElement } | null>(null);
const pay = reactive({ cash: "" as number | "", card: "" as number | "" });

/** فئات نقدية قريبة أكبر من المطلوب، لضغطة واحدة */
const quickCash = computed(() => {
  const total = pos.cartTotals.total;
  return [5, 10, 20, 50, 100, 200, 500].filter((note) => note > total).slice(0, 3);
});

const payState = computed(() => {
  const total = pos.cartTotals.total;
  const card = Number(pay.card) || 0;
  const cash = Number(pay.cash) || 0;
  const cashDue = sum2([total, -card]);

  return {
    /** ما يُسجَّل نقداً = المطلوب نقداً (لا ما استُلم) */
    cashDue,
    short: Math.max(sum2([cashDue, -cash]), 0),
    change: Math.max(sum2([cash, -cashDue]), 0),
    error: card > total ? "مبلغ الشبكة أكبر من المطلوب" : "",
  };
});

const payAll = (method: "cash" | "card") => {
  pay.cash = method === "cash" ? pos.cartTotals.total : "";
  pay.card = method === "card" ? pos.cartTotals.total : "";
};

const openPay = async () => {
  const empty = pos.cart.find((line) => !(Number(line.quantity) > 0));
  if (empty) {
    toast.warning(`أدخل كمية "${empty.product.name}"`);
    return;
  }
  pay.cash = "";
  pay.card = "";
  showPay.value = true;
  await nextTick();
  cashEl.value?.$el.focus();
};

const submitPay = async () => {
  if (payState.value.short > 0 || payState.value.error) return;
  paying.value = true;
  try {
    const payments: SalePayment[] = [];
    if (payState.value.cashDue > 0) {
      payments.push({ method: "cash", amount: payState.value.cashDue });
    }
    if (Number(pay.card) > 0) {
      payments.push({ method: "card", amount: Number(pay.card) });
    }

    const sale = await pos.checkout(payments, Number(pay.cash) || 0);
    if (payments.some((p) => p.method === "cash")) void kickDrawer();
    showPay.value = false;
    doneSale.value = sale;
    await printSale(sale);
    await nextTick();
    nextEl.value?.focus();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إتمام البيع"));
  } finally {
    paying.value = false;
  }
};

const doneSale = ref<LocalSale | null>(null);
const nextEl = ref<HTMLButtonElement | null>(null);

const finishSale = async () => {
  doneSale.value = null;
  await nextTick();
  searchEl.value?.focus();
};

// ─── الطباعة وإعادة الطباعة ───────────────────────────────────────────────────
const printer = ref<{ print: (size: "a4" | "thermal") => Promise<void> } | null>(
  null,
);
const printTarget = ref<PrintableInvoice | null>(null);

/** فاتورة الجهاز المحلية بالشكل الذي تطبعه نسخة الطباعة */
const toPrintable = (sale: LocalSale): PrintableInvoice => ({
  number: sale.number,
  invoiceType: sale.customerTaxNumber ? "standard" : "simplified",
  customer: sale.customerName
    ? { name: sale.customerName, taxNumber: sale.customerTaxNumber }
    : null,
  invoiceDate: sale.issuedAt,
  issuedAt: sale.issuedAt,
  subtotal: sale.subtotal,
  taxTotal: sale.taxTotal,
  total: sale.total,
  paidAmount: sale.total,
  remaining: 0,
  qrCode: sale.qrCode,
  lines: sale.lines.map((line, index) => ({
    id: String(index),
    productName: line.productName,
    unitName: line.unitName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discount: line.discount,
    total: line.total,
  })),
});

const printSale = async (sale: LocalSale) => {
  try {
    printTarget.value = toPrintable(sale);
    await nextTick();
    await printer.value?.print("thermal");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذرت الطباعة"));
  }
};

const showRecent = ref(false);
const shiftSales = computed(() =>
  pos.shift
    ? pos.sales
        .filter((sale) => sale.shiftId === pos.shift!.id)
        .slice()
        .reverse()
    : [],
);

const isPending = (sale: LocalSale) =>
  pos.outbox.some((entry) => entry.id === `sale-${sale.uuid}`);

// ─── المرتجع والدرج والإعدادات ────────────────────────────────────────────────
const showReturn = ref(false);
const showSettings = ref(false);

/** يفتح الدرج. فشله (طابعة مطفأة) لا يوقف البيع: تنبيه فقط */
const kickDrawer = async (manual = false) => {
  try {
    await pos.openDrawer(manual);
  } catch (e) {
    toast.warning(getErrorMessage(e, "تعذر فتح الدرج"));
  }
};

const onReturned = (salesReturn: LocalReturn) => {
  const cash = salesReturn.refundMethod === "cash" && salesReturn.refundAmount > 0;
  toast.success(
    salesReturn.refundAmount > 0
      ? `تم المرتجع — ردّ للعميل ${formatCurrency(salesReturn.refundAmount)} ${cash ? "نقداً" : "على البطاقة"}`
      : "تم تسجيل المرتجع",
  );
  if (cash) void kickDrawer();
};

// ─── المرفوضات ────────────────────────────────────────────────────────────────
const showFailed = ref(false);

const retryFailed = async () => {
  await pos.retryFailed();
  if (!pos.failedEntries.length) {
    showFailed.value = false;
    toast.success("تم رفع العمليات");
  }
};

// ─── التشغيل ──────────────────────────────────────────────────────────────────
/** يسجّل الـ service worker الذي يجعل الشاشة تفتح بلا إنترنت (الإنتاج فقط) */
const registerOfflineShell = () => {
  if (import.meta.dev || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then((registration) => {
      // ما حُمِّل قبل أن يتحكم الـ service worker بالصفحة لم يمر به: نرسله
      // ليخزّنه، فتفتح الشاشة بلا إنترنت من أول زيارة
      registration.active?.postMessage({
        type: "warm",
        urls: performance.getEntriesByType("resource").map((entry) => entry.name),
      });
    })
    .catch(() => {
      // بلا service worker الشاشة تعمل، لكن إعادة تحميلها تحتاج إنترنت
    });
};

onMounted(async () => {
  registerOfflineShell();
  try {
    await pos.init();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فتح قاعدة بيانات الجهاز"));
    return;
  }
  shiftForm.name = pos.cashierName;
  cachedCanReturn.value = (await posDb.getMeta<boolean>("canReturn")) ?? false;

  // الخطة والصلاحيات: نحاول معرفتها، وفشل الطلب (بلا إنترنت) لا يمنع البيع
  accessStore
    .fetch()
    .then(() => {
      accessKnown.value = true;
      void posDb.setMeta({ canReturn: canReturn.value });
    })
    .catch(() => {});

  if (pos.device) {
    pos.start();
    await nextTick();
    searchEl.value?.focus();
  } else {
    await loadDevices();
  }
});

onBeforeUnmount(() => pos.stop());
</script>

<style lang="scss" scoped>
@use "~/assets/scss/mixins" as *;

.pos {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

// ─── الشريط العلوي ───────────────────────────────────────────────────────────
.pos-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-2 $space-4;
  background: $stb-surface;
  border-bottom: 1px solid $stb-border;

  &__title {
    display: flex;
    align-items: center;
    gap: $space-3;
    min-width: 0;
    color: $stb-accent;
  }
  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: $space-2;
  }
}

.pos-status {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-1 $space-3;
  font: inherit;
  font-size: $font-size-xs;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid currentColor;
  border-radius: $radius-full;
  background: transparent;
  cursor: pointer;

  &--success {
    color: $stb-success;
  }
  &--warning {
    color: $stb-warning;
  }
  &--info {
    color: $stb-accent;
  }
  &--danger {
    color: $stb-danger;
  }

  &__count {
    padding: 0 $space-2;
    color: $stb-on-accent;
    background: $stb-accent;
    border-radius: $radius-full;
  }
}

.is-spinning {
  animation: pos-spin 1s linear infinite;
}
@keyframes pos-spin {
  to {
    transform: rotate(360deg);
  }
}

.pos-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-3;
  padding: $space-2 $space-4;
  font-size: $font-size-sm;
  color: $stb-text-primary;
  background: rgba($stb-warning, 0.15);
  border-bottom: 1px solid rgba($stb-warning, 0.4);

  svg {
    color: $stb-warning;
  }
  span {
    flex: 1;
    min-width: 200px;
  }
}

// ─── شاشات الإعداد ───────────────────────────────────────────────────────────
.pos-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-4;
  overflow-y: auto;
}

.pos-setup {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: $space-3;
  width: min(100%, 440px);
  padding: $space-6;
  text-align: center;

  &__icon {
    align-self: center;
    color: $stb-accent;
  }
  .form-group {
    text-align: start;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    max-height: 320px;
    overflow-y: auto;
  }
  &__device {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
    padding: $space-3 $space-4;
    font: inherit;
    color: $stb-text-primary;
    text-align: start;
    background: $stb-surface-2;
    border: 1px solid $stb-border;
    border-radius: $radius-md;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: $stb-accent;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// ─── شاشة البيع ──────────────────────────────────────────────────────────────
.pos-main {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
  gap: $space-4;
  min-height: 0;
  padding: $space-4;

  @include respond-to("lg") {
    grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
    gap: $space-3;
    padding: $space-3;
  }
  // الهاتف: الأصناف فوق والسلة تحتها، والصفحة كلها تتمرر
  @include respond-to("md") {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
}

.pos-products {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  min-height: 0;
}

.pos-search .form-input {
  padding-block: $space-3;
  font-size: $font-size-base;
}

.pos-categories {
  margin-bottom: 0;
}

.pos-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  align-content: start;
  gap: $space-3;
  min-height: 0;
  overflow-y: auto;
  @include scrollbar;

  @include respond-to("md") {
    flex: none;
    max-height: 46vh;
  }
}

.pos-tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: $space-2;
  min-height: 86px;
  padding: $space-3;
  font: inherit;
  color: $stb-text-primary;
  text-align: start;
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  cursor: pointer;
  transition:
    border-color $transition-fast,
    transform $transition-fast;

  &:hover {
    border-color: $stb-accent;
  }
  &:active {
    transform: scale(0.97);
  }

  &__name {
    font-size: $font-size-sm;
    font-weight: 600;
    line-height: 1.35;
    // سطران على الأكثر
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  &__price {
    font-weight: 800;
    color: $stb-accent;
    direction: ltr;
    text-align: end;
  }
}

// ─── السلة ───────────────────────────────────────────────────────────────────
.pos-cart {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  min-height: 0;
  padding: $space-3;

  @include respond-to("md") {
    flex: none;
  }

  &__lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $space-2;
    min-height: 120px;
    overflow-y: auto;
    @include scrollbar;
  }

  &__totals {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    padding-top: $space-2;
    font-size: $font-size-sm;
    color: $stb-text-secondary;
    border-top: 1px dashed $stb-border-light;

    div {
      display: flex;
      justify-content: space-between;
    }
  }

  &__actions {
    display: flex;
    gap: $space-2;
  }
}

.pos-pay {
  flex: 1;
  justify-content: space-between;
  padding-block: $space-4;
  font-size: $font-size-lg;

  strong {
    font-size: $font-size-xl;
  }
}

.pos-line {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-2 $space-3;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-md;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
  }
  &__body {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $space-2;
  }
  &__unit {
    width: auto;
    min-width: 90px;
    padding-block: $space-1;
  }
  &__total {
    margin-inline-start: auto;
    font-size: $font-size-base;
    color: $stb-text-primary;
  }
  &__discount {
    display: flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-size-xs;
    color: $stb-text-muted;

    .form-input {
      width: 90px;
      padding-block: $space-1;
    }
  }
}

.pos-qty {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid $stb-border-light;
  border-radius: $radius-md;
  overflow: hidden;

  button {
    display: grid;
    place-items: center;
    width: 34px;
    color: $stb-text-primary;
    background: $stb-surface-3;
    border: 0;
    cursor: pointer;

    &:hover {
      color: $stb-accent;
    }
  }
  .form-input {
    width: 58px;
    padding: $space-1;
    text-align: center;
    border: 0;
    border-radius: 0;
  }
}

// ─── النوافذ ─────────────────────────────────────────────────────────────────
.pos-short {
  border-color: $stb-danger;

  strong {
    color: $stb-danger;
  }
}

.pos-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;
  text-align: center;

  &__icon {
    color: $stb-success;
  }
  .doc-totals {
    align-self: stretch;
  }
  .modal__footer {
    align-self: stretch;
    justify-content: center;
  }
}

.pos-close__summary {
  width: 100%;
}

.pos-hide-sm {
  @include respond-to("sm") {
    display: none;
  }
}
</style>
