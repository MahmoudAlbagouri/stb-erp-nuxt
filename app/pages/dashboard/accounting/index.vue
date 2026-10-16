<!-- pages/dashboard/accounting/index.vue — إعداد المحاسبة: التفعيل، قفل الفترة، حسابات طرق الدفع، وما تعذّر ترحيله -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>المحاسبة</h1>
        <p>
          دفاتر بالقيد المزدوج تُرحَّل إليها كل مستندات النظام تلقائياً: المبيعات
          والمشتريات والمخزون والكاشير والتوصيل والرواتب
        </p>
      </div>
    </div>

    <div v-if="!status" class="empty-state"><div class="spinner spinner--lg" /></div>

    <!-- ══ غير مفعّلة ══ -->
    <template v-else-if="!status.active">
      <div class="card setup">
        <div class="setup__head">
          <Landmark :size="40" class="empty-state__icon" />
          <div>
            <h2>فعّل المحاسبة لشركتك</h2>
            <p>التفعيل مرة واحدة، ولا يغيّر شيئاً في مستنداتك الحالية.</p>
          </div>
        </div>
        <ul class="setup__points">
          <li>تُنشأ شجرة حسابات جاهزة لدولتك (تعدّلها كما تشاء بعد ذلك).</li>
          <li>
            يُقيَّد <strong>قيد افتتاحي</strong> بأرصدة هذه اللحظة: العملاء، الموردون،
            المخزون بمتوسط تكلفته، ما مع جهات التوصيل، وسلف الموظفين وقروضهم.
          </li>
          <li>
            من بعدها كل فاتورة وسند ومرتجع وتسوية ومسير يُرحَّل تلقائياً خلال
            دقيقة، ولا ينتظره البيع.
          </li>
          <li>
            أرصدة <strong>النقدية والبنوك والأصول الثابتة ورأس المال</strong> لا
            يعرفها النظام: سجّلها بقيد يدوي بعد التفعيل.
          </li>
        </ul>

        <div class="doc-grid">
          <div class="form-group">
            <label>شجرة الحسابات لدولة</label>
            <select v-model="country" class="form-select" @change="loadPreview">
              <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">
                {{ c.nameAr }}
              </option>
            </select>
            <small class="doc-hint">
              {{ preview.length }} حساباً — {{ previewDetail }} فرعياً تُسجَّل عليه القيود
            </small>
          </div>
        </div>

        <details v-if="preview.length" class="setup__preview">
          <summary>معاينة الشجرة</summary>
          <ul>
            <li
              v-for="a in preview"
              :key="a.code"
              :style="{ paddingInlineStart: `${(a.code.length - 1) * 8}px` }"
              :class="{ 'is-group': a.isGroup }"
            >
              <code>{{ a.code }}</code> {{ a.name }}
            </li>
          </ul>
        </details>

        <div class="setup__actions">
          <button
            v-can="'manage_accounting_settings'"
            class="btn btn--primary"
            @click="showActivate = true"
          >
            <Power :size="16" /> تفعيل المحاسبة
          </button>
        </div>
      </div>
    </template>

    <!-- ══ مفعّلة ══ -->
    <template v-else>
      <div class="stats">
        <div class="card stat">
          <span>بداية الدفاتر</span>
          <strong class="doc-num">{{ status.settings!.startDate }}</strong>
        </div>
        <div class="card stat">
          <span>الفترة مقفلة حتى</span>
          <strong class="doc-num">{{ status.settings!.lockDate || "مفتوحة" }}</strong>
        </div>
        <div class="card stat">
          <span>آخر ترحيل</span>
          <strong>{{ status.settings!.lastSyncAt ? formatDateTime(status.settings!.lastSyncAt) : "—" }}</strong>
        </div>
        <div class="card stat" :class="{ 'is-warning': status.errorsCount }">
          <span>مستندات تعذّر ترحيلها</span>
          <strong>{{ status.errorsCount }}</strong>
        </div>
      </div>

      <div class="card section">
        <div class="section__head">
          <h3><Lock :size="18" /> قفل الفترة</h3>
          <p>
            بعد مراجعة الشهر وإقفاله: لا قيد يدوي بتاريخ مقفل، والمستند المتأخر
            (فاتورة كاشير رُفعت بعد الإقفال) يُقيَّد في أول يوم مفتوح بتاريخ
            مستنده.
          </p>
        </div>
        <div class="inline-form">
          <StbDateInput v-model="lockDate" :max="companyToday()" />
          <button
            v-can="'manage_accounting_settings'"
            class="btn btn--primary"
            :disabled="saving || lockDate === (status.settings!.lockDate || '')"
            @click="saveLock(lockDate || null)"
          >
            حفظ
          </button>
          <button
            v-if="status.settings!.lockDate"
            v-can="'manage_accounting_settings'"
            class="btn btn--ghost"
            :disabled="saving"
            @click="saveLock(null)"
          >
            فتح الفترة
          </button>
        </div>
      </div>

      <div class="card section">
        <div class="section__head">
          <h3><Wallet :size="18" /> حسابات طرق الدفع</h3>
          <p>
            إلى أي حساب يدخل ما يُقبض بكل طريقة، ومن أي حساب يُدفع للموردين
            والرواتب. أضف صناديق وبنوكاً من شجرة الحسابات ثم اخترها هنا.
          </p>
        </div>
        <div class="methods">
          <div>
            <h4>القبض (من العملاء، الكاشير، تسويات التوصيل)</h4>
            <div v-for="m in RECEIPT_METHODS" :key="m.key" class="form-group">
              <label>{{ m.label }}</label>
              <AccountSelect
                v-model="receipts[m.key]"
                :accounts="store.accounts"
                :types="['asset']"
                postable
              />
            </div>
          </div>
          <div>
            <h4>الدفع (للموردين، الرواتب، السلف والقروض)</h4>
            <div v-for="m in PAYMENT_METHODS" :key="m.key" class="form-group">
              <label>{{ m.label }}</label>
              <AccountSelect
                v-model="payments[m.key]"
                :accounts="store.accounts"
                :types="['asset']"
                postable
              />
            </div>
          </div>
        </div>
        <div class="section__actions">
          <button
            v-can="'manage_accounting_settings'"
            class="btn btn--primary"
            :disabled="saving"
            @click="saveMethods"
          >
            حفظ الحسابات
          </button>
        </div>
      </div>

      <div class="card section">
        <div class="section__head">
          <h3><AlertTriangle :size="18" /> مستندات تعذّر ترحيلها</h3>
          <p>
            المستند نفسه سليم ولم يتوقف — قيده فقط لم يُسجَّل بعد. أصلح السبب (حساب
            موقوف مثلاً) ثم «ترحيل الآن».
          </p>
          <button
            v-can="'manage_accounting_settings'"
            class="btn btn--secondary"
            :class="{ 'btn--loading': syncing }"
            :disabled="syncing"
            @click="syncNow"
          >
            <RefreshCw :size="16" /> ترحيل الآن
          </button>
        </div>
        <div v-if="!status.errors.length" class="empty-state empty-state--compact">
          <CheckCheck :size="28" class="empty-state__icon" />
          <div class="empty-state__text">كل المستندات مُرحَّلة</div>
        </div>
        <div v-else class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>المستند</th>
                <th>السبب</th>
                <th>المحاولات</th>
                <th>آخر محاولة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in status.errors" :key="e.id">
                <td>{{ JOURNAL_SOURCE_LABEL[e.sourceType] || e.sourceType }}</td>
                <td>{{ e.message }}</td>
                <td class="doc-num">{{ e.attempts }}</td>
                <td>{{ formatDateTime(e.lastSeenAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <ConfirmDialog
      v-model="showActivate"
      title="تفعيل المحاسبة"
      :message="`ستُنشأ شجرة حسابات ${countryName} ويُقيَّد القيد الافتتاحي بأرصدة الآن. التفعيل لا يُلغى، ومن بعده تُرحَّل كل المستندات تلقائياً.`"
      confirm-text="تفعيل"
      :loading="saving"
      @confirm="activate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  AlertTriangle,
  CheckCheck,
  Landmark,
  Lock,
  Power,
  RefreshCw,
  Wallet,
} from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";
import { JOURNAL_SOURCE_LABEL, type TemplateAccount } from "@/types/accounting";

definePageMeta({ middleware: "auth" });

const RECEIPT_METHODS = [
  { key: "cash", label: "نقدي" },
  { key: "card", label: "شبكة / بطاقة" },
  { key: "bank_transfer", label: "تحويل بنكي" },
  { key: "cheque", label: "شيك" },
];
const PAYMENT_METHODS = [
  { key: "cash", label: "نقدي (ورواتب نقدية)" },
  { key: "bank_transfer", label: "تحويل بنكي (ورواتب بنكية)" },
  { key: "card", label: "بطاقة" },
  { key: "cheque", label: "شيك" },
];

const store = useAccountingStore();
const auth = useAuthStore();
const toast = useToast();

const status = computed(() => store.status);
const saving = ref(false);
const syncing = ref(false);

// ─── التفعيل ───
const country = ref(auth.country);
const preview = ref<TemplateAccount[]>([]);
const previewDetail = computed(() => preview.value.filter((a) => !a.isGroup).length);
const countryName = computed(
  () => COUNTRIES.find((c) => c.code === country.value)?.nameAr ?? "",
);
const showActivate = ref(false);

const loadPreview = async () => {
  try {
    preview.value = await store.fetchTemplate(country.value);
  } catch {
    preview.value = [];
  }
};

const activate = async () => {
  saving.value = true;
  try {
    await store.activate(country.value);
    await store.fetchAccounts(true);
    fillMethods();
    toast.success("فُعّلت المحاسبة وسُجّل القيد الافتتاحي");
    showActivate.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تفعيل المحاسبة"));
  } finally {
    saving.value = false;
  }
};

// ─── الإعدادات ───
const lockDate = ref("");
const receipts = reactive<Record<string, string>>({});
const payments = reactive<Record<string, string>>({});

const fillMethods = () => {
  Object.assign(receipts, status.value?.receiptAccounts ?? {});
  Object.assign(payments, status.value?.paymentAccounts ?? {});
  lockDate.value = status.value?.settings?.lockDate ?? "";
};

const saveLock = async (value: string | null) => {
  saving.value = true;
  try {
    await store.updateSettings({ lockDate: value });
    fillMethods();
    toast.success(value ? `أُقفلت الفترة حتى ${value}` : "فُتحت الفترة");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ القفل"));
  } finally {
    saving.value = false;
  }
};

const saveMethods = async () => {
  saving.value = true;
  try {
    await store.updateSettings({
      receiptAccounts: { ...receipts },
      paymentAccounts: { ...payments },
    });
    fillMethods();
    toast.success("حُفظت حسابات طرق الدفع");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الحسابات"));
  } finally {
    saving.value = false;
  }
};

const syncNow = async () => {
  syncing.value = true;
  try {
    const result = await store.sync();
    await store.fetchStatus();
    if (result.skipped) toast.info("ترحيل آخر يعمل الآن — أعد المحاولة بعد لحظة");
    else if (result.failed) {
      toast.warning(`رُحّل ${result.posted} وتعذّر ${result.failed} — انظر الأسباب`);
    } else toast.success(`رُحّل ${result.posted} مستنداً`);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الترحيل"));
  } finally {
    syncing.value = false;
  }
};

onMounted(async () => {
  try {
    await store.fetchStatus();
    if (store.status?.active) {
      await store.fetchAccounts(true);
      fillMethods();
    } else {
      await loadPreview();
    }
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل حالة المحاسبة"));
  }
});
</script>

<style lang="scss" scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-6;

  &__head {
    display: flex;
    align-items: center;
    gap: $space-4;

    h2 {
      margin: 0;
    }
    p {
      margin: $space-1 0 0;
      color: $stb-text-secondary;
    }
  }
  &__points {
    margin: 0;
    padding-inline-start: $space-5;
    color: $stb-text-secondary;
    line-height: 1.9;
  }
  &__preview {
    ul {
      max-height: 320px;
      overflow: auto;
      margin: $space-2 0 0;
      padding: $space-2;
      list-style: none;
      border: 1px solid $stb-border;
      border-radius: $radius-md;
      font-size: $font-size-sm;
    }
    li.is-group {
      font-weight: 700;
    }
    code {
      color: $stb-text-muted;
    }
  }
  &__actions {
    display: flex;
    justify-content: flex-end;
  }
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: $space-3;
  margin-bottom: $space-4;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  padding: $space-4;

  span {
    font-size: $font-size-sm;
    color: $stb-text-muted;
  }
  strong {
    font-size: $font-size-lg;
  }
  &.is-warning strong {
    color: $stb-warning;
  }
}

.section {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  margin-bottom: $space-4;
  padding: $space-5;

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: $space-2 $space-4;

    h3 {
      display: flex;
      align-items: center;
      gap: $space-2;
      margin: 0;
      flex-basis: 100%;
    }
    p {
      flex: 1;
      margin: 0;
      font-size: $font-size-sm;
      color: $stb-text-secondary;
    }
  }
  &__actions {
    display: flex;
    justify-content: flex-end;
  }
}

.inline-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-2;

  > :first-child {
    max-width: 200px;
  }
}

.empty-state--compact {
  padding: $space-4;
}

.methods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: $space-5;

  h4 {
    margin: 0 0 $space-2;
    font-size: $font-size-sm;
    color: $stb-text-secondary;
  }
}
</style>
