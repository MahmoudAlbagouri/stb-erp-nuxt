<!--
  CatalogProductPicker — بحث صنف من الكتالوج (بلا مخزن) لإضافته في قائمة
  مكوّنات أو وصفة أو خيار إضافة. types يقصر البحث على أنواع (مخزني، مركّب).
  Enter يضيف أول نتيجة متاحة (قارئ الباركود يعمل مباشرة).
-->
<template>
  <div ref="rootEl" class="doc-picker">
    <div class="search-bar">
      <Search :size="16" class="search-bar__icon" />
      <input
        v-model="search"
        class="form-input"
        :placeholder="placeholder"
        autocomplete="off"
        @focus="open = true"
        @input="onInput"
        @keydown.enter.prevent="pickFirst"
        @keydown.esc="open = false"
      />
    </div>
    <div v-if="open && search.trim()" class="doc-picker__results">
      <div v-if="loading && !results.length" class="doc-picker__state">
        جارٍ البحث...
      </div>
      <div v-else-if="!results.length" class="doc-picker__state">
        لا أصناف مطابقة
      </div>
      <button
        v-for="row in results"
        :key="row.id"
        type="button"
        class="doc-picker__item"
        :disabled="exclude?.includes(row.id)"
        @click="pick(row)"
      >
        <span class="doc-cell">
          <span class="doc-cell__main">{{ row.name }}</span>
          <span class="doc-cell__sub">
            {{ row.sku }} · {{ TYPE_LABEL[row.type] ?? row.type }}
            <template v-if="exclude?.includes(row.id)"> · مضاف بالفعل</template>
          </span>
        </span>
        <span class="doc-cell__sub">{{ row.baseUnit?.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Search } from "lucide-vue-next";
import { useApi } from "@/composables/useApi";
import type { Paginated, Product, ProductType } from "@/types/catalog";

const props = withDefaults(
  defineProps<{
    types?: ProductType[];
    exclude?: string[];
    placeholder?: string;
  }>(),
  {
    types: undefined,
    exclude: () => [],
    placeholder: "ابحث بالاسم أو الكود...",
  },
);
const emit = defineEmits<{ pick: [product: Product] }>();

const TYPE_LABEL: Record<string, string> = {
  stocked: "مخزني",
  service: "خدمة",
  composite: "مركّب",
};

const api = useApi();
const rootEl = ref<HTMLElement | null>(null);
const search = ref("");
const results = ref<Product[]>([]);
const loading = ref(false);
const open = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let requestId = 0;

const load = async () => {
  const term = search.value.trim();
  if (!term) {
    results.value = [];
    return;
  }
  const current = ++requestId;
  loading.value = true;
  try {
    const types = props.types?.length ? props.types : [undefined];
    const pages = await Promise.all(
      types.map((type) =>
        api.get<Paginated<Product>>(
          `/catalog/products${toQueryString({ search: term, type, isActive: "true", limit: 15 })}`,
        ),
      ),
    );
    if (current !== requestId) return;
    results.value = pages.flatMap((p) => p.data.data).slice(0, 20);
  } catch {
    if (current === requestId) results.value = [];
  } finally {
    if (current === requestId) loading.value = false;
  }
};

const onInput = () => {
  open.value = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(load, 250);
};

const pick = (row: Product) => {
  if (props.exclude?.includes(row.id)) return;
  emit("pick", row);
  search.value = "";
  results.value = [];
  open.value = false;
};

const pickFirst = async () => {
  if (timer) {
    clearTimeout(timer);
    await load();
  }
  const first = results.value.find((r) => !props.exclude?.includes(r.id));
  if (first) pick(first);
};

const onClickOutside = (event: MouseEvent) => {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) {
    open.value = false;
  }
};
onMounted(() => document.addEventListener("click", onClickOutside));
onBeforeUnmount(() => {
  document.removeEventListener("click", onClickOutside);
  if (timer) clearTimeout(timer);
});
</script>
