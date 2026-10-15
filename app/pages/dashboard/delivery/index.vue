<!-- pages/dashboard/delivery/index.vue — لوحة أوردرات التوصيل -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>أوردرات التوصيل</h1>
        <p>
          كل أوردر خلفه فاتورة بيع: تصدر عند خروجه مع الطيار أو شركة الشحن،
          وتُرجَع كاملة إن لم يُسلَّم
        </p>
      </div>
      <div class="page-header__actions">
        <button
          class="btn btn--ghost btn--icon"
          title="تحديث"
          :class="{ 'btn--loading': list.loading.value }"
          @click="refresh"
        >
          <RefreshCw :size="18" />
        </button>
        <button
          v-can="'manage_delivery'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>أوردر جديد</span>
        </button>
      </div>
    </div>

    <!-- ══ الأرقام ══ -->
    <div class="doc-stats">
      <button
        class="stat-card"
        :class="{ 'is-active': filters.tab === 'waiting' }"
        @click="setTab('waiting')"
      >
        <div class="stat-card__icon doc-tone--info"><PackageOpen :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            {{ formatNumber(summary.counts.new + summary.counts.assigned) }}
          </div>
          <div class="stat-card__label">
            بانتظار الخروج
            <template v-if="summary.counts.new">
              · {{ formatNumber(summary.counts.new) }} بلا طيار
            </template>
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ 'is-active': filters.tab === 'out_for_delivery' }"
        @click="setTab('out_for_delivery')"
      >
        <div
          class="stat-card__icon"
          :class="summary.lateCount ? 'doc-tone--danger' : 'doc-tone--accent'"
        >
          <Truck :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            {{ formatNumber(summary.counts.out_for_delivery) }}
          </div>
          <div class="stat-card__label">
            في الطريق
            <span v-if="summary.lateCount" class="text-danger">
              · {{ formatNumber(summary.lateCount) }} متأخر
            </span>
          </div>
        </div>
      </button>
      <NuxtLink to="/dashboard/delivery/agents" class="stat-card">
        <div class="stat-card__icon doc-tone--warning"><HandCoins :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatCurrency(summary.heldTotal) }}</div>
          <div class="stat-card__label">
            مع الطيارين والشركات
            <template v-if="summary.outCodTotal">
              · {{ formatCurrency(summary.outCodTotal) }} في الطريق
            </template>
          </div>
        </div>
      </NuxtLink>
      <button
        class="stat-card"
        :class="{ 'is-active': filters.tab === 'delivered' }"
        @click="setTab('delivered')"
      >
        <div class="stat-card__icon doc-tone--success"><PackageCheck :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">
            {{ formatNumber(summary.counts.delivered) }}
          </div>
          <div class="stat-card__label">
            سُلّم اليوم
            <template v-if="summary.counts.failed">
              · {{ formatNumber(summary.counts.failed) }} لم يُسلَّم
            </template>
          </div>
        </div>
      </button>
    </div>

    <div class="doc-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        class="doc-tab"
        :class="{ 'is-active': filters.tab === tab.value }"
        @click="setTab(tab.value)"
      >
        {{ tab.label }}
        <template v-if="tabCount(tab.value)">
          ({{ formatNumber(tabCount(tab.value)) }})
        </template>
      </button>
    </div>

    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="filters.search"
          class="form-input"
          placeholder="بحث برقم الأوردر أو الفاتورة أو المستلم أو جواله أو البوليصة..."
          @input="onSearchInput"
        />
      </div>
      <select v-model="filters.agentId" class="form-select" @change="list.load(1)">
        <option value="">كل الطيارين والشركات</option>
        <option v-for="a in store.agents" :key="a.id" :value="a.id">
          {{ a.name }}
        </option>
      </select>
    </div>

    <!-- ══ القائمة ══ -->
    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <Truck :size="44" class="empty-state__icon" />
        <div class="empty-state__title">
          {{ hasFilters ? "لا توجد أوردرات مطابقة" : "لا توجد أوردرات هنا" }}
        </div>
        <div class="empty-state__text">
          {{
            store.agents.length
              ? "أنشئ أوردراً وأسنده لطيار أو شركة شحن"
              : "ابدأ بإضافة طيار أو شركة شحن، ثم أنشئ أول أوردر"
          }}
        </div>
        <div class="doc-actions">
          <NuxtLink
            v-if="!store.agents.length"
            to="/dashboard/delivery/agents"
            class="btn btn--ghost"
          >
            <Bike :size="16" /> الطيارون وشركات الشحن
          </NuxtLink>
          <button v-can="'manage_delivery'" class="btn btn--primary" @click="openCreate">
            <Plus :size="16" /> أوردر جديد
          </button>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الأوردر</th>
                <th>المستلم</th>
                <th>الجهة</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in list.rows.value"
                :key="o.id"
                :class="{ 'dlv-row--late': isLate(o) }"
              >
                <td>
                  <div class="doc-cell">
                    <code class="doc-code">{{ o.number }}</code>
                    <span class="doc-cell__sub">
                      {{ formatDateTime(o.createdAt) }}
                      <template v-if="o.source === 'pos'"> · من الكاشير</template>
                    </span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ o.recipientName }}</span>
                    <span class="doc-cell__sub" dir="ltr">{{ o.phone }}</span>
                    <span class="doc-cell__sub dlv-address" :title="o.address">
                      <MapPin :size="12" />
                      <template v-if="o.zone">{{ o.zone.name }} — </template>
                      {{ o.address }}
                    </span>
                  </div>
                </td>
                <td>
                  <div v-if="o.agent" class="doc-cell">
                    <span class="doc-cell__main">
                      <component
                        :is="o.agent.type === 'carrier' ? Building2 : Bike"
                        :size="14"
                      />
                      {{ o.agent.name }}
                    </span>
                    <span v-if="o.trackingNumber" class="doc-cell__sub" dir="ltr">
                      {{ o.trackingNumber }}
                    </span>
                  </div>
                  <span v-else class="doc-cell__sub">لم يُسند</span>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-money doc-money--strong">
                      {{ formatCurrency(o.invoice.total) }}
                    </span>
                    <span class="doc-cell__sub">
                      {{
                        o.paymentMode === "cod"
                          ? "تحصيل عند الاستلام"
                          : `مدفوع مقدماً · ${PUBLIC_SALES_PAYMENT_METHOD_LABELS[o.prepaidMethod!] ?? ""}`
                      }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span>
                      <span :class="['badge', `doc-status--${STATUS[o.status].tone}`]">
                        {{ STATUS[o.status].label }}
                      </span>
                    </span>
                    <span
                      v-if="elapsedLabel(o)"
                      class="doc-cell__sub"
                      :class="{ 'text-danger': isLate(o) }"
                    >
                      <Timer :size="12" /> {{ elapsedLabel(o) }}
                    </span>
                    <span
                      v-if="o.status === 'failed' && o.failReason"
                      class="doc-cell__sub"
                    >
                      {{ o.failReason }}
                    </span>
                    <span
                      v-if="o.settlementId"
                      class="doc-cell__sub"
                    >
                      سُوّي
                    </span>
                  </div>
                </td>
                <td>
                  <div class="doc-actions">
                    <template v-if="o.status === 'new'">
                      <button
                        v-can="'manage_delivery'"
                        class="btn btn--sm btn--primary"
                        @click="openAssign(o)"
                      >
                        <UserCheck :size="14" /> إسناد
                      </button>
                    </template>
                    <template v-else-if="o.status === 'assigned'">
                      <button
                        v-can="'manage_delivery'"
                        class="btn btn--sm btn--primary"
                        :disabled="busyId === o.id"
                        @click="move(o, 'dispatch')"
                      >
                        <Truck :size="14" /> خرج
                      </button>
                      <button
                        v-can="'manage_delivery'"
                        class="btn btn--sm btn--ghost btn--icon"
                        title="تغيير الطيار / الشركة"
                        @click="openAssign(o)"
                      >
                        <UserCheck :size="14" />
                      </button>
                    </template>
                    <template v-else-if="o.status === 'out_for_delivery'">
                      <button
                        v-can="'manage_delivery'"
                        class="btn btn--sm btn--success"
                        :disabled="busyId === o.id"
                        @click="move(o, 'deliver')"
                      >
                        <PackageCheck :size="14" /> تم التسليم
                      </button>
                      <button
                        v-can="'manage_delivery'"
                        class="btn btn--sm btn--ghost"
                        @click="openFail(o)"
                      >
                        <PackageX :size="14" /> لم يُسلَّم
                      </button>
                    </template>
                    <button
                      v-if="o.status === 'new' || o.status === 'assigned'"
                      v-can="'manage_delivery'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="إلغاء الأوردر"
                      @click="askCancel(o)"
                    >
                      <Ban :size="14" />
                    </button>
                    <button
                      class="btn btn--sm btn--ghost btn--icon"
                      :title="o.invoice.status === 'issued' ? 'طباعة الفاتورة (حراري)' : 'طباعة أمر التوصيل'"
                      @click="printOrder(o, 'thermal')"
                    >
                      <Printer :size="14" />
                    </button>
                    <button
                      class="btn btn--sm btn--ghost btn--icon"
                      title="التفاصيل"
                      @click="openDetails(o)"
                    >
                      <Eye :size="14" />
                    </button>
                    <a
                      class="btn btn--sm btn--ghost btn--icon"
                      :href="whatsappLink(o)"
                      target="_blank"
                      rel="noopener"
                      title="مراسلة المستلم على واتساب"
                    >
                      <MessageCircle :size="14" />
                    </a>
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
        label="أوردر"
        @change="list.load"
      />
    </template>

    <!-- ══ أوردر جديد ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreate" class="modal-overlay" @click.self="closeCreate">
          <div class="modal doc-modal invoice-modal">
            <div class="modal__header">
              <h3>
                <Truck :size="20" class="doc-modal__icon" />
                أوردر توصيل جديد
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="closeCreate">
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="submitCreate">
              <section class="doc-section">
                <h4 class="doc-section__title">المستلم</h4>
                <div class="doc-grid">
                  <div class="form-group">
                    <label>عميل مسجّل</label>
                    <select v-model="form.customerId" class="form-select" @change="fillCustomer">
                      <option value="">عميل عابر</option>
                      <option v-for="c in sales.customerOptions" :key="c.id" :value="c.id">
                        {{ c.name }}{{ c.phone ? ` — ${c.phone}` : "" }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>اسم المستلم *</label>
                    <input v-model.trim="form.recipientName" class="form-input" required maxlength="150" />
                  </div>
                  <div class="form-group">
                    <label>الجوال *</label>
                    <input
                      v-model.trim="form.phone"
                      class="form-input"
                      dir="ltr"
                      inputmode="tel"
                      required
                      maxlength="30"
                    />
                  </div>
                  <div class="form-group">
                    <label>المنطقة</label>
                    <select v-model="form.zoneId" class="form-select" @change="applyZoneFee">
                      <option value="">بدون منطقة</option>
                      <option v-for="z in activeZones" :key="z.id" :value="z.id">
                        {{ z.name }} — {{ formatCurrency(z.fee) }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group doc-grid__full">
                    <label>العنوان *</label>
                    <input
                      v-model.trim="form.address"
                      class="form-input"
                      required
                      maxlength="500"
                      placeholder="الحي، الشارع، رقم المبنى، علامة مميزة"
                    />
                  </div>
                </div>
              </section>

              <section class="doc-section">
                <div class="section-head">
                  <h4 class="doc-section__title">الأصناف</h4>
                  <div class="form-group dlv-warehouse">
                    <select
                      v-model="form.warehouseId"
                      class="form-select"
                      required
                      :disabled="form.lines.length > 0"
                      :title="form.lines.length ? 'احذف الأصناف لتغيير المخزن' : ''"
                    >
                      <option value="" disabled>يخرج من مخزن...</option>
                      <option v-for="w in activeWarehouses" :key="w.id" :value="w.id">
                        {{ w.name }}
                      </option>
                    </select>
                  </div>
                </div>

                <StockProductPicker :warehouse-id="form.warehouseId" @pick="addLine" />

                <div class="doc-lines" :style="{ '--doc-cols': LINE_COLS }">
                  <div class="doc-lines__head">
                    <span>الصنف</span>
                    <span>الوحدة</span>
                    <span>الكمية</span>
                    <span>السعر</span>
                    <span>الإجمالي</span>
                    <span />
                  </div>
                  <div v-if="!form.lines.length" class="doc-lines__empty">
                    ابحث عن صنف بالأعلى أو امسح الباركود
                  </div>
                  <div v-for="(line, index) in form.lines" :key="line.key" class="doc-lines__row">
                    <div class="doc-cell">
                      <span class="doc-cell__main">{{ line.name }}</span>
                      <span class="doc-cell__sub">
                        المتاح
                        <span class="doc-num" :class="{ 'doc-num--out': exceeds(line) }">
                          {{ formatNumber(line.available) }}
                        </span>
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">الوحدة</span>
                      <select v-model="line.unitId" class="form-select" @change="line.unitPrice = priceFor(line)">
                        <option v-for="u in line.units" :key="u.id" :value="u.id">{{ u.name }}</option>
                      </select>
                    </div>
                    <div>
                      <span class="doc-lines__label">الكمية</span>
                      <StbNumberInput v-model.number="line.quantity" class="form-input" min="0.0001" step="any" required />
                    </div>
                    <div>
                      <span class="doc-lines__label">السعر</span>
                      <StbNumberInput v-model.number="line.unitPrice" class="form-input" min="0" step="any" required />
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
              </section>

              <section class="doc-section">
                <h4 class="doc-section__title">الدفع والتوصيل</h4>
                <div class="doc-grid">
                  <div class="form-group">
                    <label>الدفع *</label>
                    <select v-model="form.paymentMode" class="form-select">
                      <option value="cod">تحصيل عند الاستلام</option>
                      <option value="prepaid">مدفوع مقدماً</option>
                    </select>
                  </div>
                  <div v-if="form.paymentMode === 'prepaid'" class="form-group">
                    <label>دُفع عن طريق *</label>
                    <select v-model="form.prepaidMethod" class="form-select" required>
                      <option
                        v-for="(label, method) in PUBLIC_SALES_PAYMENT_METHOD_LABELS"
                        :key="method"
                        :value="method"
                      >
                        {{ label }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>رسوم التوصيل على العميل</label>
                    <StbNumberInput
                      v-model.number="form.deliveryFee"
                      class="form-input"
                      min="0"
                      :step="moneyStep()"
                      placeholder="0"
                    />
                  </div>
                  <div class="form-group">
                    <label>الطيار / شركة الشحن</label>
                    <select v-model="form.agentId" class="form-select" @change="suggestAgentFee">
                      <option value="">أسنده لاحقاً</option>
                      <option v-for="a in activeAgents" :key="a.id" :value="a.id">
                        {{ a.name }} ({{ AGENT_TYPE[a.type] }})
                      </option>
                    </select>
                  </div>
                  <template v-if="form.agentId">
                    <div class="form-group">
                      <label>تكلفة التوصيل علينا</label>
                      <StbNumberInput
                        v-model.number="form.agentFee"
                        class="form-input"
                        min="0"
                        :step="moneyStep()"
                      />
                      <small class="doc-hint">أجرة الطيار أو رسوم الشركة — تُعتمد في التسوية</small>
                    </div>
                    <div v-if="selectedAgent?.type === 'carrier'" class="form-group">
                      <label>رقم البوليصة</label>
                      <input v-model.trim="form.trackingNumber" class="form-input" dir="ltr" maxlength="80" />
                    </div>
                  </template>
                  <div class="form-group doc-grid__full">
                    <label>ملاحظة</label>
                    <input
                      v-model.trim="form.note"
                      class="form-input"
                      maxlength="500"
                      placeholder="اختياري: وقت مفضّل للتسليم، تعليمات للطيار..."
                    />
                  </div>
                </div>

                <div class="doc-totals doc-totals--box">
                  <div>
                    <span>الأصناف</span>
                    <span class="doc-money">{{ formatCurrency(totals.items) }}</span>
                  </div>
                  <div>
                    <span>رسوم التوصيل</span>
                    <span class="doc-money">{{ formatCurrency(totals.fee) }}</span>
                  </div>
                  <div class="is-grand">
                    <span>{{ form.paymentMode === "cod" ? "يُحصَّل من العميل" : "الإجمالي" }}</span>
                    <span class="doc-money">{{ formatCurrency(totals.total) }}</span>
                  </div>
                </div>
              </section>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeCreate">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting || !form.lines.length"
                >
                  إنشاء الأوردر
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ الإسناد ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="assignTarget" class="modal-overlay" @click.self="assignTarget = null">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <UserCheck :size="20" class="doc-modal__icon" />
                إسناد {{ assignTarget.number }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="assignTarget = null">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="submitAssign">
              <div class="form-group">
                <label>الطيار / شركة الشحن *</label>
                <select v-model="assignForm.agentId" class="form-select" required @change="suggestAssignFee">
                  <option value="" disabled>اختر...</option>
                  <option v-for="a in activeAgents" :key="a.id" :value="a.id">
                    {{ a.name }} ({{ AGENT_TYPE[a.type] }})
                    <template v-if="a.outCount"> · معه {{ a.outCount }}</template>
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>تكلفة التوصيل علينا</label>
                <StbNumberInput v-model.number="assignForm.agentFee" class="form-input" min="0" :step="moneyStep()" />
              </div>
              <div
                v-if="store.agents.find((a) => a.id === assignForm.agentId)?.type === 'carrier'"
                class="form-group"
              >
                <label>رقم البوليصة</label>
                <input v-model.trim="assignForm.trackingNumber" class="form-input" dir="ltr" maxlength="80" />
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="assignTarget = null">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting"
                >
                  إسناد
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ لم يُسلَّم ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="failTarget" class="modal-overlay" @click.self="failTarget = null">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <PackageX :size="20" class="doc-modal__icon" />
                لم يُسلَّم {{ failTarget.number }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="failTarget = null">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="submitFail">
              <div class="doc-note">
                <Info :size="16" />
                <span>
                  يُسجَّل مرتجع بيع كامل: تعود البضاعة للمخزن
                  {{
                    failTarget.paymentMode === "cod"
                      ? "ويُلغى التحصيل المسجّل على الجهة"
                      : "ويُسجَّل ردّ المبلغ المدفوع مقدماً للعميل"
                  }}. أجرة المشوار تبقى في التسوية.
                </span>
              </div>
              <div class="form-group">
                <label>السبب *</label>
                <select v-model="failForm.preset" class="form-select" @change="failForm.reason = failForm.preset">
                  <option value="">اختر أو اكتب السبب...</option>
                  <option v-for="r in FAIL_REASONS" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
              <div class="form-group">
                <input v-model.trim="failForm.reason" class="form-input" required maxlength="300" placeholder="السبب" />
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="failTarget = null">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn--danger"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting"
                >
                  تسجيل عدم التسليم
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ التفاصيل ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="details" class="modal-overlay" @click.self="details = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <Truck :size="20" class="doc-modal__icon" />
                {{ details.number }}
                <span :class="['badge', `doc-status--${STATUS[details.status].tone}`]">
                  {{ STATUS[details.status].label }}
                </span>
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="details = null">
                <X :size="20" />
              </button>
            </div>
            <div class="doc-form">
              <div class="doc-grid">
                <div class="doc-cell">
                  <span class="doc-cell__sub">المستلم</span>
                  <span class="doc-cell__main">{{ details.recipientName }}</span>
                  <span class="doc-cell__sub" dir="ltr">{{ details.phone }}</span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">العنوان</span>
                  <span class="doc-cell__main">
                    <template v-if="details.zone">{{ details.zone.name }} — </template>{{ details.address }}
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">الفاتورة</span>
                  <span class="doc-cell__main">
                    {{ details.invoice.number ?? "مسودة (تصدر عند الخروج)" }}
                  </span>
                </div>
                <div class="doc-cell">
                  <span class="doc-cell__sub">الجهة</span>
                  <span class="doc-cell__main">{{ details.agent?.name ?? "لم يُسند" }}</span>
                  <span v-if="details.agent" class="doc-cell__sub">
                    تكلفتها {{ formatCurrency(details.agentFee) }}
                    <template v-if="details.trackingNumber"> · بوليصة {{ details.trackingNumber }}</template>
                  </span>
                </div>
              </div>

              <div class="doc-lines" :style="{ '--doc-cols': '2fr 1fr 1fr' }">
                <div class="doc-lines__head">
                  <span>الصنف</span>
                  <span>الكمية</span>
                  <span>الإجمالي</span>
                </div>
                <div v-for="line in details.invoice.lines ?? []" :key="line.id" class="doc-lines__row">
                  <span class="doc-cell__main">{{ line.productName }}</span>
                  <span class="doc-num">{{ formatNumber(line.quantity) }} {{ line.unitName }}</span>
                  <span class="doc-money">{{ formatCurrency(line.total) }}</span>
                </div>
              </div>
              <div class="doc-totals doc-totals--box">
                <div class="is-grand">
                  <span>الإجمالي</span>
                  <span class="doc-money">{{ formatCurrency(details.invoice.total) }}</span>
                </div>
              </div>

              <ol class="dlv-timeline">
                <li v-for="step in timeline(details)" :key="step.label">
                  <span class="doc-cell__main">{{ step.label }}</span>
                  <span class="doc-cell__sub">{{ formatDateTime(step.at) }}</span>
                </li>
              </ol>
              <p v-if="details.note" class="doc-hint">ملاحظة: {{ details.note }}</p>
              <div class="doc-actions">
                <button type="button" class="btn btn--ghost" @click="printOrder(details, 'thermal')">
                  <Printer :size="16" /> طباعة حراري
                </button>
                <button type="button" class="btn btn--ghost" @click="printOrder(details, 'a4')">
                  <Printer :size="16" /> طباعة A4
                </button>
              </div>
              <p v-if="details.failReason" class="doc-hint text-danger">
                سبب عدم التسليم: {{ details.failReason }}
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <SalesInvoicePrint ref="printer" :invoice="printTarget" :settings="sales.settings" />

    <ConfirmDialog
      v-model="showCancel"
      title="إلغاء الأوردر"
      :message="`إلغاء الأوردر ${cancelTarget?.number}؟ تُلغى مسودة فاتورته، ولم تخرج بضاعة بعد.`"
      confirm-text="إلغاء الأوردر"
      :loading="submitting"
      @confirm="doCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  Ban,
  Bike,
  Building2,
  Eye,
  HandCoins,
  Info,
  MapPin,
  MessageCircle,
  PackageCheck,
  PackageOpen,
  PackageX,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  Truck,
  UserCheck,
  X,
} from "lucide-vue-next";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { useCatalogStore } from "@/stores/catalog";
import { useDeliveryStore } from "@/stores/delivery";
import { useInventoryStore } from "@/stores/inventory";
import { useSalesStore } from "@/stores/sales";
import type {
  DeliveryAgentType,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliveryPaymentMode,
  DeliverySummary,
} from "@/types/delivery";
import type { StockLookupRow } from "@/types/inventory";
import type { PrintableInvoice, PublicSalesPaymentMethod } from "@/types/sales";

definePageMeta({ middleware: "auth" });

const store = useDeliveryStore();
const sales = useSalesStore();
const inventory = useInventoryStore();
const catalog = useCatalogStore();
const toast = useToast();

const LINE_COLS = "2fr 1fr 0.9fr 1fr 1fr auto";

const STATUS: Record<
  DeliveryOrderStatus,
  { label: string; tone: "draft" | "progress" | "done" | "cancelled" | "info" }
> = {
  new: { label: "جديد", tone: "draft" },
  assigned: { label: "مُسند", tone: "info" },
  out_for_delivery: { label: "في الطريق", tone: "progress" },
  delivered: { label: "تم التسليم", tone: "done" },
  failed: { label: "لم يُسلَّم", tone: "cancelled" },
  cancelled: { label: "ملغي", tone: "cancelled" },
};

const AGENT_TYPE: Record<DeliveryAgentType, string> = {
  driver: "طيار",
  carrier: "شركة شحن",
};

const FAIL_REASONS = [
  "العميل رفض الاستلام",
  "العميل لا يرد",
  "العنوان غير صحيح",
  "العميل طلب التأجيل",
  "تلف أثناء التوصيل",
];

type Tab = "active" | "waiting" | DeliveryOrderStatus | "";
const TABS: { value: Tab; label: string }[] = [
  { value: "active", label: "النشطة" },
  { value: "waiting", label: "بانتظار الخروج" },
  { value: "out_for_delivery", label: "في الطريق" },
  { value: "delivered", label: "تم التسليم" },
  { value: "failed", label: "لم يُسلَّم" },
  { value: "cancelled", label: "ملغاة" },
  { value: "", label: "الكل" },
];
const TAB_STATUSES: Record<string, string> = {
  active: "new,assigned,out_for_delivery",
  waiting: "new,assigned",
};

// ─── القائمة والأرقام ─────────────────────────────────────────────────────────
const filters = reactive({ tab: "active" as Tab, search: "", agentId: "" });
const hasFilters = computed(() => !!filters.search || !!filters.agentId);

const list = usePagedList(
  (page) =>
    store.fetchOrders({
      status: TAB_STATUSES[filters.tab] ?? (filters.tab || undefined),
      search: filters.search || undefined,
      agentId: filters.agentId || undefined,
      page,
    }),
  "تعذر تحميل أوردرات التوصيل",
);

const summary = ref<DeliverySummary>({
  counts: {
    new: 0,
    assigned: 0,
    out_for_delivery: 0,
    delivered: 0,
    failed: 0,
    cancelled: 0,
  },
  lateCount: 0,
  heldTotal: 0,
  outCodTotal: 0,
});

const loadSummary = async () => {
  try {
    summary.value = await store.fetchSummary();
  } catch {
    // الأرقام مكمّلة: فشلها لا يمنع القائمة
  }
};

const refresh = () => Promise.all([list.load(), loadSummary()]);

const tabCount = (tab: Tab) => {
  const c = summary.value.counts;
  if (tab === "active") return c.new + c.assigned + c.out_for_delivery;
  if (tab === "waiting") return c.new + c.assigned;
  if (tab === "out_for_delivery") return c.out_for_delivery;
  return 0;
};

const setTab = (tab: Tab) => {
  filters.tab = tab;
  list.load(1);
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => list.load(1), 350);
};

// ─── المؤقتات: منذ متى الأوردر في حالته ──────────────────────────────────────
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | null = null;
let poller: ReturnType<typeof setInterval> | null = null;

const minutesSince = (at: string | null) =>
  at ? Math.max(0, Math.floor((now.value - new Date(at).getTime()) / 60000)) : 0;

const durationLabel = (minutes: number) =>
  minutes < 60
    ? `${minutes} د`
    : `${Math.floor(minutes / 60)} س ${minutes % 60 ? `${minutes % 60} د` : ""}`.trim();

const elapsedLabel = (o: DeliveryOrder) => {
  if (o.status === "out_for_delivery") {
    return `في الطريق منذ ${durationLabel(minutesSince(o.dispatchedAt))}`;
  }
  if (o.status === "new" || o.status === "assigned") {
    return `منذ ${durationLabel(minutesSince(o.createdAt))}`;
  }
  return "";
};

/** في الطريق أكثر من الوقت المتوقع لمنطقته */
const isLate = (o: DeliveryOrder) =>
  o.status === "out_for_delivery" &&
  !!o.zone?.estimatedMinutes &&
  minutesSince(o.dispatchedAt) > o.zone.estimatedMinutes;

const whatsappLink = (o: DeliveryOrder) => {
  const digits = o.phone.replace(/\D/g, "");
  const text = `مرحباً ${o.recipientName}، طلبك رقم ${o.number} ${
    o.status === "out_for_delivery" ? "في الطريق إليك" : "قيد التجهيز"
  }`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

const timeline = (o: DeliveryOrder) =>
  [
    { label: "أُنشئ", at: o.createdAt },
    { label: `أُسند${o.agent ? ` إلى ${o.agent.name}` : ""}`, at: o.assignedAt },
    { label: "خرج للتوصيل", at: o.dispatchedAt },
    { label: "تم التسليم", at: o.deliveredAt },
    { label: "لم يُسلَّم", at: o.failedAt },
    { label: "أُلغي", at: o.cancelledAt },
  ].filter((step): step is { label: string; at: string } => !!step.at);

// ─── الجهات والمناطق ──────────────────────────────────────────────────────────
const activeAgents = computed(() => store.agents.filter((a) => a.isActive));
const activeZones = computed(() => store.zones.filter((z) => z.isActive));
const activeWarehouses = computed(() => inventory.warehouses.filter((w) => w.isActive));

/** تكلفة الجهة المقترحة = أجرتها + نسبة التحصيل (كما يحسبها السيرفر) */
const agentFeeFor = (agentId: string, codAmount: number) => {
  const agent = store.agents.find((a) => a.id === agentId);
  if (!agent) return "" as const;
  return roundMoney(agent.defaultFee + (codAmount * agent.codFeePercent) / 100);
};

// ─── أوردر جديد ───────────────────────────────────────────────────────────────
interface UnitOption {
  id: string;
  name: string;
  factor: number;
  price: number;
}
interface FormLine {
  key: number;
  productId: string;
  name: string;
  taxRate: number;
  productPriceIncludesTax: boolean;
  units: UnitOption[];
  unitId: string;
  available: number;
  quantity: number | "";
  unitPrice: number | "";
}

let lineKey = 0;
const showCreate = ref(false);
const submitting = ref(false);

const emptyForm = () => ({
  customerId: "",
  recipientName: "",
  phone: "",
  address: "",
  zoneId: "",
  warehouseId:
    activeWarehouses.value.find((w) => w.type === "main")?.id ??
    activeWarehouses.value[0]?.id ??
    "",
  paymentMode: "cod" as DeliveryPaymentMode,
  prepaidMethod: "bank_transfer" as PublicSalesPaymentMethod,
  deliveryFee: "" as number | "",
  agentId: "",
  agentFee: "" as number | "",
  trackingNumber: "",
  note: "",
  pricesIncludeTax: true,
  lines: [] as FormLine[],
});
const form = reactive(emptyForm());

const vatRegistered = computed(() => sales.settings?.vatRegistered !== false);
const selectedAgent = computed(() => store.agents.find((a) => a.id === form.agentId));

const amountsOf = (line: FormLine) =>
  previewPurchaseLine({
    quantity: Number(line.quantity) || 0,
    unitPrice: Number(line.unitPrice) || 0,
    discount: 0,
    taxRate: line.taxRate,
    pricesIncludeTax: form.pricesIncludeTax,
  });

/** تقدير للعرض — الفاتورة تُحسب على السيرفر (ضريبة رسوم التوصيل منها) */
const totals = computed(() => {
  const items = sumMoney(form.lines.map((l) => amountsOf(l).total));
  const fee = Number(form.deliveryFee) || 0;
  return { items, fee, total: sumMoney([items, fee]) };
});

const exceeds = (line: FormLine) => {
  const factor = line.units.find((u) => u.id === line.unitId)?.factor ?? 1;
  return Number(line.quantity) * factor > line.available;
};

const priceFor = (line: FormLine): number => {
  const unit = line.units.find((u) => u.id === line.unitId);
  let price = unit?.price ?? 0;
  const rate = 1 + line.taxRate / 100;
  if (form.pricesIncludeTax && !line.productPriceIncludesTax) price *= rate;
  if (!form.pricesIncludeTax && line.productPriceIncludesTax) price /= rate;
  return Math.round(price * 10000) / 10000;
};

const addLine = async (row: StockLookupRow) => {
  const existing = form.lines.find((l) => l.productId === row.productId);
  if (existing) {
    existing.quantity = (Number(existing.quantity) || 0) + 1;
    return;
  }
  try {
    const product = await catalog.getProduct(row.productId);
    const line: FormLine = {
      key: ++lineKey,
      productId: product.id,
      name: product.name,
      taxRate: vatRegistered.value ? (product.taxRate?.rate ?? 0) : 0,
      productPriceIncludesTax: product.priceIncludesTax,
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
    };
    line.unitPrice = priceFor(line);
    form.lines.push(line);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إضافة الصنف"));
  }
};

const fillCustomer = () => {
  const customer = sales.customerOptions.find((c) => c.id === form.customerId);
  if (!customer) return;
  form.recipientName = customer.name;
  if (customer.phone) form.phone = customer.phone;
  if (customer.address && !form.address) form.address = customer.address;
};

const applyZoneFee = () => {
  const zone = store.zones.find((z) => z.id === form.zoneId);
  form.deliveryFee = zone ? zone.fee : "";
};

const suggestAgentFee = () => {
  form.agentFee = agentFeeFor(
    form.agentId,
    form.paymentMode === "cod" ? totals.value.total : 0,
  );
};

const openCreate = async () => {
  await Promise.all([
    sales.fetchSettings().catch(() => null),
    sales.fetchCustomerOptions().catch(() => null),
    inventory.fetchWarehouses().catch(() => null),
  ]);
  Object.assign(form, emptyForm(), {
    pricesIncludeTax: sales.settings?.pricesIncludeTax ?? true,
  });
  showCreate.value = true;
};

const closeCreate = () => {
  if (!submitting.value) showCreate.value = false;
};

const submitCreate = async () => {
  submitting.value = true;
  try {
    const order = await store.createOrder({
      warehouseId: form.warehouseId,
      customerId: form.customerId || null,
      recipientName: form.recipientName,
      phone: form.phone,
      address: form.address,
      zoneId: form.zoneId || null,
      deliveryFee: Number(form.deliveryFee) || 0,
      paymentMode: form.paymentMode,
      ...(form.paymentMode === "prepaid" ? { prepaidMethod: form.prepaidMethod } : {}),
      agentId: form.agentId || null,
      ...(form.agentId && form.agentFee !== "" ? { agentFee: Number(form.agentFee) } : {}),
      trackingNumber: form.trackingNumber || null,
      note: form.note || null,
      lines: form.lines.map((l) => ({
        productId: l.productId,
        unitId: l.unitId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
    });
    toast.success(`تم إنشاء الأوردر ${order.number}`);
    showCreate.value = false;
    await refresh();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إنشاء الأوردر"));
  } finally {
    submitting.value = false;
  }
};

// ─── الإسناد ──────────────────────────────────────────────────────────────────
const assignTarget = ref<DeliveryOrder | null>(null);
const assignForm = reactive({ agentId: "", agentFee: "" as number | "", trackingNumber: "" });

const openAssign = (o: DeliveryOrder) => {
  assignTarget.value = o;
  Object.assign(assignForm, {
    agentId: o.agentId ?? "",
    agentFee: o.agentId ? o.agentFee : "",
    trackingNumber: o.trackingNumber ?? "",
  });
};

const suggestAssignFee = () => {
  if (!assignTarget.value) return;
  assignForm.agentFee = agentFeeFor(assignForm.agentId, assignTarget.value.codAmount);
};

const submitAssign = async () => {
  if (!assignTarget.value) return;
  submitting.value = true;
  try {
    await store.assignOrder(assignTarget.value.id, {
      agentId: assignForm.agentId,
      ...(assignForm.agentFee !== "" ? { agentFee: Number(assignForm.agentFee) } : {}),
      trackingNumber: assignForm.trackingNumber || null,
    });
    toast.success("تم الإسناد");
    assignTarget.value = null;
    await refresh();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الإسناد"));
  } finally {
    submitting.value = false;
  }
};

// ─── الانتقالات ───────────────────────────────────────────────────────────────
const busyId = ref<string | null>(null);

const move = async (o: DeliveryOrder, action: "dispatch" | "deliver") => {
  busyId.value = o.id;
  try {
    await store.moveOrder(o.id, action);
    toast.success(
      action === "dispatch"
        ? `خرج ${o.number} — صدرت فاتورته وخرجت البضاعة`
        : `تم تسليم ${o.number}`,
    );
    await refresh();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحديث الأوردر"));
    await refresh();
  } finally {
    busyId.value = null;
  }
};

const failTarget = ref<DeliveryOrder | null>(null);
const failForm = reactive({ preset: "", reason: "" });

const openFail = (o: DeliveryOrder) => {
  failTarget.value = o;
  Object.assign(failForm, { preset: "", reason: "" });
};

const submitFail = async () => {
  if (!failTarget.value) return;
  submitting.value = true;
  try {
    await store.failOrder(failTarget.value.id, failForm.reason);
    toast.success("سُجّل عدم التسليم وعادت البضاعة للمخزن");
    failTarget.value = null;
    await refresh();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تسجيل عدم التسليم"));
  } finally {
    submitting.value = false;
  }
};

const showCancel = ref(false);
const cancelTarget = ref<DeliveryOrder | null>(null);

const askCancel = (o: DeliveryOrder) => {
  cancelTarget.value = o;
  showCancel.value = true;
};

const doCancel = async () => {
  if (!cancelTarget.value) return;
  submitting.value = true;
  try {
    await store.moveOrder(cancelTarget.value.id, "cancel");
    toast.success("تم إلغاء الأوردر");
    showCancel.value = false;
    await refresh();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إلغاء الأوردر"));
  } finally {
    submitting.value = false;
  }
};

// ─── الطباعة: فاتورة الأوردر (أو "أمر توصيل" لمسودة لم تخرج) ────────────────
const printer = ref<{ print: (size: "a4" | "thermal") => Promise<void> } | null>(null);
const printTarget = ref<PrintableInvoice | null>(null);

const printOrder = async (o: DeliveryOrder, size: "a4" | "thermal") => {
  try {
    const [invoice] = await Promise.all([
      sales.getInvoice(o.invoiceId),
      sales.fetchSettings(),
    ]);
    printTarget.value = {
      ...invoice,
      // مسودة لم تصدر: وقت الأوردر بدل تاريخ الفاتورة وحده
      issuedAt: invoice.issuedAt ?? o.createdAt,
      delivery: {
        orderNumber: o.number,
        recipientName: o.recipientName,
        phone: o.phone,
        address: o.address,
        zoneName: o.zone?.name ?? null,
        agentName: o.agent
          ? `${o.agent.name}${o.trackingNumber ? ` · ${o.trackingNumber}` : ""}`
          : null,
        collect: o.paymentMode === "cod" ? o.codAmount || invoice.total : 0,
        note: o.note,
      },
    };
    await nextTick();
    await printer.value?.print(size);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تجهيز الطباعة"));
  }
};

const details = ref<DeliveryOrder | null>(null);
const openDetails = async (o: DeliveryOrder) => {
  try {
    details.value = await store.getOrder(o.id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الأوردر"));
  }
};

onMounted(() => {
  store.fetchAgents().catch(() => {});
  store.fetchZones().catch(() => {});
  inventory.fetchWarehouses().catch(() => {});
  sales.fetchSettings().catch(() => {});
  list.load(1);
  loadSummary();
  clock = setInterval(() => (now.value = Date.now()), 30_000);
  // اللوحة مفتوحة طوال اليوم: تحديث هادئ كل دقيقة لمن يعمل من جهاز آخر
  poller = setInterval(() => {
    if (document.visibilityState === "visible" && !showCreate.value) refresh();
  }, 60_000);
});

onBeforeUnmount(() => {
  if (clock) clearInterval(clock);
  if (poller) clearInterval(poller);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped lang="scss">
.dlv-row--late td {
  background: color-mix(in srgb, var(--stb-danger) 7%, transparent);
}
.dlv-address {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dlv-warehouse {
  margin: 0;
  min-width: 180px;
}
.dlv-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
  border-inline-start: 2px solid var(--stb-border);
  padding-inline-start: 0.75rem;

  li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
}
</style>
