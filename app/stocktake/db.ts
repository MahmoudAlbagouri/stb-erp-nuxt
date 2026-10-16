// stocktake/db.ts — قاعدة شاشة العدّ على الجهاز (IndexedDB)
//
// العدّ يجري داخل المخزن حيث الشبكة ضعيفة أو معدومة، والجوال قد يُغلق
// التبويب في الخلفية. لذلك كل ما تحتاجه الشاشة هنا ويبقى بعد إغلاق المتصفح:
//   stocktakes  آخر ما عرفه السيرفر عن الجرد (حالته وما عُدّ فيه)
//   catalogs    أصناف الشركة وباركوداتها للبحث بلا إنترنت
//   pending     عدّ لم يُرفع بعد: واحد لكل صنف (آخر كمية فقط تهم)
import type {
  StocktakeCatalogProduct,
  StocktakeCountLine,
  StocktakeStatus,
} from "@/types/inventory";

const DB_NAME = "stb-count";
const DB_VERSION = 1;

export interface LocalStocktake {
  id: string;
  /** لمن هذه البيانات: مستخدم شركة أخرى على نفس الجهاز لا يراها */
  tenantId: string | null;
  number: string;
  status: StocktakeStatus;
  warehouseName: string;
  updatedAt: string;
  /** متى نزلت من السيرفر (ms) */
  fetchedAt: number;
  lines: StocktakeCountLine[];
}

export interface LocalCatalog {
  stocktakeId: string;
  fetchedAt: number;
  products: StocktakeCatalogProduct[];
}

/** عدّ صنف على الجهاز لم يقبله السيرفر بعد */
export interface PendingCount {
  /** `${stocktakeId}:${productId}` */
  key: string;
  stocktakeId: string;
  productId: string;
  /** null = أُزيل الصنف من الجرد */
  countedQuantity: number | null;
  /** وقت العدّ على الجهاز: الأحدث يكسب إن عدّ الصنف جهازان */
  countedAt: string;
  /** سبب رفض السيرفر: يبقى ظاهراً حتى يُعاد أو يُحذف */
  error?: string;
}

interface StoreMap {
  stocktakes: LocalStocktake;
  catalogs: LocalCatalog;
  pending: PendingCount;
}
type StoreName = keyof StoreMap;

export const pendingKey = (stocktakeId: string, productId: string) =>
  `${stocktakeId}:${productId}`;

let connection: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  if (connection) return connection;
  const opening: Promise<IDBDatabase> = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("stocktakes")) {
        db.createObjectStore("stocktakes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("catalogs")) {
        db.createObjectStore("catalogs", { keyPath: "stocktakeId" });
      }
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "key" }).createIndex(
          "stocktakeId",
          "stocktakeId",
        );
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // المتصفح قد يغلق الاتصال والصفحة مفتوحة (مسح بيانات الموقع): يُفتح
      // من جديد مع أول طلب (نفس معالجة pos/db.ts)
      const forget = () => {
        if (connection === opening) connection = null;
      };
      db.onclose = forget;
      db.onversionchange = () => {
        db.close();
        forget();
      };
      resolve(db);
    };
    request.onerror = () => {
      if (connection === opening) connection = null;
      reject(request.error ?? new Error("تعذر فتح قاعدة بيانات الجهاز"));
    };
  });
  connection = opening;
  return opening;
};

const withTransaction = async (
  stores: StoreName | StoreName[],
  mode: IDBTransactionMode,
): Promise<IDBTransaction> => {
  try {
    return (await open()).transaction(stores, mode);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "InvalidStateError")) {
      throw error;
    }
    connection = null;
    return (await open()).transaction(stores, mode);
  }
};

const done = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** الكائنات التفاعلية (Vue proxies) لا تُخزَّن كما هي */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const write = async (
  stores: StoreName[],
  work: (get: (name: StoreName) => IDBObjectStore) => void,
): Promise<void> => {
  const tx = await withTransaction(stores, "readwrite");
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("أُلغيت المعاملة"));
    work((name) => tx.objectStore(name));
  });
};

const get = async <N extends StoreName>(
  name: N,
  key: string,
): Promise<StoreMap[N] | null> => {
  const tx = await withTransaction(name, "readonly");
  return (
    (await done(tx.objectStore(name).get(key) as IDBRequest<StoreMap[N] | undefined>)) ??
    null
  );
};

export const countDb = {
  getStocktake: (id: string) => get("stocktakes", id),
  getCatalog: (stocktakeId: string) => get("catalogs", stocktakeId),

  putStocktake: (stocktake: LocalStocktake) =>
    write(["stocktakes"], (store) => store("stocktakes").put(plain(stocktake))),

  putCatalog: (catalog: LocalCatalog) =>
    write(["catalogs"], (store) => store("catalogs").put(plain(catalog))),

  async pendingOf(stocktakeId: string): Promise<PendingCount[]> {
    const tx = await withTransaction("pending", "readonly");
    return done(
      tx.objectStore("pending").index("stocktakeId").getAll(stocktakeId) as IDBRequest<
        PendingCount[]
      >,
    );
  },

  putPending: (count: PendingCount) =>
    write(["pending"], (store) => store("pending").put(plain(count))),

  /** نتيجة رفع: المقبول يُحذف، والمرفوض يُحفظ بسببه — في معاملة واحدة */
  settle: (accepted: string[], rejected: PendingCount[]) =>
    write(["pending"], (store) => {
      accepted.forEach((key) => store("pending").delete(key));
      rejected.forEach((count) => store("pending").put(plain(count)));
    }),

  removePending: (keys: string[]) =>
    write(["pending"], (store) => keys.forEach((key) => store("pending").delete(key))),
};
