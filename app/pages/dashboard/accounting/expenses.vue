<!-- pages/dashboard/accounting/expenses.vue — سندات الصرف: مصروفات تُدفع من صندوق أو بنك وتُقيَّد فوراً -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>سندات الصرف</h1>
        <p>
          إيجار، كهرباء، صيانة، نقل… يُدفع من صندوق أو بنك ويُقيَّد فور حفظه (مع
          ضريبة المدخلات إن وُجدت). لا يُعدَّل — يُلغى بقيد عكسي.
        </p>
      </div>
      <div class="page-header__actions">
        <ReportExport
          v-if="!notActive"
          path="/accounting/expenses/export"
          :query="exportQuery"
          :filename="`expense_vouchers_${filters.from || 'all'}_${filters.to || 'all'}`"
        />
        <button
          v-can="'manage_expense_vouchers'"
          class="btn btn--primary"
          :disabled="notActive"
          @click="openCreate"
        >
          <Plus :size="18" /> سند صرف
        </button>
      </div>
    </div>

    <AccountingInactive v-if="notActive" />

    <template v-else>
      <div class="card doc-filters">
        <input
          v-model.trim="filters.search"
          class="form-input"
          placeholder="رقم السند أو المستفيد أو المرجع أو البيان…"
          @input="onSearch"
        />
        <select v-model="filters.status" class="form-select" @change="list.load(1)">
          <option value="">كل الحالات</option>
          <option value="posted">مُقيَّد</option>
          <option value="cancelled">ملغي</option>
        </select>
        <StbDateInput v-model="filters.from" @update:model-value="list.load(1)" />
        <StbDateInput v-model="filters.to" @update:model-value="list.load(1)" />
      </div>

      <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
      <div v-else-if="!list.rows.value.length" class="card">
        <div class="empty-state">
          <Receipt :size="44" class="empty-state__icon" />
          <div class="empty-state__title">لا سندات صرف</div>
          <div class="empty-state__text">سجّل أول مصروف (إيجار، كهرباء…) من زر «سند صرف».</div>
        </div>
      </div>
      <template v-else>
        <div class="card doc-table-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>التاريخ</th>
                  <th>المستفيد</th>
                  <th>البيان</th>
                  <th>دُفع من</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in list.rows.value" :key="v.id" class="clickable" @click="open(v.id)">
                  <td><code class="doc-code">{{ v.number }}</code></td>
                  <td><span class="doc-num">{{ v.date }}</span></td>
                  <td>
                    {{ v.payee }}
                    <span v-if="v.reference" class="doc-cell__sub">{{ v.reference }}</span>
                  </td>
                  <td>{{ v.description }}</td>
                  <td>
                    <span v-if="v.paidFromAccount" class="doc-cell__sub">
                      {{ v.paidFromAccount.code }} {{ v.paidFromAccount.name }}
                    </span>
                  </td>
                  <td>
                    <span class="doc-num doc-num--strong">{{ formatMoney(v.total) }}</span>
                    <span v-if="v.taxTotal" class="doc-cell__sub">ضريبة {{ formatMoney(v.taxTotal) }}</span>
                  </td>
                  <td>
                    <span v-if="v.status === 'cancelled'" class="badge doc-status--cancelled">ملغي</span>
                    <span v-else class="badge doc-status--done">مُقيَّد</span>
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
          label="سند"
          @change="list.load"
        />
      </template>
    </template>

    <!-- ══ عرض سند ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="viewingId" class="modal-overlay" @click.self="viewingId = null">
          <div class="modal doc-modal voucher-modal">
            <div class="modal__header">
              <h3>
                <Receipt :size="20" class="doc-modal__icon" />
                {{ viewing ? `سند صرف ${viewing.number}` : "سند صرف" }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="viewingId = null">
                <X :size="20" />
              </button>
            </div>

            <div v-if="!viewing" class="empty-state"><div class="spinner" /></div>

            <div v-else class="doc-form">
              <div ref="voucherEl" class="voucher printable">
                <div class="report-title">
                  <h2>سند صرف {{ viewing.number }}</h2>
                  <span class="doc-num">{{ viewing.date }}</span>
                  <span v-if="viewing.status === 'cancelled'" class="badge doc-status--cancelled">
                    ملغي {{ viewing.cancelDate }}
                  </span>
                </div>
                <div class="doc-info">
                  <div class="doc-cell">
                    <span class="doc-cell__sub">اصرفوا إلى</span>
                    <strong>{{ viewing.payee }}</strong>
                    <span v-if="viewing.payeeTaxNumber" class="doc-cell__sub">
                      الرقم الضريبي {{ viewing.payeeTaxNumber }}
                    </span>
                  </div>
                  <div class="doc-cell">
                    <span class="doc-cell__sub">من</span>
                    <span>{{ viewing.paidFromName }}</span>
                  </div>
                  <div v-if="viewing.reference" class="doc-cell">
                    <span class="doc-cell__sub">المرجع</span>
                    <span>{{ viewing.reference }}</span>
                  </div>
                  <div class="doc-cell">
                    <span class="doc-cell__sub">المبلغ</span>
                    <span class="doc-num doc-num--strong">{{ formatMoney(viewing.total) }}</span>
                  </div>
                </div>
                <p class="voucher__description">{{ viewing.description }}</p>

                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>الحساب</th>
                        <th>البيان</th>
                        <th v-if="hasBranches">الفرع</th>
                        <th>المبلغ</th>
                        <th>الضريبة</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="line in viewing.lines" :key="line.id">
                        <td><code class="doc-code">{{ line.accountCode }}</code> {{ line.accountName }}</td>
                        <td>{{ line.description || "—" }}</td>
                        <td v-if="hasBranches">{{ line.branchName || "—" }}</td>
                        <td class="doc-num">{{ formatMoney(line.amount) }}</td>
                        <td class="doc-num">
                          {{ line.taxAmount ? `${formatMoney(line.taxAmount)} (${line.taxRate}%)` : "—" }}
                        </td>
                        <td class="doc-num">{{ formatMoney(line.total) }}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <th :colspan="hasBranches ? 3 : 2">الإجمالي</th>
                        <th class="doc-num">{{ formatMoney(viewing.subtotal) }}</th>
                        <th class="doc-num">{{ formatMoney(viewing.taxTotal) }}</th>
                        <th class="doc-num">{{ formatMoney(viewing.total) }}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p v-if="viewing.taxTotal && !viewing.taxRecoverable" class="doc-cell__sub">
                  المنشأة غير مسجّلة في الضريبة وقت الصرف: الضريبة جزء من المصروف.
                </p>
                <p v-if="viewing.status === 'cancelled'" class="doc-cell__sub">
                  سبب الإلغاء: {{ viewing.cancelReason }}
                </p>
                <div class="voucher__signatures">
                  <span>المستلم</span>
                  <span>المحاسب</span>
                  <span>المدير المالي</span>
                </div>
              </div>

              <div v-if="cancelling" class="doc-grid voucher__cancel">
                <div class="form-group">
                  <label>تاريخ الإلغاء *</label>
                  <StbDateInput v-model="cancelForm.date" required />
                </div>
                <div class="form-group voucher__wide">
                  <label>سبب الإلغاء *</label>
                  <input v-model.trim="cancelForm.reason" class="form-input" maxlength="300" />
                </div>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="viewingId = null">إغلاق</button>
                <button type="button" class="btn btn--ghost" @click="printVoucher">
                  <Printer :size="16" /> طباعة
                </button>
                <button
                  v-if="viewing.journalEntryId"
                  type="button"
                  class="btn btn--ghost"
                  @click="entryId = viewing.journalEntryId"
                >
                  <BookOpen :size="16" /> القيد
                </button>
                <template v-if="viewing.status === 'posted'">
                  <button
                    v-if="!cancelling"
                    v-can="'manage_expense_vouchers'"
                    type="button"
                    class="btn btn--danger"
                    @click="startCancel"
                  >
                    <Ban :size="16" /> إلغاء السند
                  </button>
                  <button
                    v-else
                    type="button"
                    class="btn btn--danger"
                    :class="{ 'btn--loading': saving }"
                    :disabled="saving || !cancelForm.reason || !cancelForm.date"
                    @click="cancel"
                  >
                    تأكيد الإلغاء بقيد عكسي
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <JournalEntryModal v-model:entry-id="entryId" />

    <!-- ══ سند صرف جديد ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal doc-modal voucher-form">
            <div class="modal__header">
              <h3><Receipt :size="20" class="doc-modal__icon" /> سند صرف جديد</h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="closeForm">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="save">
              <FormDraftNotice :draft="draft" />
              <div class="doc-grid">
                <div class="form-group">
                  <label>التاريخ *</label>
                  <StbDateInput v-model="form.date" required />
                </div>
                <div class="form-group">
                  <label>يُدفع من (صندوق / بنك) *</label>
                  <AccountSelect
                    v-model="form.paidFromAccountId"
                    :accounts="store.accounts"
                    :types="['asset']"
                    postable
                    required
                  />
                </div>
                <div class="form-group">
                  <label>المستفيد *</label>
                  <input v-model.trim="form.payee" class="form-input" maxlength="150" required />
                </div>
                <div class="form-group">
                  <label>الرقم الضريبي للمستفيد</label>
                  <input v-model.trim="form.payeeTaxNumber" class="form-input" maxlength="30" dir="ltr" />
                </div>
                <div class="form-group">
                  <label>رقم فاتورته / الإيصال</label>
                  <input v-model.trim="form.reference" class="form-input" maxlength="80" />
                </div>
                <div class="form-group voucher__wide">
                  <label>البيان *</label>
                  <input
                    v-model.trim="form.description"
                    class="form-input"
                    maxlength="500"
                    placeholder="إيجار المحل عن شهر…"
                    required
                  />
                </div>
              </div>

              <div class="doc-note">
                <Info :size="16" />
                <span>
                  الضريبة تُقيَّد ضريبةَ مدخلات (وتدخل الإقرار) إن كانت منشأتك مسجّلة في
                  الضريبة، وإلا تُضاف لتكلفة المصروف. مشتريات البضاعة وسداد الموردين
                  لها مستنداتها في المشتريات.
                </span>
              </div>

              <div class="doc-lines" :style="{ '--doc-cols': LINE_COLS }">
                <div class="doc-lines__head">
                  <span>حساب المصروف</span>
                  <span>المبلغ قبل الضريبة</span>
                  <span>الضريبة %</span>
                  <span>بيان البند</span>
                  <span v-if="branches.hasMany">الفرع</span>
                  <span />
                </div>
                <div v-for="(line, index) in form.lines" :key="line.key" class="doc-lines__row">
                  <AccountSelect v-model="line.accountId" :accounts="lineAccounts" postable required />
                  <div>
                    <span class="doc-lines__label">المبلغ</span>
                    <StbNumberInput v-model.number="line.amount" class="form-input" min="0" :step="moneyStep()" required />
                  </div>
                  <div>
                    <span class="doc-lines__label">الضريبة %</span>
                    <StbNumberInput v-model.number="line.taxRate" class="form-input" min="0" max="100" step="0.01" />
                  </div>
                  <input v-model.trim="line.description" class="form-input" maxlength="300" placeholder="اختياري" />
                  <select v-if="branches.hasMany" v-model="line.branchId" class="form-select">
                    <option value="">—</option>
                    <option v-for="b in branches.activeOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
                  </select>
                  <button
                    type="button"
                    class="btn btn--sm btn--danger btn--icon"
                    title="حذف البند"
                    :disabled="form.lines.length <= 1"
                    @click="form.lines.splice(index, 1)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
              <button type="button" class="btn btn--dashed btn--sm btn--full" @click="addLine">
                <Plus :size="14" /> بند
              </button>

              <div class="totals">
                <span>قبل الضريبة: <strong class="doc-num">{{ formatMoney(totals.subtotal) }}</strong></span>
                <span>الضريبة: <strong class="doc-num">{{ formatMoney(totals.tax) }}</strong></span>
                <span>الإجمالي: <strong class="doc-num">{{ formatMoney(totals.total) }}</strong></span>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeForm">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': saving }"
                  :disabled="saving || totals.total <= 0"
                >
                  حفظ وقيد السند
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { Ban, BookOpen, Info, Plus, Printer, Receipt, Trash2, X } from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useBranchesStore } from "@/stores/branches";
import { useToast } from "@/composables/useToast";
import type { ExpenseVoucherStatus, ExpenseVoucherView } from "@/types/accounting";

definePageMeta({ middleware: "auth" });

const store = useAccountingStore();
const branches = useBranchesStore();
const toast = useToast();
const notActive = ref(false);

/** حسابات لها دفتر مساعد تتحرك بمستنداتها لا بسند صرف (مرآة الباك إند) */
const SUBLEDGER_KEYS = new Set([
  "receivables",
  "payables",
  "inventory",
  "courier_receivable",
  "employee_advances",
  "employee_loans",
  "vat_input",
  "vat_output",
]);

const filters = reactive({
  search: "",
  status: "" as ExpenseVoucherStatus | "",
  from: "",
  to: "",
});

const list = usePagedList(
  (page) =>
    store.fetchExpenses({
      search: filters.search || undefined,
      status: filters.status || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page,
    }),
  "تعذر تحميل سندات الصرف",
);

const exportQuery = computed(() => ({
  search: filters.search || undefined,
  status: filters.status || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
}));

let timer: ReturnType<typeof setTimeout> | null = null;
const onSearch = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => list.load(1), 350);
};

// ─── عرض سند وإلغاؤه ───
const viewingId = ref<string | null>(null);
const viewing = ref<ExpenseVoucherView | null>(null);
const entryId = ref<string | null>(null);
const voucherEl = ref<HTMLElement | null>(null);
const cancelling = ref(false);
const cancelForm = reactive({ date: "", reason: "" });
const hasBranches = computed(() => !!viewing.value?.lines.some((l) => l.branchName));

const open = (id: string) => {
  viewingId.value = id;
};

watch(viewingId, async (id) => {
  viewing.value = null;
  cancelling.value = false;
  if (!id) return;
  try {
    viewing.value = await store.getExpense(id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل السند"));
    viewingId.value = null;
  }
});

const printVoucher = () => printElement(voucherEl.value);

const startCancel = () => {
  Object.assign(cancelForm, { date: companyToday(), reason: "" });
  cancelling.value = true;
};

const cancel = async () => {
  if (!viewing.value) return;
  saving.value = true;
  try {
    viewing.value = await store.cancelExpense(viewing.value.id, cancelForm.date, cancelForm.reason);
    cancelling.value = false;
    toast.success(`أُلغي السند ${viewing.value.number} بقيد عكسي`);
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إلغاء السند"));
  } finally {
    saving.value = false;
  }
};

// ─── سند جديد ───
interface FormLine {
  key: number;
  accountId: string;
  amount: number | "";
  taxRate: number | "";
  description: string;
  branchId: string;
}

let lineKey = 0;
const LINE_COLS = computed(() =>
  branches.hasMany ? "2.4fr 1.1fr 0.8fr 1.6fr 1fr auto" : "2.4fr 1.1fr 0.8fr 1.6fr auto",
);
const blankLine = (taxRate: number | "" = ""): FormLine => ({
  key: ++lineKey,
  accountId: "",
  amount: "",
  taxRate,
  description: "",
  branchId: "",
});

/** بنود السند: كل الحسابات الفرعية عدا ما له دفتر مساعد */
const lineAccounts = computed(() =>
  store.accounts.filter((a) => !a.systemKey || !SUBLEDGER_KEYS.has(a.systemKey)),
);

const showForm = ref(false);
const saving = ref(false);
const form = reactive({
  date: "",
  paidFromAccountId: "",
  payee: "",
  payeeTaxNumber: "",
  reference: "",
  description: "",
  lines: [] as FormLine[],
});

const draft = useFormDraft("expense-voucher", {
  open: showForm,
  documentId: () => null,
  snapshot: () => form,
  apply: (data) => {
    Object.assign(form, data);
    form.lines.forEach((line) => (line.key = ++lineKey));
  },
});

/** كما يحسبها الخادم: ضريبة كل بند مقرّبة لخانات العملة */
const totals = computed(() => {
  let subtotal = 0;
  let tax = 0;
  for (const line of form.lines) {
    const amount = roundMoney(Number(line.amount) || 0);
    subtotal += amount;
    tax += roundMoney((amount * (Number(line.taxRate) || 0)) / 100);
  }
  return {
    subtotal: roundMoney(subtotal),
    tax: roundMoney(tax),
    total: roundMoney(subtotal + tax),
  };
});

/** البند الجديد بنسبة ضريبة البند السابق */
const addLine = () => form.lines.push(blankLine(form.lines.at(-1)?.taxRate ?? ""));

const openCreate = async () => {
  await store.fetchAccounts();
  const cash = store.accounts.find((a) => a.systemKey === "cash");
  Object.assign(form, {
    date: companyToday(),
    paidFromAccountId: cash?.id ?? "",
    payee: "",
    payeeTaxNumber: "",
    reference: "",
    description: "",
    lines: [blankLine()],
  });
  showForm.value = true;
  draft.start();
};

const closeForm = () => {
  if (!saving.value) showForm.value = false;
};

const save = async () => {
  saving.value = true;
  try {
    const voucher = await store.createExpense({
      date: form.date,
      paidFromAccountId: form.paidFromAccountId,
      payee: form.payee,
      payeeTaxNumber: form.payeeTaxNumber || null,
      reference: form.reference || null,
      description: form.description,
      lines: form.lines
        .filter((l) => l.accountId && Number(l.amount) > 0)
        .map((l) => ({
          accountId: l.accountId,
          amount: Number(l.amount),
          taxRate: Number(l.taxRate) || 0,
          description: l.description || null,
          branchId: l.branchId || null,
        })),
    });
    draft.saved();
    toast.success(`سُجّل السند ${voucher.number}`);
    showForm.value = false;
    await list.load(1);
    viewingId.value = voucher.id;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ السند"));
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    const status = await store.fetchStatus();
    notActive.value = !status.active;
    if (!status.active) return;
    branches.fetchOptions().catch(() => {});
    store.fetchAccounts().catch(() => {});
    await list.load(1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل سندات الصرف"));
  }
});
</script>

<style lang="scss" scoped>
.modal.voucher-form {
  max-width: 1100px;
}
.modal.voucher-modal {
  max-width: 900px;
}
.voucher__wide {
  grid-column: span 2;
}
.voucher {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}
.voucher__description {
  margin: 0;
  color: $stb-text-secondary;
}
.voucher__signatures {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-4;
  margin-top: $space-6;
  text-align: center;
  font-size: $font-size-sm;
  color: $stb-text-secondary;

  span {
    padding-top: $space-6;
    border-top: 1px dashed $stb-border;
  }
}
.voucher__cancel {
  padding: $space-3;
  border-radius: $radius-md;
  background: rgba($stb-danger, 0.06);
}
.report-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: $space-2 $space-4;

  h2 {
    margin: 0;
    font-size: $font-size-lg;
  }
}
.clickable {
  cursor: pointer;
}
.totals {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2 $space-5;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}
</style>
