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

        <template v-if="pos.shift && pos.restaurantEnabled">
          <button
            class="btn btn--sm btn--ghost pos-tables-btn"
            :class="{ 'is-on': pos.order.type === 'dine_in' }"
            title="الطاولات"
            @click="showTables = true"
          >
            <Armchair :size="15" />
            <span>{{ pos.order.type === "dine_in" ? pos.order.tableName : "سفري" }}</span>
            <span v-if="openTablesCount" class="pos-status__count">
              {{ formatNumber(openTablesCount) }}
            </span>
          </button>
          <button
            class="btn btn--sm btn--ghost"
            :class="{ 'pos-kitchen-ready': pos.readyOrders.length }"
            title="حالة الطلبات في المطبخ"
            @click="openKitchen"
          >
            <ChefHat :size="15" />
            <span class="pos-hide-sm">المطبخ</span>
            <span v-if="pos.readyOrders.length" class="pos-status__count">
              {{ formatNumber(pos.readyOrders.length) }} جاهز
            </span>
          </button>
        </template>
        <button
          v-if="pos.shift && pos.canReturn"
          class="btn btn--sm btn--ghost pos-return-btn"
          @click="showReturn = true"
        >
          <Undo2 :size="15" /> <span class="pos-hide-sm">مرتجع</span>
        </button>
        <button
          v-if="pos.shift && pos.held.length"
          class="btn btn--sm btn--ghost pos-held-btn"
          title="الفواتير المعلّقة (F7)"
          @click="showHeld = true"
        >
          <PauseCircle :size="15" />
          <span class="pos-hide-sm">معلّقة</span>
          <span class="pos-status__count">{{ formatNumber(pos.held.length) }}</span>
        </button>
        <button
          v-if="pos.shift"
          class="btn btn--sm btn--ghost"
          title="إيداع أو سحب نقدي من الدرج (F9)"
          @click="showCashMove = true"
        >
          <Wallet :size="15" /> <span class="pos-hide-sm">نقد</span>
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
          v-if="pos.device"
          class="btn btn--sm btn--ghost btn--icon"
          title="شاشة العميل: نافذة تُسحب للشاشة الثانية"
          @click="openCustomerDisplay"
        >
          <MonitorUp :size="15" />
        </button>
        <button
          v-if="pos.shift"
          class="btn btn--sm btn--ghost btn--icon"
          :class="{ 'is-on': showNumpad }"
          title="لوحة الأرقام (F3)"
          @click="toggleNumpad"
        >
          <Calculator :size="15" />
        </button>
        <button
          class="btn btn--sm btn--ghost btn--icon"
          title="اختصارات لوحة المفاتيح (F1)"
          @click="showShortcuts = true"
        >
          <Keyboard :size="15" />
        </button>
        <button
          class="btn btn--sm btn--ghost btn--icon pos-settings-btn"
          title="إعدادات الشاشة (الدرج والأصوات والتثبيت كتطبيق)"
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
        هذه الشاشة تحتاج تسجيل دخول مرة واحدة لتُربط بجهازها. البيع مستمر
        ومحفوظ على الجهاز، ويُرفع بعد الربط.
      </span>
      <NuxtLink to="/auth/login" class="btn btn--sm btn--primary">
        تسجيل الدخول
      </NuxtLink>
    </div>

    <div v-if="pos.device && pos.suspended" class="pos-banner">
      <AlertTriangle :size="16" />
      <span>
        {{ pos.suspended }}
        <template v-if="pos.shift">
          — الوردية الحالية تكمل، وما يُباع محفوظ على الجهاز ويُرفع بعد التجديد.
        </template>
      </span>
    </div>

    <div
      v-else-if="pos.device && pos.offlineState !== 'ok'"
      class="pos-banner"
    >
      <CloudOff :size="16" />
      <span>{{ offlineNotice }}</span>
      <button class="btn btn--sm btn--primary" @click="pos.sync({ pull: true })">
        إعادة المحاولة
      </button>
    </div>

    <div v-if="pos.cashierRevoked" class="pos-banner">
      <AlertTriangle :size="16" />
      <span>
        تم إيقاف كاشير هذه الوردية من لوحة التحكم — قفّل الوردية ليفتح كاشير
        آخر.
      </span>
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

    <!-- الشاشة تحمل جهاز كاشير شركة غير شركة المستخدم المسجّل دخوله -->
    <div v-else-if="otherCompany" class="pos-center">
      <div class="card pos-setup">
        <Building2 :size="40" class="pos-setup__icon" />
        <h2>هذه الشاشة مربوطة بشركة أخرى</h2>
        <p class="doc-hint">
          الشاشة تحمل جهاز الكاشير «{{ pos.device!.name }}» لشركة
          <strong>{{ pos.tenant?.companyName || "أخرى" }}</strong>، وأنت مسجّل الدخول
          بحساب شركة مختلفة — بيانات تلك الشركة لا تُعرض هنا.
        </p>

        <template v-if="pos.outbox.length">
          <p class="form-error">
            على الشاشة {{ formatNumber(pos.outbox.length) }} عملية لم تُرفع لتلك
            الشركة بعد، ولا تُمسح قبل رفعها. صِل الجهاز بالإنترنت (تُرفع وحدها)،
            أو سجّل الدخول بحساب تلك الشركة.
          </p>
          <button class="btn btn--ghost btn--sm" @click="pos.sync({ pull: false })">
            <RefreshCw :size="14" /> رفع الآن
          </button>
        </template>
        <template v-else>
          <p class="doc-hint">
            افصل الشاشة عنها لتربطها بجهاز كاشير لشركتك. لا شيء يضيع: كل ما بيع
            عليها رُفع لشركته.
          </p>
          <button
            class="btn btn--primary"
            :class="{ 'btn--loading': forgetting }"
            :disabled="forgetting"
            @click="forgetOtherCompany"
          >
            فصل الشاشة وربطها بشركتي
          </button>
        </template>
        <button class="btn btn--ghost btn--sm" @click="auth.logout()">
          <LogOut :size="14" /> تسجيل الخروج
        </button>
      </div>
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
        <p v-if="pos.shiftBlockReason" class="form-error">
          {{ pos.shiftBlockReason }}
        </p>

        <!-- شركة عرّفت كاشيرات: الوردية تُفتح باسم صاحبها ورقمه السري -->
        <template v-if="pos.cashiers.length">
          <div class="form-group">
            <label>الكاشير</label>
            <div class="pos-cashiers">
              <button
                v-for="c in pos.cashiers"
                :key="c.id"
                type="button"
                class="pos-cashiers__item"
                :class="{ 'is-active': shiftForm.cashierId === c.id }"
                @click="pickCashier(c.id)"
              >
                <UserRound :size="16" />
                <span>{{ c.name }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>الرقم السري</label>
            <input
              ref="pinEl"
              v-model="shiftForm.pin"
              type="password"
              inputmode="numeric"
              autocomplete="off"
              class="form-input pos-pin"
              maxlength="6"
              placeholder="••••"
              :disabled="!shiftForm.cashierId"
              required
              @input="shiftForm.pin = shiftForm.pin.replace(/\D/g, '')"
            />
          </div>
        </template>
        <div v-else class="form-group">
          <label>اسم الكاشير</label>
          <input
            v-model.trim="shiftForm.name"
            class="form-input"
            maxlength="150"
            required
          />
        </div>
        <div class="form-group">
          <label>العهدة النقدية في الدرج ({{ currencyLabel() }})</label>
          <StbNumberInput
            v-model.number="shiftForm.openingCash"
            class="form-input"
            min="0"
            :step="moneyStep()"
            placeholder="0"
          />
        </div>
        <p v-if="!pos.products.length" class="form-error">
          لم تُنزَّل الأصناف بعد — اتصل بالإنترنت واضغط زر المزامنة بالأعلى.
        </p>
        <button
          type="submit"
          class="btn btn--primary btn--full"
          :class="{ 'btn--loading': openingShift }"
          :disabled="openingShift || !!pos.shiftBlockReason"
        >
          فتح الوردية وبدء البيع
        </button>
        <p v-if="pos.lastContactAt" class="doc-hint">
          آخر اتصال بالسيرفر: {{ formatDateTime(pos.lastContactAt) }}
        </p>
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
            aria-label="البحث"
            autocomplete="off"
            @keydown.enter.prevent="onSearchEnter"
          />
          <button
            v-if="pendingQty"
            type="button"
            class="pos-times"
            title="كمية الصنف التالي — اضغط للإلغاء"
            @click="pendingQty = null"
          >
            × {{ formatNumber(pendingQty) }} <X :size="12" />
          </button>
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
            :class="{ 'is-out': isOut(p) }"
            @click="add(p)"
          >
            <span class="pos-tile__name">{{ p.name }}</span>
            <span class="pos-tile__foot">
              <span
                v-if="pos.stockOf(p) !== null"
                class="pos-tile__stock"
                :title="`المتاح في المخزن: ${pos.stockOf(p)} ${p.baseUnitName}`"
              >
                {{ formatNumber(pos.stockOf(p)!) }}
              </span>
              <span class="pos-tile__price">
                {{ p.openPrice ? "سعر مفتوح" : formatMoney(unitPriceOf(p, null)) }}
              </span>
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
        <button
          v-if="pos.restaurantEnabled"
          type="button"
          class="pos-cart__order"
          :class="{ 'is-table': pos.order.type === 'dine_in' }"
          @click="showTables = true"
        >
          <component :is="pos.order.type === 'dine_in' ? Armchair : ShoppingBag" :size="16" />
          <strong>{{ pos.order.type === "dine_in" ? pos.order.tableName : "سفري" }}</strong>
          <span v-if="pos.order.rounds && pos.cart.length" class="doc-cell__sub">
            أُرسل للمطبخ {{ formatNumber(pos.order.rounds) }} مرة
          </span>
          <span class="pos-cart__order-change">تغيير</span>
        </button>
        <div class="pos-cart__customer">
          <select v-model="pos.customerId" class="form-select">
            <option value="">عميل نقدي</option>
            <option v-for="c in pos.customers" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
          <button
            class="btn btn--ghost btn--icon"
            title="عميل جديد"
            @click="showCustomer = true"
          >
            <UserPlus :size="16" />
          </button>
        </div>
        <p v-if="selectedCustomer" class="doc-hint pos-cart__balance">
          عليه {{ formatCurrency(pos.customerBalance(selectedCustomer.id)) }}
          <template v-if="selectedCustomer.creditLimit != null">
            · حد الائتمان {{ formatCurrency(selectedCustomer.creditLimit) }}
          </template>
        </p>

        <div class="pos-cart__lines">
          <p v-if="!pos.cart.length" class="doc-lines__empty">
            السلة فارغة — امسح باركود أو اضغط على صنف
          </p>
          <div
            v-for="{ line, unitPrice, total, promoName, invoiceDiscount } in pos.priced.lines"
            :key="line.key"
            class="pos-line"
            :class="{ 'is-selected': pos.selectedKey === line.key }"
            @click="pos.selectedKey = line.key"
          >
            <div class="pos-line__head">
              <span class="doc-cell__main">
                {{ line.product.name }}
                <span v-if="promoName" class="badge doc-status--done pos-line__promo">
                  {{ promoName }}
                </span>
                <span
                  v-if="isRepriced(line)"
                  class="badge doc-status--progress pos-line__promo"
                  :title="line.priceReason || ''"
                >
                  سعر معدّل
                </span>
                <span v-if="line.note" class="pos-line__note">{{ line.note }}</span>
              </span>
              <button
                v-if="pos.restaurantEnabled"
                class="btn btn--sm btn--ghost btn--icon"
                :class="{ 'is-on': noteKey === line.key || !!line.note }"
                title="ملاحظة للمطبخ"
                @click.stop="toggleNote(line)"
              >
                <MessageSquare :size="14" />
              </button>
              <button
                class="btn btn--sm btn--danger btn--icon"
                title="حذف (Delete)"
                @click.stop="removeLine(line)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
            <div v-if="noteKey === line.key" class="pos-line__note-edit" @click.stop>
              <input
                :ref="(el) => (noteEl = el as HTMLInputElement | null)"
                v-model="line.note"
                class="form-input"
                maxlength="200"
                placeholder="ملاحظة للمطبخ: بدون بصل، سبايسي…"
                aria-label="ملاحظة للمطبخ"
                @keydown.enter.prevent="noteKey = null"
              />
              <div class="pos-line__note-chips">
                <button
                  v-for="chip in NOTE_CHIPS"
                  :key="chip"
                  type="button"
                  class="doc-tab"
                  @click="line.note = line.note ? `${line.note}، ${chip}` : chip"
                >
                  {{ chip }}
                </button>
              </div>
            </div>
            <div class="pos-line__body">
              <div class="pos-qty">
                <button type="button" @click="step(line, -1)">
                  <Minus :size="14" />
                </button>
                <StbNumberInput
                  :ref="(el) => trackInput(qtyInputs, line.key, el)"
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
              <button
                type="button"
                class="pos-line__price"
                :class="{ 'is-pending': line.pricePending }"
                title="سعر هذه الفاتورة فقط (=)"
                @click.stop="editPrice(line)"
              >
                ×
                <template v-if="line.pricePending">اكتب السعر</template>
                <template v-else>
                  <s v-if="isRepriced(line)">{{ formatMoney(line.listPrice!) }}</s>
                  <s v-else-if="unitPrice < line.unitPrice">
                    {{ formatMoney(line.unitPrice) }}
                  </s>
                  {{ formatMoney(unitPrice) }}
                </template>
                <Pencil :size="11" />
              </button>
              <strong class="doc-money pos-line__total">
                {{ formatMoney(total) }}
              </strong>
            </div>
            <div v-if="line.product.allowDiscount" class="pos-line__discount">
              <label>خصم</label>
              <StbNumberInput
                :ref="(el) => trackInput(discountInputs, line.key, el)"
                v-model.number="line.discount"
                class="form-input"
                min="0"
                :step="moneyStep()"
                placeholder="0"
              />
              <span v-if="invoiceDiscount > 0">
                + {{ formatMoney(invoiceDiscount) }} من خصم الفاتورة
              </span>
            </div>
          </div>
        </div>

        <div class="pos-cart__totals">
          <div v-if="pos.priced.promoDiscount > 0">
            <span>خصم العروض</span>
            <span class="doc-money">
              − {{ formatCurrency(pos.priced.promoDiscount) }}
            </span>
          </div>
          <div v-if="pos.priced.manualDiscount > 0">
            <span>
              خصم الكاشير
              <template v-if="pos.invoiceDiscount?.type === 'percent'">
                ({{ pos.invoiceDiscount.value }}% على الفاتورة)
              </template>
            </span>
            <span class="doc-money" :class="{ 'pos-over': pos.cartIssues.discountOverLimit }">
              − {{ formatCurrency(pos.priced.manualDiscount) }}
            </span>
          </div>
          <!-- منشأة غير مسجّلة في الضريبة: الإجمالي وحده -->
          <template v-if="pos.settings?.vatRegistered !== false">
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
          </template>
        </div>

        <div class="pos-cart__actions">
          <button
            class="btn btn--ghost btn--icon"
            title="إفراغ السلة"
            :disabled="!pos.cart.length"
            @click="clearCart"
          >
            <Trash2 :size="16" />
          </button>
          <button
            v-if="pos.order.type !== 'dine_in'"
            class="btn btn--ghost btn--icon"
            title="تعليق الفاتورة (F6)"
            :disabled="!pos.cart.length"
            @click="hold"
          >
            <PauseCircle :size="16" />
          </button>
          <button
            class="btn btn--ghost btn--icon"
            :class="{ 'is-on': !!pos.invoiceDiscount }"
            title="خصم على الفاتورة (F8)"
            :disabled="!pos.cart.length"
            @click="showDiscount = true"
          >
            <Percent :size="16" />
          </button>
          <button
            v-if="pos.restaurantEnabled"
            class="btn btn--ghost pos-kitchen"
            title="إرسال الجديد للمطبخ (والإلغاءات)"
            :disabled="!pos.pendingKitchen.length || sendingKitchen"
            @click="sendKitchen"
          >
            <ChefHat :size="16" />
            <span>المطبخ</span>
            <span v-if="pos.pendingKitchen.length" class="pos-status__count">
              {{ formatNumber(pos.pendingKitchen.length) }}
            </span>
          </button>
          <button
            v-if="pos.deliveryOptions"
            class="btn btn--ghost pos-delivery"
            title="بيع توصيل — طيار أو شركة شحن (F10)"
            :disabled="!pos.cart.length"
            @click="openDelivery"
          >
            <Truck :size="16" />
            <span>توصيل</span>
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
                    :step="moneyStep()"
                    placeholder="0"
                  />
                </div>
                <div class="form-group">
                  <label>شبكة / بطاقة</label>
                  <StbNumberInput
                    v-model.number="pay.card"
                    class="form-input"
                    min="0"
                    :step="moneyStep()"
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

              <label v-if="selectedCustomer" class="checkbox-label">
                <input v-model="pay.credit" type="checkbox" />
                <span>
                  الباقي على حساب العميل (آجل) — {{ selectedCustomer.name }}
                </span>
              </label>
              <p v-else class="doc-hint">للبيع الآجل اختر عميلاً مسجّلاً أولاً.</p>

              <div
                v-if="payState.credit > 0"
                class="doc-totals"
                :class="{ 'pos-short': payState.creditOverLimit }"
              >
                <span>
                  على الحساب (آجل)
                  <template v-if="payState.creditOverLimit"> — يتجاوز حد الائتمان</template>
                </span>
                <strong class="doc-money">{{ formatCurrency(payState.credit) }}</strong>
              </div>
              <div
                v-else
                class="doc-totals"
                :class="{ 'pos-short': payState.short > 0 }"
              >
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
              <p v-for="message in payOverrides" :key="message" class="pos-note">
                {{ message }} — يحتاج موافقة مشرف
              </p>

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
            <div v-if="doneSale.creditAmount" class="doc-totals">
              <span>على حساب {{ doneSale.customerName }}</span>
              <strong class="doc-money">
                {{ formatCurrency(doneSale.creditAmount) }}
              </strong>
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
                <div v-if="pos.shiftSummary.courier">
                  <span>توصيل (يُحصَّل مع الطيار)</span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.courier) }}
                  </span>
                </div>
                <div v-if="pos.shiftSummary.credit">
                  <span>آجل (على الحساب)</span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.credit) }}
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
                <div v-if="pos.shiftSummary.cashIn">
                  <span>إيداعات في الدرج</span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.cashIn) }}
                  </span>
                </div>
                <div v-if="pos.shiftSummary.cashOut">
                  <span>مسحوبات من الدرج</span>
                  <span class="doc-money">
                    {{ formatCurrency(pos.shiftSummary.cashOut) }}
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
                <label>النقد المعدود في الدرج ({{ currencyLabel() }}) *</label>
                <StbNumberInput
                  v-model.number="closeForm.closingCash"
                  class="form-input"
                  min="0"
                  :step="moneyStep()"
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
                <button type="submit" class="btn btn--primary">
                  <Printer :size="16" /> تقفيل وطباعة تقرير Z
                </button>
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
            <div class="doc-actions pos-recent__actions">
              <button class="btn btn--sm btn--ghost" @click="printShiftReport('X')">
                <Printer :size="14" /> طباعة ملخص الوردية (X)
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
    <PosScreenSettings v-model="showSettings" @test-print="printTestReceipt" />
    <PosHeldModal v-model="showHeld" @resume="resumeHeld" @remove="removeHeld" />
    <PosCashMoveModal v-model="showCashMove" @submit="submitCashMove" />
    <PosCustomerModal v-model="showCustomer" />
    <PosDeliveryModal
      v-model="showDelivery"
      :options="pos.deliveryOptions"
      :items-total="itemsTotal"
      :customer="selectedCustomer ?? null"
      :busy="paying"
      @submit="submitDelivery"
    />
    <PosDiscountModal v-model="showDiscount" />
    <PosShortcutsModal v-model="showShortcuts" />
    <PosPriceModal :line="priceLine" @close="closePrice" @submit="submitPrice" />
    <PosApprovalModal ref="approval" />
    <PosShiftReport ref="shiftReport" :logo="pos.tenant?.logo ?? null" />
    <PosTablesModal
      v-model="showTables"
      @open="openTable"
      @move="moveTable"
      @takeaway="toTakeaway"
    />
    <PosKitchenModal
      v-model="showKitchen"
      @served="markServed"
      @reprint="printKitchen"
    />
    <PosKitchenTicket ref="kitchenPrinter" />
    <PosNumpad
      v-model="showNumpad"
      :multiplier="pendingQty"
      @multiply="onMultiply"
      @enter="onNumpadEnter"
    />

    <!-- الشعار من نسخة الجهاز: يُطبع بلا إنترنت ولا جلسة -->
    <SalesInvoicePrint
      ref="printer"
      :invoice="printTarget"
      :settings="pos.settings"
      :branch="pos.tenant?.branch"
      :logo="pos.tenant?.logo ?? null"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import {
  AlertTriangle,
  Armchair,
  Banknote,
  Building2,
  Calculator,
  ChefHat,
  ChevronLeft,
  CircleCheck,
  Inbox,
  Keyboard,
  CloudOff,
  CloudUpload,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Minus,
  MonitorSmartphone,
  MonitorUp,
  PauseCircle,
  Pencil,
  Percent,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  ScanBarcode,
  Settings,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Undo2,
  Unlock,
  UserPlus,
  UserRound,
  Wallet,
  Wifi,
  X,
} from "lucide-vue-next";
import { useAccess } from "@/composables/useAccess";
// الاسم مستعار: AccessState في القالب هو المكوّن لا النوع
import type { AccessState as AccessStatus } from "@/composables/useAccess";
import { useToast } from "@/composables/useToast";
import type { ShiftReportData } from "@/components/global/PosShiftReport.vue";
import { lineAmounts, sumAmounts, unitPriceOf } from "@/pos/calc";
import { isRepriced } from "@/pos/promotions";
import { createDisplayPublisher, type DisplayState } from "@/pos/display";
import { verifyCashierPin } from "@/pos/cashiers";
import type {
  CartLine,
  CashMove,
  DiningTableInfo,
  LocalKitchenTicket,
  LocalReturn,
  LocalSale,
  OutboxType,
  PosDevice,
  PosOptions,
  PosProduct,
  SaleDelivery,
  SalePayment,
} from "@/pos/types";
import type { DeliveryPayment } from "@/components/global/PosDeliveryModal.vue";
import { useAccessStore } from "@/stores/access";
import { useAuthStore } from "@/stores/auth";
import { usePosStore } from "@/stores/pos";
import type { PrintableInvoice } from "@/types/sales";
import { FEATURES, PERMS } from "@/utils/access";
import { installSoundUnlock, playSound, type SoundName } from "@/utils/sounds";

// بلا middleware "auth": الشاشة تعمل بهوية جهازها — تفتح وتبيع وترفع حتى لو
// انتهت جلسة المستخدم أو انقطع النت
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
const auth = useAuthStore();
const accessStore = useAccessStore();
const { resolve } = useAccess();
const toast = useToast();

/** صوت شاشة الكاشير (يُضبط من إعدادات الشاشة) */
const sound = (name: SoundName) => playSound(name, "pos");

/** أقصى عدد بلاطات أصناف تُرسم (الباقي يوصل له بالبحث) */
const MAX_TILES = 60;

const OUTBOX_LABELS: Record<OutboxType, string> = {
  "shift.open": "فتح وردية",
  "customer.create": "عميل جديد",
  sale: "فاتورة",
  return: "مرتجع",
  "cash.move": "حركة نقدية",
  audit: "سجل تدقيق",
  "shift.close": "تقفيل وردية",
  "kitchen.send": "بون مطبخ",
  "kitchen.close": "إغلاق طلب طاولة",
};

// ─── موافقة المشرف ────────────────────────────────────────────────────────────
const approval = ref<{
  request: (reason: string) => Promise<string | null>;
  isOpen: boolean;
} | null>(null);

/**
 * يتأكد أن العملية مسموحة: بلا موافقة إن لم تشترطها إعدادات الشركة (أو كان
 * كاشير الوردية مشرفاً)، وإلا برقم مشرف. `ok: false` = أُلغي الطلب.
 */
const authorize = async (
  kind: keyof PosOptions["approvals"] | "always",
  reason: string,
): Promise<{ ok: boolean; approvedBy: string | null }> => {
  if (!pos.needsSupervisor(kind)) return { ok: true, approvedBy: null };
  const approvedBy = (await approval.value?.request(reason)) ?? null;
  return { ok: !!approvedBy, approvedBy };
};

// ─── الصلاحية والخطة ──────────────────────────────────────────────────────────
// الشاشة المربوطة تعمل بهوية جهازها: تُحجب فقط إذا عرفنا يقيناً — من السيرفر،
// الآن — أن المستخدم المسجّل دخوله لا يملك صلاحية الكاشير أو أن الخطة لا
// تشمله. بلا إنترنت أو بلا جلسة لا نعرف، فلا نحجب (كان غياب التوكن يُقرأ
// "لا صلاحية"، فتُقفل الشاشة على صاحبها بعد ربع ساعة بلا إنترنت).
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

// ─── شاشة تحمل جهاز شركة أخرى ─────────────────────────────────────────────────
// الشاشة تعمل بهوية جهازها بلا جلسة (كاشير المحل). لكن إن سجّل الدخول عليها
// مستخدم شركة أخرى (خرج صاحبها ودخل غيره على نفس المتصفح) فبيانات الشركة
// الأولى لا تُعرض له: كاشيراتها وأصنافها ومبيعاتها
const otherCompany = computed(
  () =>
    !!pos.device?.tenantId &&
    auth.isAuthenticated &&
    !!auth.tenantId &&
    auth.tenantId !== pos.device.tenantId,
);
const forgetting = ref(false);

const forgetOtherCompany = async () => {
  forgetting.value = true;
  try {
    await pos.forgetDevice();
    await loadDevices();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فصل الشاشة"));
  } finally {
    forgetting.value = false;
  }
};

/** تنبيه مهلة العمل بلا اتصال (انظر pos.offlineState) */
const offlineNotice = computed(() => {
  const days = Math.floor(pos.offlineHours / 24);
  const limit = Math.round(pos.offlinePolicy.blockAfterHours / 24);
  return pos.offlineState === "blocked"
    ? `مرّ ${days} يوم بلا اتصال بالسيرفر. الوردية المفتوحة تكمل وتُقفَّل، لكن لا تُفتح وردية جديدة حتى يتصل الجهاز بالإنترنت.`
    : `مرّ ${days} يوم بلا اتصال بالسيرفر. البيع مستمر ومحفوظ على الجهاز — بعد ${limit} أيام بلا اتصال لن تُفتح وردية جديدة.`;
});

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
    pos.startKitchen();
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
const shiftForm = reactive({
  name: "",
  openingCash: "" as number | "",
  cashierId: "",
  pin: "",
});
const pinEl = ref<HTMLInputElement | null>(null);
const openingShift = ref(false);

const pickCashier = async (id: string) => {
  shiftForm.cashierId = id;
  shiftForm.pin = "";
  await nextTick();
  pinEl.value?.focus();
};

const submitOpenShift = async () => {
  openingShift.value = true;
  try {
    // التحقق من الرقم على الجهاز نفسه: يعمل بلا إنترنت
    const cashier = pos.cashiers.find((c) => c.id === shiftForm.cashierId) ?? null;
    if (pos.cashiers.length) {
      if (!cashier) {
        toast.warning("اختر الكاشير");
        return;
      }
      if (!(await verifyCashierPin(cashier, shiftForm.pin))) {
        shiftForm.pin = "";
        sound("error");
        toast.error("الرقم السري غير صحيح");
        return;
      }
    }

    await pos.openShift(
      Number(shiftForm.openingCash) || 0,
      cashier?.name ?? shiftForm.name,
      cashier,
    );
    shiftForm.pin = "";
    await nextTick();
    searchEl.value?.focus();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فتح الوردية"));
  } finally {
    openingShift.value = false;
  }
};

const showClose = ref(false);
const closeForm = reactive({ closingCash: "" as number | "", note: "" });

const closeDifference = computed(() =>
  sumAmounts([Number(closeForm.closingCash) || 0, -pos.shiftSummary.expectedCash]),
);

const openCloseShift = () => {
  if (pos.cart.length) {
    toast.warning("في السلة أصناف — أتمّ البيع أو أفرغ السلة قبل التقفيل");
    return;
  }
  if (pos.held.length) {
    toast.warning("توجد فواتير معلّقة — أتمّها أو احذفها قبل التقفيل");
    showHeld.value = true;
    return;
  }
  closeForm.closingCash = "";
  closeForm.note = "";
  showClose.value = true;
};

const submitCloseShift = async () => {
  try {
    // أرقام الوردية تُلتقط قبل التقفيل: بعده لا وردية على الشاشة
    const report = buildShiftReport("Z", {
      closingCash: Number(closeForm.closingCash) || 0,
      note: closeForm.note,
    });
    await pos.closeShift(Number(closeForm.closingCash) || 0, closeForm.note);
    showClose.value = false;
    if (report) void printReport(report);
    shiftForm.name = pos.cashierName;
    shiftForm.openingCash = "";
    shiftForm.cashierId = "";
    shiftForm.pin = "";
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

  try {
    if (pos.scan(term)) {
      sound("scan");
      search.value = "";
      applyPendingToScanned();
      promptPendingPrice();
      return;
    }
  } catch (e) {
    // باركود معروف لكن الرصيد لا يكفي
    sound("error");
    toast.warning(getErrorMessage(e, "تعذرت إضافة الصنف"));
    search.value = "";
    return;
  }
  if (filtered.value.length === 1) {
    if (add(filtered.value[0]!)) sound("scan");
    search.value = "";
    return;
  }
  // أهم صوت: بدونه يكمل الكاشير ولا يلاحظ أن الصنف لم يُضَف
  sound("error");
  toast.warning(
    filtered.value.length
      ? "أكثر من صنف مطابق — اختر من القائمة"
      : `لا يوجد صنف بالباركود أو الاسم "${term}"`,
  );
};

// ─── السلة ────────────────────────────────────────────────────────────────────
/**
 * يضيف صنفاً للسلة (رصيد غير كافٍ في مخزن لا يسمح بالسالب: تنبيه). يعيد
 * false إن لم يُضَف.
 */
const add = (product: PosProduct): boolean => {
  try {
    pos.addProduct(product, null, takePendingQty(product));
    promptPendingPrice();
    return true;
  } catch (e) {
    sound("error");
    toast.warning(getErrorMessage(e, "تعذرت إضافة الصنف"));
    return false;
  }
};

/** صنف مخزني نفد من مخزن الجهاز */
const isOut = (product: PosProduct) => {
  const available = pos.stockOf(product);
  return available !== null && available <= 0;
};

const selectedCustomer = computed(
  () => pos.customers.find((c) => c.id === pos.customerId) ?? null,
);

/** حذف سطر: يُسجَّل، وقد يحتاج موافقة مشرف حسب إعدادات الشركة */
const removeLine = async (line: CartLine) => {
  const { ok, approvedBy } = await authorize(
    "void",
    `حذف "${line.product.name}" من السلة`,
  );
  if (ok) await pos.removeLine(line.key, approvedBy);
};

const clearCart = async () => {
  if (!pos.cart.length) return;
  const { ok, approvedBy } = await authorize("void", "إفراغ السلة");
  if (ok) await pos.clearCart(approvedBy);
};

const step = (line: CartLine, delta: number) => {
  const next = (Number(line.quantity) || 0) + delta;
  if (next <= 0) void removeLine(line);
  else line.quantity = next;
};

// حقول الكمية والخصم لكل سطر: يركّز عليها اختصار لوحة المفاتيح
type InputHandle = { $el: HTMLInputElement };
const qtyInputs = new Map<number, InputHandle>();
const discountInputs = new Map<number, InputHandle>();
const trackInput = (
  inputs: Map<number, InputHandle>,
  key: number,
  el: unknown,
) => {
  if (el) inputs.set(key, el as InputHandle);
  else inputs.delete(key);
};
const focusInput = (inputs: Map<number, InputHandle>) => {
  const input = pos.selectedKey === null ? null : inputs.get(pos.selectedKey)?.$el;
  input?.focus();
  input?.select?.();
};

// ─── تعليق الفاتورة ───────────────────────────────────────────────────────────
const showHeld = ref(false);
const showDiscount = ref(false);
const showCustomer = ref(false);
const showShortcuts = ref(false);

const hold = async () => {
  if (!pos.cart.length) return;
  try {
    await pos.holdCart();
    toast.success("عُلّقت الفاتورة — تجدها في «معلّقة»");
    searchEl.value?.focus();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تعليق الفاتورة"));
  }
};

const resumeHeld = async (id: string) => {
  const ticket = await pos.resumeHeld(id);
  showHeld.value = false;
  if (ticket) await printKitchen(ticket);
};

const removeHeld = async (id: string) => {
  const { ok, approvedBy } = await authorize("void", "حذف فاتورة معلّقة");
  if (ok) await pos.deleteHeld(id, approvedBy);
};

// ─── حركة نقدية في الدرج ──────────────────────────────────────────────────────
const showCashMove = ref(false);

const submitCashMove = async (move: {
  type: CashMove["type"];
  amount: number;
  reason: string;
}) => {
  try {
    const { ok, approvedBy } =
      move.type === "out"
        ? await authorize(
            "cashOut",
            `سحب ${formatCurrency(move.amount)} من الدرج: ${move.reason}`,
          )
        : { ok: true, approvedBy: null };
    if (!ok) return;
    await pos.addCashMove(move.type, move.amount, move.reason, approvedBy);
    showCashMove.value = false;
    toast.success(move.type === "in" ? "سُجّل الإيداع" : "سُجّل السحب");
    // الدرج يُفتح للحركة نفسها: ليس فتحاً بلا سبب
    void kickDrawer();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تسجيل الحركة"));
  }
};

const changeUnit = (line: CartLine, unitId: string) => {
  const unit = line.product.units.find((u) => u.unitId === unitId);
  line.unitId = unit ? unit.unitId : null;
  line.unitName = unit ? unit.name : line.product.baseUnitName;
  line.factor = unit ? unit.factor : 1;
  // سعر الوحدة الجديدة: أي تعديل على سعر السابقة يُلغى، كالخصم
  pos.resetLinePrice(line);
  line.discount = 0;
  promptPendingPrice();
};

// ─── سعر الصنف في هذه الفاتورة ────────────────────────────────────────────────
/** السطر المفتوح في نافذة السعر (null = مغلقة) */
const priceLine = ref<CartLine | null>(null);

const editPrice = (line: CartLine) => {
  pos.selectedKey = line.key;
  priceLine.value = line;
};

const closePrice = async () => {
  priceLine.value = null;
  await nextTick();
  searchEl.value?.focus();
};

/** صنف بسعر مفتوح أُضيف للتو: تُطلب كتابة سعره فوراً */
const promptPendingPrice = () => {
  const line = pos.cart.find((l) => l.key === pos.selectedKey);
  if (line?.pricePending) priceLine.value = line;
};

const submitPrice = async ({ price, reason }: { price: number; reason: string | null }) => {
  const line = priceLine.value;
  if (!line) return;
  try {
    const list = pos.listPriceOf(line);
    const changing = !line.product.openPrice && Math.abs(price - list) > 1e-9;
    let approvedBy: string | null = null;
    // كاشير بلا صلاحية تغيير السعر، أو شركة تشترط الموافقة: رقم مشرف قبل التطبيق
    if (changing && pos.needsPriceApproval()) {
      priceLine.value = null;
      approvedBy =
        (await approval.value?.request(
          `تغيير سعر "${line.product.name}" من ${formatMoney(list)} إلى ${formatMoney(price)}${reason ? ` — ${reason}` : ""}`,
        )) ?? null;
      if (!approvedBy) return;
    }
    pos.setLinePrice(line.key, price, { reason, approvedBy });
    await closePrice();
  } catch (e) {
    sound("error");
    toast.error(getErrorMessage(e, "تعذر تغيير السعر"));
  }
};

// ─── الدفع ────────────────────────────────────────────────────────────────────
const showPay = ref(false);
const paying = ref(false);
const cashEl = ref<{ $el: HTMLInputElement } | null>(null);
const pay = reactive({
  cash: "" as number | "",
  card: "" as number | "",
  /** الباقي على حساب العميل (بيع آجل) */
  credit: false,
});

/** فئات نقدية قريبة أكبر من المطلوب، لضغطة واحدة */
const quickCash = computed(() => {
  const total = pos.cartTotals.total;
  return [5, 10, 20, 50, 100, 200, 500].filter((note) => note > total).slice(0, 3);
});

const payState = computed(() => {
  const total = pos.cartTotals.total;
  const card = Number(pay.card) || 0;
  const cash = Number(pay.cash) || 0;
  /** ما بقي بعد الشبكة: يُدفع نقداً، أو يُقيَّد على الحساب */
  const afterCard = sumAmounts([total, -card]);
  const onAccount = pay.credit && !!selectedCustomer.value;
  const credit = onAccount ? Math.max(sumAmounts([afterCard, -cash]), 0) : 0;
  const cashDue = sumAmounts([afterCard, -credit]);

  const limit = selectedCustomer.value?.creditLimit ?? null;
  return {
    /** ما يُسجَّل نقداً = المطلوب نقداً (لا ما استُلم) */
    cashDue,
    credit,
    creditOverLimit:
      credit > 0 &&
      limit !== null &&
      pos.customerBalance(selectedCustomer.value!.id) + credit > limit + 1e-9,
    short: Math.max(sumAmounts([cashDue, -cash]), 0),
    change: Math.max(sumAmounts([cash, -cashDue]), 0),
    error: card > total ? "مبلغ الشبكة أكبر من المطلوب" : "",
  };
});

/** ما يتجاوز صلاحية الكاشير في هذه الفاتورة: يُطلب له رقم مشرف عند الإتمام */
const payOverrides = computed(() => [
  ...pos.cartIssues.belowMin,
  ...pos.cartIssues.reducedNoDiscount,
  ...(pos.cartIssues.discountOverLimit
    ? [`الخصم ${pos.priced.manualPercent.toFixed(1)}% يتجاوز حدّك (${pos.discountLimit}%)`]
    : []),
  ...(payState.value.creditOverLimit
    ? [`تجاوز حد ائتمان "${selectedCustomer.value?.name}"`]
    : []),
]);

const payAll = (method: "cash" | "card") => {
  pay.cash = method === "cash" ? pos.cartTotals.total : "";
  pay.card = method === "card" ? pos.cartTotals.total : "";
};

/** السلة جاهزة للدفع؟ وإلا يُنبَّه الكاشير لما ينقصها */
const cartReady = (): boolean => {
  const empty = pos.cart.find((line) => !(Number(line.quantity) > 0));
  if (empty) {
    sound("error");
    toast.warning(`أدخل كمية "${empty.product.name}"`);
    return false;
  }
  // صنف بسعر مفتوح بلا سعر: تُفتح نافذته بدل رسالة فقط
  const unpriced = pos.cart.find((line) => line.pricePending);
  if (unpriced) {
    sound("error");
    editPrice(unpriced);
    return false;
  }
  if (pos.cartIssues.blocked.length) {
    sound("error");
    toast.warning(pos.cartIssues.blocked[0]!);
    return false;
  }
  return true;
};

const openPay = async () => {
  if (!cartReady()) return;
  pay.cash = "";
  pay.card = "";
  pay.credit = false;
  showPay.value = true;
  await nextTick();
  cashEl.value?.$el.focus();
};

const submitPay = async () => {
  if (payState.value.short > 0 || payState.value.error) return;
  paying.value = true;
  try {
    // ما يتجاوز صلاحية الكاشير: برقم مشرف، أو يُمنع إن لم يكن في الشركة من يوافق
    let approvedBy: string | null = null;
    if (payOverrides.value.length) {
      if (!pos.cashiers.length) {
        sound("error");
        toast.error(payOverrides.value[0]!);
        return;
      }
      const granted = await authorize("always", payOverrides.value.join(" · "));
      if (!granted.ok) return;
      approvedBy = granted.approvedBy;
    }

    const payments: SalePayment[] = [];
    if (payState.value.cashDue > 0) {
      payments.push({ method: "cash", amount: payState.value.cashDue });
    }
    if (Number(pay.card) > 0) {
      payments.push({ method: "card", amount: Number(pay.card) });
    }

    const sale = await pos.checkout(payments, Number(pay.cash) || 0, approvedBy);
    sound("success");
    if (payments.some((p) => p.method === "cash")) void kickDrawer();
    showPay.value = false;
    doneSale.value = sale;
    await printSale(sale);
    await printPendingKitchen();
    await nextTick();
    nextEl.value?.focus();
  } catch (e) {
    sound("error");
    toast.error(getErrorMessage(e, "تعذر إتمام البيع"));
  } finally {
    paying.value = false;
  }
};

// ─── بيع توصيل ────────────────────────────────────────────────────────────────
const showDelivery = ref(false);

/** إجمالي الأصناف بلا سطر رسوم التوصيل (النافذة تضيف الرسوم التي تُكتب) */
const itemsTotal = computed(() => {
  const feeId = pos.deliveryOptions?.feeProductId;
  return sumAmounts(
    pos.priced.lines
      .filter((p) => p.line.product.id !== feeId)
      .map((p) => p.total),
  );
});

const openDelivery = () => {
  if (!pos.cart.length || !cartReady()) return;
  pay.credit = false;
  showDelivery.value = true;
};

/**
 * يتم البيع "توصيل": الرسوم سطر في الفاتورة، والثمن كاملاً إما "تحصيل عبر
 * التوصيل" (على الطيار حتى تسويته — لا يدخل الدرج) أو مدفوع الآن. يعمل بلا
 * إنترنت: الأوردر يُنشأ في السيرفر عند رفع الفاتورة.
 */
const submitDelivery = async ({
  delivery,
  payment,
}: {
  delivery: SaleDelivery;
  payment: DeliveryPayment;
}) => {
  paying.value = true;
  let completed = false;
  try {
    pos.setDeliveryFee(delivery.deliveryFee);

    let approvedBy: string | null = null;
    if (payOverrides.value.length) {
      if (!pos.cashiers.length) {
        sound("error");
        toast.error(payOverrides.value[0]!);
        return;
      }
      const granted = await authorize("always", payOverrides.value.join(" · "));
      if (!granted.ok) return;
      approvedBy = granted.approvedBy;
    }

    const total = pos.cartTotals.total;
    const payments: SalePayment[] =
      total > 0
        ? [{ method: payment === "cod" ? "courier" : payment, amount: total }]
        : [];
    const sale = await pos.checkout(
      payments,
      payment === "cash" ? total : 0,
      approvedBy,
      delivery,
    );
    completed = true;
    sound("success");
    if (payment === "cash") void kickDrawer();
    showDelivery.value = false;
    doneSale.value = sale;
    await printSale(sale);
    await printPendingKitchen();
    await nextTick();
    nextEl.value?.focus();
  } catch (e) {
    sound("error");
    toast.error(getErrorMessage(e, "تعذر إتمام بيع التوصيل"));
  } finally {
    // لم يكتمل البيع: سطر الرسوم لا يبقى في السلة
    if (!completed) {
      try {
        pos.setDeliveryFee(0);
      } catch {
        // لا صنف رسوم: لا سطر أصلاً
      }
    }
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
    ? {
        name: sale.customerName,
        taxNumber: sale.customerTaxNumber,
        phone: sale.customerPhone ?? null,
        balance: sale.customerBalance ?? null,
      }
    : null,
  invoiceDate: sale.issuedAt,
  issuedAt: sale.issuedAt,
  subtotal: sale.subtotal,
  taxTotal: sale.taxTotal,
  total: sale.total,
  paidAmount: sumAmounts([sale.total, -(sale.creditAmount ?? 0)]),
  remaining: sale.creditAmount ?? 0,
  qrCode: sale.qrCode,
  tableName: sale.tableName ?? null,
  delivery: sale.delivery
    ? {
        recipientName: sale.delivery.recipientName,
        phone: sale.delivery.phone,
        address: sale.delivery.address,
        zoneName: sale.delivery.zoneName ?? null,
        agentName: sale.delivery.agentName ?? null,
        collect: sumAmounts(
          sale.payments.filter((p) => p.method === "courier").map((p) => p.amount),
        ),
        note: sale.delivery.note ?? null,
      }
    : null,
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

/**
 * إيصال تجريبي لاختبار الطابعة ومقاس الورق: أصناف وهمية بحساب الشاشة نفسه
 * (وضع الضريبة الحالي)، بلا رقم فاتورة ولا QR ولا أي أثر على الوردية أو الطابور
 */
const printTestReceipt = async () => {
  const samples = [
    { productName: "صنف تجريبي 1", unitName: "قطعة", quantity: 2, unitPrice: 10 },
    { productName: "صنف تجريبي باسم أطول ليُرى الالتفاف", unitName: "كيلوجرام", quantity: 1.5, unitPrice: 24 },
    { productName: "صنف تجريبي 3", unitName: "كرتون", quantity: 1, unitPrice: 55 },
  ];
  const rate = pos.settings?.vatRegistered === false ? 0 : (pos.products[0]?.taxRate ?? 15);
  const lines = samples.map((sample, index) => ({
    id: `test-${index}`,
    ...sample,
    discount: 0,
    ...lineAmounts({ ...sample, discount: 0, taxRate: rate }),
  }));
  const issuedAt = new Date().toISOString();
  showSettings.value = false;
  try {
    printTarget.value = {
      test: true,
      number: "TEST",
      invoiceType: "simplified",
      customer: null,
      invoiceDate: issuedAt,
      issuedAt,
      subtotal: sumAmounts(lines.map((l) => l.subtotal)),
      taxTotal: sumAmounts(lines.map((l) => l.taxAmount)),
      total: sumAmounts(lines.map((l) => l.total)),
      paidAmount: sumAmounts(lines.map((l) => l.total)),
      remaining: 0,
      qrCode: null,
      lines,
    };
    await nextTick();
    await printer.value?.print("thermal");
  } catch (e) {
    sound("error");
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
    let approvedBy: string | null = null;
    if (manual) {
      const granted = await authorize("manualDrawer", "فتح الدرج بلا بيع");
      if (!granted.ok) return;
      approvedBy = granted.approvedBy;
    }
    await pos.openDrawer(manual, approvedBy);
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

// ─── تقرير الوردية (X / Z) ────────────────────────────────────────────────────
const shiftReport = ref<{ print: (data: ShiftReportData) => Promise<void> } | null>(
  null,
);

const buildShiftReport = (
  kind: ShiftReportData["kind"],
  closing: { closingCash: number | null; note: string } = {
    closingCash: null,
    note: "",
  },
): ShiftReportData | null => {
  if (!pos.shift || !pos.device) return null;
  const summary = pos.shiftSummary;
  const branch = pos.tenant?.branch;
  return {
    kind,
    company: pos.settings?.sellerName || pos.tenant?.companyName || "",
    branch: branch && !branch.isMain ? branch.name : "",
    device: pos.device.name,
    cashier: pos.shift.cashierName,
    openedAt: pos.shift.openedAt,
    printedAt: new Date().toISOString(),
    openingCash: pos.shift.openingCash,
    invoicesCount: summary.invoicesCount,
    salesTotal: summary.salesTotal,
    cash: summary.cash,
    card: summary.card,
    credit: summary.credit,
    courier: summary.courier,
    discounts: summary.discounts,
    returnsCount: summary.returnsCount,
    returnsTotal: summary.returnsTotal,
    cashRefunds: summary.cashRefunds,
    cashIn: summary.cashIn,
    cashOut: summary.cashOut,
    drawerOpens: summary.drawerOpens,
    expectedCash: summary.expectedCash,
    closingCash: closing.closingCash,
    note: closing.note,
    moves: pos.cashMoves.filter((move) => move.shiftId === pos.shift!.id),
  };
};

const printReport = async (data: ShiftReportData) => {
  try {
    // الإيصال السابق لا يُطبع مع التقرير
    printTarget.value = null;
    await nextTick();
    await shiftReport.value?.print(data);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذرت الطباعة"));
  }
};

const printShiftReport = (kind: ShiftReportData["kind"]) => {
  const report = buildShiftReport(kind);
  if (report) void printReport(report);
};

// ─── المطاعم: الطاولات والمطبخ ────────────────────────────────────────────────
const showTables = ref(false);
const showKitchen = ref(false);
const sendingKitchen = ref(false);
const kitchenPrinter = ref<{ print: (ticket: LocalKitchenTicket) => Promise<void> } | null>(
  null,
);

/** ملاحظات جاهزة للمطبخ (تُضاف بضغطة) */
const NOTE_CHIPS = ["بدون بصل", "بدون صوص", "سبايسي", "زيادة", "خفيف", "سفري"];

/** طاولات مشغولة (المفتوح على الشاشة وغيره) */
const openTablesCount = computed(() => pos.tableStatus.size);

const printKitchen = async (ticket: LocalKitchenTicket) => {
  try {
    // الإيصال السابق لا يُطبع مع البون
    printTarget.value = null;
    await nextTick();
    await kitchenPrinter.value?.print(ticket);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذرت طباعة بون المطبخ"));
  }
};

/** بون أُرسل تلقائياً مع البيع: يُطبع بعد الإيصال */
const printPendingKitchen = async () => {
  const ticket = pos.takeKitchenTicket();
  if (ticket) await printKitchen(ticket);
};

const sendKitchen = async () => {
  if (!pos.pendingKitchen.length) return;
  sendingKitchen.value = true;
  try {
    const sent = pos.pendingKitchen.length;
    const ticket = await pos.sendToKitchen();
    sound("scan");
    toast.success(
      pos.online
        ? `أُرسل للمطبخ (${formatNumber(sent)} صنف)`
        : "بلا إنترنت: اطبع البون للمطبخ — يصل شاشته عند عودة الاتصال",
    );
    if (ticket) await printKitchen(ticket);
  } catch (e) {
    sound("error");
    toast.error(getErrorMessage(e, "تعذر الإرسال للمطبخ"));
  } finally {
    sendingKitchen.value = false;
  }
};

const openTable = async (table: DiningTableInfo) => {
  const hadTakeaway = pos.order.type !== "dine_in" && pos.cart.length > 0;
  try {
    const ticket = await pos.openTable(table);
    showTables.value = false;
    if (hadTakeaway) toast.info("عُلّقت الفاتورة السفري الجارية — تجدها في «معلّقة»");
    if (ticket) await printKitchen(ticket);
    await nextTick();
    searchEl.value?.focus();
  } catch (e) {
    sound("error");
    toast.error(getErrorMessage(e, "تعذر فتح الطاولة"));
  }
};

const toTakeaway = async () => {
  try {
    const ticket = await pos.switchToTakeaway();
    showTables.value = false;
    if (ticket) await printKitchen(ticket);
    searchEl.value?.focus();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الرجوع للسفري"));
  }
};

const moveTable = (table: DiningTableInfo) => {
  try {
    const from = pos.order.tableName;
    pos.moveTable(table);
    showTables.value = false;
    toast.success(`نُقل الطلب من ${from} إلى ${table.name}`);
  } catch (e) {
    toast.warning(getErrorMessage(e, "تعذر نقل الطلب"));
  }
};

const openKitchen = () => {
  showKitchen.value = true;
  void pos.refreshKitchen();
};

const markServed = async (id: string) => {
  try {
    await pos.markServed(id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تسجيل الاستلام"));
  }
};

// الجاهز في المطبخ: صوت وتنبيه مرة لكل طلب
const announcedReady = new Set<string>();
watch(
  () => pos.readyOrders.map((o) => o.id).join(","),
  () => {
    const fresh = pos.readyOrders.filter((o) => !announcedReady.has(o.id));
    fresh.forEach((o) => announcedReady.add(o.id));
    if (!fresh.length) return;
    sound("kitchenReady");
    toast.info(
      fresh
        .map((o) => `طلب #${o.ticketNo} جاهز${o.tableName ? ` — ${o.tableName}` : o.label ? ` — ${o.label}` : ""}`)
        .join(" · "),
    );
  },
);

// ملاحظة للمطبخ على سطر
const noteKey = ref<number | null>(null);
const noteEl = ref<HTMLInputElement | null>(null);
const toggleNote = async (line: CartLine) => {
  pos.selectedKey = line.key;
  noteKey.value = noteKey.value === line.key ? null : line.key;
  if (noteKey.value !== null) {
    await nextTick();
    noteEl.value?.focus();
  }
};

// ─── لوحة الأرقام ─────────────────────────────────────────────────────────────
const NUMPAD_OPEN_KEY = "stb-pos-numpad-open";
const showNumpad = ref(false);
/** كمية الصنف التالي ("3 ×" ثم الصنف) */
const pendingQty = ref<number | null>(null);

const toggleNumpad = () => {
  showNumpad.value = !showNumpad.value;
  try {
    localStorage.setItem(NUMPAD_OPEN_KEY, showNumpad.value ? "1" : "0");
  } catch {
    // يكفي لهذه الجلسة
  }
};

/** الكمية المعلّقة للصنف المضاف (وتُمسح). الصنف بسعر مفتوح يُضاف بقطعة */
const takePendingQty = (product: PosProduct): number => {
  const quantity = pendingQty.value;
  pendingQty.value = null;
  if (!quantity || product.openPrice) return 1;
  return product.allowsFractions ? quantity : Math.round(quantity) || 1;
};

/** بعد مسح باركود: الكمية المعلّقة على السطر (لا على الموزون: الوزن من الميزان) */
const applyPendingToScanned = () => {
  const quantity = pendingQty.value;
  pendingQty.value = null;
  const line = selectedLine();
  if (!quantity || !line || line.product.isWeighted || line.product.openPrice) return;
  const extra = (line.product.allowsFractions ? quantity : Math.round(quantity)) - 1;
  if (extra > 0) line.quantity = (Number(line.quantity) || 0) + extra;
};

const onMultiply = (value: number, input: HTMLInputElement | null) => {
  // "×" في حقل غير البحث (كمية، مبلغ) لا معنى له
  if (input && input !== searchEl.value) return;
  pendingQty.value = value;
  if (input) search.value = "";
  searchEl.value?.focus();
};

/** "إدخال" بلا حقل مركّز: الرقم باركود أو كود صنف */
const onNumpadEnter = (value: string) => {
  search.value = value;
  onSearchEnter();
};

// ─── شاشة العميل ──────────────────────────────────────────────────────────────
const displayState = (): DisplayState => ({
  company: pos.settings?.sellerName || pos.tenant?.companyName || "",
  currency: currencyLabel(),
  decimals: pos.tenant?.currencyDecimals ?? 2,
  lines: pos.priced.lines.map((p) => ({
    name: p.line.product.name,
    quantity: Number(p.line.quantity) || 0,
    unitName: p.line.unitName,
    total: p.total,
  })),
  discount: sumAmounts([pos.priced.promoDiscount, pos.priced.manualDiscount]),
  total: pos.priced.total,
  done: doneSale.value
    ? {
        total: doneSale.value.total,
        paid: sumAmounts([doneSale.value.total, -(doneSale.value.creditAmount ?? 0)]),
        change: doneSale.value.change,
      }
    : null,
});
const display = createDisplayPublisher(displayState);
watch([() => pos.priced, doneSale], () => display.publish(), { deep: false });

const openCustomerDisplay = () => {
  const opened = window.open(
    "/pos/display",
    "stb-pos-display",
    "popup,width=900,height=600",
  );
  if (!opened) toast.warning("اسمح بالنوافذ المنبثقة لهذا الموقع لفتح شاشة العميل");
};

// ─── اختصارات لوحة المفاتيح ───────────────────────────────────────────────────
/** نافذة مفتوحة فوق شاشة البيع: الاختصارات لا تعمل تحتها */
const modalOpen = computed(
  () =>
    showPay.value ||
    !!doneSale.value ||
    showClose.value ||
    showRecent.value ||
    showFailed.value ||
    showReturn.value ||
    showSettings.value ||
    showHeld.value ||
    showCashMove.value ||
    showCustomer.value ||
    showDelivery.value ||
    showDiscount.value ||
    showShortcuts.value ||
    showTables.value ||
    showKitchen.value ||
    !!priceLine.value ||
    !!approval.value?.isOpen,
);

const closeTopModal = () => {
  if (approval.value?.isOpen) return; // لها زر إلغاء يسجّل الرفض
  if (priceLine.value) void closePrice();
  else if (showPay.value) showPay.value = false;
  else if (doneSale.value) void finishSale();
  else
    for (const flag of [
      showClose,
      showRecent,
      showFailed,
      showReturn,
      showSettings,
      showHeld,
      showCashMove,
      showCustomer,
      showDelivery,
      showDiscount,
      showShortcuts,
      showTables,
      showKitchen,
    ]) {
      flag.value = false;
    }
};

const selectedLine = () =>
  pos.cart.find((line) => line.key === pos.selectedKey) ?? null;

const moveSelection = (delta: number) => {
  if (!pos.cart.length) return;
  const index = pos.cart.findIndex((line) => line.key === pos.selectedKey);
  const next = Math.min(Math.max(index + delta, 0), pos.cart.length - 1);
  pos.selectedKey = pos.cart[next]!.key;
};

const onKeydown = (event: KeyboardEvent) => {
  if (!pos.shift || event.ctrlKey || event.altKey || event.metaKey) return;
  // الشاشة محجوبة (جهاز شركة أخرى): لا اختصارات تفتح نوافذ فوقها
  if (otherCompany.value) return;
  const { key } = event;
  const handle = (action: () => void) => {
    event.preventDefault();
    action();
  };

  if (key === "Escape") return handle(closeTopModal);
  if (key === "F3") return handle(toggleNumpad);
  if (modalOpen.value) {
    // داخل نافذة الدفع: F4 = نقداً بالضبط
    if (key === "F4" && showPay.value) handle(() => payAll("cash"));
    else if (/^F\d+$/.test(key)) event.preventDefault();
    return;
  }

  switch (key) {
    case "F1":
      return handle(() => (showShortcuts.value = true));
    case "F2":
      return handle(() => searchEl.value?.focus());
    case "F4":
      return handle(() => pos.cart.length && void openPay());
    case "F6":
      return handle(() => void hold());
    case "F7":
      return handle(() => (showHeld.value = true));
    case "F8":
      return handle(() => pos.cart.length && (showDiscount.value = true));
    case "F9":
      return handle(() => (showCashMove.value = true));
    case "F10":
      return handle(() => pos.deliveryOptions && openDelivery());
  }

  // ما بعدها يعمل على السطر المحدد، وفقط خارج حقول الكتابة
  const target = event.target as HTMLElement | null;
  const typing =
    !!target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  // في حقل البحث الفارغ تبقى الأسهم و+/− للسلة (الباركود لا يحويها)
  const inEmptySearch = target === searchEl.value && !search.value;
  if (typing && !inEmptySearch) return;

  const line = selectedLine();
  switch (key) {
    case "ArrowDown":
      return handle(() => moveSelection(1));
    case "ArrowUp":
      return handle(() => moveSelection(-1));
    case "+":
      return line && handle(() => step(line, 1));
    case "-":
      return line && handle(() => step(line, -1));
    case "*":
      return line && handle(() => focusInput(qtyInputs));
    case "/":
      return line && handle(() => focusInput(discountInputs));
    case "=":
      return line && handle(() => editPrice(line));
    case "Delete":
      return line && handle(() => void removeLine(line));
  }
};

// ─── المرفوضات ────────────────────────────────────────────────────────────────
const showFailed = ref(false);

// ─── أصوات الاتصال والطابور ───────────────────────────────────────────────────
// حالة الاتصال عند فتح الشاشة ليست "تغيّراً": الأصوات تبدأ بعد أول مزامنة
// تكتمل، فلا يُسمع "عاد الاتصال" مع كل فتح للشاشة، ولا "مرفوضة" لعمليات
// رُفضت قبل إغلاقها
const connectionKnown = ref(false);
watch(
  () => pos.syncing,
  (busy) => {
    if (!busy) connectionKnown.value = true;
  },
);
watch(
  () => pos.online,
  (online) => {
    if (connectionKnown.value) sound(online ? "online" : "offline");
  },
);
watch(
  () => pos.failedEntries.length,
  (count, before) => {
    if (connectionKnown.value && count > before) sound("rejected");
  },
);

const retryFailed = async () => {
  await pos.retryFailed();
  if (!pos.failedEntries.length) {
    showFailed.value = false;
    toast.success("تم رفع العمليات");
  }
};

// ─── التشغيل ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  // الـ service worker يجعل الشاشة تفتح بلا إنترنت (utils/offline-shell)
  registerOfflineShell();
  // أول ضغطة أو زر يفتح الصوت (سياسة المتصفحات)، فتُسمع أصوات المؤقتات بعدها
  installSoundUnlock();
  window.addEventListener("keydown", onKeydown);
  try {
    await pos.init();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فتح قاعدة بيانات الجهاز"));
    return;
  }
  shiftForm.name = pos.cashierName;

  // خطة الشركة وصلاحيات المستخدم الحالي: تُعرف فقط إذا ردّ السيرفر على جلسة
  // قائمة. غير ذلك (بلا إنترنت، بلا جلسة) لا يحجب الشاشة
  void pos.fetchUserAccess().then((access) => {
    if (!access) return;
    accessStore.apply(access);
    accessKnown.value = true;
  });

  try {
    showNumpad.value = localStorage.getItem(NUMPAD_OPEN_KEY) === "1";
  } catch {
    // مقفلة
  }

  if (pos.device) {
    pos.start();
    pos.startKitchen();
    await nextTick();
    searchEl.value?.focus();
  } else {
    await loadDevices();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  display.close();
  pos.stopKitchen();
  pos.stop();
});
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

  // صف واحد ما اتسع: الأدوات ثم الدفع. مع المطبخ والتوصيل ينزل الدفع لصف
  // كامل تحتها بدل أن يُقصّ خارج السلة
  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: $space-2;

    > .btn {
      white-space: nowrap;
    }
    > .btn--icon {
      flex: none;
    }
  }
}

.pos-kitchen,
.pos-delivery {
  flex: 1 1 auto;
  justify-content: center;
}

.pos-pay {
  flex: 1 1 220px;
  min-width: 0;
  justify-content: space-between;
  gap: $space-3;
  padding-block: $space-4;
  font-size: $font-size-lg;

  strong {
    font-size: $font-size-xl;
    direction: ltr;
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
// ─── إضافات: الرصيد، السطر المحدد، العروض، العميل ────────────────────────────
.pos-tile {
  &.is-out {
    opacity: 0.55;
  }
  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
  }
  &__stock {
    padding: 0 $space-2;
    font-size: $font-size-xs;
    font-weight: 700;
    color: $stb-text-secondary;
    background: $stb-surface-3;
    border-radius: $radius-sm;
    direction: ltr;
  }
}

.pos-line {
  cursor: pointer;

  &.is-selected {
    border-color: $stb-accent;
    box-shadow: inset 3px 0 0 $stb-accent;
  }
  &__promo {
    margin-inline-start: $space-2;
    font-size: $font-size-xs;
  }
  s {
    color: $stb-text-muted;
  }
  // السعر قابل للضغط: يفتح نافذة سعر هذه الفاتورة
  &__price {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    padding: 2px $space-2;
    font-size: $font-size-xs;
    color: $stb-text-secondary;
    background: transparent;
    border: 1px dashed transparent;
    border-radius: $radius-sm;
    cursor: pointer;

    &:hover {
      color: $stb-accent;
      border-color: $stb-border-light;
    }
    &.is-pending {
      font-weight: 700;
      color: $stb-danger;
      border-color: $stb-danger;
    }
  }
}

.pos-cart {
  &__customer {
    display: flex;
    gap: $space-2;

    .form-select {
      flex: 1;
      min-width: 0;
    }
  }
  &__balance {
    margin: -$space-2 0 0;
  }
  &__actions .btn.is-on {
    color: $stb-accent;
    border-color: $stb-accent;
  }
}

.pos-over {
  color: $stb-danger;
  font-weight: 700;
}

.pos-held-btn .pos-status__count {
  margin-inline-start: $space-1;
}

.pos-recent__actions {
  padding: 0 $space-4 $space-3;
}

// ─── المطاعم ولوحة الأرقام ───────────────────────────────────────────────────
// الكمية المعلّقة (× 3) داخل حقل البحث، على يسار النص
.pos-times {
  position: absolute;
  left: $space-2;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px $space-3;
  font-family: inherit;
  font-weight: 800;
  color: $stb-on-accent;
  background: $stb-accent;
  border: 0;
  border-radius: $radius-full;
  cursor: pointer;
  direction: ltr;
}

// نوع الطلب أعلى السلة: سفري أو الطاولة (يفتح الطاولات)
.pos-cart__order {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  font-family: inherit;
  color: $stb-text-primary;
  background: $stb-surface-2;
  border: 1px solid $stb-border-light;
  border-radius: $radius-md;
  cursor: pointer;

  &.is-table {
    border-color: $stb-warning;
    background: rgba($stb-warning, 0.1);
  }
  &:hover {
    border-color: $stb-accent;
  }
}
.pos-cart__order-change {
  margin-inline-start: auto;
  font-size: $font-size-xs;
  color: $stb-accent;
}

.pos-line__note {
  display: block;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $stb-warning;
}
.pos-line__note-edit {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.pos-line__note-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;

  .doc-tab {
    padding: 2px $space-2;
    font-size: $font-size-xs;
  }
}
.pos-line__head .btn.is-on {
  color: $stb-warning;
}

.pos-kitchen .pos-status__count,
.pos-tables-btn .pos-status__count {
  margin-inline-start: $space-1;
}
.pos-tables-btn.is-on {
  color: $stb-warning;
}
// طلب جاهز في المطبخ: الزر ينبض حتى يُفتح
.pos-kitchen-ready {
  color: $stb-success;
  animation: pos-ready-pulse 1.6s ease-in-out infinite;
}
@keyframes pos-ready-pulse {
  50% {
    box-shadow: 0 0 0 4px rgba($stb-success, 0.25);
  }
}
</style>
