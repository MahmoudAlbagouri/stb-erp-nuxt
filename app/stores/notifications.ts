// stores/notifications.ts — مركز الإشعارات: الصندوق، العدّاد، البث اللحظي،
// لوحة المدير، رسائل الإدارة، والكتم.
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useApi } from "../composables/useApi";
import { readEventStream } from "../utils/notifications";
import type { Paginated } from "@/types/catalog";
import type {
  AdminNotificationRow,
  AdminNotificationsFilters,
  ChecksResult,
  InboxFilters,
  InboxPage,
  MessageAudience,
  MessageReach,
  NotificationAdminStats,
  NotificationCatalog,
  NotificationDetailTarget,
  NotificationGroup,
  NotificationItem,
  NotificationRecipientRow,
  NotificationTypeDef,
  SendMessagePayload,
  UnreadSummary,
} from "@/types/notifications";

const BASE = "/notifications";
/** ما يعرضه الجرس */
const RECENT_LIMIT = 12;
/** انتظار إعادة الاتصال يتضاعف حتى هذا الحد */
const MAX_RETRY_MS = 30_000;

/** حدث مزامنة من تبويب آخر للمستخدم نفسه (انظر InboxSync في الباك إند) */
interface InboxSync {
  action: "read" | "read_all" | "acknowledged" | "hidden" | "removed";
  ids?: string[];
  unread?: number;
}

const query = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const useNotificationsStore = defineStore("notifications", () => {
  const api = useApi();

  // ─── الحالة ────────────────────────────────────────────
  const catalog = ref<NotificationCatalog | null>(null);
  const unread = ref<UnreadSummary>({ count: 0, byGroup: {} });
  /** آخر الإشعارات (الجرس) */
  const recent = ref<NotificationItem[]>([]);
  const recentLoaded = ref(false);
  /** صفحة الإشعارات */
  const inbox = ref<InboxPage | null>(null);
  const inboxFilters = ref<InboxFilters>({ page: 1, limit: 20 });
  const loading = ref(false);
  /** درج التفاصيل (مشترك بين الجرس والصفحة) */
  const detail = ref<NotificationDetailTarget | null>(null);
  const connected = ref(false);

  // ─── المشتقات ──────────────────────────────────────────
  const unreadCount = computed(() => unread.value.count);
  const hasUnread = computed(() => unread.value.count > 0);
  const typeMap = computed(
    () => new Map((catalog.value?.types ?? []).map((t) => [t.key, t])),
  );
  const groupLabel = (key: string): string =>
    catalog.value?.groups.find((g) => g.key === key)?.label ?? key;
  const typeOf = (key: string): NotificationTypeDef | undefined =>
    typeMap.value.get(key);

  // ─── الأنواع والعدّاد ──────────────────────────────────
  const fetchCatalog = async () => {
    if (catalog.value) return;
    catalog.value = (await api.get<NotificationCatalog>(`${BASE}/types`)).data;
  };

  const fetchUnread = async () => {
    try {
      unread.value = (
        await api.get<UnreadSummary>(`${BASE}/unread-count`)
      ).data;
    } catch {
      // العدّاد يُعاد في الدورة القادمة أو مع البث
    }
  };

  // ─── الصندوق ───────────────────────────────────────────
  const fetchRecent = async () => {
    const res = await api.get<InboxPage>(
      `${BASE}${query({ page: 1, limit: RECENT_LIMIT })}`,
    );
    recent.value = res.data.data;
    unread.value = { ...unread.value, count: res.data.unread };
    recentLoaded.value = true;
  };

  const fetchInbox = async (filters: InboxFilters = inboxFilters.value) => {
    inboxFilters.value = { ...inboxFilters.value, ...filters };
    loading.value = true;
    try {
      const f = inboxFilters.value;
      inbox.value = (
        await api.get<InboxPage>(
          `${BASE}${query({
            page: f.page,
            limit: f.limit,
            unread: f.unread ? "true" : undefined,
            group: f.group ?? undefined,
          })}`,
        )
      ).data;
    } finally {
      loading.value = false;
    }
  };

  /** يطبّق تغييراً على نسخ الإشعار في الجرس والصفحة والدرج */
  const patchItems = (
    ids: string[] | null,
    change: (item: NotificationItem) => void,
  ) => {
    const match = (item: NotificationItem) => !ids || ids.includes(item.id);
    recent.value.filter(match).forEach(change);
    inbox.value?.data.filter(match).forEach(change);
    if (detail.value?.kind === "inbox" && match(detail.value.item)) {
      change(detail.value.item);
    }
  };

  const removeItems = (match: (item: NotificationItem) => boolean) => {
    recent.value = recent.value.filter((item) => !match(item));
    if (inbox.value) {
      const before = inbox.value.data.length;
      inbox.value.data = inbox.value.data.filter((item) => !match(item));
      inbox.value.total -= before - inbox.value.data.length;
    }
  };

  const markRead = async (ids: string[]) => {
    const now = new Date().toISOString();
    patchItems(ids, (item) => {
      item.readAt ??= now;
    });
    await api.post(`${BASE}/read`, { ids });
    await fetchUnread();
  };

  const markAllRead = async (group?: NotificationGroup | null) => {
    await api.post(`${BASE}/read-all`, group ? { group } : {});
    const now = new Date().toISOString();
    patchItems(null, (item) => {
      if (!group || item.group === group) item.readAt ??= now;
    });
    await fetchUnread();
  };

  const acknowledge = async (id: string) => {
    await api.post(`${BASE}/${id}/ack`);
    const now = new Date().toISOString();
    patchItems([id], (item) => {
      item.acknowledgedAt ??= now;
      item.readAt ??= now;
    });
    await fetchUnread();
  };

  const hide = async (id: string) => {
    await api.del(`${BASE}/${id}`);
    removeItems((item) => item.id === id);
    if (detail.value?.item.id === id) detail.value = null;
    await fetchUnread();
  };

  const hideRead = async () => {
    const res = await api.post<{ hidden: number }>(`${BASE}/hide-read`);
    removeItems((item) => !!item.readAt);
    return res.data.hidden;
  };

  // ─── درج التفاصيل ─────────────────────────────────────
  /** فتح إشعار من صندوقي: يُعلَّم مقروءاً */
  const openItem = (item: NotificationItem) => {
    detail.value = { kind: "inbox", item };
    if (!item.readAt) void markRead([item.id]).catch(() => undefined);
  };
  const openAdminRow = (item: AdminNotificationRow) => {
    detail.value = { kind: "admin", item };
  };
  const closeDetail = () => {
    detail.value = null;
  };

  // ─── البث اللحظي ──────────────────────────────────────
  type NewListener = (item: NotificationItem) => void;
  const newListeners = new Set<NewListener>();
  /** يُستدعى مع كل إشعار جديد يصل (صوت، تنبيه منبثق) — يعيد دالة الإلغاء */
  const onNew = (listener: NewListener) => {
    newListeners.add(listener);
    return () => newListeners.delete(listener);
  };

  const receive = (item: NotificationItem) => {
    if (recent.value.some((r) => r.id === item.id)) return;
    recent.value = [item, ...recent.value].slice(0, RECENT_LIMIT);
    const f = inboxFilters.value;
    if (
      inbox.value &&
      (f.page ?? 1) === 1 &&
      (!f.group || f.group === item.group)
    ) {
      inbox.value.data = [item, ...inbox.value.data].slice(0, f.limit ?? 20);
      inbox.value.total += 1;
    }
    unread.value = {
      count: unread.value.count + 1,
      byGroup: {
        ...unread.value.byGroup,
        [item.group]: (unread.value.byGroup[item.group] ?? 0) + 1,
      },
    };
    newListeners.forEach((listener) => listener(item));
  };

  const applySync = (sync: InboxSync) => {
    const now = new Date().toISOString();
    switch (sync.action) {
      case "read":
        patchItems(sync.ids ?? [], (item) => {
          item.readAt ??= now;
        });
        break;
      case "read_all":
        patchItems(null, (item) => {
          item.readAt ??= now;
        });
        break;
      case "acknowledged":
        patchItems(sync.ids ?? [], (item) => {
          item.acknowledgedAt ??= now;
          item.readAt ??= now;
        });
        break;
      case "hidden":
        removeItems((item) =>
          sync.ids ? sync.ids.includes(item.id) : !!item.readAt,
        );
        break;
      case "removed":
        removeItems((item) => !!sync.ids?.includes(item.id));
        break;
    }
    void fetchUnread();
  };

  let controller: AbortController | null = null;

  const wait = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve();
      });
    });

  /** يفتح البث ويبقيه مفتوحاً: ينقطع ← يعيد الاتصال بانتظار متزايد */
  const connect = () => {
    if (!import.meta.client || controller) return;
    const current = new AbortController();
    controller = current;
    const { signal } = current;

    void (async () => {
      let attempt = 0;
      while (!signal.aborted) {
        try {
          const res = await api.openStream(`${BASE}/stream`, signal);
          connected.value = true;
          attempt = 0;
          // ما فات أثناء الانقطاع
          await Promise.all([fetchUnread(), recentLoaded.value ? fetchRecent() : null]);
          await readEventStream(res, (event, data) => {
            if (event === "notification") {
              receive(JSON.parse(data) as NotificationItem);
            } else if (event === "sync") {
              applySync(JSON.parse(data) as InboxSync);
            }
          });
        } catch {
          // انقطاع أو رفض: يُعاد بعد انتظار
        }
        connected.value = false;
        if (signal.aborted) break;
        attempt += 1;
        await wait(Math.min(MAX_RETRY_MS, 1000 * 2 ** attempt), signal);
      }
    })();
  };

  const disconnect = () => {
    controller?.abort();
    controller = null;
    connected.value = false;
  };

  // ─── التفضيلات ─────────────────────────────────────────
  const fetchPreferences = async () =>
    (await api.get<{ mutedTypes: string[] }>(`${BASE}/preferences`)).data
      .mutedTypes;

  const updatePreferences = async (mutedTypes: string[]) =>
    (
      await api.patch<{ mutedTypes: string[] }>(`${BASE}/preferences`, {
        mutedTypes,
      })
    ).data.mutedTypes;

  // ─── لوحة المدير ───────────────────────────────────────
  const adminList = async (filters: AdminNotificationsFilters) =>
    (
      await api.get<Paginated<AdminNotificationRow>>(
        `${BASE}/admin/all${query({
          page: filters.page,
          limit: filters.limit,
          group: filters.group ?? undefined,
          search: filters.search?.trim() || undefined,
        })}`,
      )
    ).data;

  const adminStats = async () =>
    (await api.get<NotificationAdminStats>(`${BASE}/admin/stats`)).data;

  const adminRecipients = async (id: string) =>
    (
      await api.get<NotificationRecipientRow[]>(
        `${BASE}/admin/${id}/recipients`,
      )
    ).data;

  const adminRemove = async (id: string) => {
    await api.del(`${BASE}/admin/${id}`);
    if (detail.value?.item.id === id) detail.value = null;
  };

  const runChecks = async () =>
    (await api.post<ChecksResult>(`${BASE}/admin/run-checks`)).data;

  // ─── رسائل الإدارة ─────────────────────────────────────
  const previewMessage = async (audience: MessageAudience) =>
    (
      await api.post<MessageReach>(`${BASE}/messages/preview`, { audience })
    ).data;

  /** موظفون بعينهم من المسار المباشر، والجماعي من مسار broadcast */
  const sendMessage = async (payload: SendMessagePayload) => {
    const path =
      payload.audience.kind === "employees"
        ? `${BASE}/messages`
        : `${BASE}/messages/broadcast`;
    return (await api.post<MessageReach & { id: string }>(path, payload)).data;
  };

  const sentMessages = async (page: number) =>
    (
      await api.get<Paginated<AdminNotificationRow>>(
        `${BASE}/messages${query({ page, limit: 20 })}`,
      )
    ).data;

  const messageRecipients = async (id: string) =>
    (
      await api.get<NotificationRecipientRow[]>(
        `${BASE}/messages/${id}/recipients`,
      )
    ).data;

  const reset = () => {
    disconnect();
    catalog.value = null;
    unread.value = { count: 0, byGroup: {} };
    recent.value = [];
    recentLoaded.value = false;
    inbox.value = null;
    inboxFilters.value = { page: 1, limit: 20 };
    detail.value = null;
    newListeners.clear();
  };

  return {
    // الحالة
    catalog,
    unread,
    recent,
    recentLoaded,
    inbox,
    inboxFilters,
    loading,
    detail,
    connected,
    unreadCount,
    hasUnread,
    groupLabel,
    typeOf,
    // الصندوق
    fetchCatalog,
    fetchUnread,
    fetchRecent,
    fetchInbox,
    markRead,
    markAllRead,
    acknowledge,
    hide,
    hideRead,
    // الدرج
    openItem,
    openAdminRow,
    closeDetail,
    // البث
    connect,
    disconnect,
    onNew,
    // التفضيلات
    fetchPreferences,
    updatePreferences,
    // المدير
    adminList,
    adminStats,
    adminRecipients,
    adminRemove,
    runChecks,
    // الرسائل
    previewMessage,
    sendMessage,
    sentMessages,
    messageRecipients,
    reset,
  };
});
