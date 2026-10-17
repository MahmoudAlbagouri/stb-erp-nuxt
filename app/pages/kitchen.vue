<!--
  pages/kitchen.vue — شاشة المطبخ: طلبات شاشات الكاشير بحالتها (جديد، قيد
  التحضير، جاهز) ومدة كل طلب منذ إرساله. تُفتح على تابلت أو شاشة في المطبخ
  بحساب له صلاحية "شاشة المطبخ"، وتتحدث كل بضع ثوانٍ. الكاشير يرى الجاهز
  على شاشته وينبّهه صوت.
-->
<template>
  <div class="kds" dir="rtl">
    <header class="kds__bar">
      <div class="kds__title">
        <ChefHat :size="22" />
        <h1>شاشة المطبخ</h1>
        <span class="kds__clock" dir="ltr">{{ clock }}</span>
      </div>
      <div class="kds__actions">
        <select
          v-if="branches.hasMany"
          v-model="branchId"
          class="form-select kds__branch"
          @change="load"
        >
          <option value="">كل الفروع</option>
          <option v-for="b in branches.activeOptions" :key="b.id" :value="b.id">
            {{ b.name }}
          </option>
        </select>
        <span class="kds__status" :class="online ? 'is-on' : 'is-off'">
          <Wifi v-if="online" :size="14" />
          <WifiOff v-else :size="14" />
          {{ online ? "متصل" : "لا يوجد اتصال — آخر طلبات معروفة" }}
        </span>
        <button
          class="btn btn--sm btn--ghost btn--icon"
          :title="muted ? 'تشغيل صوت الطلب الجديد' : 'كتم صوت الطلب الجديد'"
          @click="toggleMute"
        >
          <VolumeX v-if="muted" :size="16" />
          <Volume2 v-else :size="16" />
        </button>
        <button class="btn btn--sm btn--ghost btn--icon" title="ملء الشاشة" @click="toggleFullscreen">
          <Maximize :size="16" />
        </button>
        <NuxtLink to="/dashboard" class="btn btn--sm btn--ghost btn--icon" title="لوحة التحكم">
          <LogOut :size="16" />
        </NuxtLink>
      </div>
    </header>

    <div v-if="denied" class="kds__empty">
      <Lock :size="48" />
      <p>{{ denied }}</p>
      <NuxtLink to="/dashboard" class="btn btn--primary">لوحة التحكم</NuxtLink>
    </div>

    <div v-else-if="!loaded" class="kds__empty"><div class="spinner spinner--lg" /></div>

    <main v-else class="kds__board">
      <section v-for="column in COLUMNS" :key="column.status" class="kds__column">
        <h2 :class="`is-${column.status}`">
          {{ column.title }}
          <span class="kds__count">{{ formatNumber(byStatus(column.status).length) }}</span>
        </h2>
        <div class="kds__cards">
          <p v-if="!byStatus(column.status).length" class="kds__none">{{ column.empty }}</p>
          <article
            v-for="order in byStatus(column.status)"
            :key="order.id"
            class="kds__card"
            :class="[`is-${urgency(order)}`, { 'is-fresh': fresh.has(order.id) }]"
          >
            <div class="kds__head">
              <strong class="kds__no">#{{ order.ticketNo }}</strong>
              <span class="kds__type">{{ typeLabel(order) }}</span>
              <span class="kds__timer" dir="ltr">{{ elapsed(order) }}</span>
            </div>
            <div class="kds__meta">
              <span v-if="order.round > 1" class="badge doc-status--progress">
                إضافة ({{ order.round }})
              </span>
              <span v-if="order.label">{{ order.label }}</span>
              <span v-if="order.cashierName" class="kds__muted">{{ order.cashierName }}</span>
            </div>
            <ul class="kds__lines">
              <li
                v-for="(line, index) in order.lines"
                :key="index"
                :class="{ 'is-cancel': line.quantity < 0 }"
              >
                <strong dir="ltr">{{ formatNumber(Math.abs(line.quantity)) }}×</strong>
                <span>
                  <template v-if="line.quantity < 0">إلغاء: </template>{{ line.name }}
                  <small v-if="line.unitName" class="kds__muted"> ({{ line.unitName }})</small>
                  <em v-if="line.note">{{ line.note }}</em>
                </span>
              </li>
            </ul>
            <p v-if="order.note" class="kds__note">{{ order.note }}</p>
            <div class="kds__buttons">
              <template v-if="order.status === 'new'">
                <button class="btn btn--primary" :disabled="busy.has(order.id)" @click="move(order, 'preparing')">
                  ابدأ التحضير
                </button>
                <button class="btn btn--ghost" :disabled="busy.has(order.id)" @click="move(order, 'ready')">
                  جاهز
                </button>
              </template>
              <template v-else-if="order.status === 'preparing'">
                <button class="btn btn--success" :disabled="busy.has(order.id)" @click="move(order, 'ready')">
                  <Check :size="16" /> جاهز
                </button>
                <button
                  class="btn btn--ghost btn--icon"
                  title="رجوع لجديد"
                  :disabled="busy.has(order.id)"
                  @click="move(order, 'new')"
                >
                  <Undo2 :size="16" />
                </button>
              </template>
              <template v-else>
                <button class="btn btn--primary" :disabled="busy.has(order.id)" @click="move(order, 'served')">
                  تم التسليم
                </button>
                <button
                  class="btn btn--ghost btn--icon"
                  title="رجوع للتحضير"
                  :disabled="busy.has(order.id)"
                  @click="move(order, 'preparing')"
                >
                  <Undo2 :size="16" />
                </button>
              </template>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  Check,
  ChefHat,
  Lock,
  LogOut,
  Maximize,
  Undo2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-vue-next";
import { NetworkError } from "@/composables/useConnection";
import { useToast } from "@/composables/useToast";
import type { KitchenOrderRecord, KitchenOrderStatus } from "@/pos/types";
import { useBranchesStore } from "@/stores/branches";
import { usePosAdminStore } from "@/stores/posAdmin";
import { installSoundUnlock, playSound } from "@/utils/sounds";

definePageMeta({ middleware: "auth", layout: "pos" });
useHead({ title: "شاشة المطبخ" });

const COLUMNS: { status: "new" | "preparing" | "ready"; title: string; empty: string }[] = [
  { status: "new", title: "جديد", empty: "لا طلبات جديدة" },
  { status: "preparing", title: "قيد التحضير", empty: "لا شيء على النار" },
  { status: "ready", title: "جاهز للتسليم", empty: "لا طلبات جاهزة" },
];
/** كل كم تسأل الشاشة عن الطلبات */
const POLL_MS = 5_000;
/** دقائق بعدها يصير الطلب متأخراً (أصفر ثم أحمر) */
const LATE_MIN = 10;
const VERY_LATE_MIN = 20;
const MUTE_KEY = "stb-kds-muted";

const store = usePosAdminStore();
const branches = useBranchesStore();
const toast = useToast();

const orders = ref<KitchenOrderRecord[]>([]);
const loaded = ref(false);
const online = ref(true);
const denied = ref("");
const branchId = ref("");
const busy = ref(new Set<string>());
/** طلبات وصلت للتو: تومض لحظات */
const fresh = ref(new Set<string>());
const known = new Set<string>();
const muted = ref(false);

const now = ref(Date.now());
const clock = computed(() =>
  new Date(now.value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
);

const byStatus = (status: KitchenOrderStatus) => orders.value.filter((o) => o.status === status);

const typeLabel = (order: KitchenOrderRecord) => {
  if (order.orderType === "dine_in") return order.tableName || "صالة";
  return order.orderType === "delivery" ? "توصيل" : "سفري";
};

const minutes = (order: KitchenOrderRecord) =>
  Math.max(0, (now.value - new Date(order.sentAt).getTime()) / 60_000);

const elapsed = (order: KitchenOrderRecord) => {
  const total = Math.floor(minutes(order) * 60);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
};

/** الجاهز لا يتأخر؛ غيره بلونه حسب مدته */
const urgency = (order: KitchenOrderRecord) => {
  if (order.status === "ready") return "done";
  const m = minutes(order);
  return m >= VERY_LATE_MIN ? "late" : m >= LATE_MIN ? "warn" : "ok";
};

const load = async () => {
  try {
    const next = await store.fetchKitchenBoard(branchId.value || undefined);
    const arrived = next.filter((o) => !known.has(o.id));
    next.forEach((o) => known.add(o.id));
    // أول تحميل ليس "وصولاً": لا صوت لما كان على الشاشة قبل فتحها
    if (loaded.value && arrived.length) {
      if (!muted.value) playSound("notification", "dashboard");
      arrived.forEach((o) => fresh.value.add(o.id));
      setTimeout(() => arrived.forEach((o) => fresh.value.delete(o.id)), 8_000);
    }
    orders.value = next;
    online.value = true;
    denied.value = "";
    loaded.value = true;
  } catch (e) {
    loaded.value = true;
    // بلا اتصال: تبقى آخر طلبات معروفة وتُعاد المحاولة مع الدورة التالية
    if (e instanceof NetworkError) {
      online.value = false;
      return;
    }
    // رفض السيرفر (صلاحية، باقة): لا جدوى من الطلبات المعروضة
    denied.value = getErrorMessage(
      e,
      "شاشة المطبخ تحتاج صلاحية «شاشة المطبخ» وباقة فيها المطاعم",
    );
  }
};

const move = async (order: KitchenOrderRecord, status: KitchenOrderStatus) => {
  busy.value.add(order.id);
  try {
    const updated = await store.setKitchenStatus(order.id, status);
    orders.value =
      status === "served" || status === "cancelled"
        ? orders.value.filter((o) => o.id !== order.id)
        : orders.value.map((o) => (o.id === order.id ? updated : o));
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحديث الطلب"));
    void load();
  } finally {
    busy.value.delete(order.id);
  }
};

const toggleMute = () => {
  muted.value = !muted.value;
  try {
    localStorage.setItem(MUTE_KEY, muted.value ? "1" : "0");
  } catch {
    // لهذه الجلسة فقط
  }
};

const toggleFullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
};

let poll: ReturnType<typeof setInterval> | null = null;
let tick: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  installSoundUnlock();
  try {
    muted.value = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    // بالصوت
  }
  branches.fetchOptions().catch(() => {});
  await load();
  poll = setInterval(() => void load(), POLL_MS);
  tick = setInterval(() => (now.value = Date.now()), 1_000);
});

onBeforeUnmount(() => {
  if (poll) clearInterval(poll);
  if (tick) clearInterval(tick);
});
</script>

<style lang="scss" scoped>
.kds {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: $stb-text-primary;
}
.kds__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $space-2 $space-4;
  padding: $space-3 $space-4;
  background: $stb-surface;
  border-bottom: 1px solid $stb-border;
}
.kds__title {
  display: flex;
  align-items: center;
  gap: $space-3;

  h1 {
    margin: 0;
    font-size: $font-size-xl;
  }
}
.kds__clock {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $stb-text-secondary;
}
.kds__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-2;
}
.kds__branch {
  width: auto;
  min-width: 160px;
}
.kds__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: $font-size-xs;

  &.is-on {
    color: $stb-success;
  }
  &.is-off {
    color: $stb-danger;
  }
}
.kds__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-4;
  padding: $space-8;
  text-align: center;
  color: $stb-text-secondary;
}
.kds__board {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $space-3;
  min-height: 0;
  padding: $space-3;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
}
.kds__column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-lg;

  h2 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    padding: $space-3 $space-4;
    font-size: $font-size-lg;
    border-bottom: 3px solid $stb-border-light;

    &.is-new {
      border-color: $stb-info;
    }
    &.is-preparing {
      border-color: $stb-warning;
    }
    &.is-ready {
      border-color: $stb-success;
    }
  }
}
.kds__count {
  min-width: 32px;
  padding: 0 $space-2;
  font-size: $font-size-base;
  text-align: center;
  background: $stb-surface-3;
  border-radius: $radius-full;
}
.kds__cards {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  min-height: 0;
  padding: $space-3;
  overflow-y: auto;
}
.kds__none {
  margin: $space-6 0;
  text-align: center;
  color: $stb-text-muted;
}
.kds__card {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-3;
  background: $stb-surface-2;
  border: 2px solid $stb-border-light;
  border-inline-start-width: 6px;
  border-radius: $radius-md;

  &.is-ok {
    border-inline-start-color: $stb-success;
  }
  &.is-warn {
    border-inline-start-color: $stb-warning;
  }
  &.is-late {
    border-inline-start-color: $stb-danger;

    .kds__timer {
      color: $stb-danger;
    }
  }
  &.is-done {
    border-inline-start-color: $stb-success;
    background: rgba($stb-success, 0.08);
  }
  &.is-fresh {
    animation: kds-fresh 1s ease-in-out 4;
  }
}
@keyframes kds-fresh {
  50% {
    box-shadow: 0 0 0 4px rgba($stb-accent, 0.45);
  }
}
.kds__head {
  display: flex;
  align-items: baseline;
  gap: $space-3;
}
.kds__no {
  font-size: 1.75rem;
  line-height: 1;
}
.kds__type {
  flex: 1;
  font-size: $font-size-lg;
  font-weight: 800;
}
.kds__timer {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $stb-text-secondary;
}
.kds__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-sm;
}
.kds__muted {
  color: $stb-text-muted;
}
.kds__lines {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: $font-size-lg;

  li {
    display: flex;
    gap: $space-2;
    padding: $space-1 0;
    border-bottom: 1px dashed $stb-border;
  }
  em {
    display: block;
    font-size: $font-size-sm;
    font-style: normal;
    font-weight: 700;
    color: $stb-warning;
  }
  .is-cancel {
    color: $stb-danger;
    font-weight: 800;
  }
}
.kds__note {
  margin: 0;
  font-weight: 700;
  color: $stb-warning;
}
.kds__buttons {
  display: flex;
  gap: $space-2;

  .btn:not(.btn--icon) {
    flex: 1;
    justify-content: center;
    padding-block: $space-3;
    font-size: $font-size-base;
  }
}
</style>
