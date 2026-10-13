<!-- pages/dashboard/pos/promotions.vue — عروض الكاشير وأسعاره الخاصة -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>عروض الكاشير</h1>
        <p>
          أسعار خاصة وخصومات تطبّقها شاشة الكاشير تلقائياً — لفترة، لصنف أو
          تصنيف، أو لعميل بعينه
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_pos_promotions'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>إضافة عرض</span>
        </button>
      </div>
    </div>

    <div class="doc-note">
      <Info :size="16" />
      <span>
        العروض تصل أجهزة الكاشير عند أول اتصال لها (خلال دقائق إن كانت متصلة)
        وتعمل بعدها بلا إنترنت. يُطبَّق على السطر أفضل عرض واحد (لا تُجمع)، ولا
        تسري على فواتير لوحة التحكم.
      </span>
    </div>

    <div v-if="loading && !promotions.length" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!promotions.length" class="card">
      <div class="empty-state">
        <Tag :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا توجد عروض بعد</div>
        <div class="empty-state__text">
          أضف سعراً خاصاً لصنف، خصماً على تصنيف، أو عرض «اشترِ واحصل»
        </div>
      </div>
    </div>

    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>العرض</th>
              <th>النوع</th>
              <th>يسري على</th>
              <th>القيمة</th>
              <th>الفترة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in promotions" :key="p.id">
              <td><span class="doc-cell__main">{{ p.name }}</span></td>
              <td>{{ TYPE_LABELS[p.type] }}</td>
              <td>
                <div class="doc-cell">
                  <span>{{ targetLabel(p) }}</span>
                  <span v-if="p.customerId" class="doc-cell__sub">
                    للعميل: {{ names.customers[p.customerId] ?? "—" }}
                  </span>
                </div>
              </td>
              <td><span class="doc-num">{{ valueLabel(p) }}</span></td>
              <td>
                <div class="doc-cell">
                  <span class="doc-num">
                    {{ p.startsAt ? formatDateTime(p.startsAt) : "من الآن" }}
                  </span>
                  <span class="doc-cell__sub doc-num">
                    {{ p.endsAt ? formatDateTime(p.endsAt) : "بلا نهاية" }}
                  </span>
                </div>
              </td>
              <td>
                <span :class="['badge', stateOf(p).tone]">{{ stateOf(p).label }}</span>
              </td>
              <td>
                <div class="doc-actions">
                  <button
                    v-can="'manage_pos_promotions'"
                    class="btn btn--sm btn--ghost"
                    @click="openEdit(p)"
                  >
                    <Pencil :size="14" /> تعديل
                  </button>
                  <button
                    v-can="'manage_pos_promotions'"
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

    <!-- ══ نموذج العرض ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <Tag :size="20" class="doc-modal__icon" />
                {{ editing ? "تعديل عرض" : "إضافة عرض" }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="closeModal">
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="handleSubmit">
              <div class="doc-grid">
                <div class="form-group doc-grid__full">
                  <label>اسم العرض *</label>
                  <input
                    v-model.trim="form.name"
                    class="form-input"
                    required
                    maxlength="150"
                    placeholder="يظهر للكاشير على سطر الصنف"
                  />
                </div>
                <div class="form-group doc-grid__full">
                  <label>النوع *</label>
                  <select v-model="form.type" class="form-select">
                    <option v-for="(label, type) in TYPE_LABELS" :key="type" :value="type">
                      {{ label }}
                    </option>
                  </select>
                </div>

                <!-- الصنف -->
                <div class="form-group doc-grid__full">
                  <label>
                    الصنف {{ form.type === "percent_off" ? "(اختياري)" : "*" }}
                  </label>
                  <div v-if="form.productId" class="promo-picked">
                    <span>{{ names.products[form.productId] ?? "صنف" }}</span>
                    <button type="button" class="btn btn--sm btn--ghost" @click="clearProduct">
                      تغيير
                    </button>
                  </div>
                  <template v-else>
                    <input
                      v-model="productSearch"
                      class="form-input"
                      placeholder="ابحث باسم الصنف أو كوده..."
                      @input="searchProducts"
                    />
                    <div v-if="productResults.length" class="promo-results">
                      <button
                        v-for="product in productResults"
                        :key="product.id"
                        type="button"
                        @click="pickProduct(product)"
                      >
                        <span>{{ product.name }}</span>
                        <span class="doc-cell__sub">
                          {{ product.sku }} · {{ formatMoney(product.salePrice) }}
                        </span>
                      </button>
                    </div>
                  </template>
                </div>

                <div
                  v-if="form.type === 'percent_off' && !form.productId"
                  class="form-group doc-grid__full"
                >
                  <label>أو تصنيف كامل</label>
                  <select v-model="form.categoryId" class="form-select">
                    <option value="">كل الأصناف</option>
                    <option v-for="c in catalog.categories" :key="c.id" :value="c.id">
                      {{ c.name }}
                    </option>
                  </select>
                </div>

                <!-- القيمة -->
                <div v-if="form.type === 'special_price'" class="form-group doc-grid__full">
                  <label>السعر الخاص لوحدة الأساس ({{ currencyLabel() }}) *</label>
                  <StbNumberInput
                    v-model.number="form.price"
                    class="form-input"
                    min="0"
                    :step="moneyStep()"
                    required
                  />
                  <small class="doc-hint">
                    بنفس أساس سعر الصنف (شامل الضريبة أو قبلها، كما هو معرّف عليه).
                  </small>
                </div>
                <div v-if="form.type === 'percent_off'" class="form-group doc-grid__full">
                  <label>نسبة الخصم % *</label>
                  <StbNumberInput
                    v-model.number="form.percent"
                    class="form-input"
                    min="0.01"
                    max="100"
                    step="any"
                    required
                  />
                </div>
                <template v-if="form.type === 'buy_x_get_y'">
                  <div class="form-group">
                    <label>اشترِ (كمية) *</label>
                    <StbNumberInput
                      v-model.number="form.buyQuantity"
                      class="form-input"
                      min="1"
                      step="1"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label>واحصل مجاناً على *</label>
                    <StbNumberInput
                      v-model.number="form.getQuantity"
                      class="form-input"
                      min="1"
                      step="1"
                      required
                    />
                  </div>
                </template>

                <div class="form-group doc-grid__full">
                  <label>لعميل بعينه (اختياري)</label>
                  <select v-model="form.customerId" class="form-select">
                    <option value="">كل العملاء</option>
                    <option v-for="c in sales.customerOptions" :key="c.id" :value="c.id">
                      {{ c.name }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>يبدأ</label>
                  <input v-model="form.startsAt" type="datetime-local" class="form-input" />
                </div>
                <div class="form-group">
                  <label>ينتهي</label>
                  <input v-model="form.endsAt" type="datetime-local" class="form-input" />
                </div>
              </div>
              <small class="doc-hint">
                السعر الخاص و«اشترِ واحصل» يسريان على البيع بوحدة الأساس. بلا تاريخ
                = يسري دائماً.
              </small>

              <label class="checkbox-label">
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
                  {{ editing ? "حفظ التعديلات" : "إضافة العرض" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف العرض"
      :message="`هل تريد حذف العرض '${deleteTarget?.name}'؟ يتوقف على الأجهزة عند أول اتصال لها.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Info, Pencil, Plus, Tag, Trash2, X } from "lucide-vue-next";
import { useApi } from "@/composables/useApi";
import { useToast } from "@/composables/useToast";
import type { PosPromotionPayload, PosPromotionRecord } from "@/pos/types";
import { useCatalogStore } from "@/stores/catalog";
import { usePosAdminStore } from "@/stores/posAdmin";
import { useSalesStore } from "@/stores/sales";
import type { Paginated, Product } from "@/types/catalog";
import { fromZonedInput, toZonedInput } from "@/utils/timezone";
import { useAuthStore } from "@/stores/auth";

definePageMeta({ middleware: "auth" });

const store = usePosAdminStore();
const catalog = useCatalogStore();
const sales = useSalesStore();
const auth = useAuthStore();
const api = useApi();
const toast = useToast();

const TYPE_LABELS: Record<PosPromotionRecord["type"], string> = {
  special_price: "سعر خاص",
  percent_off: "خصم نسبة",
  buy_x_get_y: "اشترِ واحصل",
};

const promotions = ref<PosPromotionRecord[]>([]);
const loading = ref(false);
/** أسماء الأصناف والعملاء المشار إليهم في العروض (العرض يحمل المعرّف فقط) */
const names = reactive({
  products: {} as Record<string, string>,
  customers: {} as Record<string, string>,
});

const loadNames = async () => {
  for (const customer of sales.customerOptions) {
    names.customers[customer.id] = customer.name;
  }
  const missing = [
    ...new Set(
      promotions.value
        .map((p) => p.productId)
        .filter((id): id is string => !!id && !names.products[id]),
    ),
  ];
  await Promise.all(
    missing.map(async (id) => {
      try {
        names.products[id] = (await catalog.getProduct(id)).name;
      } catch {
        names.products[id] = "صنف محذوف";
      }
    }),
  );
};

const load = async () => {
  loading.value = true;
  try {
    promotions.value = await store.fetchPromotions();
    await loadNames();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل العروض"));
  } finally {
    loading.value = false;
  }
};

const targetLabel = (p: PosPromotionRecord) => {
  if (p.productId) return names.products[p.productId] ?? "صنف";
  if (p.categoryId) {
    return `تصنيف: ${catalog.categories.find((c) => c.id === p.categoryId)?.name ?? "—"}`;
  }
  return "كل الأصناف";
};

const valueLabel = (p: PosPromotionRecord) => {
  if (p.type === "special_price") return formatCurrency(p.price ?? 0);
  if (p.type === "percent_off") return `${p.percent}%`;
  return `${p.buyQuantity} + ${p.getQuantity} مجاناً`;
};

const stateOf = (p: PosPromotionRecord) => {
  const now = Date.now();
  if (!p.isActive) return { label: "موقوف", tone: "badge--inactive" };
  if (p.endsAt && Date.parse(p.endsAt) <= now) {
    return { label: "انتهى", tone: "doc-status--draft" };
  }
  if (p.startsAt && Date.parse(p.startsAt) > now) {
    return { label: "لم يبدأ", tone: "doc-status--progress" };
  }
  return { label: "سارٍ", tone: "badge--active" };
};

// ─── النموذج ──────────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<PosPromotionRecord | null>(null);

const emptyForm = () => ({
  name: "",
  type: "special_price" as PosPromotionRecord["type"],
  productId: "",
  categoryId: "",
  customerId: "",
  price: "" as number | "",
  percent: "" as number | "",
  buyQuantity: "" as number | "",
  getQuantity: "" as number | "",
  startsAt: "",
  endsAt: "",
  isActive: true,
});
const form = reactive(emptyForm());

const productSearch = ref("");
const productResults = ref<Product[]>([]);
let searchId = 0;

const searchProducts = async () => {
  const current = ++searchId;
  const term = productSearch.value.trim();
  if (term.length < 2) {
    productResults.value = [];
    return;
  }
  try {
    const res = await api.get<Paginated<Product>>(
      `/catalog/products${toQueryString({ search: term, isActive: "true", limit: 8 })}`,
    );
    if (current === searchId) productResults.value = res.data.data;
  } catch {
    if (current === searchId) productResults.value = [];
  }
};

const pickProduct = (product: Product) => {
  form.productId = product.id;
  form.categoryId = "";
  names.products[product.id] = product.name;
  productSearch.value = "";
  productResults.value = [];
};

const clearProduct = () => {
  form.productId = "";
};

const openCreate = () => {
  Object.assign(form, emptyForm());
  productSearch.value = "";
  productResults.value = [];
  editing.value = null;
  showModal.value = true;
};

const openEdit = (p: PosPromotionRecord) => {
  Object.assign(form, {
    name: p.name,
    type: p.type,
    productId: p.productId ?? "",
    categoryId: p.categoryId ?? "",
    customerId: p.customerId ?? "",
    price: p.price ?? "",
    percent: p.percent ?? "",
    buyQuantity: p.buyQuantity ?? "",
    getQuantity: p.getQuantity ?? "",
    // حقول الوقت بتوقيت الشركة لا المتصفح
    startsAt: p.startsAt ? toZonedInput(p.startsAt, auth.timezone) : "",
    endsAt: p.endsAt ? toZonedInput(p.endsAt, auth.timezone) : "",
    isActive: p.isActive,
  });
  productSearch.value = "";
  productResults.value = [];
  editing.value = p;
  showModal.value = true;
};

const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const numberOrNull = (value: number | "") => (value === "" ? null : Number(value));

const handleSubmit = async () => {
  if (form.type !== "percent_off" && !form.productId) {
    toast.warning("اختر الصنف");
    return;
  }
  submitting.value = true;
  try {
    const payload: PosPromotionPayload = {
      name: form.name,
      type: form.type,
      productId: form.productId || null,
      categoryId: form.categoryId || null,
      customerId: form.customerId || null,
      price: numberOrNull(form.price),
      percent: numberOrNull(form.percent),
      buyQuantity: numberOrNull(form.buyQuantity),
      getQuantity: numberOrNull(form.getQuantity),
      startsAt: form.startsAt ? fromZonedInput(form.startsAt, auth.timezone) : null,
      endsAt: form.endsAt ? fromZonedInput(form.endsAt, auth.timezone) : null,
      isActive: form.isActive,
    };
    if (editing.value) {
      await store.updatePromotion(editing.value.id, payload);
      toast.success("تم حفظ التعديلات");
    } else {
      await store.createPromotion(payload);
      toast.success("تمت إضافة العرض");
    }
    showModal.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ العرض"));
  } finally {
    submitting.value = false;
  }
};

// ─── الحذف ────────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<PosPromotionRecord | null>(null);

const askDelete = (p: PosPromotionRecord) => {
  deleteTarget.value = p;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removePromotion(deleteTarget.value.id);
    toast.success("تم حذف العرض");
    showConfirm.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف العرض"));
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  // قوائم النموذج: فشلها (بلا صلاحية الأصناف مثلاً) لا يمنع عرض العروض
  await Promise.allSettled([catalog.fetchSettings(), sales.fetchCustomerOptions()]);
  await load();
});
</script>

<style lang="scss" scoped>
.promo-picked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  padding: $space-2 $space-3;
  font-weight: 600;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
}

.promo-results {
  display: flex;
  flex-direction: column;
  max-height: 220px;
  margin-top: $space-1;
  overflow-y: auto;
  border: 1px solid $stb-border;
  border-radius: $radius-md;

  button {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: $space-2 $space-3;
    font: inherit;
    text-align: start;
    color: $stb-text-primary;
    background: transparent;
    border: 0;
    border-bottom: 1px solid $stb-border;
    cursor: pointer;

    &:hover {
      background: $stb-surface-3;
    }
    &:last-child {
      border-bottom: 0;
    }
  }
}
</style>
