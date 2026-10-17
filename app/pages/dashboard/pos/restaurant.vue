<!-- pages/dashboard/pos/restaurant.vue — المطعم: طاولات الصالة وإعدادات المطبخ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الطاولات والمطبخ</h1>
        <p>
          طاولات الصالة تنزل لشاشات الكاشير (كل فرع طاولاته)، والطلب يُرسل للمطبخ
          ببون مطبوع ويظهر على شاشة المطبخ بحالته
        </p>
      </div>
      <div class="page-header__actions">
        <NuxtLink v-can="'use_kitchen_display'" to="/kitchen" class="btn btn--ghost">
          <ChefHat :size="16" /> <span>شاشة المطبخ</span>
        </NuxtLink>
        <button v-can="'manage_restaurant'" class="btn btn--ghost" @click="openBulk">
          <Rows3 :size="16" /> <span>طاولات متتالية</span>
        </button>
        <button v-can="'manage_restaurant'" class="btn btn--primary" @click="openCreate">
          <Plus :size="18" /> <span>إضافة طاولة</span>
        </button>
      </div>
    </div>

    <!-- ══ إعدادات المطبخ ══ -->
    <div class="card section">
      <div class="section__head">
        <h3><ChefHat :size="18" /> المطبخ</h3>
        <p>
          ما يُحضَّر في المطبخ يُرسل له من شاشة الكاشير (زر «المطبخ»)، بإضافاته
          وإلغاءاته. تصل الشاشات مع مزامنتها التالية.
        </p>
      </div>
      <div v-if="!settings" class="empty-state"><div class="spinner" /></div>
      <form v-else class="kitchen-settings" @submit.prevent="saveSettings">
        <label class="check">
          <input v-model="settings.printKitchenTicket" type="checkbox" />
          طباعة بون المطبخ مع كل إرسال
          <small>(بلا إنترنت يُطبع دائماً: شاشة المطبخ لن تراه حتى يعود)</small>
        </label>
        <label class="check">
          <input v-model="settings.sendOnPayment" type="checkbox" />
          ما لم يُرسل للمطبخ يُرسل تلقائياً عند الدفع
          <small>(السفري يُدفع ثم يُحضَّر: بلا ضغطة إضافية)</small>
        </label>

        <div class="form-group">
          <label>التصنيفات التي تُحضَّر في المطبخ</label>
          <p class="doc-hint">
            بلا اختيار: كل الأصناف. اختر تصنيفات الأكل وحدها فلا تصل المطبخ
            المشروبات المعلّبة أو المنتجات الجاهزة.
          </p>
          <p v-if="categoriesError" class="doc-hint">{{ categoriesError }}</p>
          <div class="kitchen-settings__categories">
            <label v-for="c in catalog.categories" :key="c.id" class="check">
              <input
                type="checkbox"
                :checked="settings.kitchenCategoryIds.includes(c.id)"
                @change="toggleCategory(c.id)"
              />
              {{ c.name }}
            </label>
          </div>
        </div>
        <div>
          <button
            v-can="'manage_restaurant'"
            type="submit"
            class="btn btn--primary"
            :class="{ 'btn--loading': savingSettings }"
            :disabled="savingSettings"
          >
            حفظ إعدادات المطبخ
          </button>
        </div>
      </form>
    </div>

    <!-- ══ الطاولات ══ -->
    <div v-if="loading && !tables.length" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!tables.length" class="card">
      <div class="empty-state">
        <Armchair :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا طاولات بعد</div>
        <div class="empty-state__text">
          أضف طاولات الصالة دفعة واحدة («طاولة 1» إلى «طاولة 20»)، أو واحدة واحدة
          بقسمها (صالة، تراس، عائلات)
        </div>
        <button v-can="'manage_restaurant'" class="btn btn--primary" @click="openBulk">
          <Rows3 :size="16" /> طاولات متتالية
        </button>
      </div>
    </div>

    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الطاولة</th>
              <th>القسم</th>
              <th>الكراسي</th>
              <th v-if="branches.hasMany">الفرع</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tables" :key="t.id">
              <td><strong>{{ t.name }}</strong></td>
              <td>{{ t.area || "—" }}</td>
              <td class="doc-num">{{ t.seats }}</td>
              <td v-if="branches.hasMany">{{ t.branchId ? branches.nameOf(t.branchId) : "كل الفروع" }}</td>
              <td>
                <span :class="['badge', t.isActive ? 'badge--active' : 'badge--inactive']">
                  {{ t.isActive ? "نشطة" : "موقوفة" }}
                </span>
              </td>
              <td>
                <div class="doc-actions">
                  <button
                    v-can="'manage_restaurant'"
                    class="btn btn--sm btn--ghost btn--icon"
                    title="تعديل"
                    @click="openEdit(t)"
                  >
                    <Pencil :size="14" />
                  </button>
                  <button
                    v-can="'manage_restaurant'"
                    class="btn btn--sm btn--danger btn--icon"
                    title="حذف"
                    @click="askDelete(t)"
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

    <!-- ══ طاولة واحدة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <Armchair :size="20" class="doc-modal__icon" />
                {{ editing ? "تعديل طاولة" : "طاولة جديدة" }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="showForm = false">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="saveTable">
              <div class="doc-grid">
                <div class="form-group">
                  <label>الاسم *</label>
                  <input v-model.trim="form.name" class="form-input" maxlength="60" required />
                </div>
                <div class="form-group">
                  <label>القسم</label>
                  <input
                    v-model.trim="form.area"
                    class="form-input"
                    maxlength="60"
                    list="table-areas"
                    placeholder="صالة، تراس، عائلات…"
                  />
                </div>
                <div class="form-group">
                  <label>الكراسي</label>
                  <StbNumberInput v-model.number="form.seats" class="form-input" min="1" max="100" />
                </div>
                <div v-if="branches.hasMany" class="form-group">
                  <label>الفرع</label>
                  <select v-model="form.branchId" class="form-select">
                    <option value="">كل الفروع</option>
                    <option v-for="b in branches.activeOptions" :key="b.id" :value="b.id">
                      {{ b.name }}
                    </option>
                  </select>
                </div>
                <label v-if="editing" class="check">
                  <input v-model="form.isActive" type="checkbox" /> نشطة (تظهر على شاشة الكاشير)
                </label>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showForm = false">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': saving }"
                  :disabled="saving"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ طاولات متتالية ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showBulk" class="modal-overlay" @click.self="showBulk = false">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3><Rows3 :size="20" class="doc-modal__icon" /> طاولات متتالية</h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="showBulk = false">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="saveBulk">
              <div class="doc-grid">
                <div class="form-group">
                  <label>قبل الرقم</label>
                  <input v-model.trim="bulk.prefix" class="form-input" maxlength="40" />
                </div>
                <div class="form-group">
                  <label>القسم</label>
                  <input
                    v-model.trim="bulk.area"
                    class="form-input"
                    maxlength="60"
                    list="table-areas"
                    placeholder="صالة"
                  />
                </div>
                <div class="form-group">
                  <label>من *</label>
                  <StbNumberInput v-model.number="bulk.from" class="form-input" min="1" max="9999" required />
                </div>
                <div class="form-group">
                  <label>إلى *</label>
                  <StbNumberInput v-model.number="bulk.to" class="form-input" min="1" max="9999" required />
                </div>
                <div class="form-group">
                  <label>الكراسي</label>
                  <StbNumberInput v-model.number="bulk.seats" class="form-input" min="1" max="100" />
                </div>
                <div v-if="branches.hasMany" class="form-group">
                  <label>الفرع</label>
                  <select v-model="bulk.branchId" class="form-select">
                    <option value="">كل الفروع</option>
                    <option v-for="b in branches.activeOptions" :key="b.id" :value="b.id">
                      {{ b.name }}
                    </option>
                  </select>
                </div>
              </div>
              <p class="doc-hint">
                مثال: «{{ bulk.prefix || "طاولة" }} {{ bulk.from || 1 }}» إلى «{{ bulk.prefix || "طاولة" }}
                {{ bulk.to || 1 }}». الموجود باسمه يُتخطّى.
              </p>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showBulk = false">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': saving }"
                  :disabled="saving"
                >
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <datalist id="table-areas">
      <option v-for="a in areas" :key="a" :value="a" />
    </datalist>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف طاولة"
      :message="`حذف '${deleteTarget?.name}'؟ طلب مفتوح عليها في شاشة كاشير يبقى حتى يُدفع، وبونات المطبخ القديمة تبقى باسمها.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Armchair, ChefHat, Pencil, Plus, Rows3, Trash2, X } from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import type { DiningTableRecord, RestaurantSettingsRecord } from "@/pos/types";
import { useBranchesStore } from "@/stores/branches";
import { useCatalogStore } from "@/stores/catalog";
import { usePosAdminStore } from "@/stores/posAdmin";

definePageMeta({ middleware: "auth" });

const store = usePosAdminStore();
const branches = useBranchesStore();
const catalog = useCatalogStore();
const toast = useToast();

const tables = ref<DiningTableRecord[]>([]);
const loading = ref(false);
const settings = ref<RestaurantSettingsRecord | null>(null);
const savingSettings = ref(false);
const categoriesError = ref("");

const areas = computed(() => [
  ...new Set(tables.value.map((t) => t.area).filter((a): a is string => !!a)),
]);

const load = async () => {
  loading.value = true;
  try {
    tables.value = await store.fetchTables();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الطاولات"));
  } finally {
    loading.value = false;
  }
};

// ─── إعدادات المطبخ ───
const toggleCategory = (id: string) => {
  if (!settings.value) return;
  const ids = settings.value.kitchenCategoryIds;
  settings.value.kitchenCategoryIds = ids.includes(id)
    ? ids.filter((x) => x !== id)
    : [...ids, id];
};

const saveSettings = async () => {
  if (!settings.value) return;
  savingSettings.value = true;
  try {
    settings.value = await store.updateRestaurantSettings({
      kitchenCategoryIds: settings.value.kitchenCategoryIds,
      printKitchenTicket: settings.value.printKitchenTicket,
      sendOnPayment: settings.value.sendOnPayment,
    });
    toast.success("حُفظت إعدادات المطبخ — تصل شاشات الكاشير مع مزامنتها التالية");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الإعدادات"));
  } finally {
    savingSettings.value = false;
  }
};

// ─── طاولة واحدة ───
const showForm = ref(false);
const saving = ref(false);
const editing = ref<DiningTableRecord | null>(null);
const form = reactive({
  name: "",
  area: "",
  seats: 4 as number | "",
  branchId: "",
  isActive: true,
});

const openCreate = () => {
  editing.value = null;
  Object.assign(form, { name: "", area: areas.value[0] ?? "", seats: 4, branchId: "", isActive: true });
  showForm.value = true;
};

const openEdit = (table: DiningTableRecord) => {
  editing.value = table;
  Object.assign(form, {
    name: table.name,
    area: table.area ?? "",
    seats: table.seats,
    branchId: table.branchId ?? "",
    isActive: table.isActive,
  });
  showForm.value = true;
};

const saveTable = async () => {
  saving.value = true;
  const payload = {
    name: form.name,
    area: form.area || null,
    seats: Number(form.seats) || 4,
    branchId: form.branchId || null,
  };
  try {
    if (editing.value) {
      await store.updateTable(editing.value.id, { ...payload, isActive: form.isActive });
      toast.success("حُفظت الطاولة");
    } else {
      await store.createTable(payload);
      toast.success(`أُضيفت "${payload.name}"`);
    }
    showForm.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الطاولة"));
  } finally {
    saving.value = false;
  }
};

// ─── طاولات متتالية ───
const showBulk = ref(false);
const bulk = reactive({
  prefix: "طاولة",
  area: "",
  from: 1 as number | "",
  to: 10 as number | "",
  seats: 4 as number | "",
  branchId: "",
});

const openBulk = () => {
  const last = tables.value.length;
  Object.assign(bulk, { from: last + 1, to: last + 10, area: areas.value[0] ?? "" });
  showBulk.value = true;
};

const saveBulk = async () => {
  saving.value = true;
  try {
    const result = await store.createTables({
      prefix: bulk.prefix,
      area: bulk.area || null,
      from: Number(bulk.from),
      to: Number(bulk.to),
      seats: Number(bulk.seats) || 4,
      branchId: bulk.branchId || null,
    });
    toast.success(
      result.skipped
        ? `أُضيفت ${result.created} طاولة (وتُخطّيت ${result.skipped} موجودة)`
        : `أُضيفت ${result.created} طاولة`,
    );
    showBulk.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إضافة الطاولات"));
  } finally {
    saving.value = false;
  }
};

// ─── الحذف ───
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<DiningTableRecord | null>(null);

const askDelete = (table: DiningTableRecord) => {
  deleteTarget.value = table;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeTable(deleteTarget.value.id);
    toast.success("حُذفت الطاولة");
    showConfirm.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف الطاولة"));
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  branches.fetchOptions().catch(() => {});
  catalog.fetchSettings().catch(() => {
    categoriesError.value = "تعذر تحميل التصنيفات (صلاحية الأصناف)";
  });
  void load();
  try {
    settings.value = await store.fetchRestaurantSettings();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل إعدادات المطبخ"));
  }
});
</script>

<style lang="scss" scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  margin-bottom: $space-4;
  padding: $space-5;

  &__head {
    h3 {
      display: flex;
      align-items: center;
      gap: $space-2;
      margin: 0 0 $space-1;
    }
    p {
      margin: 0;
      font-size: $font-size-sm;
      color: $stb-text-secondary;
    }
  }
}
.kitchen-settings {
  display: flex;
  flex-direction: column;
  gap: $space-3;

  small {
    color: $stb-text-muted;
  }
  &__categories {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2 $space-5;
  }
}
.check {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}
</style>
