<!-- pages/dashboard/accounting/chart.vue — شجرة الحسابات: عرض شجري، إضافة وتعديل ونقل وإيقاف وحذف -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>شجرة الحسابات</h1>
        <p>
          القيود على الحسابات الفرعية وحدها. حسابات النظام (عليها شارة) يُرحَّل
          إليها تلقائياً: يُغيَّر اسمها ولا تُحذف
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_chart_of_accounts'"
          class="btn btn--primary"
          :disabled="!store.accounts.length"
          @click="openCreate()"
        >
          <Plus :size="18" /> حساب جديد
        </button>
      </div>
    </div>

    <AccountingInactive v-if="notActive" />

    <template v-else>
      <div class="card doc-filters">
        <input
          v-model.trim="search"
          class="form-input"
          placeholder="ابحث بالكود أو الاسم…"
        />
        <label class="check">
          <input v-model="showInactive" type="checkbox" /> إظهار الموقوفة
        </label>
        <div class="doc-actions">
          <button class="btn btn--sm btn--ghost" @click="expandAll">فتح الكل</button>
          <button class="btn btn--sm btn--ghost" @click="collapseAll">طي الكل</button>
        </div>
      </div>

      <div v-if="loading" class="empty-state"><div class="spinner spinner--lg" /></div>

      <div v-else class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table tree-table">
            <thead>
              <tr>
                <th>الحساب</th>
                <th>النوع</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in visibleRows"
                :key="row.account.id"
                :class="{ 'is-group': row.account.isGroup, 'is-inactive': !row.account.isActive }"
              >
                <td>
                  <div class="tree-cell" :style="{ paddingInlineStart: `${(row.depth - 1) * 22}px` }">
                    <button
                      v-if="row.hasChildren"
                      class="tree-toggle"
                      :aria-label="expanded.has(row.account.id) ? 'طي' : 'فتح'"
                      @click="toggle(row.account.id)"
                    >
                      <ChevronDown v-if="expanded.has(row.account.id) || search" :size="16" />
                      <ChevronLeft v-else :size="16" />
                    </button>
                    <span v-else class="tree-toggle tree-toggle--leaf" />
                    <code class="doc-code">{{ row.account.code }}</code>
                    <span class="tree-name">{{ row.account.name }}</span>
                    <span v-if="row.account.systemKey" class="badge doc-status--progress" title="يُرحَّل إليه تلقائياً">نظام</span>
                    <span v-if="!row.account.isActive" class="badge doc-status--cancelled">موقوف</span>
                  </div>
                  <div v-if="row.account.nameEn" class="tree-en" :style="{ paddingInlineStart: `${(row.depth - 1) * 22 + 30}px` }">
                    {{ row.account.nameEn }}
                  </div>
                </td>
                <td>
                  <span class="doc-cell__sub">
                    {{ ACCOUNT_TYPE_LABEL[row.account.type] }} ·
                    {{ row.account.isGroup ? "تجميعي" : "فرعي" }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <button
                      v-if="row.account.isGroup"
                      v-can="'manage_chart_of_accounts'"
                      class="btn btn--sm btn--ghost btn--icon"
                      title="إضافة حساب تحته"
                      @click="openCreate(row.account)"
                    >
                      <Plus :size="14" />
                    </button>
                    <button
                      class="btn btn--sm btn--ghost btn--icon"
                      title="كشف الحساب"
                      @click="navigateTo(`/dashboard/accounting/ledger?accountId=${row.account.id}`)"
                    >
                      <FileText :size="14" />
                    </button>
                    <button
                      v-can="'manage_chart_of_accounts'"
                      class="btn btn--sm btn--ghost btn--icon"
                      title="تعديل"
                      @click="openEdit(row.account)"
                    >
                      <Pencil :size="14" />
                    </button>
                    <button
                      v-if="row.account.parentId && !row.account.systemKey && !row.hasChildren"
                      v-can="'manage_chart_of_accounts'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="askRemove(row.account)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!visibleRows.length">
                <td colspan="3" class="empty-state__text">لا حسابات مطابقة</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ إضافة / تعديل ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
          <div class="modal">
            <div class="modal__header">
              <h3>{{ form.id ? `تعديل ${form.code} ${form.name}` : "حساب جديد" }}</h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="showForm = false">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="save">
              <div class="form-group">
                <label>تحت الحساب *</label>
                <AccountSelect
                  v-model="form.parentId"
                  :accounts="store.accounts"
                  groups-only
                  required
                  :disabled="!!form.id && (!editing?.parentId || editingHasChildren)"
                />
                <small v-if="form.id && editingHasChildren" class="doc-hint">
                  حساب تحته حسابات: لا يُنقل ولا يتغير كوده
                </small>
              </div>
              <div class="doc-grid">
                <div class="form-group">
                  <label>الكود</label>
                  <input
                    v-model.trim="form.code"
                    class="form-input doc-num"
                    inputmode="numeric"
                    pattern="\d{1,20}"
                    :placeholder="form.id ? '' : 'تلقائي (التالي تحت الأب)'"
                    :disabled="!!form.id && (!editing?.parentId || editingHasChildren)"
                  />
                </div>
                <div class="form-group">
                  <label>الاسم *</label>
                  <input v-model.trim="form.name" class="form-input" maxlength="150" required />
                </div>
                <div class="form-group">
                  <label>الاسم بالإنجليزية</label>
                  <input v-model.trim="form.nameEn" class="form-input" maxlength="150" dir="ltr" />
                </div>
              </div>
              <div class="form-group">
                <label>وصف</label>
                <input v-model.trim="form.description" class="form-input" maxlength="300" />
              </div>
              <div class="checks">
                <label class="check">
                  <input
                    v-model="form.isGroup"
                    type="checkbox"
                    :disabled="!!editing?.systemKey || (!!form.id && editingHasChildren)"
                  />
                  حساب تجميعي (أب لحسابات، لا يُرحَّل عليه)
                </label>
                <label v-if="form.id" class="check">
                  <input v-model="form.isActive" type="checkbox" :disabled="!!editing?.systemKey" />
                  فعّال
                </label>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showForm = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': saving }" :disabled="saving">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showRemove"
      title="حذف حساب"
      :message="`حذف ${removeTarget?.code} ${removeTarget?.name}؟ لا يُحذف حساب عليه قيود (أوقفه بدلاً من ذلك).`"
      confirm-text="حذف"
      :loading="saving"
      @confirm="remove"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  ChevronDown,
  ChevronLeft,
  FileText,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useToast } from "@/composables/useToast";
import { ACCOUNT_TYPE_LABEL, type Account } from "@/types/accounting";

definePageMeta({ middleware: "auth" });

const store = useAccountingStore();
const toast = useToast();
const loading = ref(true);
const notActive = ref(false);
const search = ref("");
const showInactive = ref(false);
const expanded = ref(new Set<string>());

interface Row {
  account: Account;
  depth: number;
  hasChildren: boolean;
  ancestors: string[];
}

const rows = computed<Row[]>(() => {
  const byId = new Map(store.accounts.map((a) => [a.id, a]));
  const parents = new Set(store.accounts.map((a) => a.parentId).filter(Boolean));
  return store.accounts.map((account) => {
    const ancestors: string[] = [];
    let parent = account.parentId ? byId.get(account.parentId) : undefined;
    while (parent && ancestors.length < 20) {
      ancestors.push(parent.id);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return {
      account,
      depth: ancestors.length + 1,
      hasChildren: parents.has(account.id),
      ancestors,
    };
  });
});

const visibleRows = computed(() => {
  const term = search.value.toLowerCase();
  const list = rows.value.filter((r) => showInactive.value || r.account.isActive);
  if (term) {
    // المطابق وآباؤه (ليظهر موضعه في الشجرة)
    const keep = new Set<string>();
    for (const r of list) {
      const hit =
        r.account.code.includes(term) ||
        r.account.name.toLowerCase().includes(term) ||
        (r.account.nameEn ?? "").toLowerCase().includes(term);
      if (hit) {
        keep.add(r.account.id);
        r.ancestors.forEach((id) => keep.add(id));
      }
    }
    return list.filter((r) => keep.has(r.account.id));
  }
  return list.filter((r) => r.ancestors.every((id) => expanded.value.has(id)));
});

const toggle = (id: string) => {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
};
const expandAll = () => {
  expanded.value = new Set(rows.value.filter((r) => r.hasChildren).map((r) => r.account.id));
};
const collapseAll = () => {
  expanded.value = new Set();
};

// ─── النموذج ───
const showForm = ref(false);
const saving = ref(false);
const editing = ref<Account | null>(null);
const form = reactive({
  id: "",
  parentId: "",
  code: "",
  name: "",
  nameEn: "",
  description: "",
  isGroup: false,
  isActive: true,
});
const editingHasChildren = computed(
  () => !!editing.value && rows.value.some((r) => r.account.parentId === editing.value!.id),
);

const openCreate = (parent?: Account) => {
  editing.value = null;
  Object.assign(form, {
    id: "",
    parentId: parent?.id ?? "",
    code: "",
    name: "",
    nameEn: "",
    description: "",
    isGroup: false,
    isActive: true,
  });
  showForm.value = true;
};

const openEdit = (account: Account) => {
  editing.value = account;
  Object.assign(form, {
    id: account.id,
    parentId: account.parentId ?? "",
    code: account.code,
    name: account.name,
    nameEn: account.nameEn ?? "",
    description: account.description ?? "",
    isGroup: account.isGroup,
    isActive: account.isActive,
  });
  showForm.value = true;
};

const save = async () => {
  saving.value = true;
  try {
    if (form.id) {
      const original = editing.value!;
      await store.updateAccount(form.id, {
        ...(form.parentId && form.parentId !== original.parentId ? { parentId: form.parentId } : {}),
        ...(form.code && form.code !== original.code ? { code: form.code } : {}),
        name: form.name,
        nameEn: form.nameEn || null,
        description: form.description || null,
        ...(form.isGroup !== original.isGroup ? { isGroup: form.isGroup } : {}),
        ...(form.isActive !== original.isActive ? { isActive: form.isActive } : {}),
      });
      toast.success("حُفظ الحساب");
    } else {
      const created = await store.createAccount({
        parentId: form.parentId,
        code: form.code || undefined,
        name: form.name,
        nameEn: form.nameEn || null,
        description: form.description || null,
        isGroup: form.isGroup,
      });
      expanded.value = new Set([...expanded.value, form.parentId]);
      toast.success(`أُضيف الحساب ${created.code}`);
    }
    showForm.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الحساب"));
  } finally {
    saving.value = false;
  }
};

// ─── الحذف ───
const showRemove = ref(false);
const removeTarget = ref<Account | null>(null);
const askRemove = (account: Account) => {
  removeTarget.value = account;
  showRemove.value = true;
};
const remove = async () => {
  if (!removeTarget.value) return;
  saving.value = true;
  try {
    await store.removeAccount(removeTarget.value.id);
    toast.success("حُذف الحساب");
    showRemove.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف الحساب"));
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    const status = await store.fetchStatus();
    notActive.value = !status.active;
    if (status.active) {
      await store.fetchAccounts(true);
      // الحسابات الرئيسية مفتوحة من البداية
      expanded.value = new Set(rows.value.filter((r) => r.depth <= 1).map((r) => r.account.id));
    }
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الشجرة"));
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.tree-table {
  tr.is-group td {
    font-weight: 700;
  }
  tr.is-inactive td {
    opacity: 0.6;
  }
}
.tree-cell {
  display: flex;
  align-items: center;
  gap: $space-2;
}
.tree-toggle {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  color: $stb-text-secondary;
  background: transparent;
  cursor: pointer;

  &--leaf {
    cursor: default;
  }
}
.tree-name {
  color: $stb-text-primary;
}
.tree-en {
  font-size: $font-size-xs;
  font-weight: 400;
  color: $stb-text-muted;
}
.check {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}
.checks {
  display: flex;
  flex-wrap: wrap;
  gap: $space-4;
}
</style>
