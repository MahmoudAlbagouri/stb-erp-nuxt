<!-- pages/dashboard/products/settings.vue — التصنيفات / الوحدات / الضرائب -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>إعدادات الأصناف</h1>
        <p>التصنيفات ووحدات القياس ونسب الضريبة المستخدمة في الأصناف</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/dashboard/products" class="btn btn--ghost">
          <ArrowRight :size="16" /> <span>الأصناف</span>
        </NuxtLink>
        <button class="btn btn--primary" @click="openCreate">
          <Plus :size="18" /> <span>{{ current.addLabel }}</span>
        </button>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-btn"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
        <span class="tab-btn__count">{{ counts[tab.key] }}</span>
      </button>
    </div>

    <div v-if="store.settingsLoading && !store.settingsLoaded" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!rows.length" class="card">
      <div class="empty-state">
        <component :is="current.icon" :size="40" class="empty-state__icon" />
        <div class="empty-state__title">{{ current.emptyTitle }}</div>
        <button class="btn btn--primary" @click="openCreate">
          <Plus :size="16" /> {{ current.addLabel }}
        </button>
      </div>
    </div>

    <div v-else class="card table-card">
      <div class="table-responsive">
        <!-- ══ التصنيفات ══ -->
        <table v-if="activeTab === 'categories'" class="data-table">
          <thead>
            <tr>
              <th>التصنيف</th>
              <th>التصنيف الأب</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in categoryRows" :key="c.id">
              <td>
                <span
                  class="cat-name"
                  :style="{ paddingInlineStart: `${c.depth * 18}px` }"
                >
                  <span
                    class="color-dot"
                    :style="{ background: c.color || 'transparent' }"
                  />
                  <strong>{{ c.name }}</strong>
                </span>
              </td>
              <td>{{ c.parentName || "—" }}</td>
              <td><StatusBadge :active="c.isActive" /></td>
              <td><RowActions @edit="openEdit(c)" @remove="askDelete(c)" /></td>
            </tr>
          </tbody>
        </table>

        <!-- ══ الوحدات ══ -->
        <table v-else-if="activeTab === 'units'" class="data-table">
          <thead>
            <tr>
              <th>الوحدة</th>
              <th>الاختصار</th>
              <th>تقبل الكسور</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in store.units" :key="u.id">
              <td><strong>{{ u.name }}</strong></td>
              <td>{{ u.symbol || "—" }}</td>
              <td>{{ u.allowsFractions ? "نعم (وزن/حجم)" : "لا" }}</td>
              <td><StatusBadge :active="u.isActive" /></td>
              <td><RowActions @edit="openEdit(u)" @remove="askDelete(u)" /></td>
            </tr>
          </tbody>
        </table>

        <!-- ══ الضرائب ══ -->
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>الضريبة</th>
              <th>النسبة</th>
              <th>التصنيف الضريبي</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in store.taxRates" :key="t.id">
              <td>
                <strong>{{ t.name }}</strong>
                <span v-if="t.isDefault" class="default-tag">الافتراضية</span>
              </td>
              <td>{{ formatNumber(t.rate) }}%</td>
              <td>{{ TAX_CATEGORY_LABELS[t.category] }}</td>
              <td><StatusBadge :active="t.isActive" /></td>
              <td><RowActions @edit="openEdit(t)" @remove="askDelete(t)" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ النموذج ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal__header">
              <h3>{{ editingId ? current.editLabel : current.addLabel }}</h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeModal"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="modal-form" @submit.prevent="handleSubmit">
              <div class="form-group">
                <label>الاسم *</label>
                <input
                  v-model.trim="form.name"
                  class="form-input"
                  required
                  maxlength="120"
                />
              </div>

              <template v-if="activeTab === 'categories'">
                <div class="form-group">
                  <label>التصنيف الأب</label>
                  <select v-model="form.parentId" class="form-select">
                    <option value="">بدون (تصنيف رئيسي)</option>
                    <option
                      v-for="c in parentOptions"
                      :key="c.id"
                      :value="c.id"
                    >
                      {{ c.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>لون الزر في شاشة الكاشير</label>
                  <div class="color-row">
                    <input v-model="form.color" type="color" class="color-input" />
                    <button
                      type="button"
                      class="btn btn--sm btn--ghost"
                      @click="form.color = ''"
                    >
                      بدون لون
                    </button>
                  </div>
                </div>
              </template>

              <template v-else-if="activeTab === 'units'">
                <div class="form-group">
                  <label>الاختصار</label>
                  <input
                    v-model.trim="form.symbol"
                    class="form-input"
                    maxlength="20"
                    placeholder="كجم"
                  />
                </div>
                <label class="toggle">
                  <input v-model="form.allowsFractions" type="checkbox" />
                  <span>تقبل الكسور (تُباع بالوزن أو الحجم)</span>
                </label>
              </template>

              <template v-else>
                <div class="form-group">
                  <label>النسبة % *</label>
                  <StbNumberInput
                    v-model.number="form.rate"
                    class="form-input"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>التصنيف الضريبي (هيئة الزكاة والضريبة)</label>
                  <select v-model="form.category" class="form-select">
                    <option
                      v-for="(label, key) in TAX_CATEGORY_LABELS"
                      :key="key"
                      :value="key"
                    >
                      {{ label }}
                    </option>
                  </select>
                </div>
                <label class="toggle">
                  <input v-model="form.isDefault" type="checkbox" />
                  <span>الضريبة الافتراضية للأصناف الجديدة</span>
                </label>
              </template>

              <label class="toggle">
                <input v-model="form.isActive" type="checkbox" />
                <span>نشط</span>
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
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      :title="current.deleteLabel"
      :message="`هل تريد حذف '${deleteTarget?.name}'؟`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from "vue";
import {
  ArrowRight,
  FolderTree,
  Pencil,
  Percent,
  Plus,
  Ruler,
  Trash2,
  X,
} from "lucide-vue-next";
import { useCatalogStore } from "@/stores/catalog";
import { useToast } from "@/composables/useToast";
import type {
  ProductCategory,
  TaxCategory,
  TaxRate,
  Unit,
} from "@/types/catalog";

definePageMeta({ middleware: "auth" });

type TabKey = "categories" | "units" | "taxes";
type Row = ProductCategory | Unit | TaxRate;

const TABS = [
  {
    key: "categories" as const,
    label: "التصنيفات",
    icon: FolderTree,
    addLabel: "إضافة تصنيف",
    editLabel: "تعديل تصنيف",
    deleteLabel: "حذف التصنيف",
    emptyTitle: "لا توجد تصنيفات بعد",
  },
  {
    key: "units" as const,
    label: "الوحدات",
    icon: Ruler,
    addLabel: "إضافة وحدة",
    editLabel: "تعديل وحدة",
    deleteLabel: "حذف الوحدة",
    emptyTitle: "لا توجد وحدات",
  },
  {
    key: "taxes" as const,
    label: "الضرائب",
    icon: Percent,
    addLabel: "إضافة ضريبة",
    editLabel: "تعديل ضريبة",
    deleteLabel: "حذف الضريبة",
    emptyTitle: "لا توجد ضرائب معرّفة",
  },
];

const TAX_CATEGORY_LABELS: Record<TaxCategory, string> = {
  S: "خاضع بالنسبة الأساسية",
  Z: "خاضع بنسبة صفر",
  E: "معفى",
  O: "خارج نطاق الضريبة",
};

// مكوّنان صغيران مشتركان بين الجداول الثلاثة
const StatusBadge = defineComponent({
  props: { active: { type: Boolean, required: true } },
  setup: (props) => () =>
    h(
      "span",
      { class: ["badge", props.active ? "badge--active" : "badge--inactive"] },
      props.active ? "نشط" : "موقوف",
    ),
});

const RowActions = defineComponent({
  emits: ["edit", "remove"],
  setup: (_, { emit }) => () =>
    h("div", { class: "row-actions" }, [
      h(
        "button",
        { class: "btn btn--sm btn--ghost", onClick: () => emit("edit") },
        [h(Pencil, { size: 14 }), " تعديل"],
      ),
      h(
        "button",
        {
          class: "btn btn--sm btn--danger btn--icon",
          title: "حذف",
          onClick: () => emit("remove"),
        },
        [h(Trash2, { size: 14 })],
      ),
    ]),
});

const store = useCatalogStore();
const toast = useToast();

const activeTab = ref<TabKey>("categories");
const current = computed(() => TABS.find((t) => t.key === activeTab.value)!);

const counts = computed<Record<TabKey, number>>(() => ({
  categories: store.categories.length,
  units: store.units.length,
  taxes: store.taxRates.length,
}));

const rows = computed<Row[]>(() =>
  activeTab.value === "categories"
    ? store.categories
    : activeTab.value === "units"
      ? store.units
      : store.taxRates,
);

// التصنيفات مرتبة كشجرة (الفرعي تحت أبيه مع إزاحة)
const categoryRows = computed(() => {
  const byParent = new Map<string, ProductCategory[]>();
  for (const c of store.categories) {
    const key = c.parentId ?? "";
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: (ProductCategory & { depth: number; parentName: string })[] = [];
  const walk = (parentId: string, depth: number, parentName: string) => {
    for (const c of byParent.get(parentId) ?? []) {
      out.push({ ...c, depth, parentName });
      walk(c.id, depth + 1, c.name);
    }
  };
  walk("", 0, "");
  return out;
});

// ─── النموذج ──────────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);

const emptyForm = () => ({
  name: "",
  isActive: true,
  // تصنيف
  parentId: "",
  color: "",
  // وحدة
  symbol: "",
  allowsFractions: false,
  // ضريبة
  rate: 15 as number | "",
  category: "S" as TaxCategory,
  isDefault: false,
});
const form = reactive(emptyForm());

/** لا يُسمح باختيار التصنيف نفسه أو أحد فروعه كأب (حلقة في الشجرة) */
const parentOptions = computed(() => {
  if (!editingId.value) return store.categories;
  const blocked = new Set<string>([editingId.value]);
  let added = true;
  while (added) {
    added = false;
    for (const c of store.categories) {
      if (c.parentId && blocked.has(c.parentId) && !blocked.has(c.id)) {
        blocked.add(c.id);
        added = true;
      }
    }
  }
  return store.categories.filter((c) => !blocked.has(c.id));
});

const openCreate = () => {
  Object.assign(form, emptyForm());
  editingId.value = null;
  showModal.value = true;
};

const openEdit = (row: Row) => {
  Object.assign(form, emptyForm(), row, {
    parentId: "parentId" in row ? (row.parentId ?? "") : "",
    color: "color" in row ? (row.color ?? "") : "",
    symbol: "symbol" in row ? (row.symbol ?? "") : "",
  });
  editingId.value = row.id;
  showModal.value = true;
};

const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const handleSubmit = async () => {
  submitting.value = true;
  const id = editingId.value;
  try {
    if (activeTab.value === "categories") {
      const payload = {
        name: form.name,
        parentId: form.parentId || null,
        color: form.color || undefined,
        isActive: form.isActive,
      };
      await (id
        ? store.categoryApi.update(id, payload)
        : store.categoryApi.create(payload));
    } else if (activeTab.value === "units") {
      const payload = {
        name: form.name,
        symbol: form.symbol || undefined,
        allowsFractions: form.allowsFractions,
        isActive: form.isActive,
      };
      await (id ? store.unitApi.update(id, payload) : store.unitApi.create(payload));
    } else {
      const payload = {
        name: form.name,
        rate: Number(form.rate) || 0,
        category: form.category,
        isDefault: form.isDefault,
        isActive: form.isActive,
      };
      await (id
        ? store.taxRateApi.update(id, payload)
        : store.taxRateApi.create(payload));
    }
    toast.success("تم الحفظ");
    showModal.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    submitting.value = false;
  }
};

// ─── الحذف ────────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Row | null>(null);

const askDelete = (row: Row) => {
  deleteTarget.value = row;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    const id = deleteTarget.value.id;
    if (activeTab.value === "categories") await store.categoryApi.remove(id);
    else if (activeTab.value === "units") await store.unitApi.remove(id);
    else await store.taxRateApi.remove(id);
    toast.success("تم الحذف");
    showConfirm.value = false;
  } catch (e) {
    // السيرفر يرفض حذف ما هو مستخدم في أصناف ويشرح السبب
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  try {
    await store.fetchSettings(true);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الإعدادات"));
  }
});
</script>

<style lang="scss" scoped>
.tabs {
  display: flex;
  gap: $space-2;
  margin-bottom: $space-4;
  border-bottom: 1px solid $stb-border;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3 $space-4;
  margin-bottom: -1px;
  font-family: $font-family;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $stb-text-secondary;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: $stb-text-primary;
  }
  &.is-active {
    color: $stb-accent;
    border-bottom-color: $stb-accent;
  }

  &__count {
    min-width: 22px;
    padding: 0 $space-2;
    font-size: $font-size-xs;
    line-height: 20px;
    text-align: center;
    color: $stb-text-secondary;
    background: $stb-surface-3;
    border-radius: $radius-full;
  }
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.cat-name {
  display: inline-flex;
  align-items: center;
}

.color-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  margin-inline-end: $space-2;
  border: 1px solid $stb-border-light;
  border-radius: 50%;
  vertical-align: middle;
}

.default-tag {
  margin-inline-start: $space-2;
  padding: 1px $space-2;
  font-size: 0.7rem;
  font-weight: 700;
  color: $stb-accent;
  background: rgba($stb-accent, 0.1);
  border-radius: $radius-full;
}

:deep(.row-actions) {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    accent-color: $stb-accent;
  }
}

.color-row {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.color-input {
  width: 56px;
  height: 38px;
  padding: 2px;
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  cursor: pointer;
}
</style>
