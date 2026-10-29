<!-- pages/dashboard/notifications.vue — مركز الإشعارات -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>مركز الإشعارات</h1>
        <p>
          تنبيهاتك ورسائل الإدارة لحظة بلحظة
          <span class="live" :class="{ 'is-live': store.connected }">
            {{ store.connected ? "متصل" : "يعيد الاتصال..." }}
          </span>
        </p>
      </div>
      <div class="page-header__actions">
        <button v-if="canCreate" class="btn btn--primary" @click="composeOpen = true">
          <Send :size="18" /><span>رسالة للموظفين</span>
        </button>
        <button class="btn btn--outline" @click="prefsOpen = true">
          <Settings2 :size="18" /><span>ما يصلني</span>
        </button>
      </div>
    </div>

    <div v-if="tabs.length > 1" class="nc-tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        class="nc-tab"
        :class="{ active: tab === t.key }"
        :aria-selected="tab === t.key"
        @click="setTab(t.key)"
      >
        <component :is="t.icon" :size="16" />
        {{ t.label }}
        <span v-if="t.key === 'inbox' && store.unreadCount" class="nc-tab__count">
          {{ store.unreadCount }}
        </span>
      </button>
    </div>

    <!-- ═════════════ إشعاراتي ═════════════ -->
    <template v-if="tab === 'inbox'">
      <div class="card nc-toolbar">
        <div class="nc-groups" role="group" aria-label="المجموعات">
          <button
            class="nc-chip"
            :class="{ active: !store.inboxFilters.group }"
            @click="filterInbox({ group: null })"
          >
            الكل
          </button>
          <button
            v-for="g in store.catalog?.groups ?? []"
            :key="g.key"
            class="nc-chip"
            :class="{ active: store.inboxFilters.group === g.key }"
            @click="filterInbox({ group: g.key })"
          >
            {{ g.label }}
            <span v-if="store.unread.byGroup[g.key]" class="nc-chip__count">
              {{ store.unread.byGroup[g.key] }}
            </span>
          </button>
        </div>
        <div class="nc-toolbar__actions">
          <label class="nc-switch">
            <input
              type="checkbox"
              :checked="!!store.inboxFilters.unread"
              @change="filterInbox({ unread: !store.inboxFilters.unread })"
            />
            غير المقروء فقط
          </label>
          <button
            v-if="store.hasUnread"
            class="btn btn--ghost btn--sm"
            :disabled="busy"
            @click="markAllRead"
          >
            <CheckCheck :size="15" /> قراءة الكل
          </button>
          <button
            v-can="P.NOTIFICATION_DELETE"
            class="btn btn--ghost btn--sm"
            :disabled="busy"
            @click="hideRead"
          >
            <EyeOff :size="15" /> إخفاء المقروء
          </button>
        </div>
      </div>

      <div v-if="store.loading && !store.inbox" class="empty-state">
        <div class="spinner spinner--lg" />
      </div>
      <div v-else-if="!store.inbox?.data.length" class="card empty-card">
        <div class="empty-state">
          <BellOff :size="32" class="empty-icon" />
          <div class="empty-state__title">لا توجد إشعارات</div>
          <div class="empty-state__text">
            {{ store.inboxFilters.unread ? "قرأت كل شيء 👌" : "ستظهر هنا تنبيهاتك ورسائل الإدارة فور وصولها" }}
          </div>
        </div>
      </div>
      <div v-else class="nc-list">
        <button
          v-for="n in store.inbox.data"
          :key="n.id"
          class="nc-card"
          :class="{ 'is-unread': !n.readAt }"
          @click="store.openItem(n)"
        >
          <div class="nc-card__icon" :class="`sev-${n.severity}`">
            <component :is="iconOf(n.type)" :size="20" />
            <span v-if="!n.readAt" class="nc-card__dot" />
          </div>
          <div class="nc-card__content">
            <div class="nc-card__head">
              <h4>{{ n.title }}</h4>
              <time :title="formatDateTime(n.createdAt)">{{ timeAgo(n.createdAt) }}</time>
            </div>
            <p>{{ n.body }}</p>
            <div class="nc-card__meta">
              <span class="badge-soft" :class="`sev-${n.severity}`">
                {{ store.typeOf(n.type)?.label ?? store.groupLabel(n.group) }}
              </span>
              <span v-if="dueText(n.data)" class="nc-meta nc-meta--due">
                <Clock :size="12" /> {{ dueText(n.data) }}
              </span>
              <span v-if="n.sender" class="nc-meta">
                <UserRound :size="12" /> {{ n.sender.name }}
              </span>
              <span v-if="n.requiresAck && !n.acknowledgedAt" class="nc-meta nc-meta--ack">
                <ShieldAlert :size="12" /> يتطلب تأكيد الاطلاع
              </span>
            </div>
          </div>
          <ChevronLeft :size="18" class="nc-card__go" />
        </button>
        <DocPager
          :total="store.inbox.total"
          :page="store.inbox.page"
          :total-pages="store.inbox.totalPages"
          label="إشعار"
          @change="(page: number) => filterInbox({ page }, false)"
        />
      </div>
    </template>

    <!-- ═════════════ الرسائل المرسلة ═════════════ -->
    <template v-else-if="tab === 'sent'">
      <div v-if="!sent.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
      <div v-else-if="!sent.rows.value.length" class="card empty-card">
        <div class="empty-state">
          <Send :size="32" class="empty-icon" />
          <div class="empty-state__title">لم تُرسل رسائل بعد</div>
          <button class="btn btn--primary" @click="composeOpen = true">رسالة للموظفين</button>
        </div>
      </div>
      <div v-else class="nc-list">
        <button
          v-for="m in sent.rows.value"
          :key="m.id"
          class="nc-card"
          @click="store.openAdminRow(m)"
        >
          <div class="nc-card__icon" :class="`sev-${m.severity}`">
            <Megaphone :size="20" />
          </div>
          <div class="nc-card__content">
            <div class="nc-card__head">
              <h4>{{ m.title }}</h4>
              <time :title="formatDateTime(m.createdAt)">{{ timeAgo(m.createdAt) }}</time>
            </div>
            <p>{{ m.body }}</p>
            <div class="nc-progress" :title="`قرأها ${m.read} من ${m.recipients}`">
              <div class="nc-progress__bar">
                <span :style="{ width: percent(m.read, m.recipients) }" />
              </div>
              <small>
                قرأها {{ m.read }} من {{ m.recipients }}
                <template v-if="m.requiresAck"> · أكّد {{ m.acknowledged }}</template>
                <template v-if="m.sender"> · {{ m.sender.name }}</template>
              </small>
            </div>
          </div>
          <ChevronLeft :size="18" class="nc-card__go" />
        </button>
        <DocPager
          :total="sent.total.value"
          :page="sent.page.value"
          :total-pages="sent.totalPages.value"
          label="رسالة"
          @change="(page: number) => sent.load(page)"
        />
      </div>
    </template>

    <!-- ═════════════ إشعارات الشركة ═════════════ -->
    <template v-else-if="tab === 'company'">
      <div v-if="stats" class="grid-4 stats-row">
        <StatTile label="كل الإشعارات" :value="formatNumber(stats.total)" :icon="Bell" />
        <StatTile label="آخر 7 أيام" :value="formatNumber(stats.last7Days)" :icon="Clock" />
        <StatTile label="لم تُقرأ بعد" :value="formatNumber(stats.unreadDeliveries)" :icon="MailOpen" />
        <StatTile label="تنبيهات انتهاء لم تُقرأ" :value="formatNumber(stats.urgentUnread)" :icon="AlertTriangle" />
      </div>

      <div class="card nc-toolbar">
        <div class="nc-filters">
          <select v-model="companyFilters.group" class="form-select form-select--sm" @change="company.load(1)">
            <option :value="null">كل المجموعات</option>
            <option v-for="g in store.catalog?.groups ?? []" :key="g.key" :value="g.key">
              {{ g.label }}
            </option>
          </select>
          <div class="nc-search">
            <Search :size="15" />
            <input
              v-model="companyFilters.search"
              type="search"
              class="form-input form-input--sm"
              placeholder="بحث في العنوان أو باسم المستلم..."
              @input="debouncedSearch"
            />
          </div>
        </div>
        <button class="btn btn--ghost btn--sm" :disabled="busy" @click="runChecks">
          <RefreshCw :size="15" /> تشغيل الفحوص الآن
        </button>
      </div>

      <div v-if="!company.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
      <div v-else-if="!company.rows.value.length" class="card empty-card">
        <div class="empty-state">
          <BellOff :size="32" class="empty-icon" />
          <div class="empty-state__title">لا توجد إشعارات تطابق البحث</div>
        </div>
      </div>
      <div v-else class="nc-list">
        <button
          v-for="r in company.rows.value"
          :key="r.id"
          class="nc-card"
          @click="store.openAdminRow(r)"
        >
          <div class="nc-card__icon" :class="`sev-${r.severity}`">
            <component :is="iconOf(r.type)" :size="20" />
          </div>
          <div class="nc-card__content">
            <div class="nc-card__head">
              <h4>{{ r.title }}</h4>
              <time :title="formatDateTime(r.createdAt)">{{ timeAgo(r.createdAt) }}</time>
            </div>
            <p>{{ r.body }}</p>
            <div class="nc-card__meta">
              <span class="badge-soft" :class="`sev-${r.severity}`">
                {{ store.typeOf(r.type)?.label ?? store.groupLabel(r.group) }}
              </span>
              <span class="nc-meta">
                <Users :size="12" />
                {{ r.recipientName ?? `${r.recipients} مستلماً` }}
              </span>
              <span class="nc-meta">
                <CheckCheck :size="12" /> قرأه {{ r.read }}/{{ r.recipients }}
              </span>
            </div>
          </div>
          <ChevronLeft :size="18" class="nc-card__go" />
        </button>
        <DocPager
          :total="company.total.value"
          :page="company.page.value"
          :total-pages="company.totalPages.value"
          label="إشعار"
          @change="(page: number) => company.load(page)"
        />
      </div>
    </template>

    <NotificationComposeModal v-model="composeOpen" @sent="onSent" />
    <NotificationPreferencesModal v-model="prefsOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Building2,
  CheckCheck,
  ChevronLeft,
  Clock,
  EyeOff,
  Inbox,
  MailOpen,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-vue-next";
import StatTile from "@/components/dashboard/StatTile.vue";
import { useNotificationsStore } from "@/stores/notifications";
import { useToast } from "@/composables/useToast";
import { useAccess } from "@/composables/useAccess";
import { usePagedList } from "@/composables/usePagedList";
import { dueText, notificationIcon, timeAgo } from "@/utils/notifications";
import { formatDateTime, formatNumber } from "@/utils/format";
import type {
  AdminNotificationsFilters,
  InboxFilters,
  NotificationAdminStats,
} from "@/types/notifications";

definePageMeta({ middleware: "auth" });

type Tab = "inbox" | "sent" | "company";

const store = useNotificationsStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const { can, P } = useAccess();

const canCreate = computed(() => can(P.NOTIFICATION_CREATE));
const canViewAll = computed(() => can(P.NOTIFICATION_VIEW_ALL));

const tabs = computed(() => [
  { key: "inbox" as const, label: "إشعاراتي", icon: Inbox },
  ...(canCreate.value
    ? [{ key: "sent" as const, label: "الرسائل المرسلة", icon: Send }]
    : []),
  ...(canViewAll.value
    ? [{ key: "company" as const, label: "إشعارات الشركة", icon: Building2 }]
    : []),
]);

const tab = computed<Tab>(() => {
  const wanted = route.query.tab as Tab | undefined;
  return tabs.value.some((t) => t.key === wanted) ? wanted! : "inbox";
});
const setTab = (key: Tab) =>
  router.replace({ query: { ...route.query, tab: key === "inbox" ? undefined : key } });

const composeOpen = ref(false);
const prefsOpen = ref(false);
const busy = ref(false);

const iconOf = (type: string) => notificationIcon(store.typeOf(type)?.icon);
const percent = (part: number, whole: number) =>
  `${whole ? Math.round((part / whole) * 100) : 0}%`;

const run = async (action: () => Promise<unknown>) => {
  busy.value = true;
  try {
    await action();
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    busy.value = false;
  }
};

// ─── إشعاراتي ───
/** تغيير فلتر يعيد للصفحة الأولى، إلا تقليب الصفحات */
const filterInbox = (change: InboxFilters, resetPage = true) =>
  run(() => store.fetchInbox({ ...change, ...(resetPage ? { page: 1 } : {}) }));

const markAllRead = () =>
  run(async () => {
    await store.markAllRead(store.inboxFilters.group);
    toast.success("عُلّمت كمقروءة");
  });

const hideRead = () =>
  run(async () => {
    const hidden = await store.hideRead();
    toast.success(hidden ? `أُخفي ${hidden} إشعار مقروء` : "لا مقروء لإخفائه");
    await store.fetchInbox();
  });

// ─── الرسائل المرسلة ───
const sent = usePagedList((page) => store.sentMessages(page), "تعذر تحميل الرسائل");

const onSent = () => {
  if (tab.value === "sent") void sent.load(1);
  else setTab("sent");
};

// ─── إشعارات الشركة ───
const stats = ref<NotificationAdminStats | null>(null);
const companyFilters = reactive<AdminNotificationsFilters>({
  group: null,
  search: "",
  limit: 20,
});
const company = usePagedList(
  (page) => store.adminList({ ...companyFilters, page }),
  "تعذر تحميل إشعارات الشركة",
);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void company.load(1), 400);
};

const loadCompany = async () => {
  await Promise.all([
    company.load(1),
    store.adminStats().then((s) => (stats.value = s)),
  ]);
};

const runChecks = () =>
  run(async () => {
    const result = await store.runChecks();
    if (result.failed.length) {
      toast.warning(`تعذّر: ${result.failed.map((f) => f.check).join("، ")}`);
    } else {
      toast.success("اكتملت الفحوص — ما استجد ظهر في الإشعارات");
    }
    await loadCompany();
  });

// كل تبويب يُحمَّل عند فتحه
watch(
  tab,
  (current) => {
    if (current === "inbox") void filterInbox({}, false);
    else if (current === "sent") void sent.load(1);
    else void loadCompany();
  },
  { immediate: true },
);

onMounted(() => {
  void store.fetchCatalog().catch(() => undefined);
  void store.fetchUnread();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

$severities: (
  info: $stb-info,
  success: $stb-success,
  warning: $stb-warning,
  danger: $stb-danger,
);

.page-header {
  padding-bottom: $space-5;
  border-bottom: 1px solid rgba($stb-border, 0.6);
  &__title h1 {
    font-size: $font-size-2xl;
    letter-spacing: -0.01em;
  }
  &__title p {
    @include flex(row, center, flex-start, $space-2);
    flex-wrap: wrap;
  }
}
.page-header__actions {
  @include flex(row, center, flex-end, $space-3);
  flex-wrap: wrap;
}

.live {
  @include flex(row, center, center, 6px);
  font-size: $font-size-xs;
  color: $stb-text-muted;
  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }
  &.is-live {
    color: $stb-success;
  }
}

.nc-tabs {
  @include flex(row, center, flex-start, $space-2);
  margin: $space-5 0;
  border-bottom: 1px solid $stb-border;
  overflow-x: auto;
}
.nc-tab {
  @include flex(row, center, center, $space-2);
  padding: $space-3 $space-4;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: $stb-text-secondary;
  font: inherit;
  font-size: $font-size-sm;
  cursor: pointer;
  white-space: nowrap;
  margin-bottom: -1px;
  &.active {
    color: $stb-text-primary;
    border-bottom-color: $stb-primary;
    font-weight: 700;
  }
  &__count {
    min-width: 20px;
    padding: 0 6px;
    border-radius: $radius-full;
    background: $stb-danger;
    color: #fff;
    font-size: 11px;
    line-height: 18px;
  }
}

.nc-toolbar {
  @include flex(row, center, space-between, $space-3);
  flex-wrap: wrap;
  padding: $space-3 $space-4;
  margin-bottom: $space-4;
  &__actions {
    @include flex(row, center, flex-end, $space-2);
    flex-wrap: wrap;
  }
}

.nc-groups {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;
}
.nc-chip {
  @include flex(row, center, center, 6px);
  padding: 4px $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-full;
  background: transparent;
  color: $stb-text-secondary;
  font: inherit;
  font-size: $font-size-xs;
  cursor: pointer;
  &.active {
    background: rgba($stb-primary, 0.14);
    border-color: $stb-primary;
    color: $stb-text-primary;
    font-weight: 600;
  }
  &__count {
    min-width: 18px;
    padding: 0 5px;
    border-radius: $radius-full;
    background: $stb-danger;
    color: #fff;
    font-size: 10px;
    line-height: 16px;
  }
}

.nc-switch {
  @include flex(row, center, center, $space-2);
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  cursor: pointer;
}

.nc-filters {
  @include flex(row, center, flex-start, $space-3);
  flex-wrap: wrap;
  flex: 1;
}
.nc-search {
  position: relative;
  flex: 1;
  min-width: 200px;
  svg {
    position: absolute;
    inset-inline-start: $space-3;
    top: 50%;
    transform: translateY(-50%);
    color: $stb-text-muted;
  }
  input {
    width: 100%;
    padding-inline-start: $space-8;
  }
}

.stats-row {
  margin-bottom: $space-5;
}

.nc-list {
  @include flex(column, stretch, flex-start, $space-3);
}

.nc-card {
  @include glass-card;
  @include flex(row, flex-start, flex-start, $space-4);
  width: 100%;
  padding: $space-4;
  border: 1px solid transparent;
  border-inline-start: 3px solid transparent;
  text-align: start;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: all $transition-fast;
  &:hover,
  &:focus-visible {
    border-color: rgba($stb-border-light, 0.6);
    .nc-card__go {
      opacity: 1;
    }
  }
  &.is-unread {
    border-inline-start-color: $stb-accent;
    background: linear-gradient(
      270deg,
      rgba($stb-accent, 0.04) 0%,
      $stb-surface-2 100%
    );
  }
  &__icon {
    position: relative;
    width: 42px;
    height: 42px;
    border-radius: $radius-lg;
    @include flex(row, center, center);
    flex-shrink: 0;
  }
  &__dot {
    position: absolute;
    top: -2px;
    inset-inline-end: -2px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: $stb-accent;
    border: 2px solid $stb-surface-2;
  }
  &__content {
    flex: 1;
    min-width: 0;
    p {
      margin: $space-1 0 $space-2;
      font-size: $font-size-sm;
      color: $stb-text-secondary;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
  &__head {
    @include flex(row, flex-start, space-between, $space-3);
    h4 {
      margin: 0;
      font-size: $font-size-base;
      font-weight: 700;
      color: $stb-text-primary;
    }
    time {
      font-size: $font-size-xs;
      color: $stb-text-muted;
      white-space: nowrap;
    }
  }
  &__meta {
    @include flex(row, center, flex-start, $space-3);
    flex-wrap: wrap;
  }
  &__go {
    align-self: center;
    color: $stb-text-muted;
    opacity: 0.4;
    transition: opacity $transition-fast;
    flex-shrink: 0;
  }
}

@each $name, $color in $severities {
  .sev-#{$name} {
    background: rgba($color, 0.12);
    color: $color;
  }
}

.badge-soft {
  padding: 2px $space-2;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 600;
}
.nc-meta {
  @include flex(row, center, center, 4px);
  font-size: $font-size-xs;
  color: $stb-text-muted;
  &--due {
    color: $stb-warning;
    font-weight: 600;
  }
  &--ack {
    color: $stb-warning;
  }
}

.nc-progress {
  @include flex(column, stretch, flex-start, 4px);
  &__bar {
    height: 6px;
    border-radius: $radius-full;
    background: $stb-surface-3;
    overflow: hidden;
    span {
      display: block;
      height: 100%;
      background: $stb-success;
      border-radius: inherit;
    }
  }
  small {
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
}

.empty-card .empty-state {
  padding: $space-12 $space-8;
}
.empty-icon {
  color: $stb-text-muted;
}

@include respond-to("sm") {
  .nc-card {
    gap: $space-3;
    padding: $space-3;
    &__go {
      display: none;
    }
  }
  .nc-toolbar__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
