// stores/pos.ts — حالة شاشة الكاشير ومنطقها
//
// المبدأ: مسار واحد دائماً — كل بيع يُكتب أولاً في قاعدة بيانات الجهاز
// (IndexedDB) مع عملية في طابور الرفع، ثم يُرفع للسيرفر حين يتوفر الاتصال.
// لا فرق بين "أونلاين" و"أوفلاين" في طريقة البيع؛ الفرق فقط متى يُفرَّغ
// الطابور.
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  OfflineError,
  PosRequestError,
  SessionExpiredError,
  usePosApi,
} from "@/pos/api";
import {
  buildZatcaQr,
  lineAmounts,
  newUuid,
  POS_PRICES_INCLUDE_TAX,
  pricingError,
  returnShare,
  sum2,
  toSaleLine,
  unitPriceOf,
} from "@/pos/calc";
import { posDb } from "@/pos/db";
import { DEFAULT_DRAWER, kickDrawer, type DrawerConfig } from "@/pos/drawer";
import type {
  CartLine,
  LocalReturn,
  LocalSale,
  LocalShift,
  OutboxEntry,
  PosBootstrap,
  PosCategory,
  PosCustomer,
  PosDevice,
  PosProduct,
  ReturnableInvoice,
  SalePayment,
  SyncResult,
} from "@/pos/types";
import type { SalesPaymentMethod, SalesSettings } from "@/types/sales";

/** كل كم يفحص الجهاز الاتصال ويرفع ما في طابوره */
const HEARTBEAT_MS = 20_000;
/** كل كم يسحب تغييرات الأصناف والأسعار */
const PULL_EVERY_MS = 5 * 60_000;
/** أقصى عدد عمليات في طلب رفع واحد (حد السيرفر) */
const PUSH_BATCH = 100;
const COUNTER_DIGITS = 6;

export const usePosStore = defineStore("pos", () => {
  const api = usePosApi();

  // ─── حالة الجهاز (تُحمَّل من IndexedDB) ─────────────────────────────────────
  const ready = ref(false);
  const device = ref<PosDevice | null>(null);
  const settings = ref<SalesSettings | null>(null);
  const shift = ref<LocalShift | null>(null);
  const counter = ref(0);
  const lastSync = ref<string | null>(null);
  const cashierName = ref("");
  /** مرتجعات سُجّلت على هذه الشاشة */
  const returns = ref<LocalReturn[]>([]);
  /** إعداد درج النقود لهذه الشاشة (عتاد موصول بها، لا بجهاز الكاشير) */
  const drawer = ref<DrawerConfig>({ ...DEFAULT_DRAWER });

  const products = ref<PosProduct[]>([]);
  const customers = ref<PosCustomer[]>([]);
  const categories = ref<PosCategory[]>([]);
  const sales = ref<LocalSale[]>([]);
  const outbox = ref<OutboxEntry[]>([]);

  // ─── الاتصال ────────────────────────────────────────────────────────────────
  const online = ref(false);
  const sessionExpired = ref(false);
  const syncing = ref(false);
  const lastError = ref("");

  const pendingCount = computed(
    () => outbox.value.filter((entry) => !entry.error).length,
  );
  const failedEntries = computed(() =>
    outbox.value.filter((entry) => !!entry.error),
  );

  /** باركود ← الصنف ووحدته، للبحث الفوري عند المسح */
  const barcodeIndex = computed(() => {
    const index = new Map<string, { product: PosProduct; unitId: string | null }>();
    for (const product of products.value) {
      for (const item of product.barcodes) {
        index.set(item.barcode, { product, unitId: item.unitId });
      }
    }
    return index;
  });

  // ─── هوية الشاشة ────────────────────────────────────────────────────────────
  // كل متصفح له نسخته المحلية (عدّاد الفواتير، الوردية، المبيعات)، فجهاز
  // الكاشير يُربط بشاشة واحدة. معرّف الشاشة يُولَّد مرة ويبقى.
  const installationId = ref("");
  /** هل أكد السيرفر أن هذه الشاشة هي المربوطة بالجهاز؟ */
  const bound = ref(false);
  /** سبب رفض السيرفر لهذه الشاشة (الجهاز مربوط بشاشة أخرى) */
  const bindError = ref("");

  const setBound = async (value: boolean) => {
    bound.value = value;
    await posDb.setMeta({ bound: value });
  };

  /**
   * يتأكد أن الشاشة مربوطة بجهازها قبل أي رفع أو سحب. شاشة رفضها السيرفر
   * لا تعيد المحاولة وحدها (قد يكون المدير نقل الجهاز لشاشة أخرى): تنتظر
   * ضغطة "إعادة المحاولة".
   */
  const ensureBound = async (manual = false): Promise<boolean> => {
    if (!device.value) return false;
    if (bound.value) return true;
    if (bindError.value && !manual) return false;
    const result = await guarded(() =>
      api.post<PosDevice>(`/pos/devices/${device.value!.id}/bind`, {
        installationId: installationId.value,
      }),
    );
    if (!result) return false;
    bindError.value = "";
    await setBound(true);
    return true;
  };

  /** محاولة ربط يطلبها الكاشير بعد أن رُفضت الشاشة */
  const rebind = async () => {
    if (await ensureBound(true)) await sync({ pull: true });
  };

  const reloadOutbox = async () => {
    outbox.value = await posDb.all("outbox");
  };

  /** يحمّل حالة الجهاز المحفوظة. لا يحتاج إنترنت */
  const init = async () => {
    if (ready.value) return;
    const [d, s, sh, c, ls, name, inst, isBound] = await Promise.all([
      posDb.getMeta<PosDevice>("device"),
      posDb.getMeta<SalesSettings>("settings"),
      posDb.getMeta<LocalShift>("shift"),
      posDb.getMeta<number>("counter"),
      posDb.getMeta<string>("lastSync"),
      posDb.getMeta<string>("cashierName"),
      posDb.getMeta<string>("installationId"),
      posDb.getMeta<boolean>("bound"),
    ]);
    drawer.value = {
      ...DEFAULT_DRAWER,
      ...((await posDb.getMeta<DrawerConfig>("drawer")) ?? {}),
    };
    returns.value = await posDb.all("returns");
    installationId.value = inst ?? newUuid();
    if (!inst) await posDb.setMeta({ installationId: installationId.value });
    bound.value = isBound === true;
    // false محفوظة = السيرفر رفض هذه الشاشة قبل إغلاقها؛ null = لم تُربط بعد
    if (isBound === false && d) {
      bindError.value = "هذه الشاشة ليست المربوطة بجهاز الكاشير";
    }
    device.value = d;
    settings.value = s;
    shift.value = sh;
    counter.value = c ?? 0;
    lastSync.value = ls;
    cashierName.value = name ?? "";

    [products.value, customers.value, categories.value, sales.value] =
      await Promise.all([
        posDb.all("products"),
        posDb.all("customers"),
        posDb.all("categories"),
        posDb.all("sales"),
      ]);
    await reloadOutbox();
    ready.value = true;
  };

  // ─── المزامنة ───────────────────────────────────────────────────────────────
  /** ينفّذ طلباً للسيرفر ويحدّث حالة الاتصال حسب نتيجته */
  const guarded = async <T>(work: () => Promise<T>): Promise<T | null> => {
    try {
      const result = await work();
      online.value = true;
      sessionExpired.value = false;
      lastError.value = "";
      return result;
    } catch (error) {
      if (error instanceof OfflineError) {
        online.value = false;
      } else if (error instanceof SessionExpiredError) {
        // السيرفر ردّ، فالشبكة تعمل؛ لكن الرفع ينتظر تسجيل الدخول
        online.value = true;
        sessionExpired.value = true;
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

  const applyBootstrap = async (data: PosBootstrap) => {
    await posDb.applyCatalog(data);
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
      };
    }

    await posDb.setMeta({
      device: data.device,
      settings: data.settings,
      lastSync: data.serverTime,
      counter: nextCounter,
      shift: nextShift,
    });
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

  const hasQueued = (type: OutboxEntry["type"], id: string) =>
    outbox.value.some((entry) => entry.type === type && entry.payload.id === id);

  /** يسحب الأصناف والأسعار والعملاء: كلها، أو ما تغيّر منذ آخر سحب */
  const pull = async (full = false): Promise<boolean> => {
    if (!device.value) return false;
    const since = !full && lastSync.value ? `&since=${encodeURIComponent(lastSync.value)}` : "";
    const data = await guarded(() =>
      api.get<PosBootstrap>(
        `/pos/bootstrap?deviceId=${device.value!.id}&installationId=${installationId.value}${since}`,
      ),
    );
    if (!data) return false;
    await applyBootstrap(data);
    lastPullAt = Date.now();
    return true;
  };

  /** يرفع طابور الجهاز بالترتيب. ما يؤكده السيرفر يُحذف، وما يرفضه يُعلَّم */
  const push = async (): Promise<boolean> => {
    if (!device.value) return false;

    for (;;) {
      const batch = outbox.value.filter((e) => !e.error).slice(0, PUSH_BATCH);
      if (batch.length === 0) return true;

      const response = await guarded(() =>
        api.post<{ results: SyncResult[]; lastCounter: number }>("/pos/sync", {
          deviceId: device.value!.id,
          installationId: installationId.value,
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

  let lastPullAt = 0;

  /** دورة مزامنة: رفع ما في الطابور ثم سحب التغييرات إن حان وقتها */
  const sync = async (options: { pull?: boolean } = {}) => {
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
        // لا شيء للرفع ولا للسحب: فحص اتصال خفيف
        await guarded(() => api.get("/pos/ping"));
      }
    } finally {
      syncing.value = false;
    }
  };

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
    await api.post<PosDevice>(`/pos/devices/${target.id}/bind`, {
      installationId: installationId.value,
    });
    const data = await api.get<PosBootstrap>(
      `/pos/bootstrap?deviceId=${target.id}&installationId=${installationId.value}`,
    );
    const keepName = cashierName.value;
    await posDb.reset({
      installationId: installationId.value,
      bound: true,
      drawer: drawer.value,
    });
    returns.value = [];
    bound.value = true;
    bindError.value = "";
    counter.value = 0;
    shift.value = null;
    sales.value = [];
    cart.value = [];
    await posDb.setMeta({ cashierName: keepName });
    await applyBootstrap(data);
    online.value = true;
    lastPullAt = Date.now();
  };

  // ─── الوردية ────────────────────────────────────────────────────────────────
  const openShift = async (openingCash: number, name: string) => {
    if (shift.value) throw new Error("توجد وردية مفتوحة بالفعل");
    const next: LocalShift = {
      id: newUuid(),
      openedAt: new Date().toISOString(),
      openingCash,
      cashierName: name,
    };
    await posDb.enqueue(
      {
        id: `open-${next.id}`,
        type: "shift.open",
        payload: {
          id: next.id,
          openedAt: next.openedAt,
          openingCash,
          cashierName: name || undefined,
        },
        createdAt: next.openedAt,
      },
      { shift: next, cashierName: name },
    );
    shift.value = next;
    cashierName.value = name;
    await reloadOutbox();
    // بداية الوردية أنسب وقت لتحديث الأسعار كاملة
    void sync({ pull: true });
  };

  /** مبيعات الوردية الحالية من نسخة الجهاز (تعمل بلا إنترنت) */
  const shiftSummary = computed(() => {
    const own = shift.value
      ? sales.value.filter((sale) => sale.shiftId === shift.value!.id)
      : [];
    const byMethod = (method: string) =>
      sum2(
        own.flatMap((sale) =>
          sale.payments.filter((p) => p.method === method).map((p) => p.amount),
        ),
      );
    const cash = byMethod("cash");
    const ownReturns = shift.value
      ? returns.value.filter((r) => r.shiftId === shift.value!.id)
      : [];
    const cashRefunds = sum2(
      ownReturns.filter((r) => r.refundMethod === "cash").map((r) => r.refundAmount),
    );
    return {
      invoicesCount: own.length,
      salesTotal: sum2(own.map((sale) => sale.total)),
      cash,
      card: byMethod("card"),
      returnsCount: ownReturns.length,
      returnsTotal: sum2(ownReturns.map((r) => r.total)),
      cashRefunds,
      drawerOpens: shift.value?.drawerOpens ?? 0,
      // الدرج = العهدة + المبيعات النقدية − ما رُدّ نقداً
      expectedCash: sum2([shift.value?.openingCash ?? 0, cash, -cashRefunds]),
    };
  });

  const closeShift = async (closingCash: number, note: string) => {
    if (!shift.value) throw new Error("لا توجد وردية مفتوحة");
    const closedAt = new Date().toISOString();
    await posDb.enqueue(
      {
        id: `close-${shift.value.id}`,
        type: "shift.close",
        payload: {
          id: shift.value.id,
          closedAt,
          closingCash,
          note: note || undefined,
          drawerOpens: shift.value.drawerOpens ?? 0,
        },
        createdAt: closedAt,
      },
      { shift: null },
    );
    shift.value = null;
    cart.value = [];
    await reloadOutbox();
    void sync();
  };

  // ─── السلة ──────────────────────────────────────────────────────────────────
  const cart = ref<CartLine[]>([]);
  const customerId = ref("");
  let lineKey = 0;

  const cartTotals = computed(() => {
    const amounts = cart.value.map((line) =>
      lineAmounts({ ...line, taxRate: line.product.taxRate }),
    );
    return {
      subtotal: sum2(amounts.map((a) => a.subtotal)),
      taxTotal: sum2(amounts.map((a) => a.taxAmount)),
      total: sum2(amounts.map((a) => a.total)),
      items: cart.value.reduce((count, line) => count + line.quantity, 0),
    };
  });

  /** يضيف صنفاً للسلة، أو يزيد كميته إن كان موجوداً بنفس الوحدة */
  const addProduct = (product: PosProduct, unitId: string | null = null) => {
    // باركود وحدة الأساس قد يحمل معرّفها صراحةً
    const effectiveUnit = unitId === product.baseUnitId ? null : unitId;
    const existing = cart.value.find(
      (line) => line.product.id === product.id && line.unitId === effectiveUnit,
    );
    if (existing) {
      existing.quantity += 1;
      return;
    }
    const unit = effectiveUnit
      ? product.units.find((u) => u.unitId === effectiveUnit)
      : null;
    cart.value.push({
      key: ++lineKey,
      product,
      unitId: unit ? unit.unitId : null,
      unitName: unit ? unit.name : product.baseUnitName,
      factor: unit ? unit.factor : 1,
      quantity: 1,
      unitPrice: unitPriceOf(product, unit ? unit.unitId : null),
      discount: 0,
    });
  };

  /** مسح باركود: يعيد false إذا لم يُعرف */
  const scan = (barcode: string): boolean => {
    const match = barcodeIndex.value.get(barcode.trim());
    if (!match) return false;
    addProduct(match.product, match.unitId);
    return true;
  };

  const removeLine = (key: number) => {
    cart.value = cart.value.filter((line) => line.key !== key);
  };

  const clearCart = () => {
    cart.value = [];
    customerId.value = "";
  };

  // ─── إتمام البيع ────────────────────────────────────────────────────────────
  /**
   * يحفظ الفاتورة على الجهاز ويضعها في طابور الرفع، ثم يحاول رفعها. يعيد
   * الفاتورة لطباعة إيصالها فوراً — سواء وُجد إنترنت أم لا.
   */
  const checkout = async (
    payments: SalePayment[],
    cashReceived: number,
  ): Promise<LocalSale> => {
    if (!device.value || !shift.value) throw new Error("افتح وردية أولاً");
    if (cart.value.length === 0) throw new Error("السلة فارغة");

    for (const line of cart.value) {
      if (!(line.quantity > 0)) throw new Error(`كمية "${line.product.name}" غير صحيحة`);
      const problem = pricingError(line);
      if (problem) throw new Error(problem);
    }

    const lines = cart.value.map(toSaleLine);
    const total = sum2(lines.map((l) => l.total));
    const taxTotal = sum2(lines.map((l) => l.taxAmount));
    if (sum2(payments.map((p) => p.amount)) !== total) {
      throw new Error("المقبوض لا يساوي إجمالي الفاتورة");
    }

    const customer = customers.value.find((c) => c.id === customerId.value);
    const nextCounter = counter.value + 1;
    const issuedAt = new Date().toISOString();
    const cashPaid = sum2(
      payments.filter((p) => p.method === "cash").map((p) => p.amount),
    );

    const sale: LocalSale = {
      uuid: newUuid(),
      number: `${device.value.code}-${String(nextCounter).padStart(COUNTER_DIGITS, "0")}`,
      issuedAt,
      shiftId: shift.value.id,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      customerTaxNumber: customer?.taxNumber ?? null,
      pricesIncludeTax: POS_PRICES_INCLUDE_TAX,
      lines,
      payments,
      subtotal: sum2(lines.map((l) => l.subtotal)),
      taxTotal,
      total,
      cashReceived,
      change: Math.max(sum2([cashReceived, -cashPaid]), 0),
      qrCode: settings.value?.taxNumber
        ? buildZatcaQr({
            sellerName: settings.value.sellerName ?? "",
            taxNumber: settings.value.taxNumber,
            issuedAt,
            total,
            taxTotal,
          })
        : null,
    };

    await posDb.saveSale(
      sale,
      {
        id: `sale-${sale.uuid}`,
        type: "sale",
        createdAt: issuedAt,
        payload: {
          uuid: sale.uuid,
          number: sale.number,
          issuedAt,
          shiftId: sale.shiftId,
          customerId: sale.customerId ?? undefined,
          pricesIncludeTax: sale.pricesIncludeTax,
          lines: lines.map(({ productName: _name, unitName: _unit, ...line }) => line),
          payments,
        },
      },
      nextCounter,
    );

    counter.value = nextCounter;
    sales.value.push(sale);
    clearCart();
    await reloadOutbox();
    void sync();
    return sale;
  };

  // ─── المرتجع ────────────────────────────────────────────────────────────────
  /** مرتجعات هذه الشاشة التي لم يؤكد السيرفر استلامها بعد */
  const pendingReturnsOf = (invoiceNumber: string) =>
    returns.value.filter(
      (r) =>
        r.invoiceNumber === invoiceNumber &&
        outbox.value.some((entry) => entry.id === `return-${r.uuid}`),
    );

  /** يطرح من الفاتورة ما أُرجع منها على هذه الشاشة */
  const withReturns = (
    invoice: ReturnableInvoice,
    done: LocalReturn[],
  ): ReturnableInvoice => {
    const returned = new Map<number, number>();
    for (const line of done.flatMap((r) => r.lines)) {
      returned.set(line.lineIndex, (returned.get(line.lineIndex) ?? 0) + line.quantity);
    }
    return {
      ...invoice,
      returnedAmount: sum2([invoice.returnedAmount, ...done.map((r) => r.total)]),
      paidAmount: sum2([invoice.paidAmount, ...done.map((r) => -r.refundAmount)]),
      lines: invoice.lines.map((line) => ({
        ...line,
        returnedQuantity: line.returnedQuantity + (returned.get(line.lineIndex) ?? 0),
      })),
    };
  };

  /**
   * يجلب فاتورة برقمها لاختيار ما يُرجَع منها: من السيرفر (أي فاتورة للشركة)،
   * وبلا إنترنت من نسخة الجهاز (فواتير هذه الشاشة فقط).
   */
  const lookupInvoice = async (rawNumber: string): Promise<ReturnableInvoice> => {
    const number = rawNumber.trim();
    if (!number) throw new Error("أدخل رقم الفاتورة");

    try {
      const remote = await api.get<Omit<ReturnableInvoice, "local">>(
        `/pos/invoices/${encodeURIComponent(number)}`,
      );
      online.value = true;
      // السيرفر لم يرَ بعد ما ينتظر الرفع من هذه الشاشة
      return withReturns({ ...remote, local: false }, pendingReturnsOf(remote.number));
    } catch (error) {
      const waiting = sales.value.find(
        (sale) => sale.number.toLowerCase() === number.toLowerCase(),
      );
      // فاتورة بيعت هنا ولم تُرفع بعد: السيرفر لا يعرفها، ونسخة الجهاز تكفي
      const notUploaded =
        waiting && outbox.value.some((entry) => entry.id === `sale-${waiting.uuid}`);
      if (!(error instanceof OfflineError) && !notUploaded) throw error;
      if (error instanceof OfflineError) online.value = false;
      if (!waiting) {
        throw new Error(
          "لا يوجد اتصال — بلا إنترنت يمكن إرجاع فواتير هذه الشاشة فقط",
        );
      }
      return withReturns(
        {
          number: waiting.number,
          issuedAt: waiting.issuedAt,
          customerName: waiting.customerName,
          total: waiting.total,
          paidAmount: waiting.total,
          returnedAmount: 0,
          lines: waiting.lines.map((line, lineIndex) => ({
            lineIndex,
            productName: line.productName,
            unitName: line.unitName,
            quantity: line.quantity,
            returnedQuantity: 0,
            subtotal: line.subtotal,
            taxAmount: line.taxAmount,
            total: line.total,
          })),
          local: true,
        },
        returns.value.filter((r) => r.invoiceNumber === waiting.number),
      );
    }
  };

  /** قيمة مرتجع وما يُردّ للعميل منه (نفس قاعدة السيرفر: المدفوع الزائد) */
  const refundPreview = (
    invoice: ReturnableInvoice,
    quantities: Record<number, number>,
  ) => {
    const lines = invoice.lines
      .map((line) => ({ line, quantity: Number(quantities[line.lineIndex]) || 0 }))
      .filter((item) => item.quantity > 0);
    const total = sum2(
      lines.map((item) => returnShare(item.line, item.quantity).total),
    );
    const net = sum2([invoice.total, -invoice.returnedAmount, -total]);
    return {
      lines,
      total,
      refund: Math.max(sum2([invoice.paidAmount, -net]), 0),
    };
  };

  /**
   * يسجّل المرتجع على الجهاز ويضعه في طابور الرفع. المبلغ يخرج من درج الوردية
   * الحالية، حتى لو كانت الفاتورة من وردية سابقة.
   */
  const refund = async (
    invoice: ReturnableInvoice,
    quantities: Record<number, number>,
    method: SalesPaymentMethod,
    reason: string,
  ): Promise<LocalReturn> => {
    if (!shift.value) throw new Error("افتح وردية أولاً");
    const preview = refundPreview(invoice, quantities);
    if (preview.lines.length === 0) throw new Error("حدّد كمية صنف واحد على الأقل");
    for (const { line, quantity } of preview.lines) {
      if (quantity > line.quantity - line.returnedQuantity + 1e-9) {
        throw new Error(`كمية "${line.productName}" أكبر من المتاح للإرجاع`);
      }
    }

    const issuedAt = new Date().toISOString();
    const salesReturn: LocalReturn = {
      uuid: newUuid(),
      invoiceNumber: invoice.number,
      issuedAt,
      shiftId: shift.value.id,
      lines: preview.lines.map(({ line, quantity }) => ({
        lineIndex: line.lineIndex,
        productName: line.productName,
        unitName: line.unitName,
        quantity,
        total: returnShare(line, quantity).total,
      })),
      total: preview.total,
      refundMethod: method,
      refundAmount: preview.refund,
      reason: reason || null,
    };

    await posDb.saveReturn(salesReturn, {
      id: `return-${salesReturn.uuid}`,
      type: "return",
      createdAt: issuedAt,
      payload: {
        uuid: salesReturn.uuid,
        invoiceNumber: salesReturn.invoiceNumber,
        issuedAt,
        shiftId: salesReturn.shiftId,
        lines: salesReturn.lines.map(({ lineIndex, quantity }) => ({ lineIndex, quantity })),
        refundMethod: method,
        refundAmount: salesReturn.refundAmount,
        reason: reason || undefined,
      },
    });
    returns.value.push(salesReturn);
    await reloadOutbox();
    void sync();
    return salesReturn;
  };

  // ─── درج النقود ─────────────────────────────────────────────────────────────
  const setDrawer = async (config: DrawerConfig) => {
    drawer.value = { ...config };
    await posDb.setMeta({ drawer: drawer.value });
  };

  /**
   * يفتح الدرج. `manual` = بلا بيع ولا مرتجع: يُعدّ على الوردية ويظهر
   * للمدير عند التقفيل.
   */
  const openDrawer = async (manual = false) => {
    if (drawer.value.mode === "off") return;
    await kickDrawer(drawer.value);
    if (manual && shift.value) {
      shift.value = {
        ...shift.value,
        drawerOpens: (shift.value.drawerOpens ?? 0) + 1,
      };
      await posDb.setMeta({ shift: shift.value });
    }
  };

  /** يعيد محاولة ما رفضه السيرفر (في مكانه من الطابور: الترتيب مهم) */
  const retryFailed = async () => {
    await posDb.clearOutboxErrors(failedEntries.value);
    await reloadOutbox();
    await sync();
  };

  const reset = () => {
    stop();
    cart.value = [];
    customerId.value = "";
  };

  return {
    ready,
    device,
    settings,
    shift,
    counter,
    lastSync,
    cashierName,
    products,
    customers,
    categories,
    sales,
    outbox,
    online,
    sessionExpired,
    syncing,
    lastError,
    installationId,
    bindError,
    rebind,
    pendingCount,
    failedEntries,
    init,
    start,
    stop,
    sync,
    pull,
    fetchDevices,
    bindDevice,
    openShift,
    closeShift,
    shiftSummary,
    cart,
    customerId,
    cartTotals,
    addProduct,
    scan,
    removeLine,
    clearCart,
    checkout,
    returns,
    lookupInvoice,
    refundPreview,
    refund,
    drawer,
    setDrawer,
    openDrawer,
    retryFailed,
    reset,
  };
});
