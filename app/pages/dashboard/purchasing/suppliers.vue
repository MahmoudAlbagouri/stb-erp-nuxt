<!-- pages/dashboard/purchasing/suppliers.vue — الموردون وكشوف حساباتهم -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الموردون</h1>
        <p>بيانات الموردين، المستحق لكل منهم، وكشف حسابه</p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_suppliers'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>إضافة مورد</span>
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
        <option value="">كل الموردين</option>
        <option value="true">لهم رصيد فقط</option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <Contact :size="44" class="empty-state__icon" />
        <div class="empty-state__title">
          {{ hasFilters ? "لا يوجد موردون مطابقون" : "لا يوجد موردون بعد" }}
        </div>
        <div class="empty-state__text">
          {{
            hasFilters
              ? "جرّب تغيير كلمة البحث أو الفلاتر"
              : "أضف مورديك لتسجّل فواتير الشراء وتتابع مستحقاتهم"
          }}
        </div>
        <button
          v-if="!hasFilters"
          v-can="'manage_suppliers'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> إضافة مورد
        </button>
      </div>
    </div>

    <template v-else>
      <div class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>المورد</th>
                <th>التواصل</th>
                <th>الرقم الضريبي</th>
                <th>مهلة السداد</th>
                <th>المستحق له</th>
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
                    <span>{{ s.contactPerson || "—" }}</span>
                    <span v-if="s.phone" class="doc-cell__sub" dir="ltr">
                      {{ s.phone }}
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
                    لنا عنده
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
                      v-can="'manage_supplier_payments'"
                      class="btn btn--sm btn--ghost btn--icon"
                      title="سداد على الحساب"
                      @click="openPayment(s)"
                    >
                      <Wallet :size="14" />
                    </button>
                    <button
                      v-can="'manage_suppliers'"
                      class="btn btn--sm btn--ghost btn--icon"
                      title="تعديل"
                      @click="openEdit(s)"
                    >
                      <Pencil :size="14" />
                    </button>
                    <button
                      v-can="'manage_suppliers'"
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
        label="مورد"
        @change="list.load"
      />
    </template>

    <!-- ══ نموذج المورد ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <Contact :size="20" class="doc-modal__icon" />
                {{ editing ? "تعديل مورد" : "إضافة مورد" }}
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
                  <label>اسم المورد *</label>
                  <input
                    v-model.trim="form.name"
                    class="form-input"
                    required
                    maxlength="200"
                    placeholder="مثال: مؤسسة التوريد للمواد الغذائية"
                  />
                </div>
                <div class="form-group">
                  <label>الشخص المسؤول</label>
                  <input
                    v-model.trim="form.contactPerson"
                    class="form-input"
                    maxlength="120"
                  />
                </div>
                <div class="form-group">
                  <label>الهاتف</label>
                  <StbPhoneInput v-model="form.phone" />
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
                  <label>رصيد افتتاحي ({{ currencyLabel() }})</label>
                  <StbNumberInput
                    v-model.number="form.openingBalance"
                    class="form-input"
                    :step="moneyStep()"
                    placeholder="0"
                  />
                  <small class="doc-hint">
                    ما كان مستحقاً له قبل استخدام النظام
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
                <span>نشط (يظهر في فواتير الشراء الجديدة)</span>
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
                  {{ editing ? "حفظ التعديلات" : "إضافة المورد" }}
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
          v-if="statementSupplier"
          class="modal-overlay"
          @click.self="statementSupplier = null"
        >
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <ScrollText :size="20" class="doc-modal__icon" />
                كشف حساب: {{ statementSupplier.name }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="statementSupplier = null"
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
                    <span>له (فواتير)</span>
                    <span>منه (سداد/مرتجع)</span>
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
                        {{ STATEMENT_ENTRY_LABELS[entry.type] }}
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
                      <span class="doc-lines__label">له</span>
                      <span v-if="entry.credit" class="doc-money">
                        {{ formatCurrency(entry.credit) }}
                      </span>
                    </div>
                    <div>
                      <span class="doc-lines__label">منه</span>
                      <span v-if="entry.debit" class="doc-money doc-money--in">
                        {{ formatCurrency(entry.debit) }}
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
                      {{ formatCurrency(statement.totalCredit) }}
                    </span>
                  </div>
                  <div>
                    <span>إجمالي السداد والمرتجعات</span>
                    <span class="doc-money">
                      {{ formatCurrency(statement.totalDebit) }}
                    </span>
                  </div>
                  <div class="is-grand">
                    <span>
                      {{
                        statement.closingBalance < 0
                          ? "لنا عند المورد"
                          : "المستحق للمورد"
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
                  @click="statementSupplier = null"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <SupplierPaymentModal
      v-model="showPayment"
      :supplier="paymentSupplier"
      @saved="list.load()"
    />

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف المورد"
      :message="`هل تريد حذف المورد '${deleteTarget?.name}'؟ المورد الذي له فواتير لا يُحذف — يمكن إيقافه.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  Contact,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-vue-next";
import { usePurchasingStore } from "@/stores/purchasing";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import type {
  Supplier,
  SupplierPayload,
  SupplierStatement,
} from "@/types/purchasing";

definePageMeta({ middleware: "auth" });

const store = usePurchasingStore();
const toast = useToast();

const STATEMENT_COLS = "2fr 0.9fr 1fr 1fr 1fr";

// ─── الفلاتر والقائمة ─────────────────────────────────────────────────────────
const filters = reactive({ search: "", isActive: "", withBalance: "" });

const hasFilters = computed(
  () => !!filters.search || !!filters.isActive || !!filters.withBalance,
);

const list = usePagedList(
  (page) => store.fetchSuppliers({ ...filters, page }),
  "تعذر تحميل الموردين",
);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => list.load(1), 350);
};

// ─── النموذج ──────────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<Supplier | null>(null);

const emptyForm = () => ({
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  taxNumber: "",
  commercialRegister: "",
  address: "",
  paymentTermsDays: "" as number | "",
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

const openEdit = (supplier: Supplier) => {
  Object.assign(form, {
    name: supplier.name,
    contactPerson: supplier.contactPerson ?? "",
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    taxNumber: supplier.taxNumber ?? "",
    commercialRegister: supplier.commercialRegister ?? "",
    address: supplier.address ?? "",
    paymentTermsDays: supplier.paymentTermsDays || "",
    openingBalance: supplier.openingBalance || "",
    notes: supplier.notes ?? "",
    isActive: supplier.isActive,
  });
  editing.value = supplier;
  showModal.value = true;
};

const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload: SupplierPayload = {
      name: form.name,
      contactPerson: form.contactPerson || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      taxNumber: form.taxNumber || undefined,
      commercialRegister: form.commercialRegister || undefined,
      address: form.address || undefined,
      paymentTermsDays: Number(form.paymentTermsDays) || 0,
      openingBalance: Number(form.openingBalance) || 0,
      notes: form.notes || undefined,
      isActive: form.isActive,
    };
    if (editing.value) {
      await store.updateSupplier(editing.value.id, payload);
      toast.success("تم حفظ التعديلات");
    } else {
      await store.createSupplier(payload);
      toast.success("تمت إضافة المورد");
    }
    showModal.value = false;
    await list.load(editing.value ? list.page.value : 1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ المورد"));
  } finally {
    submitting.value = false;
  }
};

// ─── كشف الحساب ───────────────────────────────────────────────────────────────
const statementSupplier = ref<Supplier | null>(null);
const statement = ref<SupplierStatement | null>(null);
const statementLoading = ref(false);
const statementRange = reactive({ from: "", to: "" });

const loadStatement = async () => {
  if (!statementSupplier.value) return;
  statementLoading.value = true;
  try {
    statement.value = await store.getStatement(
      statementSupplier.value.id,
      statementRange.from || undefined,
      statementRange.to || undefined,
    );
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل كشف الحساب"));
  } finally {
    statementLoading.value = false;
  }
};

const openStatement = (supplier: Supplier) => {
  statement.value = null;
  statementRange.from = "";
  statementRange.to = "";
  statementSupplier.value = supplier;
  loadStatement();
};

watch(
  () => [statementRange.from, statementRange.to],
  () => loadStatement(),
);

// ─── السداد على الحساب ────────────────────────────────────────────────────────
const showPayment = ref(false);
const paymentSupplier = ref<Supplier | null>(null);

const openPayment = (supplier: Supplier) => {
  paymentSupplier.value = supplier;
  showPayment.value = true;
};

// ─── الحذف ────────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Supplier | null>(null);

const askDelete = (supplier: Supplier) => {
  deleteTarget.value = supplier;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeSupplier(deleteTarget.value.id);
    toast.success("تم حذف المورد");
    showConfirm.value = false;
    await list.reloadAfterRemoval();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف المورد"));
  } finally {
    deleting.value = false;
  }
};

onMounted(() => list.load(1));
</script>
