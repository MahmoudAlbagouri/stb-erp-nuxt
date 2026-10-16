<!-- pages/dashboard/accounting/journals.vue — دفتر اليومية: القيود المرحّلة واليدوية، وقيد يدوي جديد -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>القيود اليومية</h1>
        <p>
          كل مستند يُرحَّل بقيده تلقائياً. القيد اليدوي لما لا يسجّله النظام
          (رأس المال، الأصول، المصروفات، التسويات)
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'create_journal_entries'"
          class="btn btn--primary"
          :disabled="notActive"
          @click="openCreate"
        >
          <Plus :size="18" /> قيد يدوي
        </button>
      </div>
    </div>

    <AccountingInactive v-if="notActive" />

    <template v-else>
      <div class="card doc-filters">
        <input
          v-model.trim="filters.search"
          class="form-input"
          placeholder="رقم القيد أو بيانه أو رقم مستنده…"
          @input="onSearch"
        />
        <select v-model="filters.sourceType" class="form-select" @change="list.load(1)">
          <option value="">كل المصادر</option>
          <option v-for="(label, key) in JOURNAL_SOURCE_LABEL" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
        <StbDateInput v-model="filters.from" @update:model-value="list.load(1)" />
        <StbDateInput v-model="filters.to" @update:model-value="list.load(1)" />
      </div>

      <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
      <div v-else-if="!list.rows.value.length" class="card">
        <div class="empty-state">
          <BookOpen :size="44" class="empty-state__icon" />
          <div class="empty-state__title">لا قيود</div>
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
                  <th>البيان</th>
                  <th>المصدر</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in list.rows.value" :key="e.id" class="clickable" @click="viewing = e.id">
                  <td><code class="doc-code">{{ e.number }}</code></td>
                  <td>
                    <span class="doc-num">{{ e.date }}</span>
                    <span v-if="e.documentDate" class="doc-cell__sub" :title="`تاريخ المستند ${e.documentDate}`">
                      ({{ e.documentDate }})
                    </span>
                  </td>
                  <td>
                    {{ e.description }}
                    <span v-if="e.reversedById" class="badge doc-status--cancelled">معكوس</span>
                  </td>
                  <td>
                    <span class="doc-cell__sub">{{ JOURNAL_SOURCE_LABEL[e.sourceType] }}</span>
                    <code v-if="e.sourceRef" class="doc-code">{{ e.sourceRef }}</code>
                  </td>
                  <td><span class="doc-num doc-num--strong">{{ formatMoney(e.total) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <DocPager
          :total="list.total.value"
          :page="list.page.value"
          :total-pages="list.totalPages.value"
          label="قيد"
          @change="list.load"
        />
      </template>
    </template>

    <JournalEntryModal v-model:entry-id="viewing" @reversed="list.load()" />

    <!-- ══ قيد يدوي ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal doc-modal entry-modal">
            <div class="modal__header">
              <h3><BookOpen :size="20" class="doc-modal__icon" /> قيد يدوي</h3>
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
                <div class="form-group entry-modal__wide">
                  <label>البيان *</label>
                  <input v-model.trim="form.description" class="form-input" maxlength="500" required />
                </div>
              </div>

              <div class="doc-note">
                <Info :size="16" />
                <span>
                  حركات العملاء والموردين تُسجَّل بمستنداتها (سند قبض، سداد، مرتجع)
                  لا بقيد يدوي — فيبقى كشف حساب كل منهم مطابقاً للدفاتر.
                </span>
              </div>

              <div class="doc-lines" :style="{ '--doc-cols': LINE_COLS }">
                <div class="doc-lines__head">
                  <span>الحساب</span>
                  <span>مدين</span>
                  <span>دائن</span>
                  <span>بيان السطر</span>
                  <span v-if="branches.hasMany">الفرع</span>
                  <span />
                </div>
                <div v-for="(line, index) in form.lines" :key="line.key" class="doc-lines__row">
                  <AccountSelect v-model="line.accountId" :accounts="store.accounts" postable required />
                  <div>
                    <span class="doc-lines__label">مدين</span>
                    <StbNumberInput v-model.number="line.debit" class="form-input" min="0" :step="moneyStep()" @input="line.credit = ''" />
                  </div>
                  <div>
                    <span class="doc-lines__label">دائن</span>
                    <StbNumberInput v-model.number="line.credit" class="form-input" min="0" :step="moneyStep()" @input="line.debit = ''" />
                  </div>
                  <input v-model.trim="line.description" class="form-input" maxlength="300" placeholder="اختياري" />
                  <select v-if="branches.hasMany" v-model="line.branchId" class="form-select">
                    <option value="">—</option>
                    <option v-for="b in branches.activeOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
                  </select>
                  <button
                    type="button"
                    class="btn btn--sm btn--danger btn--icon"
                    title="حذف السطر"
                    :disabled="form.lines.length <= 2"
                    @click="form.lines.splice(index, 1)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
              <button type="button" class="btn btn--dashed btn--sm btn--full" @click="addLine">
                <Plus :size="14" /> سطر
              </button>

              <div class="totals" :class="{ 'is-off': !balanced }">
                <span>مدين: <strong class="doc-num">{{ formatMoney(totals.debit) }}</strong></span>
                <span>دائن: <strong class="doc-num">{{ formatMoney(totals.credit) }}</strong></span>
                <span v-if="!balanced">
                  الفرق: <strong class="doc-num">{{ formatMoney(Math.abs(totals.debit - totals.credit)) }}</strong>
                </span>
                <span v-else-if="totals.debit > 0" class="doc-money--in">متوازن ✓</span>
              </div>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeForm">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': saving }"
                  :disabled="saving || !balanced || totals.debit <= 0"
                >
                  تسجيل القيد
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
import { computed, onMounted, reactive, ref } from "vue";
import { BookOpen, Info, Plus, Trash2, X } from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useBranchesStore } from "@/stores/branches";
import { useFormDraft } from "@/composables/useFormDraft";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { JOURNAL_SOURCE_LABEL, type JournalSource } from "@/types/accounting";

definePageMeta({ middleware: "auth" });

const store = useAccountingStore();
const branches = useBranchesStore();
const toast = useToast();
const notActive = ref(false);
const viewing = ref<string | null>(null);

const route = useRoute();
const filters = reactive({
  search: typeof route.query.search === "string" ? route.query.search : "",
  sourceType: "" as JournalSource | "",
  from: "",
  to: "",
});

const list = usePagedList(
  (page) =>
    store.fetchJournals({
      ...filters,
      sourceType: filters.sourceType || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page,
    }),
  "تعذر تحميل القيود",
);

let timer: ReturnType<typeof setTimeout> | null = null;
const onSearch = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => list.load(1), 350);
};

// ─── القيد اليدوي ───
interface FormLine {
  key: number;
  accountId: string;
  debit: number | "";
  credit: number | "";
  description: string;
  branchId: string;
}

let lineKey = 0;
const LINE_COLS = computed(() =>
  branches.hasMany ? "2.4fr 1fr 1fr 1.6fr 1fr auto" : "2.4fr 1fr 1fr 1.6fr auto",
);
const blankLine = (): FormLine => ({
  key: ++lineKey,
  accountId: "",
  debit: "",
  credit: "",
  description: "",
  branchId: "",
});

const showForm = ref(false);
const saving = ref(false);
const form = reactive({ date: "", description: "", lines: [] as FormLine[] });

const draft = useFormDraft("journal-entry", {
  open: showForm,
  documentId: () => null,
  snapshot: () => form,
  apply: (data) => {
    Object.assign(form, data);
    form.lines.forEach((line) => (line.key = ++lineKey));
  },
});

const totals = computed(() => ({
  debit: form.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0),
  credit: form.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0),
}));
const balanced = computed(
  () => Math.abs(totals.value.debit - totals.value.credit) < 0.0005,
);

const addLine = () => form.lines.push(blankLine());

const openCreate = async () => {
  await store.fetchAccounts();
  Object.assign(form, {
    date: companyToday(),
    description: "",
    lines: [blankLine(), blankLine()],
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
    const entry = await store.createJournal({
      date: form.date,
      description: form.description,
      lines: form.lines
        .filter((l) => l.accountId && (Number(l.debit) || Number(l.credit)))
        .map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || null,
          branchId: l.branchId || null,
        })),
    });
    draft.saved();
    toast.success(`سُجّل القيد ${entry.number}`);
    showForm.value = false;
    await list.load(1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تسجيل القيد"));
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
    toast.error(getErrorMessage(e, "تعذر تحميل القيود"));
  }
});
</script>

<style lang="scss" scoped>
.modal.entry-modal {
  max-width: 1100px;
}
.entry-modal__wide {
  grid-column: span 2;
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

  &.is-off strong {
    color: $stb-danger;
  }
}
</style>
