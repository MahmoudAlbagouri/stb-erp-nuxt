<!-- pages/dashboard/sales/customers.vue — العملاء وكشوف حساباتهم -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>العملاء</h1>
        <p>عملاء البيع الآجل: ما على كل منهم، حده الائتماني، وكشف حسابه</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_customers'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>إضافة عميل</span>
        </button>
      </div>
    </div>

    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="filters.search"
          class="form-input"
          placeholder="بحث بالاسم أو الكود أو الهاتف أو الرقم الضريبي..."
          @input="onSearchInput"
        />
      </div>
      <select v-model="filters.isActive" class="form-select" @change="list.load(1)">
        <option value="">كل الحالات</option>
        <option value="true">نشط</option>
        <option value="false">موقوف</option>
      </select>
      <select
        v-model="filters.withBalance"
        class="form-select"
        @change="list.load(1)"
      >
        <option value="">كل العملاء</option>
        <option value="true">لهم رصيد فقط</option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <UsersRound :size="44" class="empty-state__icon" />
        <div class="empty-state__title">
          {{ hasFilters ? "لا يوجد عملاء مطابقون" : "لا يوجد عملاء بعد" }}
        </div>
        <div class="empty-state__text">
          {{
            hasFilters
              ? "جرّب تغيير كلمة البحث أو الفلاتر"
              : "أضف عملاء البيع الآجل لتصدر فواتيرهم وتتابع تحصيلها"
          }}
        </div>
        <button
          v-if="!hasFilters"
          v-can="'manage_customers'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> إضافة عميل
        </button>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>العميل</th>
                <th>التواصل</th>
                <th>الرقم الضريبي</th>
                <th>مهلة السداد</th>
                <th>عليه</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in list.rows.value" :key="s.id">
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">{{ s.name }}</span>
                    <span class="doc-cell__sub">{{ s.code }}</span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span dir="ltr">{{ s.phone || "—" }}</span>
                    <span v-if="s.email" class="doc-cell__sub" dir="ltr">
                      {{ s.email }}
                    </span>
                  </div>
                </td>
                <td>
                  <code v-if="s.taxNumber" class="doc-code">{{ s.taxNumber }}</code>
                  <span v-else>—</span>
                </td>
                <td>
                  {{
                    s.paymentTermsDays
                      ? `${formatNumber(s.paymentTermsDays)} يوم`
                      : "نقدي"
                  }}
                </td>
                <td>
                  <span
                    class="doc-money doc-money--strong"
                    :class="{ 'doc-money--in': (s.balance ?? 0) < 0 }"
                  >
                    {{ formatCurrency(Math.abs(s.balance ?? 0)) }}
                  </span>
                  <span v-if="(s.balance ?? 0) < 0" class="doc-cell__sub">
                    له رصيد عندنا
                  </span>
                </td>
                <td>
                  <span
                    :class="['badge', s.isActive ? 'badge--active' : 'badge--inactive']"
                  >
                    {{ s.isActive ? "نشط" : "موقوف" }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <button class="btn btn--sm btn--ghost" @click="openStatement(s)">
                      <ScrollText :size="14" /> كشف حساب
                    </button>
                    <button
                      v-if="s.isActive"
                      v-can="'manage_customer_payments'"
                      class="btn btn--sm btn--ghost btn--icon"
                      title="قبض على الحساب"
                      @click="openPayment(s)"
                    >
                      <Wallet :size="14" />
                    </button>
                    <button
                      v-can="'manage_customers'"
                      class="btn btn--sm btn--ghost btn--icon"
                      title="تعديل"
                      @click="openEdit(s)"
                    >
                      <Pencil :size="14" />
                    </button>
                    <button
                      v-can="'manage_customers'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="askDelete(s)"
                    >
                      <Trash2 :size="14" />
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
        label="عميل"
        @change="list.load"
      />
    </template>

    <!-- ══ نموذج العميل ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <UsersRound :size="20" class="doc-modal__icon" />
                {{ editing ? "تعديل عميل" : "إضافة عميل" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeModal"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="handleSubmit">
              <div class="doc-grid">
                <div class="form-group doc-grid__full">
                  <label>اسم العميل *</label>
                  <input
                    v-model.trim="form.name"
                    class="form-input"
                    required
                    maxlength="200"
                    placeholder="مثال: مطعم الريف"
                  />
                </div>
                <div class="form-group">
                  <label>الهاتف</label>
                  <input
                    v-model.trim="form.phone"
                    class="form-input"
                    dir="ltr"
                    maxlength="30"
                  />
                </div>
                <div class="form-group">
                  <label>البريد الإلكتروني</label>
                  <input
                    v-model.trim="form.email"
                    type="email"
                    class="form-input"
                    dir="ltr"
                    maxlength="150"
                  />
                </div>
                <div class="form-group">
                  <label>الرقم الضريبي</label>
                  <input
                    v-model.trim="form.taxNumber"
                    class="form-input"
                    dir="ltr"
                    inputmode="numeric"
                    pattern="\d{15}"
                    maxlength="15"
                    placeholder="15 رقماً"
                  />
                </div>
                <div class="form-group">
                  <label>السجل التجاري</label>
                  <input
                    v-model.trim="form.commercialRegister"
                    class="form-input"
                    dir="ltr"
                    maxlength="20"
                  />
                </div>
                <div class="form-group">
                  <label>مهلة السداد (يوم)</label>
                  <StbNumberInput
                    v-model.number="form.paymentTermsDays"
                    class="form-input"
                    min="0"
                    max="365"
                    placeholder="0 = نقدي"
                  />
                  <small class="doc-hint">
                    منها يُقترح تاريخ استحقاق فواتيره
                  </small>
                </div>
                <div class="form-group">
                  <label>الحد الائتماني (ر.س)</label>
                  <StbNumberInput
                    v-model.number="form.creditLimit"
                    class="form-input"
                    min="0"
                    step="0.01"
                    placeholder="بلا حد"
                  />
                  <small class="doc-hint">
                    أقصى مديونية: يُرفض إصدار فاتورة آجلة تتجاوزه
                  </small>
                </div>
                <div class="form-group">
                  <label>رصيد افتتاحي (ر.س)</label>
                  <StbNumberInput
                    v-model.number="form.openingBalance"
                    class="form-input"
                    step="0.01"
                    placeholder="0"
                  />
                  <small class="doc-hint">
                    ما كان عليه قبل استخدام النظام
                  </small>
                </div>
                <div class="form-group doc-grid__full">
                  <label>العنوان</label>
                  <input
                    v-model.trim="form.address"
                    class="form-input"
                    maxlength="300"
                  />
                </div>
                <div class="form-group doc-grid__full">
                  <label>ملاحظات</label>
                  <input v-model.trim="form.notes" class="form-input" maxlength="500" />
                </div>
              </div>

              <label class="checkbox-label">
                <input v-model="form.isActive" type="checkbox" />
                <span>نشط (يظهر في فواتير البيع الجديدة)</span>
              </label>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeModal">
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting"
                >
                  {{ editing ? "حفظ التعديلات" : "إضافة العميل" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ كشف الحساب ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="statementCustomer"
          class="modal-overlay"
          @click.self="statementCustomer = null"
        >
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <ScrollText :size="20" class="doc-modal__icon" />
                كشف حساب: {{ statementCustomer.name }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="statementCustomer = null"
              >
                <X :size="20" />
              </button>
            </div>

            <div class="doc-form">
              <div class="doc-grid">
                <div class="form-group">
                  <label>من تاريخ</label>
                  <StbDateInput v-model="statementRange.from" class="form-input" />
                </div>
                <div class="form-group">
                  <label>إلى تاريخ</label>
                  <StbDateInput v-model="statementRange.to" class="form-input" />
                </div>
              </div>

              <div v-if="statementLoading || !statement" class="empty-state">
                <div class="spinner spinner--lg" />
              </div>

              <template v-else>
                <div class="doc-lines" :style="{ '--doc-cols': STATEMENT_COLS }">
                  <div class="doc-lines__head">
                    <span>البيان</span>
                    <span>التاريخ</span>
                    <span>عليه (فواتير)</span>
                    <span>له (قبض/مرتجع)</span>
                    <span>الرصيد</span>
                  </div>
                  <div class="doc-lines__row">
                    <div class="doc-cell">
                      <span class="doc-cell__main">رصيد أول المدة</span>
                    </div>
                    <span />
                    <span />
                    <span />
                    <div>
                      <span class="doc-lines__label">الرصيد</span>
                      <span class="doc-money doc-money--strong">
                        {{ formatCurrency(statement.openingBalance) }}
                      </span>
                    </div>
                  </div>
                  <div
                    v-for="entry in statement.entries"
                    :key="`${entry.type}-${entry.id}`"
                    class="doc-lines__row"
                  >
                    <div class="doc-cell">
                      <span class="doc-cell__main">
                        {{ CUSTOMER_STATEMENT_LABELS[entry.type] }}
                        <code class="doc-code">{{ entry.number }}</code>
                      </span>
                      <span v-if="entry.reference" class="doc-cell__sub">
                        {{ entry.reference }}
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">التاريخ</span>
                      <span class="doc-num">{{ formatDate(entry.date) }}</span>
                    </div>
                    <div>
                      <span class="doc-lines__label">عليه</span>
                      <span v-if="entry.debit" class="doc-money">
                        {{ formatCurrency(entry.debit) }}
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">له</span>
                      <span v-if="entry.credit" class="doc-money doc-money--in">
                        {{ formatCurrency(entry.credit) }}
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">الرصيد</span>
                      <span class="doc-money doc-money--strong">
                        {{ formatCurrency(entry.balance) }}
                      </span>
                    </div>
                  </div>
                  <div v-if="!statement.entries.length" class="doc-lines__empty">
                    لا توجد حركات في هذه الفترة
                  </div>
                </div>

                <div class="doc-totals doc-totals--box">
                  <div>
                    <span>إجمالي الفواتير</span>
                    <span class="doc-money">
                      {{ formatCurrency(statement.totalDebit) }}
                    </span>
                  </div>
                  <div>
                    <span>إجمالي القبض والمرتجعات</span>
                    <span class="doc-money">
                      {{ formatCurrency(statement.totalCredit) }}
                    </span>
                  </div>
                  <div class="is-grand">
                    <span>
                      {{
                        statement.closingBalance < 0
                          ? "للعميل رصيد عندنا"
                          : "المتبقي على العميل"
                      }}
                    </span>
                    <span class="doc-money">
                      {{ formatCurrency(Math.abs(statement.closingBalance)) }}
                    </span>
                  </div>
                </div>
              </template>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="statementCustomer = null"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <CustomerPaymentModal
      v-model="showPayment"
      :customer="paymentCustomer"
      @saved="list.load()"
    />

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف العميل"
      :message="`هل تريد حذف العميل '${deleteTarget?.name}'؟ العميل الذي له فواتير لا يُحذف — يمكن إيقافه.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  UsersRound,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-vue-next";
import { useSalesStore } from "@/stores/sales";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  Customer,
  CustomerPayload,
  CustomerStatement,
} from "@/types/sales";

definePageMeta({ middleware: "auth" });

const store = useSalesStore();
const toast = useToast();

const STATEMENT_COLS = "2fr 0.9fr 1fr 1fr 1fr";

// ─── الفلاتر والقائمة ─────────────────────────────────────────────────────────
const filters = reactive({ search: "", isActive: "", withBalance: "" });

const hasFilters = computed(
  () => !!filters.search || !!filters.isActive || !!filters.withBalance,
);

const list = usePagedList(
  (page) => store.fetchCustomers({ ...filters, page }),
  "تعذر تحميل العملاء",
);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => list.load(1), 350);
};

// ─── النموذج ──────────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<Customer | null>(null);

const emptyForm = () => ({
  name: "",
  phone: "",
  email: "",
  taxNumber: "",
  commercialRegister: "",
  address: "",
  paymentTermsDays: "" as number | "",
  creditLimit: "" as number | "",
  openingBalance: "" as number | "",
  notes: "",
  isActive: true,
});
const form = reactive(emptyForm());

const openCreate = () => {
  Object.assign(form, emptyForm());
  editing.value = null;
  showModal.value = true;
};

const openEdit = (customer: Customer) => {
  Object.assign(form, {
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    taxNumber: customer.taxNumber ?? "",
    commercialRegister: customer.commercialRegister ?? "",
    address: customer.address ?? "",
    paymentTermsDays: customer.paymentTermsDays || "",
    creditLimit: customer.creditLimit ?? "",
    openingBalance: customer.openingBalance || "",
    notes: customer.notes ?? "",
    isActive: customer.isActive,
  });
  editing.value = customer;
  showModal.value = true;
};

const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload: CustomerPayload = {
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      taxNumber: form.taxNumber || undefined,
      commercialRegister: form.commercialRegister || undefined,
      address: form.address || undefined,
      paymentTermsDays: Number(form.paymentTermsDays) || 0,
      creditLimit: form.creditLimit === "" ? null : Number(form.creditLimit),
      openingBalance: Number(form.openingBalance) || 0,
      notes: form.notes || undefined,
      isActive: form.isActive,
    };
    if (editing.value) {
      await store.updateCustomer(editing.value.id, payload);
      toast.success("تم حفظ التعديلات");
    } else {
      await store.createCustomer(payload);
      toast.success("تمت إضافة العميل");
    }
    showModal.value = false;
    await list.load(editing.value ? list.page.value : 1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ العميل"));
  } finally {
    submitting.value = false;
  }
};

// ─── كشف الحساب ───────────────────────────────────────────────────────────────
const statementCustomer = ref<Customer | null>(null);
const statement = ref<CustomerStatement | null>(null);
const statementLoading = ref(false);
const statementRange = reactive({ from: "", to: "" });

const loadStatement = async () => {
  if (!statementCustomer.value) return;
  statementLoading.value = true;
  try {
    statement.value = await store.getStatement(
      statementCustomer.value.id,
      statementRange.from || undefined,
      statementRange.to || undefined,
    );
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل كشف الحساب"));
  } finally {
    statementLoading.value = false;
  }
};

const openStatement = (customer: Customer) => {
  statement.value = null;
  statementRange.from = "";
  statementRange.to = "";
  statementCustomer.value = customer;
  loadStatement();
};

watch(
  () => [statementRange.from, statementRange.to],
  () => loadStatement(),
);

// ─── القبض على الحساب ────────────────────────────────────────────────────────
const showPayment = ref(false);
const paymentCustomer = ref<Customer | null>(null);

const openPayment = (customer: Customer) => {
  paymentCustomer.value = customer;
  showPayment.value = true;
};

// ─── الحذف ────────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Customer | null>(null);

const askDelete = (customer: Customer) => {
  deleteTarget.value = customer;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeCustomer(deleteTarget.value.id);
    toast.success("تم حذف العميل");
    showConfirm.value = false;
    await list.reloadAfterRemoval();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف العميل"));
  } finally {
    deleting.value = false;
  }
};

onMounted(() => list.load(1));
</script>
