// field/db.ts — قاعدة الشاشة الميدانية على الجهاز (IndexedDB)
//
// المزرعة ونت ضعيف أو معدوم، والمشرف يسجّل طوال اليوم. ما تحتاجه الشاشة هنا
// ويبقى بعد إغلاق المتصفح:
//   boot   آخر ما نزّله الجهاز لكل مزرعة (الوحدات، الزراعات، النخيل، المدخلات...)
//   queue  ما سُجّل ولم يقبله السيرفر بعد — يُرفع بترتيبه، والمرفوض يبقى بسببه
// كل سجل باسم صاحبه (الشركة والمستخدم): مستخدم آخر على نفس الجهاز لا يراه.

const DB_NAME = "stb-field";
const DB_VERSION = 1;

export type FieldOpType =
  | "operation"
  | "operation_complete"
  | "harvest"
  | "inspection"
  | "plant_status";

export interface FieldBoot {
  /** `${owner}:${farmId}` */
  key: string;
  owner: string;
  farmId: string;
  fetchedAt: number;
  data: FieldBootstrap;
}

export interface FieldBootstrap {
  serverTime: string;
  today: string;
  timezone: string;
  farmId: string | null;
  farms: { id: string; code: string; name: string; warehouseId: string | null }[];
  units: {
    id: string;
    farmId: string;
    parentId: string | null;
    kind: string;
    name: string;
    code: string | null;
    depth: number;
    path: string;
    sortOrder: number;
    areaM2: number | null;
    waterSourceId: string | null;
  }[];
  plantings: {
    id: string;
    number: string;
    farmId: string;
    unitId: string;
    cropId: string;
    cropName: string;
    varietyName: string | null;
    trackingMode: "individual" | "count" | "area";
    plantCount: number;
    status: string;
    harvestProductId: string | null;
  }[];
  plants: {
    id: string;
    plantingId: string;
    unitId: string;
    tag: string;
    position: number | null;
    sex: string;
    status: string;
  }[];
  products: { id: string; name: string; sku: string; unitName: string }[];
  warehouses: { id: string; name: string }[];
  employees: { id: string; fullName: string }[];
  waterSources: { id: string; farmId: string; name: string; kind: string }[];
  inspections: {
    id: string;
    number: string;
    farmId: string;
    unitId: string | null;
    plantId: string | null;
    pest: string;
    pestName: string | null;
    severity: number;
    status: string;
    inspectedAt: string;
  }[];
  plannedOperations: {
    id: string;
    number: string;
    farmId: string;
    unitId: string | null;
    plantingId: string | null;
    type: string;
    title: string | null;
    plannedDate: string;
  }[];
}

/** عملية سُجّلت في الميدان ولم يقبلها السيرفر بعد */
export interface FieldQueued {
  id: string;
  owner: string;
  farmId: string;
  type: FieldOpType;
  occurredAt: string;
  payload: Record<string, unknown>;
  /** وصف قصير يراه المشرف في الطابور */
  label: string;
  createdAt: number;
  /** سبب رفض السيرفر: يبقى حتى يُعاد أو يُحذف */
  error?: string;
}

interface StoreMap {
  boot: FieldBoot;
  queue: FieldQueued;
}
type StoreName = keyof StoreMap;

let connection: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  if (connection) return connection;
  const opening: Promise<IDBDatabase> = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("boot")) {
        db.createObjectStore("boot", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id" }).createIndex("owner", "owner");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
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

const tx = async (stores: StoreName | StoreName[], mode: IDBTransactionMode) => {
  try {
    return (await open()).transaction(stores, mode);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "InvalidStateError")) throw error;
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
  const t = await tx(stores, "readwrite");
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("أُلغيت المعاملة"));
    work((name) => t.objectStore(name));
  });
};

export const fieldDb = {
  async getBoot(owner: string, farmId: string): Promise<FieldBoot | null> {
    const t = await tx("boot", "readonly");
    return (
      (await done(
        t.objectStore("boot").get(`${owner}:${farmId}`) as IDBRequest<FieldBoot | undefined>,
      )) ?? null
    );
  },

  putBoot: (boot: FieldBoot) => write(["boot"], (s) => s("boot").put(plain(boot))),

  async queueOf(owner: string): Promise<FieldQueued[]> {
    const t = await tx("queue", "readonly");
    const rows = await done(
      t.objectStore("queue").index("owner").getAll(owner) as IDBRequest<FieldQueued[]>,
    );
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },

  enqueue: (op: FieldQueued) => write(["queue"], (s) => s("queue").put(plain(op))),

  /** نتيجة رفع: المقبول يُحذف، والمرفوض يُحفظ بسببه — في معاملة واحدة */
  settle: (accepted: string[], rejected: FieldQueued[]) =>
    write(["queue"], (s) => {
      accepted.forEach((id) => s("queue").delete(id));
      rejected.forEach((op) => s("queue").put(plain(op)));
    }),

  remove: (ids: string[]) => write(["queue"], (s) => ids.forEach((id) => s("queue").delete(id))),
};
