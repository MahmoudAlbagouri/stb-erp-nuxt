<!-- pages/dashboard/products/index.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الأصناف</h1>
        <p>إدارة المنتجات والأسعار والباركود ووحدات البيع</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink
          v-can="'manage_catalog_settings'"
          to="/dashboard/products/settings"
          class="btn btn--ghost"
        >
          <SlidersHorizontal :size="16" />
          <span>التصنيفات والوحدات</span>
        </NuxtLink>
        <button
          v-can="'create_product'"
          v-quota="'max_products'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>إضافة صنف</span>
        </button>
      </div>
    </div>

    <!-- ══ الفلاتر ══ -->
    <div class="card filters">
      <div class="search-bar filters__search">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="filters.search"
          class="form-input"
          placeholder="بحث بالاسم أو الكود أو الباركود..."
          @input="onSearchInput"
        />
      </div>
      <select
        v-model="filters.categoryId"
        class="form-select"
        @change="reload(1)"
      >
        <option value="">كل التصنيفات</option>
        <option v-for="c in categoryOptions" :key="c.id" :value="c.id">
          {{ c.label }}
        </option>
      </select>
      <select v-model="filters.type" class="form-select" @change="reload(1)">
        <option value="">كل الأنواع</option>
        <option value="stocked">بضاعة مخزنية</option>
        <option value="service">خدمة</option>
      </select>
      <select
        v-model="filters.isActive"
        class="form-select"
        @change="reload(1)"
      >
        <option value="">كل الحالات</option>
        <option value="true">نشط</option>
        <option value="false">موقوف</option>
      </select>
    </div>

    <!-- ══ القائمة ══ -->
    <div v-if="store.loading && !store.products.length" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!store.products.length" class="card">
      <div class="empty-state">
        <Boxes :size="44" class="empty-state__icon" />
        <div class="empty-state__title">
          {{ hasFilters ? "لا توجد أصناف مطابقة" : "لا توجد أصناف بعد" }}
        </div>
        <div class="empty-state__text">
          {{
            hasFilters
              ? "جرّب تغيير كلمة البحث أو الفلاتر"
              : "أضف أول صنف لتبدأ البيع وإدارة المخزون"
          }}
        </div>
        <button
          v-if="!hasFilters"
          v-can="'create_product'"
          v-quota="'max_products'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> إضافة صنف
        </button>
      </div>
    </div>

    <template v-else>
      <div class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكود</th>
                <th>التصنيف</th>
                <th>سعر البيع</th>
                <th>الضريبة</th>
                <th>الباركود</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in store.products" :key="p.id">
                <td>
                  <div class="product-cell">
                    <span class="product-cell__name">{{ p.name }}</span>
                    <span class="product-cell__meta">
                      {{ p.type === "service" ? "خدمة" : p.baseUnit?.name }}
                      <template v-if="p.isWeighted"> · بالوزن</template>
                      <template v-if="p.openPrice"> · سعر مفتوح</template>
                    </span>
                  </div>
                </td>
                <td><code class="sku">{{ p.sku }}</code></td>
                <td>{{ p.category?.name || "—" }}</td>
                <td>
                  <strong class="price">{{ formatCurrency(p.salePrice) }}</strong>
                  <span class="price-note">
                    {{ p.priceIncludesTax ? "شامل الضريبة" : "قبل الضريبة" }}
                  </span>
                </td>
                <td>{{ formatNumber(p.taxRate?.rate ?? 0) }}%</td>
                <td>
                  <code v-if="p.barcodes?.length" class="sku">
                    {{ p.barcodes[0]?.barcode }}
                  </code>
                  <span v-if="(p.barcodes?.length ?? 0) > 1" class="more-count">
                    +{{ (p.barcodes?.length ?? 0) - 1 }}
                  </span>
                  <span v-if="!p.barcodes?.length">—</span>
                </td>
                <td>
                  <span
                    :class="[
                      'badge',
                      p.isActive ? 'badge--active' : 'badge--inactive',
                    ]"
                  >
                    {{ p.isActive ? "نشط" : "موقوف" }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button
                      v-can="'update_product'"
                      class="btn btn--sm btn--ghost"
                      @click="openEdit(p)"
                    >
                      <Pencil :size="14" /> تعديل
                    </button>
                    <button
                      v-can="'delete_product'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="askDelete(p)"
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

      <div class="list-footer">
        <span class="list-footer__count">
          {{ formatNumber(store.total) }} صنف
        </span>
        <div v-if="store.totalPages > 1" class="pager">
          <button
            class="btn btn--sm btn--ghost"
            :disabled="store.page <= 1"
            @click="reload(store.page - 1)"
          >
            <ChevronRight :size="14" /> السابق
          </button>
          <span class="pager__info">
            {{ store.page }} / {{ store.totalPages }}
          </span>
          <button
            class="btn btn--sm btn--ghost"
            :disabled="store.page >= store.totalPages"
            @click="reload(store.page + 1)"
          >
            التالي <ChevronLeft :size="14" />
          </button>
        </div>
      </div>
    </template>

    <!-- ══ نموذج الصنف ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal product-modal">
            <div class="modal__header">
              <h3>
                <Boxes :size="20" class="modal-icon" />
                {{ editingId ? "تعديل صنف" : "إضافة صنف جديد" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeModal"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="modal-form" @submit.prevent="handleSubmit">
              <!-- البيانات الأساسية -->
              <section class="form-section">
                <h4 class="form-section__title">البيانات الأساسية</h4>
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label>اسم الصنف *</label>
                    <input
                      v-model.trim="form.name"
                      class="form-input"
                      required
                      maxlength="200"
                      placeholder="مثال: مياه معدنية 330 مل"
                    />
                  </div>
                  <div class="form-group">
                    <label>الاسم بالإنجليزية</label>
                    <input
                      v-model.trim="form.nameEn"
                      class="form-input"
                      dir="ltr"
                      maxlength="200"
                    />
                  </div>
                  <div class="form-group">
                    <label>كود الصنف</label>
                    <input
                      v-model.trim="form.sku"
                      class="form-input"
                      dir="ltr"
                      pattern="[A-Za-z0-9._\-]{1,40}"
                      placeholder="يُولَّد تلقائياً إذا تُرك فارغاً"
                    />
                  </div>
                  <div class="form-group">
                    <label>النوع</label>
                    <select v-model="form.type" class="form-select">
                      <option value="stocked">بضاعة مخزنية</option>
                      <option value="service">خدمة (بدون مخزون)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>التصنيف</label>
                    <select v-model="form.categoryId" class="form-select">
                      <option value="">بدون تصنيف</option>
                      <option
                        v-for="c in categoryOptions"
                        :key="c.id"
                        :value="c.id"
                      >
                        {{ c.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </section>

              <!-- التسعير -->
              <section class="form-section">
                <h4 class="form-section__title">التسعير والضريبة</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>سعر البيع ({{ currencyLabel() }}) *</label>
                    <StbNumberInput
                      v-model.number="form.salePrice"
                      class="form-input"
                      min="0"
                      :step="moneyStep()"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label>الضريبة</label>
                    <select v-model="form.taxRateId" class="form-select">
                      <option
                        v-for="t in activeTaxRates"
                        :key="t.id"
                        :value="t.id"
                      >
                        {{ t.name }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>أقل سعر مسموح به</label>
                    <StbNumberInput
                      v-model.number="form.minSalePrice"
                      class="form-input"
                      min="0"
                      :step="moneyStep()"
                      placeholder="اختياري"
                    />
                  </div>
                  <div class="form-group price-preview">
                    <label>تفصيل السعر</label>
                    <div class="price-preview__box">
                      <span>قبل الضريبة: {{ formatCurrency(priceBreakdown.net) }}</span>
                      <span>الضريبة: {{ formatCurrency(priceBreakdown.tax) }}</span>
                      <strong>الإجمالي: {{ formatCurrency(priceBreakdown.gross) }}</strong>
                    </div>
                  </div>
                </div>
                <div class="toggles">
                  <label class="toggle">
                    <input v-model="form.priceIncludesTax" type="checkbox" />
                    <span>السعر شامل الضريبة</span>
                  </label>
                  <label class="toggle">
                    <input v-model="form.allowDiscount" type="checkbox" />
                    <span>يُسمح بالخصم</span>
                  </label>
                  <label class="toggle">
                    <input v-model="form.isWeighted" type="checkbox" />
                    <span>يُباع بالوزن</span>
                  </label>
                  <label
                    class="toggle"
                    title="خدمات أو أصناف بلا سعر ثابت: الكاشير يكتب السعر عند إضافتها، وسعر البيع أعلاه اقتراح فقط"
                  >
                    <input v-model="form.openPrice" type="checkbox" />
                    <span>سعر مفتوح (يُكتب عند البيع)</span>
                  </label>
                  <label class="toggle">
                    <input v-model="form.isActive" type="checkbox" />
                    <span>نشط</span>
                  </label>
                </div>
              </section>

              <!-- الوحدات -->
              <section class="form-section">
                <h4 class="form-section__title">وحدات البيع</h4>
                <div class="form-group">
                  <label>وحدة الأساس *</label>
                  <select
                    v-model="form.baseUnitId"
                    class="form-select"
                    required
                  >
                    <option value="" disabled>اختر الوحدة...</option>
                    <option v-for="u in activeUnits" :key="u.id" :value="u.id">
                      {{ u.name }}
                    </option>
                  </select>
                  <small class="form-hint">
                    بها يُحسب المخزون وسعر البيع الأساسي
                  </small>
                </div>

                <div
                  v-for="(unit, index) in form.units"
                  :key="`unit-${index}`"
                  class="repeat-row"
                >
                  <div class="form-group">
                    <label>الوحدة</label>
                    <select v-model="unit.unitId" class="form-select" required>
                      <option value="" disabled>اختر...</option>
                      <option
                        v-for="u in extraUnitOptions(unit.unitId)"
                        :key="u.id"
                        :value="u.id"
                      >
                        {{ u.name }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>تساوي ({{ baseUnitName }})</label>
                    <StbNumberInput
                      v-model.number="unit.factor"
                      class="form-input"
                      min="0.0001"
                      step="any"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label>سعرها</label>
                    <StbNumberInput
                      v-model.number="unit.salePrice"
                      class="form-input"
                      min="0"
                      :step="moneyStep()"
                      :placeholder="unitPricePlaceholder(unit.factor)"
                    />
                  </div>
                  <button
                    type="button"
                    class="btn btn--sm btn--danger btn--icon repeat-row__remove"
                    title="حذف الوحدة"
                    @click="removeUnit(index)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn--dashed btn--sm btn--full"
                  @click="addUnit"
                >
                  <Plus :size="14" /> إضافة وحدة (كرتون، علبة...)
                </button>
              </section>

              <!-- الباركود -->
              <section class="form-section">
                <h4 class="form-section__title">الباركود</h4>
                <div
                  v-for="(item, index) in form.barcodes"
                  :key="`barcode-${index}`"
                  class="repeat-row repeat-row--barcode"
                >
                  <div class="form-group">
                    <label>الباركود</label>
                    <input
                      v-model.trim="item.barcode"
                      class="form-input"
                      dir="ltr"
                      required
                      pattern="[A-Za-z0-9._\-]{3,64}"
                      placeholder="امسح أو اكتب الباركود"
                      @keydown.enter.prevent
                    />
                  </div>
                  <div class="form-group">
                    <label>يبيع</label>
                    <select v-model="item.unitId" class="form-select">
                      <option value="">{{ baseUnitName }}</option>
                      <option
                        v-for="u in selectedExtraUnits"
                        :key="u.id"
                        :value="u.id"
                      >
                        {{ u.name }}
                      </option>
                    </select>
                  </div>
                  <button
                    type="button"
                    class="btn btn--sm btn--danger btn--icon repeat-row__remove"
                    title="حذف الباركود"
                    @click="form.barcodes.splice(index, 1)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn--dashed btn--sm btn--full"
                  @click="form.barcodes.push({ barcode: '', unitId: '' })"
                >
                  <ScanBarcode :size="14" /> إضافة باركود
                </button>
              </section>

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
                  {{ editingId ? "حفظ التعديلات" : "إضافة الصنف" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف الصنف"
      :message="`هل تريد حذف الصنف '${deleteTarget?.name}'؟ سيبقى ظاهراً في الفواتير السابقة.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ScanBarcode,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-vue-next";
import { useCatalogStore } from "@/stores/catalog";
import { useAccessStore } from "@/stores/access";
import { useToast } from "@/composables/useToast";
import type {
  Product,
  ProductFilters,
  ProductPayload,
  ProductType,
} from "@/types/catalog";

definePageMeta({ middleware: "auth" });

const store = useCatalogStore();
const accessStore = useAccessStore();
const toast = useToast();

// ─── الفلاتر والقائمة ─────────────────────────────────────────────────────────
const filters = reactive<Required<Omit<ProductFilters, "page" | "limit">>>({
  search: "",
  categoryId: "",
  type: "",
  isActive: "",
});

const hasFilters = computed(
  () =>
    !!filters.search ||
    !!filters.categoryId ||
    !!filters.type ||
    !!filters.isActive,
);

const reload = async (page = store.page) => {
  try {
    await store.fetchProducts({ ...filters, page });
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الأصناف"));
  }
};

// البحث ينتظر توقف الكتابة (قارئ الباركود يكتب بسرعة ثم يتوقف)
let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => reload(1), 350);
};

// التصنيفات كقائمة مسطّحة مع إزاحة للفرعي ("أغذية ← مشروبات")
const categoryOptions = computed(() => {
  const byParent = new Map<string, typeof store.categories>();
  for (const c of store.categories) {
    const key = c.parentId ?? "";
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: { id: string; label: string }[] = [];
  const walk = (parentId: string, prefix: string) => {
    for (const c of byParent.get(parentId) ?? []) {
      out.push({ id: c.id, label: prefix + c.name });
      walk(c.id, `${prefix}${c.name} ← `);
    }
  };
  walk("", "");
  return out;
});

const activeUnits = computed(() => store.units.filter((u) => u.isActive));
const activeTaxRates = computed(() => store.taxRates.filter((t) => t.isActive));

// ─── النموذج ──────────────────────────────────────────────────────────────────
interface UnitRow {
  unitId: string;
  factor: number | "";
  salePrice: number | "";
}
interface BarcodeRow {
  barcode: string;
  unitId: string;
}

const showModal = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);

const emptyForm = () => ({
  name: "",
  nameEn: "",
  sku: "",
  type: "stocked" as ProductType,
  categoryId: "",
  baseUnitId: "",
  taxRateId: "",
  salePrice: 0 as number | "",
  minSalePrice: "" as number | "",
  priceIncludesTax: true,
  allowDiscount: true,
  isWeighted: false,
  openPrice: false,
  isActive: true,
  units: [] as UnitRow[],
  barcodes: [] as BarcodeRow[],
});

const form = reactive(emptyForm());

const baseUnitName = computed(
  () => store.units.find((u) => u.id === form.baseUnitId)?.name ?? "وحدة الأساس",
);

/** الوحدات المتاحة لصف إضافي: غير الأساس وغير المختارة في صفوف أخرى */
const extraUnitOptions = (currentId: string) =>
  activeUnits.value.filter(
    (u) =>
      u.id !== form.baseUnitId &&
      (u.id === currentId || !form.units.some((row) => row.unitId === u.id)),
  );

const selectedExtraUnits = computed(() =>
  store.units.filter((u) => form.units.some((row) => row.unitId === u.id)),
);

const unitPricePlaceholder = (factor: number | "") =>
  factor && form.salePrice !== ""
    ? `تلقائي: ${formatMoney(Number(form.salePrice) * Number(factor))}`
    : "تلقائي";

// تفصيل السعر حسب "شامل/قبل الضريبة" — نفس القاعدة التي سيستخدمها الكاشير
const priceBreakdown = computed(() => {
  const price = Number(form.salePrice) || 0;
  const rate =
    (store.taxRates.find((t) => t.id === form.taxRateId)?.rate ?? 0) / 100;
  const net = form.priceIncludesTax ? price / (1 + rate) : price;
  const gross = form.priceIncludesTax ? price : price * (1 + rate);
  return { net, tax: gross - net, gross };
});

const addUnit = () => form.units.push({ unitId: "", factor: "", salePrice: "" });

const removeUnit = (index: number) => {
  const [removed] = form.units.splice(index, 1);
  // باركود كان مرتبطاً بالوحدة المحذوفة يعود لوحدة الأساس
  if (removed?.unitId) {
    form.barcodes.forEach((b) => {
      if (b.unitId === removed.unitId) b.unitId = "";
    });
  }
};

const openCreate = () => {
  Object.assign(form, emptyForm());
  editingId.value = null;
  form.taxRateId =
    store.taxRates.find((t) => t.isDefault)?.id ?? store.taxRates[0]?.id ?? "";
  form.baseUnitId = activeUnits.value[0]?.id ?? "";
  showModal.value = true;
};

const openEdit = async (product: Product) => {
  try {
    // التفاصيل الكاملة (الوحدات الإضافية ليست ضمن القائمة)
    const full = await store.getProduct(product.id);
    Object.assign(form, emptyForm(), {
      name: full.name,
      nameEn: full.nameEn ?? "",
      sku: full.sku,
      type: full.type,
      categoryId: full.categoryId ?? "",
      baseUnitId: full.baseUnitId,
      taxRateId: full.taxRateId,
      salePrice: full.salePrice,
      minSalePrice: full.minSalePrice ?? "",
      priceIncludesTax: full.priceIncludesTax,
      allowDiscount: full.allowDiscount,
      isWeighted: full.isWeighted,
      openPrice: full.openPrice ?? false,
      isActive: full.isActive,
      units: (full.units ?? []).map((u) => ({
        unitId: u.unitId,
        factor: u.factor,
        salePrice: u.salePrice ?? "",
      })),
      barcodes: (full.barcodes ?? []).map((b) => ({
        barcode: b.barcode,
        unitId: b.unitId && b.unitId !== full.baseUnitId ? b.unitId : "",
      })),
    });
    editingId.value = full.id;
    showModal.value = true;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل بيانات الصنف"));
  }
};

const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const buildPayload = (): ProductPayload => ({
  name: form.name,
  nameEn: form.nameEn || undefined,
  sku: form.sku || undefined,
  type: form.type,
  categoryId: form.categoryId || null,
  baseUnitId: form.baseUnitId,
  taxRateId: form.taxRateId || undefined,
  salePrice: Number(form.salePrice) || 0,
  minSalePrice: form.minSalePrice === "" ? null : Number(form.minSalePrice),
  priceIncludesTax: form.priceIncludesTax,
  allowDiscount: form.allowDiscount,
  isWeighted: form.isWeighted,
  openPrice: form.openPrice,
  isActive: form.isActive,
  units: form.units.map((u) => ({
    unitId: u.unitId,
    factor: Number(u.factor),
    salePrice: u.salePrice === "" ? null : Number(u.salePrice),
  })),
  barcodes: form.barcodes.map((b) => ({
    barcode: b.barcode,
    unitId: b.unitId || null,
  })),
});

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await store.updateProduct(editingId.value, payload);
      toast.success("تم حفظ التعديلات");
    } else {
      await store.createProduct(payload);
      toast.success("تمت إضافة الصنف");
      accessStore.fetch(true); // تحديث عدّاد حد الخطة
    }
    showModal.value = false;
    await reload(editingId.value ? store.page : 1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الصنف"));
  } finally {
    submitting.value = false;
  }
};

// ─── الحذف ────────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Product | null>(null);

const askDelete = (product: Product) => {
  deleteTarget.value = product;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeProduct(deleteTarget.value.id);
    toast.success("تم حذف الصنف");
    showConfirm.value = false;
    accessStore.fetch(true);
    // لو حُذف آخر صنف في الصفحة نرجع للصفحة السابقة
    await reload(
      store.products.length === 1 ? Math.max(store.page - 1, 1) : store.page,
    );
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف الصنف"));
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  try {
    await Promise.all([store.fetchSettings(), reload(1)]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل بيانات الأصناف"));
  }
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/mixins" as *;

.filters {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(140px, 1fr));
  gap: $space-3;
  padding: $space-4;
  margin-bottom: $space-4;

  @include respond-to("lg") {
    grid-template-columns: 1fr 1fr;

    &__search {
      grid-column: 1 / -1;
    }
  }
  @include respond-to("sm") {
    grid-template-columns: 1fr;
  }
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.product-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__name {
    font-weight: 600;
    color: $stb-text-primary;
  }
  &__meta {
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
}

.sku {
  padding: 2px $space-2;
  font-size: $font-size-xs;
  color: $stb-accent;
  background: rgba($stb-accent, 0.08);
  border-radius: $radius-sm;
  direction: ltr;
  unicode-bidi: isolate;
}

.price {
  display: block;
  color: $stb-text-primary;
}
.price-note {
  font-size: 0.7rem;
  color: $stb-text-muted;
}

.more-count {
  margin-inline-start: $space-1;
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $space-3;
  margin-top: $space-4;

  &__count {
    font-size: $font-size-sm;
    color: $stb-text-secondary;
  }
}

.pager {
  display: flex;
  align-items: center;
  gap: $space-3;

  &__info {
    font-size: $font-size-sm;
    color: $stb-text-secondary;
    font-variant-numeric: tabular-nums;
  }
}

// ─── النموذج ─────────────────────────────────────────────────────────────────
.product-modal {
  max-width: 760px;
  padding: $space-6;
}

.modal-icon {
  color: $stb-accent;
  vertical-align: -3px;
  margin-inline-end: $space-2;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-4;
  background: rgba($stb-surface, 0.6);
  border: 1px solid $stb-border;
  border-radius: $radius-lg;

  &__title {
    font-size: $font-size-sm;
    font-weight: 700;
    color: $stb-accent;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-3 $space-4;
}

.full-width {
  grid-column: 1 / -1;
}

.form-hint {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.price-preview__box {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: $space-2 $space-3;
  font-size: $font-size-xs;
  color: $stb-text-secondary;
  background: $stb-surface-2;
  border: 1px dashed $stb-border-light;
  border-radius: $radius-md;

  strong {
    color: $stb-text-primary;
  }
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2 $space-5;
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

.repeat-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto;
  align-items: end;
  gap: $space-3;

  &--barcode {
    grid-template-columns: 2fr 1fr auto;
  }

  &__remove {
    margin-bottom: 2px;
  }

  @include respond-to("sm") {
    grid-template-columns: 1fr 1fr;
    padding-bottom: $space-3;
    border-bottom: 1px dashed $stb-border;

    > :first-child {
      grid-column: 1 / -1;
    }
    &__remove {
      justify-self: end;
    }
  }
}
</style>
