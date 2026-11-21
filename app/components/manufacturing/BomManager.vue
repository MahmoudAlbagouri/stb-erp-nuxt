<!--
  BomManager — قوائم المكوّنات (المصنع) أو الوصفات (المطعم) بنفس الشاشة:
  القائمة، المحرر (مكوّنات + خطوات تصنيع + منتجات ثانوية للمصنع)، والتكلفة
  المقدّرة الآن (ونسبة تكلفة الطبق من سعره للوصفات).
-->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>{{ isRecipe ? "الوصفات" : "قوائم المكوّنات" }}</h1>
        <p>
          {{
            isRecipe
              ? "مكوّنات كل طبق: تُخصم من المخزون مع كل بيع، ومنها تكلفة الطبق ونسبتها من سعره"
              : "ما يلزم لإنتاج كل منتج: الخامات بنسبة هالكها، خطوات التصنيع ووقتها، والمنتجات الثانوية"
          }}
        </p>
      </div>
      <div class="page-header__actions">
        <button v-can="'manage_boms'" class="btn btn--primary" @click="openCreate">
          <Plus :size="18" />
          <span>{{ isRecipe ? "وصفة جديدة" : "قائمة جديدة" }}</span>
        </button>
      </div>
    </div>

    <div class="card doc-filters">
      <div class="search-bar">
        <Search :size="16" class="search-bar__icon" />
        <input
          v-model="search"
          class="form-input"
          placeholder="بحث باسم المنتج أو كوده..."
          @input="onSearch"
        />
      </div>
    </div>

    <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <ListTree :size="44" class="empty-state__icon" />
        <div class="empty-state__title">
          {{ isRecipe ? "لا وصفات بعد" : "لا قوائم مكوّنات بعد" }}
        </div>
        <div class="empty-state__text">
          {{
            isRecipe
              ? "اجعل نوع الطبق \"صنفاً مركّباً\" من الأصناف، ثم اكتب وصفته هنا"
              : "المنتج المصنّع صنف مخزني؛ اكتب خاماته وخطواته هنا ثم أنشئ له أمر إنتاج"
          }}
        </div>
      </div>
    </div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ isRecipe ? "الطبق" : "المنتج" }}</th>
              <th>القائمة</th>
              <th>الدفعة</th>
              <th>المكوّنات</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in list.rows.value" :key="b.id">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ b.product?.name }}</span>
                  <span class="doc-cell__sub">{{ b.product?.sku }}</span>
                </div>
              </td>
              <td>
                <div class="doc-cell">
                  <span>{{ b.name }}</span>
                  <span class="doc-cell__sub">
                    {{ b.code }} · إصدار {{ b.version }}
                    <template v-if="b.isDefault"> · الافتراضية</template>
                  </span>
                </div>
              </td>
              <td class="doc-num">
                {{ formatNumber(b.outputQuantity) }} {{ b.product?.baseUnit?.name }}
              </td>
              <td class="doc-num">{{ b.linesCount ?? "—" }}</td>
              <td>
                <span :class="['badge', b.isActive ? 'badge--active' : 'badge--inactive']">
                  {{ b.isActive ? "فعّالة" : "موقوفة" }}
                </span>
              </td>
              <td>
                <div class="doc-actions">
                  <button class="btn btn--sm btn--ghost" @click="showCost(b)">
                    <Calculator :size="14" /> التكلفة
                  </button>
                  <button v-can="'manage_boms'" class="btn btn--sm btn--ghost" @click="openEdit(b)">
                    <Pencil :size="14" /> تعديل
                  </button>
                  <button
                    v-can="'manage_boms'"
                    class="btn btn--sm btn--ghost"
                    title="نسخة جديدة للتجربة"
                    @click="duplicate(b)"
                  >
                    <Copy :size="14" />
                  </button>
                  <button
                    v-can="'manage_boms'"
                    class="btn btn--sm btn--danger btn--icon"
                    title="حذف"
                    @click="askDelete(b)"
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
      v-if="list.ready.value"
      :total="list.total.value"
      :page="list.page.value"
      :total-pages="list.totalPages.value"
      :label="isRecipe ? 'وصفة' : 'قائمة'"
      @change="list.load"
    />

    <!-- ══ المحرر ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal doc-modal doc-modal--lg">
            <div class="modal__header">
              <h3>
                <ListTree :size="20" class="doc-modal__icon" />
                {{ editingId ? "تعديل" : "إنشاء" }} {{ isRecipe ? "وصفة" : "قائمة مكوّنات" }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="closeForm">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="submit">
              <div class="doc-grid">
                <div class="form-group doc-grid__full">
                  <label>{{ isRecipe ? "الطبق (صنف مركّب)" : "المنتج المصنّع (صنف مخزني)" }} *</label>
                  <div v-if="form.product" class="picked">
                    <span>{{ form.product.name }} <small>{{ form.product.sku }}</small></span>
                    <button
                      v-if="!editingId"
                      type="button"
                      class="btn btn--sm btn--ghost"
                      @click="form.product = null"
                    >
                      تغيير
                    </button>
                  </div>
                  <CatalogProductPicker
                    v-else
                    :types="[isRecipe ? 'composite' : 'stocked']"
                    :placeholder="isRecipe ? 'ابحث عن الطبق...' : 'ابحث عن المنتج...'"
                    @pick="(p: Product) => (form.product = p)"
                  />
                </div>
                <div class="form-group">
                  <label>اسم القائمة</label>
                  <input v-model.trim="form.name" class="form-input" maxlength="150" placeholder="فارغ = اسم المنتج" />
                </div>
                <div class="form-group">
                  <label>كمية الدفعة *</label>
                  <StbNumberInput v-model.number="form.outputQuantity" class="form-input" min="0.0001" step="any" required />
                  <small class="doc-hint">الكميات بالأسفل لإنتاج هذه الكمية</small>
                </div>
                <div v-if="!isRecipe" class="form-group">
                  <label>نسبة الناتج المتوقعة %</label>
                  <StbNumberInput v-model.number="form.expectedYieldPercent" class="form-input" min="1" max="100" step="any" />
                </div>
                <div v-else class="form-group">
                  <label>وقت التحضير (دقيقة)</label>
                  <StbNumberInput v-model.number="form.prepMinutes" class="form-input" min="0" placeholder="اختياري" />
                </div>
                <div class="form-group doc-grid__full">
                  <label>ملاحظات / طريقة التحضير</label>
                  <textarea v-model="form.note" class="form-input" rows="2" maxlength="4000" />
                </div>
              </div>
              <div class="toggles">
                <label class="checkbox-label">
                  <input v-model="form.isDefault" type="checkbox" />
                  <span>القائمة الافتراضية للمنتج</span>
                </label>
                <label class="checkbox-label">
                  <input v-model="form.isActive" type="checkbox" />
                  <span>فعّالة</span>
                </label>
              </div>

              <section class="doc-section">
                <h4 class="doc-section__title">المكوّنات</h4>
                <CatalogProductPicker
                  :types="isRecipe ? ['stocked', 'composite'] : ['stocked']"
                  :exclude="form.lines.map((l) => l.componentId)"
                  placeholder="ابحث عن مكوّن لإضافته..."
                  @pick="addLine"
                />
                <div class="doc-lines" :style="{ '--doc-cols': isRecipe ? '2fr 1fr 1fr auto' : '2fr 1fr 1fr 1fr auto' }">
                  <div class="doc-lines__head">
                    <span>المكوّن</span>
                    <span>الكمية</span>
                    <span>هالك %</span>
                    <span v-if="!isRecipe">في الخطوة</span>
                    <span />
                  </div>
                  <div v-if="!form.lines.length" class="doc-lines__empty">لم تُضف مكوّنات بعد</div>
                  <div v-for="(line, index) in form.lines" :key="line.componentId" class="doc-lines__row">
                    <div class="doc-cell">
                      <span class="doc-cell__main">{{ line.name }}</span>
                      <span class="doc-cell__sub">{{ line.unit }}</span>
                    </div>
                    <div>
                      <span class="doc-lines__label">الكمية</span>
                      <StbNumberInput v-model.number="line.quantity" class="form-input" min="0.0001" step="any" required />
                    </div>
                    <div>
                      <span class="doc-lines__label">هالك %</span>
                      <StbNumberInput v-model.number="line.scrapPercent" class="form-input" min="0" step="any" placeholder="0" />
                    </div>
                    <div v-if="!isRecipe">
                      <span class="doc-lines__label">في الخطوة</span>
                      <select v-model="line.operationSequence" class="form-select">
                        <option :value="null">—</option>
                        <option v-for="op in form.operations" :key="op.sequence" :value="op.sequence">
                          {{ op.sequence }} · {{ op.name }}
                        </option>
                      </select>
                    </div>
                    <button type="button" class="btn btn--sm btn--danger btn--icon" @click="form.lines.splice(index, 1)">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>
              </section>

              <template v-if="!isRecipe">
                <section class="doc-section">
                  <div class="section-head">
                    <h4 class="doc-section__title">خطوات التصنيع</h4>
                    <button type="button" class="btn btn--sm btn--ghost" @click="addOperation">
                      <Plus :size="14" /> خطوة
                    </button>
                  </div>
                  <div class="doc-lines" style="--doc-cols: 0.6fr 1.6fr 1.4fr 0.9fr 0.9fr auto">
                    <div class="doc-lines__head">
                      <span>#</span><span>الخطوة</span><span>مركز العمل</span>
                      <span>تجهيز (د)</span><span>تشغيل للدفعة (د)</span><span />
                    </div>
                    <div v-if="!form.operations.length" class="doc-lines__empty">
                      بلا خطوات: التكلفة خامات فقط
                    </div>
                    <div v-for="(op, index) in form.operations" :key="index" class="doc-lines__row">
                      <StbNumberInput v-model.number="op.sequence" class="form-input" min="0" required />
                      <input v-model.trim="op.name" class="form-input" required maxlength="150" placeholder="خلط، خَبز، تعبئة..." />
                      <select v-model="op.workCenterId" class="form-select" required>
                        <option value="" disabled>اختر...</option>
                        <option v-for="c in activeCenters" :key="c.id" :value="c.id">{{ c.name }}</option>
                      </select>
                      <StbNumberInput v-model.number="op.setupMinutes" class="form-input" min="0" step="any" />
                      <StbNumberInput v-model.number="op.runMinutes" class="form-input" min="0" step="any" />
                      <button type="button" class="btn btn--sm btn--danger btn--icon" @click="form.operations.splice(index, 1)">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </div>
                </section>

                <section class="doc-section">
                  <h4 class="doc-section__title">منتجات ثانوية (اختياري)</h4>
                  <CatalogProductPicker
                    :types="['stocked']"
                    :exclude="form.byproducts.map((b) => b.productId)"
                    placeholder="منتج ثانوي يخرج مع الإنتاج..."
                    @pick="(p: Product) => form.byproducts.push({ productId: p.id, name: p.name, quantity: 1 })"
                  />
                  <div v-for="(b, index) in form.byproducts" :key="b.productId" class="byproduct-row">
                    <span>{{ b.name }}</span>
                    <StbNumberInput v-model.number="b.quantity" class="form-input" min="0.0001" step="any" />
                    <button type="button" class="btn btn--sm btn--danger btn--icon" @click="form.byproducts.splice(index, 1)">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </section>
              </template>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeForm">إلغاء</button>
                <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': submitting }" :disabled="submitting">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ التكلفة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="cost" class="modal-overlay" @click.self="cost = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3><Calculator :size="20" class="doc-modal__icon" /> التكلفة المقدّرة الآن</h3>
              <button class="btn btn--icon btn--ghost" @click="cost = null"><X :size="20" /></button>
            </div>
            <div class="doc-form">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr><th>المكوّن</th><th>الكمية</th><th>تكلفة الوحدة</th><th>التكلفة</th><th>النصيب</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="m in cost.materials" :key="m.componentId">
                      <td>{{ m.name }} <small v-if="m.isComposite">(وصفة فرعية)</small></td>
                      <td class="doc-num">{{ formatNumber(m.quantity) }} {{ m.unit }}</td>
                      <td class="doc-money">{{ formatCurrency(m.unitCost) }}</td>
                      <td class="doc-money">{{ formatCurrency(m.cost) }}</td>
                      <td class="doc-num">{{ formatNumber(m.share) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="doc-totals doc-totals--box">
                <div><span>الخامات</span><span class="doc-money">{{ formatCurrency(cost.materialCost) }}</span></div>
                <div v-if="cost.laborCost"><span>العمالة والتشغيل</span><span class="doc-money">{{ formatCurrency(cost.laborCost) }}</span></div>
                <div v-if="cost.overheadCost"><span>غير مباشرة</span><span class="doc-money">{{ formatCurrency(cost.overheadCost) }}</span></div>
                <div v-if="cost.byproductCredit"><span>المنتجات الثانوية</span><span class="doc-money">-{{ formatCurrency(cost.byproductCredit) }}</span></div>
                <div><span>للدفعة ({{ formatNumber(cost.outputQuantity) }})</span><span class="doc-money">{{ formatCurrency(cost.totalCost) }}</span></div>
                <div class="is-grand"><span>تكلفة الوحدة</span><span class="doc-money">{{ formatCurrency(cost.unitCost) }}</span></div>
                <template v-if="cost.netSalePrice !== null">
                  <div><span>سعر البيع قبل الضريبة</span><span class="doc-money">{{ formatCurrency(cost.netSalePrice) }}</span></div>
                  <div>
                    <span>نسبة التكلفة (Food cost)</span>
                    <span class="doc-num" :class="(cost.costPercent ?? 0) > 35 ? 'doc-num--out' : 'doc-num--in'">
                      {{ formatNumber(cost.costPercent ?? 0) }}%
                    </span>
                  </div>
                  <div><span>الهامش للوحدة</span><span class="doc-money">{{ formatCurrency(cost.margin ?? 0) }}</span></div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف القائمة"
      :message="`حذف '${deleteTarget?.name}'؟ القائمة عليها أوامر إنتاج لا تُحذف (أوقفها).`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Calculator, Copy, ListTree, Pencil, Plus, Search, Trash2, X } from "lucide-vue-next";
import { useManufacturingStore } from "@/stores/manufacturing";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { useAccess } from "@/composables/useAccess";
import type { Product } from "@/types/catalog";
import type { Bom, BomCost, BomKind } from "@/types/manufacturing";

const props = defineProps<{ kind: BomKind }>();
const isRecipe = computed(() => props.kind === "recipe");

const store = useManufacturingStore();
const toast = useToast();
const { hasFeature } = useAccess();
const search = ref("");
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const list = usePagedList(
  (page) => store.fetchBoms({ kind: props.kind, search: search.value || undefined, page }),
  "تعذر تحميل القوائم",
);
const onSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => list.load(1), 300);
};

const activeCenters = computed(() => store.workCenters.filter((c) => c.isActive));

interface LineRow {
  componentId: string;
  name: string;
  unit: string;
  quantity: number | "";
  scrapPercent: number | "";
  operationSequence: number | null;
}
const emptyForm = () => ({
  product: null as Pick<Product, "id" | "name" | "sku"> | null,
  name: "",
  outputQuantity: 1 as number | "",
  expectedYieldPercent: 100 as number | "",
  prepMinutes: "" as number | "",
  note: "",
  isDefault: true,
  isActive: true,
  lines: [] as LineRow[],
  operations: [] as {
    sequence: number | "";
    name: string;
    workCenterId: string;
    setupMinutes: number | "";
    runMinutes: number | "";
  }[],
  byproducts: [] as { productId: string; name: string; quantity: number | "" }[],
});
const form = reactive(emptyForm());
const showForm = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);

const openCreate = () => {
  Object.assign(form, emptyForm());
  editingId.value = null;
  showForm.value = true;
};

const openEdit = async (row: Bom) => {
  try {
    const bom = await store.getBom(row.id);
    Object.assign(form, emptyForm(), {
      product: bom.product ?? null,
      name: bom.name,
      outputQuantity: bom.outputQuantity,
      expectedYieldPercent: bom.expectedYieldPercent,
      prepMinutes: bom.prepMinutes ?? "",
      note: bom.note ?? "",
      isDefault: bom.isDefault,
      isActive: bom.isActive,
      lines: (bom.lines ?? []).map((l) => ({
        componentId: l.componentId,
        name: l.component?.name ?? "",
        unit: l.component?.baseUnit?.name ?? "",
        quantity: l.quantity,
        scrapPercent: l.scrapPercent || "",
        operationSequence: l.operationSequence ?? null,
      })),
      operations: (bom.operations ?? []).map((o) => ({
        sequence: o.sequence,
        name: o.name,
        workCenterId: o.workCenterId,
        setupMinutes: o.setupMinutes,
        runMinutes: o.runMinutes,
      })),
      byproducts: (bom.byproducts ?? []).map((b) => ({
        productId: b.productId,
        name: b.product?.name ?? "",
        quantity: b.quantity,
      })),
    });
    editingId.value = bom.id;
    showForm.value = true;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل القائمة"));
  }
};

const closeForm = () => {
  if (!submitting.value) showForm.value = false;
};

const addLine = (product: Product) =>
  form.lines.push({
    componentId: product.id,
    name: product.name,
    unit: product.baseUnit?.name ?? "",
    quantity: "",
    scrapPercent: "",
    operationSequence: null,
  });

const addOperation = () => {
  const last = form.operations.reduce((max, o) => Math.max(max, Number(o.sequence) || 0), 0);
  form.operations.push({
    sequence: last + 10,
    name: "",
    workCenterId: activeCenters.value[0]?.id ?? "",
    setupMinutes: 0,
    runMinutes: 0,
  });
};

const submit = async () => {
  if (!form.product) return toast.error("اختر المنتج");
  if (!form.lines.length) return toast.error("أضف مكوّناً واحداً على الأقل");
  submitting.value = true;
  try {
    const payload = {
      kind: props.kind,
      productId: form.product.id,
      name: form.name || undefined,
      isDefault: form.isDefault,
      isActive: form.isActive,
      outputQuantity: Number(form.outputQuantity) || 1,
      ...(isRecipe.value
        ? { prepMinutes: form.prepMinutes === "" ? null : Number(form.prepMinutes) }
        : { expectedYieldPercent: Number(form.expectedYieldPercent) || 100 }),
      note: form.note || undefined,
      lines: form.lines.map((l) => ({
        componentId: l.componentId,
        quantity: Number(l.quantity),
        scrapPercent: Number(l.scrapPercent) || 0,
        operationSequence: isRecipe.value ? null : l.operationSequence,
      })),
      ...(isRecipe.value
        ? {}
        : {
            operations: form.operations.map((o) => ({
              sequence: Number(o.sequence),
              name: o.name,
              workCenterId: o.workCenterId,
              setupMinutes: Number(o.setupMinutes) || 0,
              runMinutes: Number(o.runMinutes) || 0,
            })),
            byproducts: form.byproducts.map((b) => ({
              productId: b.productId,
              quantity: Number(b.quantity),
            })),
          }),
    };
    if (editingId.value) {
      const { kind: _k, productId: _p, ...changes } = payload;
      await store.saveBom(changes, editingId.value);
    } else {
      await store.saveBom(payload);
    }
    toast.success("تم الحفظ");
    showForm.value = false;
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ القائمة"));
  } finally {
    submitting.value = false;
  }
};

const cost = ref<BomCost | null>(null);
const showCost = async (bom: Bom) => {
  try {
    cost.value = await store.bomCost(bom.id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حساب التكلفة"));
  }
};

const duplicate = async (bom: Bom) => {
  try {
    const copy = await store.duplicateBom(bom.id);
    toast.success(`أُنشئت نسخة (إصدار ${copy.version}) — عدّلها ثم اجعلها افتراضية`);
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر النسخ"));
  }
};

const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Bom | null>(null);
const askDelete = (bom: Bom) => {
  deleteTarget.value = bom;
  showConfirm.value = true;
};
const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeBom(deleteTarget.value.id);
    toast.success("تم الحذف");
    showConfirm.value = false;
    await list.reloadAfterRemoval();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  list.load(1);
  if (!isRecipe.value && hasFeature("manufacturing_module")) {
    store.fetchWorkCenters().catch(() => {});
  }
});
</script>

<style lang="scss" scoped>
.picked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  padding: $space-2 $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;

  small {
    color: $stb-text-muted;
  }
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: $space-4;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.byproduct-row {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: $space-2;
  align-items: center;
  margin-top: $space-2;
}
</style>
