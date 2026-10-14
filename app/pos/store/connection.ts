// pos/store/connection.ts — اتصال الشاشة بالسيرفر: الربط، الساعة، والمزامنة
//
// المبدأ: مسار واحد دائماً — كل عملية تُكتب أولاً في قاعدة بيانات الجهاز
// مع عملية في طابور الرفع، وهنا يُفرَّغ الطابور حين يتوفر الاتصال.
import { computed } from "vue";
import {
  DeviceKeyError,
  OfflineError,
  PosRequestError,
  SessionExpiredError,
  SubscriptionInactiveError,
  type DeviceCredentials,
  type usePosApi,
} from "@/pos/api";
import { posDb } from "@/pos/db";
import type {
  BoundPosDevice,
  PosBootstrap,
  PosDevice,
  SyncResult,
} from "@/pos/types";
import type { AccessResponse } from "@/stores/access";
import { useAuthStore } from "@/stores/auth";
import {
  HEARTBEAT_MS,
  HOUR_MS,
  PERSIST_EVERY_MS,
  PULL_EVERY_MS,
  PUSH_BATCH,
  type PosState,
} from "./state";

export const createConnection = (
  state: PosState,
  api: ReturnType<typeof usePosApi>,
) => {
  const {
    device,
    outbox,
    online,
    sessionExpired,
    syncing,
    lastError,
    suspended,
    lastContactAt,
    now,
    installationId,
    bound,
    bindError,
    deviceKey,
    offlinePolicy,
    pendingCount,
    failedEntries,
    reloadOutbox,
  } = state;

  // ─── مفتاح الجهاز ───────────────────────────────────────────────────────────
  const setBound = async (value: boolean, key: string | null = null) => {
    bound.value = value;
    deviceKey.value = value ? key : null;
    await posDb.setMeta({ bound: value, deviceKey: deviceKey.value });
  };

  const credentials = (): DeviceCredentials | null =>
    device.value && deviceKey.value
      ? {
          deviceId: device.value.id,
          installationId: installationId.value,
          key: deviceKey.value,
        }
      : null;

  /** طلبات الشاشة بمفتاح جهازها */
  const deviceApi = () => {
    const current = credentials();
    if (!current) throw new DeviceKeyError("الشاشة غير مربوطة بجهاز كاشير");
    return api.device(current);
  };

  // ─── ساعة الشاشة وحد العمل بلا اتصال ────────────────────────────────────────
  let clockSavedAt = 0;
  let contactSavedAt = 0;

  /** يحدّث "الآن" (بلا رجوع للخلف) ويحفظه دورياً ليبقى بعد إعادة التشغيل */
  const tick = () => {
    now.value = Math.max(Date.now(), now.value);
    if (now.value - clockSavedAt > PERSIST_EVERY_MS) {
      clockSavedAt = now.value;
      void posDb.setMeta({ clock: now.value });
    }
  };

  const markContact = () => {
    tick();
    lastContactAt.value = now.value;
    if (now.value - contactSavedAt > PERSIST_EVERY_MS) {
      contactSavedAt = now.value;
      void posDb.setMeta({ lastContactAt: now.value });
    }
  };

  const setSuspended = (message: string) => {
    if (suspended.value === message) return;
    suspended.value = message;
    void posDb.setMeta({ suspended: message });
  };

  const offlineHours = computed(() =>
    lastContactAt.value === null
      ? 0
      : Math.max(0, (now.value - lastContactAt.value) / HOUR_MS),
  );

  /** ok ← warn (تنبيه) ← blocked (لا وردية جديدة حتى تتصل الشاشة) */
  const offlineState = computed<"ok" | "warn" | "blocked">(() => {
    if (offlineHours.value >= offlinePolicy.value.blockAfterHours) return "blocked";
    if (offlineHours.value >= offlinePolicy.value.warnAfterHours) return "warn";
    return "ok";
  });

  /**
   * سبب منع فتح وردية جديدة، أو "" إن كان مسموحاً. الوردية المفتوحة لا تتأثر:
   * تكمل وتُقفَّل وتُرفع مبيعاتها حين يعود الاتصال.
   */
  const shiftBlockReason = computed(() => {
    if (suspended.value) return suspended.value;
    if (offlineState.value === "blocked") {
      const days = Math.floor(offlineHours.value / 24);
      return `مرّ ${days} يوم بلا اتصال بالسيرفر — صِل الجهاز بالإنترنت لفتح وردية جديدة`;
    }
    return "";
  });

  // ─── الطلبات ────────────────────────────────────────────────────────────────
  /** ينفّذ طلباً للسيرفر ويحدّث حالة الاتصال حسب نتيجته */
  const guarded = async <T>(work: () => Promise<T>): Promise<T | null> => {
    try {
      const result = await work();
      online.value = true;
      sessionExpired.value = false;
      lastError.value = "";
      markContact();
      setSuspended("");
      return result;
    } catch (error) {
      if (error instanceof OfflineError) {
        online.value = false;
      } else if (error instanceof SessionExpiredError) {
        // السيرفر ردّ، فالشبكة تعمل؛ لكن ربط الشاشة ينتظر تسجيل الدخول
        online.value = true;
        sessionExpired.value = true;
      } else if (error instanceof SubscriptionInactiveError) {
        // السيرفر ردّ: الشاشة متصلة، لكن الاشتراك موقوف — ما بيع يبقى على
        // الجهاز ويُرفع بعد التجديد، ولا تُفتح وردية جديدة حتى ذلك
        online.value = true;
        markContact();
        setSuspended(error.message);
      } else if (error instanceof DeviceKeyError) {
        // المفتاح أُبطل (فُكّ الربط أو أُوقف الجهاز): الشاشة تحتاج ربطاً
        // جديداً، والمبيعات تبقى محفوظة هنا حتى يُحسم الأمر
        online.value = true;
        bindError.value = error.message;
        await setBound(false);
      } else {
        online.value = true;
        lastError.value = error instanceof Error ? error.message : "خطأ غير متوقع";
        if (error instanceof PosRequestError && error.status === 409) {
          // الجهاز مربوط بشاشة أخرى (أو فُكّ ربطه): نعيد محاولة الربط في
          // الدورة التالية، والمبيعات تبقى محفوظة هنا حتى يُحسم الأمر
          bindError.value = error.message;
          await setBound(false);
        }
      }
      return null;
    }
  };

  /**
   * يتأكد أن الشاشة مربوطة بجهازها قبل أي رفع أو سحب. شاشة رفضها السيرفر
   * لا تعيد المحاولة وحدها (قد يكون المدير نقل الجهاز لشاشة أخرى): تنتظر
   * ضغطة "إعادة المحاولة".
   */
  const ensureBound = async (manual = false): Promise<boolean> => {
    if (!device.value) return false;
    if (bound.value && deviceKey.value) return true;
    if (bindError.value && !manual) return false;
    // الربط (وإصدار المفتاح) هو الطلب الوحيد الذي يحتاج جلسة مستخدم. شاشة
    // مربوطة من قبل هذا التحديث بلا مفتاح تحصل عليه هنا عند أول جلسة
    const result = await guarded(() =>
      api.post<BoundPosDevice>(`/pos/devices/${device.value!.id}/bind`, {
        installationId: installationId.value,
      }),
    );
    if (!result) return false;
    bindError.value = "";
    await setBound(true, result.deviceKey);
    return true;
  };

  /** محاولة ربط يطلبها الكاشير بعد أن رُفضت الشاشة */
  const rebind = async () => {
    if (await ensureBound(true)) await sync({ pull: true });
  };

  // ─── التنزيل ────────────────────────────────────────────────────────────────
  const applyBootstrap = async (data: PosBootstrap) => {
    const {
      customers,
      stockLevels,
      stockKnown,
      serverBalances,
      counter,
      shift,
      promotions,
      posOptions,
      tenant,
      cashiers,
      returnsAllowed,
      settings,
      lastSync,
      products,
      categories,
      hasQueued,
    } = state;

    await posDb.applyCatalog(data);
    // التنزيل الكامل يستبدل نسخة العملاء: من أُضيف هنا ولم يُرفع بعد يعود
    const waiting = customers.value.filter(
      (c) => c.local && outbox.value.some((e) => e.id === `customer-${c.id}`),
    );
    if (waiting.length) await posDb.putCustomers(waiting);

    // الأرصدة: كلها في التنزيل الكامل، وما تغيّر في غيره
    // التغييرات تُدمج فقط فوق نسخة كاملة سبق استلامها
    let nextStock = stockLevels.value;
    const stockReceived = !!data.stock && (data.full || stockKnown.value);
    if (data.stock && stockReceived) {
      nextStock = data.full ? {} : { ...stockLevels.value };
      for (const row of data.stock) nextStock[row.productId] = row.quantity;
    }
    const nextBalances = data.customerBalances
      ? Object.fromEntries(data.customerBalances.map((row) => [row.id, row.balance]))
      : serverBalances.value;
    // العدّاد لا ينقص أبداً: الأعلى بين الجهاز والسيرفر (جهاز أُعيدت تهيئته)
    const nextCounter = Math.max(counter.value, data.device.lastCounter);

    // وردية مفتوحة في السيرفر وليست على الجهاز (مُسحت بياناته): نستعيدها
    let nextShift = shift.value;
    if (!nextShift && data.openShift && !hasQueued("shift.close", data.openShift.id)) {
      nextShift = {
        id: data.openShift.id,
        openedAt: data.openShift.openedAt,
        openingCash: data.openShift.openingCash,
        cashierName: data.openShift.cashierName ?? "",
        cashierId: data.openShift.cashierId ?? null,
      };
    }

    await posDb.setMeta({
      device: data.device,
      settings: data.settings,
      lastSync: data.serverTime,
      counter: nextCounter,
      shift: nextShift,
      tenant: data.tenant,
      cashiers: data.cashiers,
      returnsAllowed: data.returnsAllowed,
      offlinePolicy: data.offlinePolicy,
      customerBalances: nextBalances,
      promotions: data.promotions ?? promotions.value,
      posOptions: data.posOptions ?? posOptions.value,
      ...(stockReceived ? { stock: nextStock, stockComplete: true } : {}),
    });
    stockLevels.value = nextStock;
    if (stockReceived) stockKnown.value = true;
    serverBalances.value = nextBalances;
    promotions.value = data.promotions ?? promotions.value;
    posOptions.value = data.posOptions ?? posOptions.value;
    tenant.value = data.tenant;
    cashiers.value = data.cashiers;
    returnsAllowed.value = data.returnsAllowed;
    offlinePolicy.value = data.offlinePolicy;
    useAuthStore().setDeviceLocale(data.tenant);
    device.value = data.device;
    settings.value = data.settings;
    lastSync.value = data.serverTime;
    counter.value = nextCounter;
    shift.value = nextShift;

    [products.value, customers.value, categories.value] = await Promise.all([
      posDb.all("products"),
      posDb.all("customers"),
      posDb.all("categories"),
    ]);
  };

  let lastPullAt = 0;

  /** يسحب الأصناف والأسعار والعملاء: كلها، أو ما تغيّر منذ آخر سحب */
  const pull = async (full = false): Promise<boolean> => {
    if (!device.value) return false;
    // شاشة لم تستلم أرصدة مخزنها كاملة بعد (رُبطت قبل أن يرسلها السيرفر): سحب
    // "ما تغيّر" وحده كان سيعرض كل الأصناف برصيد صفر
    const complete = full || !state.stockKnown.value;
    const since =
      !complete && state.lastSync.value
        ? `?since=${encodeURIComponent(state.lastSync.value)}`
        : "";
    const data = await guarded(() =>
      deviceApi().get<PosBootstrap>(`/bootstrap${since}`),
    );
    if (!data) return false;
    await applyBootstrap(data);
    lastPullAt = Date.now();
    return true;
  };

  // ─── الرفع ──────────────────────────────────────────────────────────────────
  /** يرفع طابور الجهاز بالترتيب. ما يؤكده السيرفر يُحذف، وما يرفضه يُعلَّم */
  const push = async (): Promise<boolean> => {
    if (!device.value) return false;

    for (;;) {
      const batch = outbox.value.filter((e) => !e.error).slice(0, PUSH_BATCH);
      if (batch.length === 0) return true;

      const response = await guarded(() =>
        deviceApi().post<{ results: SyncResult[]; lastCounter: number }>("/sync", {
          operations: batch.map((e) => ({
            id: e.id,
            type: e.type,
            payload: e.payload,
          })),
        }),
      );
      if (!response) return false;

      try {
        await posDb.settleOutbox(
          batch,
          new Map(
            response.results.map((r) => [
              r.id,
              { ok: r.status !== "error", message: r.message },
            ]),
          ),
        );
      } finally {
        // مهما حدث: الواجهة تعرض ما في الطابور فعلاً
        await reloadOutbox();
      }
    }
  };

  /** دورة مزامنة: رفع ما في الطابور ثم سحب التغييرات إن حان وقتها */
  const sync = async (options: { pull?: boolean } = {}) => {
    tick();
    if (!device.value || syncing.value) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      online.value = false;
      return;
    }
    syncing.value = true;
    try {
      if (!(await ensureBound())) {
        // الشاشة مرفوضة: لا رفع ولا سحب، لكن حالة الاتصال تبقى صحيحة
        if (bindError.value) {
          try {
            await api.get("/pos/ping");
            online.value = true;
          } catch (error) {
            if (error instanceof OfflineError) online.value = false;
          }
        }
        return;
      }
      const pushed = pendingCount.value > 0 ? await push() : true;
      const duePull = options.pull || Date.now() - lastPullAt > PULL_EVERY_MS;
      if (pushed && duePull) {
        await pull();
      } else if (pushed && pendingCount.value === 0) {
        // لا شيء للرفع ولا للسحب: فحص اتصال خفيف (وبه يُعرف أن الاشتراك سارٍ)
        await guarded(() => deviceApi().get("/ping"));
      }
    } finally {
      syncing.value = false;
    }
  };

  /**
   * يعيد محاولة ما رفضه السيرفر (في مكانه من الطابور: الترتيب مهم). ما وصل
   * بعد تقفيل ورديته يُقبل، والسيرفر يعيد حساب أرقام تلك الوردية.
   */
  const retryFailed = async () => {
    await posDb.clearOutboxErrors(failedEntries.value);
    await reloadOutbox();
    await sync();
  };

  // ─── نبض الاتصال ────────────────────────────────────────────────────────────
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const onOnline = () => void sync();
  const onOffline = () => {
    online.value = false;
  };

  /** يبدأ نبض الاتصال: يفحص دورياً ويرفع فور عودة الشبكة */
  const start = () => {
    if (heartbeat) return;
    heartbeat = setInterval(() => void sync(), HEARTBEAT_MS);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void sync({ pull: true });
  };

  const stop = () => {
    // خارج شاشة الكاشير تعود العملة والتوقيت لما في جلسة المستخدم
    useAuthStore().setDeviceLocale(null);
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };

  // ─── ربط الجهاز ─────────────────────────────────────────────────────────────
  const fetchDevices = () => api.get<PosDevice[]>("/pos/devices");

  /** يربط هذا المتصفح بجهاز كاشير وينزّل بياناته (يحتاج إنترنت) */
  const bindDevice = async (target: PosDevice) => {
    if (outbox.value.length > 0) {
      throw new Error("في الجهاز مبيعات لم تُرفع بعد — ارفعها قبل تغيير الجهاز");
    }
    // الربط أولاً: جهاز مربوط بشاشة أخرى يُرفض هنا قبل مسح أي شيء
    const { deviceKey: key } = await api.post<BoundPosDevice>(
      `/pos/devices/${target.id}/bind`,
      { installationId: installationId.value },
    );
    const data = await api
      .device({
        deviceId: target.id,
        installationId: installationId.value,
        key,
      })
      .get<PosBootstrap>("/bootstrap");
    const keepName = state.cashierName.value;
    tick();
    await posDb.reset({
      installationId: installationId.value,
      bound: true,
      deviceKey: key,
      drawer: state.drawer.value,
      clock: now.value,
      lastContactAt: now.value,
    });
    state.returns.value = [];
    bound.value = true;
    deviceKey.value = key;
    lastContactAt.value = now.value;
    suspended.value = "";
    bindError.value = "";
    state.counter.value = 0;
    state.shift.value = null;
    state.sales.value = [];
    state.cart.value = [];
    state.held.value = [];
    state.cashMoves.value = [];
    state.stockLevels.value = {};
    state.stockKnown.value = false;
    state.serverBalances.value = {};
    await posDb.setMeta({ cashierName: keepName });
    await applyBootstrap(data);
    online.value = true;
    lastPullAt = Date.now();
  };

  /**
   * خطة الشركة وصلاحيات المستخدم المسجّل دخوله الآن — إن وُجد واتصلنا. يعيد
   * null إن تعذر (بلا إنترنت أو بلا جلسة)، وهذا لا يمنع البيع: الشاشة تعمل
   * بهوية جهازها.
   */
  const fetchUserAccess = async (): Promise<AccessResponse | null> => {
    if (!api.hasSession()) return null;
    try {
      return await api.get<AccessResponse>("/subscriptions/me/access");
    } catch {
      return null;
    }
  };

  return {
    deviceApi,
    tick,
    markContact,
    offlineHours,
    offlineState,
    shiftBlockReason,
    rebind,
    pull,
    sync,
    retryFailed,
    start,
    stop,
    fetchDevices,
    bindDevice,
    fetchUserAccess,
  };
};

export type PosConnection = ReturnType<typeof createConnection>;
