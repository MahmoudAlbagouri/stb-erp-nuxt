<!--
  pages/driver.vue — شاشة الطيار على جواله.

  تُفتح برابط يصدره المدير من صفحة الطيارين (‎/driver?a=…&k=…): الرابط يُحفظ
  في متصفح الجوال ثم يُزال من شريط العنوان، فلا يحتاج الطيار حساباً ولا كلمة
  مرور. يرى أوردراته وحده: يستلمها، يسلّمها، أو يسجّل أنها لم تُسلَّم.
-->
<template>
  <div class="driver" dir="rtl">
    <!-- ══ بلا رابط ══ -->
    <div v-if="!credentials" class="driver__empty">
      <Bike :size="56" />
      <h1>شاشة الطيار</h1>
      <p>{{ authError || "افتح الرابط الذي أرسله لك المدير لتظهر أوردراتك هنا." }}</p>
    </div>

    <template v-else>
      <header class="driver__header">
        <div>
          <small>{{ board?.company }}</small>
          <h1>{{ board?.agent.name ?? "…" }}</h1>
        </div>
        <button
          class="driver__icon-btn"
          :class="{ 'is-spinning': loading }"
          aria-label="تحديث"
          @click="load"
        >
          <RefreshCw :size="20" />
        </button>
      </header>

      <section class="driver__held">
        <div>
          <span>معك الآن للمحل</span>
          <strong>{{ formatCurrency(board?.agent.heldAmount ?? 0) }}</strong>
        </div>
        <div>
          <span>في الطريق: يُحصَّل</span>
          <strong>{{ formatCurrency(toCollect) }}</strong>
        </div>
      </section>

      <p v-if="error" class="driver__error">
        <WifiOff :size="16" /> {{ error }}
      </p>

      <nav class="driver__tabs">
        <button :class="{ 'is-active': tab === 'open' }" @click="tab = 'open'">
          أوردراتي ({{ openOrders.length }})
        </button>
        <button :class="{ 'is-active': tab === 'done' }" @click="tab = 'done'">
          أنهيته اليوم ({{ doneOrders.length }})
        </button>
      </nav>

      <div v-if="!board && loading" class="driver__state">جارٍ التحميل…</div>
      <div v-else-if="!visible.length" class="driver__state">
        {{ tab === "open" ? "لا أوردرات معك الآن 👌" : "لم تُنهِ أوردرات اليوم بعد" }}
      </div>

      <article
        v-for="o in visible"
        :key="o.id"
        class="driver__card"
        :class="`is-${o.status}`"
      >
        <div class="driver__card-head">
          <code>{{ o.number }}</code>
          <span class="driver__badge">{{ STATUS_LABEL[o.status] }}</span>
        </div>

        <h2>{{ o.recipientName }}</h2>
        <p class="driver__address">
          <MapPin :size="16" />
          <span>
            <template v-if="o.zone">{{ o.zone.name }} — </template>{{ o.address }}
          </span>
        </p>
        <p v-if="o.note" class="driver__note">📝 {{ o.note }}</p>

        <div class="driver__money" :class="{ 'is-paid': o.paymentMode !== 'cod' }">
          <template v-if="o.paymentMode === 'cod' && o.status !== 'failed'">
            <span>حصّل من العميل</span>
            <strong>{{ formatCurrency(o.codAmount || o.invoice.total) }}</strong>
          </template>
          <template v-else-if="o.status === 'failed'">
            <span>لم يُسلَّم</span>
            <strong>{{ o.failReason }}</strong>
          </template>
          <template v-else>
            <span>مدفوع مقدماً</span>
            <strong>لا تحصّل شيئاً</strong>
          </template>
        </div>

        <details v-if="o.invoice.lines?.length" class="driver__items">
          <summary>الأصناف ({{ itemsOf(o).length }})</summary>
          <ul>
            <li v-for="line in itemsOf(o)" :key="line.id">
              <span>{{ line.productName }}</span>
              <span>× {{ formatNumber(line.quantity) }} {{ line.unitName }}</span>
            </li>
          </ul>
        </details>

        <div class="driver__contact">
          <a :href="`tel:${o.phone}`"><Phone :size="18" /> اتصال</a>
          <a :href="whatsapp(o)" target="_blank" rel="noopener">
            <MessageCircle :size="18" /> واتساب
          </a>
          <a :href="mapLink(o)" target="_blank" rel="noopener">
            <Navigation :size="18" /> الخريطة
          </a>
        </div>

        <div v-if="o.status === 'assigned'" class="driver__actions">
          <button class="is-primary" :disabled="busyId === o.id" @click="act(o, 'pickup')">
            <Truck :size="20" /> استلمته وخرجت
          </button>
        </div>
        <div v-else-if="o.status === 'out_for_delivery'" class="driver__actions">
          <button class="is-success" :disabled="busyId === o.id" @click="confirmDeliver(o)">
            <PackageCheck :size="20" /> تم التسليم
          </button>
          <button class="is-ghost" :disabled="busyId === o.id" @click="openFail(o)">
            <PackageX :size="20" /> لم يُسلَّم
          </button>
        </div>
      </article>
    </template>

    <!-- ══ تأكيد التسليم ══ -->
    <div v-if="deliverTarget" class="driver__sheet" @click.self="deliverTarget = null">
      <div class="driver__sheet-body">
        <h3>تسليم {{ deliverTarget.number }}</h3>
        <p v-if="deliverTarget.paymentMode === 'cod'">
          تأكد أنك استلمت
          <strong>{{ formatCurrency(deliverTarget.codAmount || deliverTarget.invoice.total) }}</strong>
          من {{ deliverTarget.recipientName }}
        </p>
        <p v-else>الأوردر مدفوع مقدماً — سلّمه فقط.</p>
        <div class="driver__actions">
          <button class="is-success" :disabled="!!busyId" @click="deliverNow">تأكيد التسليم</button>
          <button class="is-ghost" @click="deliverTarget = null">رجوع</button>
        </div>
      </div>
    </div>

    <!-- ══ لم يُسلَّم ══ -->
    <div v-if="failTarget" class="driver__sheet" @click.self="failTarget = null">
      <div class="driver__sheet-body">
        <h3>لم يُسلَّم {{ failTarget.number }}</h3>
        <div class="driver__reasons">
          <button
            v-for="r in FAIL_REASONS"
            :key="r"
            :class="{ 'is-active': failReason === r }"
            @click="failReason = r"
          >
            {{ r }}
          </button>
        </div>
        <input v-model.trim="failReason" class="form-input" maxlength="300" placeholder="أو اكتب السبب" />
        <p class="driver__hint">ارجع بالبضاعة للمحل — تعود للمخزن تلقائياً.</p>
        <div class="driver__actions">
          <button class="is-danger" :disabled="!failReason || !!busyId" @click="failNow">
            تسجيل عدم التسليم
          </button>
          <button class="is-ghost" @click="failTarget = null">رجوع</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  Bike,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  PackageX,
  Phone,
  RefreshCw,
  Truck,
  WifiOff,
} from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import type { DeliveryOrder, DeliveryOrderStatus } from "@/types/delivery";

definePageMeta({ layout: false });
useHead({ title: "شاشة الطيار" });

interface DriverBoard {
  agent: { id: string; name: string; heldAmount: number; unsettledCount: number };
  company: string;
  orders: DeliveryOrder[];
}

const STORAGE_KEY = "stb-driver";
const POLL_MS = 30_000;

const STATUS_LABEL: Record<DeliveryOrderStatus, string> = {
  new: "جديد",
  assigned: "عندك — لم تخرج",
  out_for_delivery: "في الطريق",
  delivered: "سُلّم",
  failed: "لم يُسلَّم",
  cancelled: "ملغي",
};

const FAIL_REASONS = [
  "العميل رفض الاستلام",
  "العميل لا يرد",
  "العنوان غير صحيح",
  "العميل طلب التأجيل",
  "تلف أثناء التوصيل",
];

const toast = useToast();
const route = useRoute();
const router = useRouter();
const apiBase = useRuntimeConfig().public.apiBase;

const credentials = ref<{ a: string; k: string } | null>(null);
const authError = ref("");
const board = ref<DriverBoard | null>(null);
const loading = ref(false);
const error = ref("");
const tab = ref<"open" | "done">("open");
const busyId = ref<string | null>(null);

const openOrders = computed(() =>
  (board.value?.orders ?? []).filter(
    (o) => o.status === "assigned" || o.status === "out_for_delivery",
  ),
);
const doneOrders = computed(() =>
  (board.value?.orders ?? []).filter(
    (o) => o.status === "delivered" || o.status === "failed",
  ),
);
const visible = computed(() => (tab.value === "open" ? openOrders.value : doneOrders.value));
const toCollect = computed(() =>
  sumMoney(
    openOrders.value
      .filter((o) => o.paymentMode === "cod")
      .map((o) => o.codAmount || o.invoice.total),
  ),
);

/** أصناف الأوردر بلا سطر رسوم التوصيل (خدمة لا تُسلَّم) */
const itemsOf = (o: DeliveryOrder) => (o.invoice.lines ?? []).filter((l) => l.isStocked);

const whatsapp = (o: DeliveryOrder) => {
  const text = `مرحباً ${o.recipientName}، معك طيار ${board.value?.company ?? ""} بطلبك رقم ${o.number}`;
  return `https://wa.me/${o.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
};

const mapLink = (o: DeliveryOrder) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [o.address, o.zone?.name].filter(Boolean).join("، "),
  )}`;

// ─── الاتصال بالسيرفر (برابط الطيار، بلا جلسة مستخدم) ─────────────────────────
class LinkError extends Error {}

const call = async <T,>(method: "GET" | "POST", path: string, body?: object): Promise<T> => {
  const creds = credentials.value!;
  let res: Response;
  try {
    res = await fetch(`${apiBase}/delivery/driver${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Driver-Agent": creds.a,
        "X-Driver-Key": creds.k,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("لا يوجد اتصال بالإنترنت");
  }
  const json = (await res.json().catch(() => null)) as {
    data?: T;
    message?: string | string[];
  } | null;
  if (!res.ok) {
    const message =
      (Array.isArray(json?.message) ? json?.message[0] : json?.message) ||
      `تعذر تنفيذ الطلب (${res.status})`;
    if (res.status === 401) throw new LinkError(message);
    throw new Error(message);
  }
  return json?.data as T;
};

const handleError = (e: unknown) => {
  if (e instanceof LinkError) {
    // الرابط أُبطل: لا نعيد المحاولة به
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // التخزين غير متاح
    }
    credentials.value = null;
    authError.value = e.message;
    return;
  }
  error.value = (e as Error).message;
};

const load = async () => {
  if (!credentials.value) return;
  loading.value = true;
  try {
    board.value = await call<DriverBoard>("GET", "/board");
    error.value = "";
  } catch (e) {
    handleError(e);
  } finally {
    loading.value = false;
  }
};

const act = async (o: DeliveryOrder, action: "pickup" | "deliver", body?: object) => {
  busyId.value = o.id;
  try {
    await call("POST", `/orders/${o.id}/${action}`, body);
    toast.success(action === "pickup" ? `خرجت بالأوردر ${o.number}` : `تم تسليم ${o.number}`);
    await load();
  } catch (e) {
    toast.error((e as Error).message);
    handleError(e);
    await load();
  } finally {
    busyId.value = null;
  }
};

const deliverTarget = ref<DeliveryOrder | null>(null);
const confirmDeliver = (o: DeliveryOrder) => (deliverTarget.value = o);
const deliverNow = async () => {
  const o = deliverTarget.value;
  if (!o) return;
  deliverTarget.value = null;
  await act(o, "deliver");
};

const failTarget = ref<DeliveryOrder | null>(null);
const failReason = ref("");
const openFail = (o: DeliveryOrder) => {
  failTarget.value = o;
  failReason.value = "";
};
const failNow = async () => {
  const o = failTarget.value;
  if (!o || !failReason.value) return;
  busyId.value = o.id;
  try {
    await call("POST", `/orders/${o.id}/fail`, { reason: failReason.value });
    toast.success("سُجّل — ارجع بالبضاعة للمحل");
    failTarget.value = null;
    await load();
  } catch (e) {
    toast.error((e as Error).message);
    handleError(e);
  } finally {
    busyId.value = null;
  }
};

// ─── الرابط والتحديث الدوري ───────────────────────────────────────────────────
let poller: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  const a = typeof route.query.a === "string" ? route.query.a : "";
  const k = typeof route.query.k === "string" ? route.query.k : "";
  if (a && k) {
    credentials.value = { a, k };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials.value));
    } catch {
      // التخزين غير متاح: يعمل الرابط ما دامت الصفحة مفتوحة
    }
    // المفتاح لا يبقى في شريط العنوان ولا في السجل
    await router.replace({ path: "/driver" });
  } else {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved?.a && saved?.k) credentials.value = saved;
    } catch {
      // لا رابط محفوظ
    }
  }
  await load();
  poller = setInterval(() => {
    if (document.visibilityState === "visible" && !busyId.value) void load();
  }, POLL_MS);
});

onBeforeUnmount(() => {
  if (poller) clearInterval(poller);
});
</script>

<style lang="scss">
.driver {
  min-height: 100vh;
  min-height: 100dvh;
  max-width: 560px;
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

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-top: 30vh;
    text-align: center;
    color: var(--stb-text-secondary);
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

    &.is-spinning svg {
      animation: driver-spin 0.8s linear infinite;
    }
  }

  &__held {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;

    div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px;
      border: 1px solid var(--stb-border);
      border-radius: 14px;
      background: var(--stb-surface);
    }
    span {
      font-size: 0.8rem;
      color: var(--stb-text-muted);
    }
    strong {
      font-size: 1.15rem;
    }
  }

  &__error {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 10px;
    color: var(--stb-warning);
    background: color-mix(in srgb, var(--stb-warning) 12%, transparent);
  }

  &__tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin: 8px 0 12px;

    button {
      padding: 10px;
      border: 1px solid var(--stb-border);
      border-radius: 12px;
      font: inherit;
      font-weight: 700;
      color: var(--stb-text-secondary);
      background: transparent;

      &.is-active {
        color: var(--stb-on-accent);
        background: var(--stb-accent);
        border-color: var(--stb-accent);
      }
    }
  }

  &__state {
    padding: 40px 0;
    text-align: center;
    color: var(--stb-text-muted);
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
    padding: 14px;
    border: 1px solid var(--stb-border);
    border-radius: 16px;
    background: var(--stb-surface);

    &.is-out_for_delivery {
      border-color: var(--stb-accent);
    }
    &.is-delivered,
    &.is-failed {
      opacity: 0.75;
    }
    h2 {
      font-size: 1.2rem;
    }
  }

  &__card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    code {
      color: var(--stb-text-muted);
    }
  }

  &__badge {
    padding: 2px 10px;
    border-radius: 99px;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--stb-accent);
    background: color-mix(in srgb, var(--stb-accent) 14%, transparent);
  }

  &__address {
    display: flex;
    gap: 6px;
    margin: 0;
    color: var(--stb-text-secondary);

    svg {
      flex-shrink: 0;
      margin-top: 3px;
    }
  }

  &__note {
    margin: 0;
    color: var(--stb-text-secondary);
  }

  &__money {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--stb-warning) 14%, transparent);

    strong {
      font-size: 1.25rem;
    }
    &.is-paid {
      background: color-mix(in srgb, var(--stb-success) 14%, transparent);
    }
  }

  &__items {
    color: var(--stb-text-secondary);

    summary {
      cursor: pointer;
      font-weight: 700;
    }
    ul {
      margin: 6px 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px dashed var(--stb-border);
    }
  }

  &__contact {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;

    a {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 10px 4px;
      border: 1px solid var(--stb-border);
      border-radius: 12px;
      font-weight: 700;
      color: var(--stb-text-primary);
      text-decoration: none;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;

    button {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 52px;
      border: 1px solid transparent;
      border-radius: 14px;
      font: inherit;
      font-size: 1.05rem;
      font-weight: 800;
      color: #fff;

      &:disabled {
        opacity: 0.6;
      }
      &.is-primary {
        background: var(--stb-accent);
      }
      &.is-success {
        background: var(--stb-success);
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
    gap: 12px;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    padding: 20px 16px 28px;
    border-radius: 20px 20px 0 0;
    background: var(--stb-surface);

    p {
      margin: 0;
    }
  }

  &__reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    button {
      padding: 8px 12px;
      border: 1px solid var(--stb-border);
      border-radius: 99px;
      font: inherit;
      color: var(--stb-text-primary);
      background: transparent;

      &.is-active {
        border-color: var(--stb-danger);
        color: var(--stb-danger);
      }
    }
  }

  &__hint {
    font-size: 0.85rem;
    color: var(--stb-text-muted);
  }
}

@keyframes driver-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
