// pos/db.ts — قاعدة بيانات الجهاز المحلية (IndexedDB)
//
// كل ما تحتاجه شاشة الكاشير لتعمل بلا إنترنت يعيش هنا: نسخة الأصناف
// والعملاء، حالة الجهاز (meta)، المبيعات المحلية، وطابور الرفع (outbox).
// IndexedDB يبقى بعد إغلاق المتصفح وإعادة تشغيل الجهاز.
import type {
  LocalReturn,
  LocalSale,
  OutboxEntry,
  PosCategory,
  PosCustomer,
  PosProduct,
} from "./types";

const DB_NAME = "stb-pos";
const DB_VERSION = 2;

interface StoreMap {
  products: PosProduct;
  customers: PosCustomer;
  categories: PosCategory;
  sales: LocalSale;
  returns: LocalReturn;
  outbox: OutboxEntry;
  meta: { key: string; value: unknown };
}
type StoreName = keyof StoreMap;

let connection: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      // جهاز يعمل بنسخة أقدم يحتفظ ببياناته: نضيف ما ينقصه فقط
      const ensure = (name: StoreName, options: IDBObjectStoreParameters) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options);
      };
      ensure("products", { keyPath: "id" });
      ensure("customers", { keyPath: "id" });
      ensure("categories", { keyPath: "id" });
      ensure("sales", { keyPath: "uuid" });
      ensure("returns", { keyPath: "uuid" }); // النسخة 2
      // seq تلقائي: الطابور يُرفع بنفس ترتيب إدخاله
      ensure("outbox", { keyPath: "seq", autoIncrement: true });
      ensure("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      connection = null;
      reject(request.error ?? new Error("تعذر فتح قاعدة بيانات الجهاز"));
    };
  });
  return connection;
};

const done = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** ينفّذ عدة كتابات في معاملة واحدة: إما تُحفظ كلها أو لا شيء */
const transact = async (
  stores: StoreName[],
  work: (get: <N extends StoreName>(name: N) => IDBObjectStore) => void,
): Promise<void> => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("أُلغيت المعاملة"));
    work((name) => tx.objectStore(name));
  });
};

export const posDb = {
  async all<N extends StoreName>(name: N): Promise<StoreMap[N][]> {
    const db = await open();
    return done(
      db.transaction(name).objectStore(name).getAll() as IDBRequest<
        StoreMap[N][]
      >,
    );
  },

  async getMeta<T>(key: string): Promise<T | null> {
    const db = await open();
    const row = await done(
      db.transaction("meta").objectStore("meta").get(key) as IDBRequest<
        StoreMap["meta"] | undefined
      >,
    );
    return (row?.value as T | undefined) ?? null;
  },

  setMeta(values: Record<string, unknown>): Promise<void> {
    return transact(["meta"], (get) => {
      for (const [key, value] of Object.entries(values)) {
        // الكائنات التفاعلية (Vue proxies) لا تُخزَّن كما هي
        get("meta").put({ key, value: JSON.parse(JSON.stringify(value ?? null)) });
      }
    });
  },

  /**
   * يطبّق ما نزل من السيرفر: استبدال كامل، أو دمج تغييرات (والمحذوف
   * `available: false` يُزال).
   */
  applyCatalog(data: {
    full: boolean;
    products: PosProduct[];
    customers: PosCustomer[];
    categories: PosCategory[];
  }): Promise<void> {
    return transact(["products", "customers", "categories"], (get) => {
      if (data.full) {
        get("products").clear();
        get("customers").clear();
      }
      // التصنيفات قائمة صغيرة تأتي كاملة دائماً
      get("categories").clear();
      data.categories.forEach((c) => get("categories").put(c));

      for (const product of data.products) {
        if (product.available) get("products").put(product);
        else get("products").delete(product.id);
      }
      for (const customer of data.customers) {
        if (customer.available) get("customers").put(customer);
        else get("customers").delete(customer.id);
      }
    });
  },

  /**
   * يحفظ عملية بيع: الفاتورة + عملية رفعها + العدّاد الجديد في معاملة واحدة.
   * انقطاع الكهرباء في منتصفها لا يترك فاتورة بلا رفع أو رقماً مكرراً.
   */
  saveSale(sale: LocalSale, entry: OutboxEntry, counter: number): Promise<void> {
    return transact(["sales", "outbox", "meta"], (get) => {
      get("sales").put(JSON.parse(JSON.stringify(sale)));
      get("outbox").add(JSON.parse(JSON.stringify(entry)));
      get("meta").put({ key: "counter", value: counter });
    });
  },

  /** عميل أضافه الكاشير هنا، مع عملية رفعه في معاملة واحدة */
  saveCustomer(customer: PosCustomer, entry: OutboxEntry): Promise<void> {
    return transact(["customers", "outbox"], (get) => {
      get("customers").put(JSON.parse(JSON.stringify(customer)));
      get("outbox").add(JSON.parse(JSON.stringify(entry)));
    });
  },

  /** يعيد عملاء أُضيفوا هنا ولم يُرفعوا بعد (تنزيل كامل يمسح نسخة العملاء) */
  putCustomers(customers: PosCustomer[]): Promise<void> {
    return transact(["customers"], (get) => {
      customers.forEach((c) => get("customers").put(JSON.parse(JSON.stringify(c))));
    });
  },

  /** يحفظ مرتجعاً مع عملية رفعه في معاملة واحدة */
  saveReturn(salesReturn: LocalReturn, entry: OutboxEntry): Promise<void> {
    return transact(["returns", "outbox"], (get) => {
      get("returns").put(JSON.parse(JSON.stringify(salesReturn)));
      get("outbox").add(JSON.parse(JSON.stringify(entry)));
    });
  },

  /** يضيف عملية للطابور مع تحديث حالة الجهاز (فتح/تقفيل وردية) */
  enqueue(entry: OutboxEntry, meta: Record<string, unknown> = {}): Promise<void> {
    return transact(["outbox", "meta"], (get) => {
      get("outbox").add(JSON.parse(JSON.stringify(entry)));
      for (const [key, value] of Object.entries(meta)) {
        get("meta").put({ key, value: JSON.parse(JSON.stringify(value ?? null)) });
      }
    });
  },

  /** يحذف ما أكد السيرفر استلامه، ويسجّل سبب رفض ما رُفض */
  settleOutbox(
    entries: OutboxEntry[],
    results: Map<string, { ok: boolean; message?: string }>,
  ): Promise<void> {
    return transact(["outbox"], (get) => {
      for (const entry of entries) {
        const result = results.get(entry.id);
        if (!result || entry.seq === undefined) continue;
        if (result.ok) get("outbox").delete(entry.seq);
        else {
          // نسخة عادية: العملية هنا كائن تفاعلي (Vue proxy) لا يقبله IndexedDB
          get("outbox").put({
            ...JSON.parse(JSON.stringify(entry)),
            error: result.message ?? "رُفضت",
          });
        }
      }
    });
  },

  /** يزيل علامة الرفض عن عمليات لتُرفع من جديد، دون تغيير ترتيبها */
  clearOutboxErrors(entries: OutboxEntry[]): Promise<void> {
    return transact(["outbox"], (get) => {
      for (const { error: _error, ...entry } of entries) {
        if (entry.seq !== undefined) {
          get("outbox").put(JSON.parse(JSON.stringify(entry)));
        }
      }
    });
  },

  /**
   * يمسح بيانات الجهاز كلها (عند ربطه بجهاز كاشير آخر) ويُبقي `keep` في
   * نفس المعاملة — معرّف الشاشة لا يضيع ولو انقطعت الكهرباء في منتصفها.
   */
  reset(keep: Record<string, unknown> = {}): Promise<void> {
    return transact(
      ["products", "customers", "categories", "sales", "returns", "outbox", "meta"],
      (get) => {
        (
          ["products", "customers", "categories", "sales", "returns", "outbox", "meta"] as const
        ).forEach((name) => get(name).clear());
        for (const [key, value] of Object.entries(keep)) {
          get("meta").put({ key, value: JSON.parse(JSON.stringify(value ?? null)) });
        }
      },
    );
  },
};
