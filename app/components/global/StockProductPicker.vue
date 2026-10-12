<!--
  اختيار صنف مخزني لإضافته في مستند (تسوية / تحويل / جرد).
  يبحث بالاسم أو الكود أو الباركود، ويعرض رصيد الصنف في المخزن المحدد.
  Enter يضيف أول نتيجة — فيعمل قارئ الباركود مباشرة (يكتب الكود ثم Enter).
-->
<template>
  <div ref="rootEl" class="doc-picker">
    <div class="search-bar">
      <ScanBarcode :size="16" class="search-bar__icon" />
      <input
        ref="inputEl"
        v-model="search"
        class="form-input"
        :placeholder="
          warehouseId
            ? 'ابحث بالاسم أو الكود أو امسح الباركود لإضافة صنف...'
            : 'اختر المخزن أولاً'
        "
        :disabled="!warehouseId"
        autocomplete="off"
        @focus="onFocus"
        @click="onFocus"
        @input="onInput"
        @keydown.enter.prevent="pickFirst"
        @keydown.esc="open = false"
      />
    </div>

    <div v-if="open" class="doc-picker__results">
      <div v-if="loading && !results.length" class="doc-picker__state">
        جارٍ البحث...
      </div>
      <div v-else-if="!results.length" class="doc-picker__state">
        لا توجد أصناف مخزنية مطابقة
      </div>
      <button
        v-for="(row, index) in results"
        :key="row.productId"
        type="button"
        class="doc-picker__item"
        :class="{ 'is-focused': index === firstAvailable }"
        :disabled="isExcluded(row)"
        @click="pick(row)"
      >
        <span class="doc-cell">
          <span class="doc-cell__main">{{ row.name }}</span>
          <span class="doc-cell__sub">
            {{ row.sku }}
            <template v-if="isExcluded(row)"> · مضاف بالفعل</template>
          </span>
        </span>
        <span class="doc-cell" style="align-items: flex-end">
          <span
            class="doc-num"
            :class="row.quantity < 0 ? 'doc-num--out' : 'doc-num--strong'"
          >
            {{ formatNumber(row.quantity) }}
          </span>
          <span class="doc-cell__sub">{{ row.unit || "الرصيد" }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ScanBarcode } from "lucide-vue-next";
import { useInventoryStore } from "@/stores/inventory";
import type { StockLookupRow } from "@/types/inventory";

const props = defineProps<{
  warehouseId: string;
  /** أصناف مضافة بالفعل في المستند */
  exclude?: string[];
}>();

const emit = defineEmits<{ pick: [row: StockLookupRow] }>();

const store = useInventoryStore();

const rootEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const search = ref("");
const open = ref(false);
const loading = ref(false);
const results = ref<StockLookupRow[]>([]);

const isExcluded = (row: StockLookupRow) =>
  props.exclude?.includes(row.productId) ?? false;

const firstAvailable = computed(() =>
  results.value.findIndex((row) => !isExcluded(row)),
);

let timer: ReturnType<typeof setTimeout> | null = null;
let requestId = 0;
let pending: Promise<void> | null = null;

const runSearch = async () => {
  if (!props.warehouseId) return;
  const current = ++requestId;
  loading.value = true;
  try {
    const rows = await store.lookup(props.warehouseId, search.value.trim());
    if (current === requestId) results.value = rows;
  } catch {
    if (current === requestId) results.value = [];
  } finally {
    if (current === requestId) loading.value = false;
  }
};

const onFocus = () => {
  open.value = true;
  if (!results.value.length) pending = runSearch();
};

const onInput = () => {
  open.value = true;
  if (timer) clearTimeout(timer);
  // القارئ يكتب بسرعة ثم يرسل Enter: ننتظر توقف الكتابة
  pending = new Promise((resolve) => {
    timer = setTimeout(() => runSearch().then(resolve), 250);
  });
};

const pick = (row: StockLookupRow) => {
  if (isExcluded(row)) return;
  emit("pick", row);
  search.value = "";
  results.value = [];
  open.value = false;
  inputEl.value?.focus();
};

const pickFirst = async () => {
  // Enter قد يسبق نتيجة البحث (قارئ الباركود): ننتظرها أولاً
  await pending;
  const row = results.value[firstAvailable.value];
  if (row) pick(row);
};

// تغيير المخزن يغيّر الأرصدة المعروضة
watch(
  () => props.warehouseId,
  () => {
    results.value = [];
    open.value = false;
  },
);

const onClickOutside = (event: MouseEvent) => {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) {
    open.value = false;
  }
};

onMounted(() => document.addEventListener("mousedown", onClickOutside));
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onClickOutside);
  if (timer) clearTimeout(timer);
});
</script>
