<!--
  pages/stocktake/[id].vue — شاشة العدّ: جرد بالباركود من الجوال أو التابلت
  داخل المخزن، ويعمل بلا إنترنت.

  كل مسحة تضيف قطعة (أو كرتونة كاملة بباركودها)، والضغط على الصنف يكتب كميته.
  العدّ يُحفظ على الجهاز فوراً (stocktake/db.ts) ويُرفع وحده متى وُجد اتصال،
  ويعدّ أكثر من جهاز نفس الجرد: لكل صنف آخر عدّ بوقته يكسب. المراجعة والاعتماد
  من لوحة التحكم (صفحة الجرد) بعد رفع كل العدّ.
-->
<template>
  <div class="count" dir="rtl">
    <header class="count__header">
      <div>
        <small>{{ stocktake?.warehouseName || "شاشة العدّ" }}</small>
        <h1>{{ stocktake ? `جرد ${stocktake.number}` : "جرد" }}</h1>
      </div>
      <NuxtLink
        to="/dashboard/inventory/stocktakes"
        class="count__icon-btn"
        aria-label="الرجوع لصفحة الجرد"
      >
        <ArrowRight :size="20" />
      </NuxtLink>
    </header>

    <button
      type="button"
      class="count__status"
      :class="`is-${status.tone}`"
      @click="sync"
    >
      <WifiOff v-if="status.tone === 'offline'" :size="16" />
      <CloudUpload v-else-if="status.tone === 'pending'" :size="16" />
      <Wifi v-else :size="16" />
      <span>{{ status.text }}</span>
    </button>

    <p v-if="notice" class="count__notice">
      <AlertTriangle :size="16" /> {{ notice }}
    </p>

    <div v-if="!stocktake" class="count__empty">
      <ClipboardCheck :size="52" />
      <p v-if="loading">جارٍ التحميل…</p>
      <p v-else>
        هذا الجرد لم يُفتح على هذا الجهاز من قبل. افتحه مرة وأنت متصل،
        وبعدها يعمل بلا إنترنت.
      </p>
    </div>

    <template v-else>
      <!-- ══ اعتُمد أو أُلغي: لا عدّ بعده ══ -->
      <section v-if="closed" class="count__closed">
        <h2>
          {{ stocktake.status === "posted" ? "اعتُمد هذا الجرد" : "أُلغي هذا الجرد" }}
        </h2>
        <p>لا عدّ بعد الآن.</p>
        <template v-if="pending.length">
          <p>
            على هذا الجهاز {{ pending.length }} صنف عُدّ ولم يُرفع قبل
            {{ stocktake.status === "posted" ? "الاعتماد" : "الإلغاء" }}، فلم
            يدخل في الجرد:
          </p>
          <ul>
            <li v-for="count in pending" :key="count.key">
              {{ nameOf(count.productId) }}:
              {{ count.countedQuantity === null ? "إزالة" : formatNumber(count.countedQuantity) }}
            </li>
          </ul>
          <button type="button" class="count__link" @click="dropAll">
            مسحها من الجهاز
          </button>
        </template>
      </section>

      <template v-else>
        <label class="count__scan">
          <ScanBarcode :size="22" />
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            enterkeyhint="go"
            autocomplete="off"
            placeholder="امسح الباركود أو اكتب اسم الصنف أو كوده"
            @keydown.enter.prevent="onEnter"
          />
        </label>
        <p class="count__hint">
          كل مسحة تضيف قطعة (وباركود الكرتونة يضيفها كاملة). اضغط الصنف لكتابة
          كميته.
        </p>

        <div v-if="flashItem" class="count__flash">
          <span>
            <strong>{{ nameOf(flashItem.productId) }}</strong>
            +{{ formatNumber(flashItem.added) }}
          </span>
          <span class="count__flash-total">
            {{ formatNumber(quantities.get(flashItem.productId) ?? 0) }}
          </span>
          <button type="button" @click="openEditor(flashItem.productId)">
            تعديل
          </button>
        </div>

        <!-- ══ نتائج البحث ══ -->
        <section v-if="search.trim()" class="count__list">
          <div v-if="!results.length" class="count__state">
            {{
              catalog?.products.length
                ? "لا صنف بهذا الاسم أو الكود"
                : "أصناف الشركة لم تُحمَّل على هذا الجهاز بعد — اتصل بالإنترنت مرة"
            }}
          </div>
          <button
            v-for="product in results"
            :key="product.id"
            type="button"
            class="count__row"
            @click="openEditor(product.id)"
          >
            <span class="count__row-main">
              <strong>{{ product.name }}</strong>
              <small>
                {{ product.sku }} · {{ product.unit }}
                <template v-if="!product.isActive"> · موقوف</template>
              </small>
            </span>
            <span class="count__row-qty">
              {{ quantities.has(product.id) ? formatNumber(quantities.get(product.id)!) : "—" }}
            </span>
          </button>
        </section>

        <template v-else>
          <!-- ══ ما رفضه السيرفر ══ -->
          <section v-if="rejected.length" class="count__rejected">
            <h3>
              <AlertTriangle :size="18" /> لم يقبلها السيرفر ({{ rejected.length }})
            </h3>
            <article v-for="count in rejected" :key="count.key">
              <strong>{{ nameOf(count.productId) }}</strong>
              <p>{{ count.error }}</p>
              <div class="count__rejected-actions">
                <button type="button" @click="retry(count)">إعادة المحاولة</button>
                <button type="button" class="is-ghost" @click="dropRejected(count)">
                  حذفه
                </button>
              </div>
            </article>
          </section>

          <h2 class="count__title">المعدود ({{ items.length }})</h2>
          <div v-if="!items.length" class="count__state">
            لم يُعدّ شيء بعد — امسح أول صنف أو ابحث عنه
          </div>
          <article
            v-for="item in items"
            :key="item.productId"
            class="count__item"
            :class="{ 'is-local': item.local }"
          >
            <button
              type="button"
              class="count__item-main"
              @click="openEditor(item.productId)"
            >
              <strong>{{ nameOf(item.productId) }}</strong>
              <small>
                {{ detailOf(item.productId) }}
                <template v-if="item.local"> · على الجهاز</template>
              </small>
            </button>
            <div class="count__stepper">
              <button
                type="button"
                aria-label="ناقص واحد"
                :disabled="item.quantity < 1"
                @click="adjust(item.productId, -1)"
              >
                <Minus :size="18" />
              </button>
              <strong>{{ formatNumber(item.quantity) }}</strong>
              <button
                type="button"
                aria-label="زائد واحد"
                @click="adjust(item.productId, 1)"
              >
                <Plus :size="18" />
              </button>
            </div>
          </article>
        </template>
      </template>

      <footer class="count__footer">
        <p v-if="pendingCount && !closed">
          {{ pendingCount }} صنف على هذا الجهاز لم يُرفع بعد — لا يُعتمد الجرد
          قبل رفعه.
        </p>
        <NuxtLink to="/dashboard/inventory/stocktakes" class="count__review">
          المراجعة والاعتماد من لوحة التحكم
        </NuxtLink>
        <button
          v-if="!closed"
          type="button"
          class="count__link"
          :disabled="refreshingCatalog"
          @click="loadCatalog(true)"
        >
          تحديث الأصناف
          <template v-if="catalog">(آخر تحميل {{ formatDateTime(catalog.fetchedAt) }})</template>
        </button>
      </footer>
    </template>

    <!-- ══ كتابة كمية صنف ══ -->
    <div v-if="editor" class="count__sheet" @click.self="closeEditor">
      <form class="count__sheet-body" @submit.prevent="saveEditor">
        <h3>{{ nameOf(editor.productId) }}</h3>
        <small>{{ detailOf(editor.productId) }}</small>
        <input
          ref="editorInput"
          v-model="editor.value"
          type="number"
          inputmode="decimal"
          min="0"
          :step="fractionsOf(editor.productId) ? 'any' : '1'"
          class="count__qty-input"
          placeholder="الكمية المعدودة"
          required
        />
        <p class="count__sheet-hint">
          صفر = لا يوجد منه شيء (رصيده يصبح صفراً عند الاعتماد). «إزالة من
          الجرد» تُخرجه منه فلا يتغير رصيده.
        </p>
        <div class="count__actions">
          <button type="submit" class="is-primary">حفظ الكمية</button>
          <button
            v-if="quantities.has(editor.productId)"
            type="button"
            class="is-danger"
            @click="removeEditing"
          >
            إزالة من الجرد
          </button>
          <button type="button" class="is-ghost" @click="closeEditor">رجوع</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  CloudUpload,
  Minus,
  Plus,
  ScanBarcode,
  Wifi,
  WifiOff,
} from "lucide-vue-next";
import { NetworkError } from "@/composables/useConnection";
import { useToast } from "@/composables/useToast";
import { useAuthStore } from "@/stores/auth";
import { useInventoryStore } from "@/stores/inventory";
import {
  countDb,
  pendingKey,
  type LocalCatalog,
  type LocalStocktake,
  type PendingCount,
} from "@/stocktake/db";
import { cleanQuantity, countedItems, indexCatalog } from "@/stocktake/counting";
import type { StocktakeCounts } from "@/types/inventory";

definePageMeta({ middleware: "auth", layout: false });
useHead({ title: "شاشة العدّ" });

/** مهلة بعد آخر مسحة قبل الرفع (المسح المتتالي يُرفع دفعة واحدة) */
const SYNC_DELAY_MS = 1500;
const POLL_MS = 20_000;
/** أصناف الجهاز الأقدم من هذا تُحدَّث عند الفتح */
const CATALOG_MAX_AGE_MS = 6 * 60 * 60 * 1000;
/** حد السيرفر لعدد الأصناف في رفعة */
const SYNC_BATCH = 500;

const route = useRoute();
const id = String(route.params.id);
const inventory = useInventoryStore();
const auth = useAuthStore();
const toast = useToast();

const stocktake = ref<LocalStocktake | null>(null);
const catalog = ref<LocalCatalog | null>(null);
/** عدّ هذا الجهاز الذي لم يقبله السيرفر بعد (المرفوض بسببه) */
const pending = ref<PendingCount[]>([]);
const loading = ref(true);
const refreshingCatalog = ref(false);
/** null = لم نعرف بعد */
const online = ref<boolean | null>(null);
const notice = ref("");
const search = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

const index = computed(() => indexCatalog(catalog.value?.products ?? []));
const items = computed(() => countedItems(stocktake.value?.lines ?? [], pending.value));
const quantities = computed(
  () => new Map(items.value.map((item) => [item.productId, item.quantity])),
);
const rejected = computed(() => pending.value.filter((count) => count.error));
const pendingCount = computed(() => pending.value.filter((count) => !count.error).length);
const closed = computed(() => !!stocktake.value && stocktake.value.status !== "draft");
const results = computed(() => index.value.search(search.value));

const nameOf = (productId: string) =>
  index.value.byId.get(productId)?.name ?? "صنف غير موجود في أصناف هذا الجهاز";
const detailOf = (productId: string) => {
  const product = index.value.byId.get(productId);
  return product ? `${product.sku} · ${product.unit}` : "اضغط «تحديث الأصناف»";
};
const fractionsOf = (productId: string) =>
  index.value.byId.get(productId)?.allowsFractions ?? true;

const status = computed(() => {
  const waiting = pendingCount.value;
  if (online.value === false) {
    return {
      tone: "offline",
      text: [
        "بلا إنترنت — العدّ محفوظ على الجهاز",
        waiting ? `${waiting} صنف يُرفع وحده عند عودة الاتصال` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }
  if (waiting) return { tone: "pending", text: `بانتظار الرفع: ${waiting} صنف…` };
  if (online.value === null) return { tone: "pending", text: "جارٍ الاتصال…" };
  return { tone: "online", text: "متصل — كل العدّ مرفوع" };
});

// ─── الرفع والسحب ─────────────────────────────────────────────────────────────
/** آخر ما عرفه السيرفر يُحفظ على الجهاز (ليفتح بلا إنترنت) */
const remember = async (fresh: StocktakeCounts) => {
  stocktake.value = {
    id: fresh.id,
    tenantId: auth.tenantId,
    number: fresh.number,
    status: fresh.status,
    warehouseName: fresh.warehouseName,
    updatedAt: fresh.updatedAt,
    fetchedAt: Date.now(),
    lines: fresh.lines,
  };
  await countDb.putStocktake(stocktake.value);
};

const runSync = async () => {
  const batch = closed.value
    ? []
    : pending.value.filter((count) => !count.error).slice(0, SYNC_BATCH);
  try {
    if (!batch.length) {
      await remember(await inventory.fetchStocktakeCounts(id));
    } else {
      let response: Awaited<ReturnType<typeof inventory.pushStocktakeCounts>>;
      try {
        response = await inventory.pushStocktakeCounts(
          id,
          batch.map(({ productId, countedQuantity, countedAt }) => ({
            productId,
            countedQuantity,
            countedAt,
          })),
        );
      } catch (error) {
        if (error instanceof NetworkError) throw error;
        // الجرد اعتُمد أو أُلغي، أو رُفضت الدفعة كلها: حاله من السيرفر يحسم
        const fresh = await inventory.fetchStocktakeCounts(id);
        await remember(fresh);
        if (fresh.status === "draft") {
          const message = getErrorMessage(error, "رُفض");
          await countDb.settle(
            [],
            batch.map((count) => ({ ...count, error: message })),
          );
        }
        online.value = true;
        return;
      }

      // عُدّ الصنف مرة أخرى أثناء الرفع: الأحدث يبقى ويُرفع في المرة القادمة
      const current = new Map((await countDb.pendingOf(id)).map((c) => [c.key, c]));
      const accepted: string[] = [];
      const refused: PendingCount[] = [];
      const outvoted: string[] = [];
      response.results.forEach((result, i) => {
        const sent = batch[i];
        const now = sent && current.get(sent.key);
        if (!now || now.countedAt !== sent.countedAt) return;
        if (result.status === "error") {
          refused.push({ ...now, error: result.message || "رُفض" });
        } else {
          accepted.push(now.key);
          if (result.status === "stale") outvoted.push(nameOf(now.productId));
        }
      });
      await countDb.settle(accepted, refused);
      await remember(response.stocktake);
      if (outvoted.length) {
        toast.info(`عُدّ من جهاز آخر بعد عدّك فاعتُمد عدّه: ${outvoted.join("، ")}`);
      }
    }
    online.value = true;
    notice.value = "";
  } catch (error) {
    if (error instanceof NetworkError) online.value = false;
    else notice.value = getErrorMessage(error, "تعذر الاتصال بالسيرفر");
  } finally {
    pending.value = await countDb.pendingOf(id).catch(() => pending.value);
  }
};

let syncing: Promise<void> | null = null;
const sync = (): Promise<void> =>
  (syncing ??= runSync().finally(() => {
    syncing = null;
  }));

let syncTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleSync = () => {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void sync(), SYNC_DELAY_MS);
};

/** أصناف الشركة للبحث بلا إنترنت (`force`: زر التحديث) */
const loadCatalog = async (force = false) => {
  if (
    !force &&
    catalog.value &&
    Date.now() - catalog.value.fetchedAt < CATALOG_MAX_AGE_MS
  ) {
    return;
  }
  refreshingCatalog.value = true;
  try {
    const products = await inventory.fetchStocktakeCatalog(id);
    catalog.value = { stocktakeId: id, fetchedAt: Date.now(), products };
    await countDb.putCatalog(catalog.value);
    if (force) toast.success(`حُدّثت الأصناف (${formatNumber(products.length)})`);
  } catch (error) {
    if (error instanceof NetworkError) online.value = false;
    if (force) toast.error(getErrorMessage(error, "تعذر تحميل الأصناف"));
  } finally {
    refreshingCatalog.value = false;
  }
};

// ─── العدّ: يُحفظ على الجهاز فوراً ويُرفع بعد لحظة ──────────────────────────────
const setCount = (productId: string, quantity: number | null) => {
  if (closed.value) return;
  const count: PendingCount = {
    key: pendingKey(id, productId),
    stocktakeId: id,
    productId,
    countedQuantity: quantity,
    countedAt: new Date().toISOString(),
  };
  // الشاشة أولاً: مسحتان متتاليتان تقرأ الثانية ما أضافته الأولى
  pending.value = [...pending.value.filter((c) => c.key !== count.key), count];
  countDb
    .putPending(count)
    .catch((error) => toast.error(getErrorMessage(error, "تعذر الحفظ على الجهاز")));
  scheduleSync();
};

const adjust = (productId: string, delta: number) => {
  const next = cleanQuantity(
    Math.max(0, (quantities.value.get(productId) ?? 0) + delta),
    fractionsOf(productId),
  );
  if (next !== null) setCount(productId, next);
};

const flashItem = ref<{ productId: string; added: number } | null>(null);

const onEnter = () => {
  const term = search.value.trim();
  if (!term) return;
  const hit = index.value.byCode.get(term.toLowerCase());
  if (hit) {
    adjust(hit.product.id, hit.factor);
    flashItem.value = { productId: hit.product.id, added: hit.factor };
    navigator.vibrate?.(30);
    search.value = "";
    return;
  }
  const [only, ...more] = results.value;
  if (only && !more.length) {
    search.value = "";
    openEditor(only.id);
  } else if (!only) {
    toast.warning(`لا صنف بالباركود أو الكود "${term}"`);
  }
};

// ─── كتابة الكمية ─────────────────────────────────────────────────────────────
const editor = ref<{ productId: string; value: number | "" } | null>(null);
const editorInput = ref<HTMLInputElement | null>(null);

const openEditor = async (productId: string) => {
  editor.value = { productId, value: quantities.value.get(productId) ?? "" };
  await nextTick();
  editorInput.value?.focus();
  editorInput.value?.select();
};

const closeEditor = () => {
  editor.value = null;
  searchInput.value?.focus();
};

const saveEditor = () => {
  if (!editor.value) return;
  const { productId, value } = editor.value;
  const quantity =
    value === "" ? null : cleanQuantity(Number(value), fractionsOf(productId));
  if (quantity === null) {
    toast.warning("اكتب كمية صحيحة: صفر أو أكثر");
    return;
  }
  setCount(productId, quantity);
  closeEditor();
};

const removeEditing = () => {
  if (!editor.value) return;
  setCount(editor.value.productId, null);
  if (flashItem.value?.productId === editor.value.productId) flashItem.value = null;
  closeEditor();
};

// ─── المرفوض ──────────────────────────────────────────────────────────────────
const retry = async (count: PendingCount) => {
  const { error: _error, ...again } = count;
  await countDb.putPending(again);
  pending.value = await countDb.pendingOf(id);
  void sync();
};

const dropRejected = async (count: PendingCount) => {
  await countDb.removePending([count.key]);
  pending.value = await countDb.pendingOf(id);
};

const dropAll = async () => {
  await countDb.removePending(pending.value.map((count) => count.key));
  pending.value = [];
};

// ─── التشغيل ──────────────────────────────────────────────────────────────────
let poller: ReturnType<typeof setInterval> | null = null;
const onOnline = () => void sync();
const onVisible = () => {
  if (document.visibilityState === "visible") void sync();
};

onMounted(async () => {
  registerOfflineShell();
  try {
    const [local, localCatalog, localPending] = await Promise.all([
      countDb.getStocktake(id),
      countDb.getCatalog(id),
      countDb.pendingOf(id),
    ]);
    // بيانات شركة أخرى سجّل منها مستخدم على نفس الجهاز لا تُعرض
    const foreign =
      !!local?.tenantId && !!auth.tenantId && local.tenantId !== auth.tenantId;
    if (!foreign) {
      stocktake.value = local;
      catalog.value = localCatalog;
      pending.value = localPending;
    }
  } catch (error) {
    notice.value = getErrorMessage(error, "تعذر فتح قاعدة بيانات الجهاز");
  }

  await sync();
  await loadCatalog();
  loading.value = false;
  searchInput.value?.focus();

  poller = setInterval(() => {
    if (document.visibilityState === "visible") void sync();
  }, POLL_MS);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);
});

onBeforeUnmount(() => {
  if (poller) clearInterval(poller);
  if (syncTimer) clearTimeout(syncTimer);
  window.removeEventListener("online", onOnline);
  document.removeEventListener("visibilitychange", onVisible);
});
</script>

<style lang="scss">
.count {
  min-height: 100vh;
  min-height: 100dvh;
  max-width: 640px;
  margin: 0 auto;
  padding: 16px 16px 40px;
  color: var(--stb-text-primary);
  background: var(--stb-dark);
  font-family: "Cairo", sans-serif;

  h1,
  h2,
  h3 {
    margin: 0;
    color: var(--stb-text-primary);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    small {
      color: var(--stb-text-muted);
    }
    h1 {
      font-size: 1.4rem;
    }
  }

  &__icon-btn {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--stb-border);
    border-radius: 12px;
    color: var(--stb-text-primary);
    background: var(--stb-surface);
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    margin-bottom: 10px;
    padding: 8px 12px;
    border: 1px solid transparent;
    border-radius: 10px;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    text-align: start;
    cursor: pointer;

    svg {
      flex-shrink: 0;
    }
    &.is-online {
      color: var(--stb-success);
      background: color-mix(in srgb, var(--stb-success) 10%, transparent);
    }
    &.is-pending {
      color: var(--stb-accent);
      background: color-mix(in srgb, var(--stb-accent) 10%, transparent);
    }
    &.is-offline {
      color: var(--stb-warning);
      background: color-mix(in srgb, var(--stb-warning) 12%, transparent);
      border-color: color-mix(in srgb, var(--stb-warning) 40%, transparent);
    }
  }

  &__notice {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 10px;
    color: var(--stb-danger);
    background: color-mix(in srgb, var(--stb-danger) 10%, transparent);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-top: 22vh;
    text-align: center;
    color: var(--stb-text-secondary);
  }

  &__closed {
    margin: 12px 0;
    padding: 14px;
    border: 1px solid var(--stb-border);
    border-radius: 14px;
    background: var(--stb-surface);

    p {
      color: var(--stb-text-secondary);
    }
  }

  &__scan {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border: 2px solid var(--stb-accent);
    border-radius: 14px;
    background: var(--stb-surface);
    color: var(--stb-accent);

    input {
      flex: 1;
      min-height: 52px;
      border: 0;
      outline: 0;
      font: inherit;
      font-size: 1.1rem;
      color: var(--stb-text-primary);
      background: transparent;
    }
  }

  &__hint {
    margin: 6px 2px 12px;
    font-size: 0.8rem;
    color: var(--stb-text-muted);
  }

  &__flash {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--stb-success) 12%, transparent);

    span:first-child {
      flex: 1;
    }
    button {
      padding: 6px 12px;
      border: 1px solid var(--stb-border);
      border-radius: 10px;
      font: inherit;
      color: var(--stb-text-primary);
      background: transparent;
    }
  }

  &__flash-total {
    font-size: 1.5rem;
    font-weight: 800;
  }

  &__title {
    margin: 4px 0 8px;
    font-size: 1rem;
    color: var(--stb-text-secondary);
  }

  &__state {
    padding: 32px 0;
    text-align: center;
    color: var(--stb-text-muted);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__row,
  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--stb-border);
    border-radius: 14px;
    font: inherit;
    color: var(--stb-text-primary);
    background: var(--stb-surface);
    text-align: start;
  }

  &__item {
    margin-bottom: 8px;

    &.is-local {
      border-color: color-mix(in srgb, var(--stb-accent) 55%, transparent);
    }
  }

  &__row-main,
  &__item-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 0;
    border: 0;
    font: inherit;
    color: inherit;
    background: transparent;
    text-align: start;

    small {
      color: var(--stb-text-muted);
    }
  }

  &__row-qty {
    font-size: 1.2rem;
    font-weight: 800;
  }

  &__stepper {
    display: flex;
    align-items: center;
    gap: 8px;

    strong {
      min-width: 48px;
      font-size: 1.35rem;
      text-align: center;
    }
    button {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--stb-border);
      border-radius: 10px;
      color: var(--stb-text-primary);
      background: transparent;

      &:disabled {
        opacity: 0.4;
      }
    }
  }

  &__rejected {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    padding: 12px;
    border: 1px solid color-mix(in srgb, var(--stb-danger) 45%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--stb-danger) 8%, transparent);

    h3 {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 1rem;
      color: var(--stb-danger);
    }
    article {
      padding-top: 8px;
      border-top: 1px dashed var(--stb-border);
    }
    p {
      margin: 4px 0 8px;
      color: var(--stb-text-secondary);
    }
  }

  &__rejected-actions {
    display: flex;
    gap: 6px;

    button {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--stb-border);
      border-radius: 10px;
      font: inherit;
      font-weight: 700;
      color: var(--stb-on-accent);
      background: var(--stb-accent);

      &.is-ghost {
        color: var(--stb-text-primary);
        background: transparent;
      }
    }
  }

  &__footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 20px;
    text-align: center;

    p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--stb-warning);
    }
  }

  &__review {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--stb-border);
    border-radius: 14px;
    font-weight: 700;
    color: var(--stb-text-primary);
    text-decoration: none;
    background: var(--stb-surface);
  }

  &__link {
    padding: 4px;
    border: 0;
    font: inherit;
    font-size: 0.85rem;
    color: var(--stb-accent);
    background: transparent;
    text-decoration: underline;
  }

  &__sheet {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: flex-end;
    background: var(--stb-scrim);
  }

  &__sheet-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    padding: 20px 16px 28px;
    border-radius: 20px 20px 0 0;
    background: var(--stb-surface);

    small {
      color: var(--stb-text-muted);
    }
  }

  &__qty-input {
    min-height: 60px;
    padding: 0 14px;
    border: 2px solid var(--stb-accent);
    border-radius: 14px;
    font: inherit;
    font-size: 1.6rem;
    font-weight: 800;
    text-align: center;
    color: var(--stb-text-primary);
    background: var(--stb-dark);
  }

  &__sheet-hint {
    margin: 0;
    font-size: 0.8rem;
    color: var(--stb-text-muted);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    button {
      flex: 1;
      min-height: 50px;
      border: 1px solid transparent;
      border-radius: 14px;
      font: inherit;
      font-weight: 800;
      color: #fff;

      &.is-primary {
        background: var(--stb-accent);
      }
      &.is-danger {
        background: var(--stb-danger);
      }
      &.is-ghost {
        color: var(--stb-text-primary);
        background: transparent;
        border-color: var(--stb-border);
      }
    }
  }
}
</style>
