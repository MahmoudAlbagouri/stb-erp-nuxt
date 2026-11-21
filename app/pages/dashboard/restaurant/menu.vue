<!-- pages/dashboard/restaurant/menu.vue — الإضافات والوجبات وربطها بالأصناف -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الإضافات والوجبات</h1>
        <p>
          مجموعات تظهر للكاشير مع الصنف: "الحجم"، "إضافات"، "مشروب الوجبة" —
          بسعرها وأثرها على المخزون
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_restaurant'"
          class="btn btn--primary"
          @click="openGroup()"
        >
          <Plus :size="18" /> <span>مجموعة جديدة</span>
        </button>
      </div>
    </div>

    <div class="layout">
      <section class="card section">
        <h3 class="section__title">المجموعات</h3>
        <div v-if="!store.groups.length" class="doc-lines__empty">
          لا مجموعات بعد
        </div>
        <div v-for="g in store.groups" :key="g.id" class="group">
          <div class="group__head">
            <div>
              <strong>{{ g.name }}</strong>
              <span class="doc-cell__sub">
                — {{ selectionLabel(g.minSelect, g.maxSelect) }}</span
              >
              <span v-if="!g.isActive" class="badge badge--inactive"
                >موقوفة</span
              >
            </div>
            <div class="doc-actions">
              <button
                v-can="'manage_restaurant'"
                class="btn btn--sm btn--ghost"
                @click="openGroup(g)"
              >
                <Pencil :size="14" /> تعديل
              </button>
              <button
                v-can="'manage_restaurant'"
                class="btn btn--sm btn--danger btn--icon"
                @click="removeGroup(g)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <div class="chips">
            <span
              v-for="o in (g.options ?? []).filter((o) => o.isActive)"
              :key="o.id"
              class="chip"
            >
              {{ o.name
              }}<template v-if="o.priceDelta">
                +{{ formatMoney(o.priceDelta) }}</template
              >
            </span>
          </div>
        </div>
      </section>

      <section class="card section">
        <h3 class="section__title">مجموعات صنف</h3>
        <CatalogProductPicker
          :types="['composite', 'stocked']"
          placeholder="اختر صنفاً لتحديد مجموعاته..."
          @pick="pickProduct"
        />
        <template v-if="product">
          <p class="picked-product">{{ product.name }}</p>
          <div
            v-for="g in store.groups.filter((x) => x.isActive)"
            :key="g.id"
            class="link-row"
          >
            <label class="checkbox-label">
              <input v-model="linked" type="checkbox" :value="g.id" />
              <span>{{ g.name }}</span>
            </label>
            <small class="doc-cell__sub">{{
              selectionLabel(g.minSelect, g.maxSelect)
            }}</small>
          </div>
          <button
            v-can="'manage_restaurant'"
            class="btn btn--primary"
            :disabled="busy"
            @click="saveLinks"
          >
            حفظ مجموعات الصنف
          </button>
        </template>
      </section>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="form" class="modal-overlay" @click.self="form = null">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3>
                <SquarePlus :size="20" class="doc-modal__icon" />
                {{ form.id ? "تعديل مجموعة" : "مجموعة جديدة" }}
              </h3>
              <button class="btn btn--icon btn--ghost" @click="form = null">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="saveGroup">
              <div class="doc-grid">
                <div class="form-group">
                  <label>الاسم *</label>
                  <input
                    v-model.trim="form.name"
                    class="form-input"
                    required
                    maxlength="100"
                    placeholder="إضافات، الحجم، مشروب الوجبة..."
                  />
                </div>
                <div class="form-group">
                  <label>أقل اختيار</label>
                  <StbNumberInput
                    v-model.number="form.minSelect"
                    class="form-input"
                    min="0"
                  />
                  <small class="doc-hint"
                    >1 = إلزامية (لا يُضاف الصنف بدونها)</small
                  >
                </div>
                <div class="form-group">
                  <label>أقصى اختيار</label>
                  <StbNumberInput
                    v-model.number="form.maxSelect"
                    class="form-input"
                    min="0"
                  />
                  <small class="doc-hint">0 = بلا حد</small>
                </div>
              </div>
              <label class="checkbox-label"
                ><input v-model="form.isActive" type="checkbox" />
                <span>فعّالة</span></label
              >

              <section class="doc-section">
                <div class="section-head">
                  <h4 class="doc-section__title">الخيارات</h4>
                  <button
                    type="button"
                    class="btn btn--sm btn--ghost"
                    @click="addOption"
                  >
                    <Plus :size="14" /> خيار
                  </button>
                </div>
                <div
                  v-for="(o, index) in form.options"
                  :key="index"
                  class="option"
                >
                  <div class="option__row">
                    <input
                      v-model.trim="o.name"
                      class="form-input"
                      required
                      maxlength="100"
                      placeholder="اسم الخيار"
                    />
                    <StbNumberInput
                      v-model.number="o.priceDelta"
                      class="form-input"
                      :step="moneyStep()"
                      placeholder="سعر إضافي"
                    />
                    <label class="checkbox-label"
                      ><input v-model="o.isDefault" type="checkbox" />
                      <span>مختار مسبقاً</span></label
                    >
                    <button
                      type="button"
                      class="btn btn--sm btn--danger btn--icon"
                      @click="form.options.splice(index, 1)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                  <div class="option__effect">
                    <select v-model="o.effect" class="form-select">
                      <option value="none">بلا أثر مخزني</option>
                      <option value="add">يُستهلك صنف مع كل وحدة</option>
                      <option value="remove">يحذف مكوّناً من الوصفة</option>
                    </select>
                    <template v-if="o.effect !== 'none'">
                      <div v-if="o.effectProduct" class="effect-product">
                        {{ o.effectProduct.name }}
                        <button
                          type="button"
                          class="btn btn--sm btn--ghost"
                          @click="o.effectProduct = null"
                        >
                          تغيير
                        </button>
                      </div>
                      <CatalogProductPicker
                        v-else
                        :types="
                          o.effect === 'add'
                            ? ['stocked', 'composite']
                            : ['stocked']
                        "
                        placeholder="الصنف..."
                        @pick="
                          (p: Product) =>
                            (o.effectProduct = { id: p.id, name: p.name })
                        "
                      />
                      <StbNumberInput
                        v-if="o.effect === 'add'"
                        v-model.number="o.quantity"
                        class="form-input"
                        min="0.0001"
                        step="any"
                        placeholder="الكمية لكل وحدة"
                      />
                    </template>
                  </div>
                </div>
              </section>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="form = null"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': busy }"
                  :disabled="busy"
                >
                  حفظ
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
import { onMounted, ref } from "vue";
import { Pencil, Plus, SquarePlus, Trash2, X } from "lucide-vue-next";
import { useRestaurantStore } from "@/stores/restaurant";
import { useToast } from "@/composables/useToast";
import type { Product } from "@/types/catalog";
import type { ModifierGroup } from "@/types/restaurant";

definePageMeta({ middleware: "auth" });

const store = useRestaurantStore();
const toast = useToast();
const busy = ref(false);

const selectionLabel = (min: number, max: number) =>
  `${min > 0 ? `إلزامية (${min}+)` : "اختيارية"} · ${max === 0 ? "بلا حد" : `حتى ${max}`}`;

interface OptionForm {
  id?: string;
  name: string;
  priceDelta: number | "";
  isDefault: boolean;
  effect: "none" | "add" | "remove";
  effectProduct: { id: string; name: string } | null;
  quantity: number | "";
}
const form = ref<{
  id?: string;
  name: string;
  minSelect: number | "";
  maxSelect: number | "";
  isActive: boolean;
  options: OptionForm[];
} | null>(null);

const productNames = new Map<string, string>();

const openGroup = (group?: ModifierGroup) => {
  form.value = {
    id: group?.id,
    name: group?.name ?? "",
    minSelect: group?.minSelect ?? 0,
    maxSelect: group?.maxSelect ?? 1,
    isActive: group?.isActive ?? true,
    options: (group?.options ?? [])
      .filter((o) => o.isActive)
      .map((o) => ({
        id: o.id,
        name: o.name,
        priceDelta: o.priceDelta || "",
        isDefault: o.isDefault,
        effect: o.productId ? "add" : o.removesProductId ? "remove" : "none",
        effectProduct:
          o.productId || o.removesProductId
            ? {
                id: (o.productId ?? o.removesProductId)!,
                name:
                  productNames.get((o.productId ?? o.removesProductId)!) ??
                  "صنف محدد",
              }
            : null,
        quantity: o.quantity,
      })),
  };
};

const addOption = () =>
  form.value?.options.push({
    name: "",
    priceDelta: "",
    isDefault: false,
    effect: "none",
    effectProduct: null,
    quantity: 1,
  });

const saveGroup = async () => {
  const f = form.value!;
  busy.value = true;
  try {
    await store.saveGroup(
      {
        name: f.name,
        minSelect: Number(f.minSelect) || 0,
        maxSelect: Number(f.maxSelect) || 0,
        isActive: f.isActive,
        options: f.options.map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: Number(o.priceDelta) || 0,
          isDefault: o.isDefault,
          isActive: true,
          productId: o.effect === "add" ? (o.effectProduct?.id ?? null) : null,
          removesProductId:
            o.effect === "remove" ? (o.effectProduct?.id ?? null) : null,
          quantity: o.effect === "add" ? Number(o.quantity) || 1 : 1,
        })),
      },
      f.id,
    );
    toast.success("تم الحفظ");
    form.value = null;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ المجموعة"));
  } finally {
    busy.value = false;
  }
};

const removeGroup = async (group: ModifierGroup) => {
  if (!confirm(`حذف مجموعة "${group.name}" وفكّها من أصنافها؟`)) return;
  try {
    await store.removeGroup(group.id);
    toast.success("حُذفت المجموعة");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  }
};

const product = ref<Product | null>(null);
const linked = ref<string[]>([]);
const pickProduct = async (picked: Product) => {
  product.value = picked;
  try {
    linked.value = (await store.productGroups(picked.id)).map((g) => g.id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل مجموعات الصنف"));
  }
};
const saveLinks = async () => {
  if (!product.value) return;
  busy.value = true;
  try {
    // بترتيب المجموعات في القائمة
    const order = store.groups
      .map((g) => g.id)
      .filter((id) => linked.value.includes(id));
    await store.setProductGroups(product.value.id, order);
    toast.success("حُفظت مجموعات الصنف — تنزل للكاشير مع المزامنة");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    busy.value = false;
  }
};

onMounted(() =>
  store
    .fetchGroups()
    .catch((e) => toast.error(getErrorMessage(e, "تعذر التحميل"))),
);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;
.layout {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: $space-4;

  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}

.section {
  padding: $space-4;

  &__title {
    margin-bottom: $space-3;
    font-size: $font-size-base;
  }
}

.group {
  padding: $space-3 0;
  border-bottom: 1px solid $stb-border;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $space-2;
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
  margin-top: $space-2;
}

.chip {
  padding: 2px $space-2;
  font-size: $font-size-xs;
  background: $stb-surface-2;
  border-radius: 999px;
}

.picked-product {
  margin: $space-3 0;
  font-weight: 600;
}

.link-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-1 0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.option {
  padding: $space-2;
  margin-top: $space-2;
  border: 1px solid $stb-border;
  border-radius: $radius-md;

  &__row,
  &__effect {
    display: grid;
    grid-template-columns: 2fr 1fr auto auto;
    gap: $space-2;
    align-items: center;
  }

  &__effect {
    grid-template-columns: 1.2fr 2fr 1fr;
    margin-top: $space-2;
  }
}

.effect-product {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
