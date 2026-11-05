// offline/office-db.ts — قاعدة لوحة التحكم على الجهاز (IndexedDB) للعمل بلا إنترنت
//
//   responses  آخر رد لكل قراءة (المبيعات، المشتريات، المخزون، الأصناف)
//   ops        عمليات حفظ تنتظر الرفع، بترتيب إدخالها
//   ids        المعرّف المؤقت لما أُنشئ بلا إنترنت ← معرّفه على السيرفر
//
// منفصلة عن قاعدة الكاشير (stb-pos): مسح بيانات الكاشير لا يمسّ طابور المكتب.

export interface CachedResponse {
  key: string;
  /** صاحب البيانات: مستخدم آخر على نفس المتصفح لا يرى بيانات غيره */
  owner: string;
  path: string;
  body: unknown;
  savedAt: number;
}

export interface OfficeOp {
  seq?: number;
  /** مفتاحها عند السيرفر (Idempotency-Key): إعادة رفعها لا تكررها */
  id: string;
  owner: string;
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body: unknown;
  label: string;
  /** عملية إنشاء: المعرّف المؤقت الذي تحمله الصفحات حتى يصل الحقيقي */
  tempId: string | null;
  createdAt: number;
  /** سبب رفض السيرفر: تبقى حتى يعدّلها المستخدم أو يلغيها */
  error?: string;
}

const DB_NAME = "stb-office";
const DB_VERSION = 1;
type StoreName = "responses" | "ops" | "ids";

let connection: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  if (connection) return connection;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("responses")) {
        db.createObjectStore("responses", { keyPath: "key" }).createIndex(
          "path",
          "path",
        );
      }
      if (!db.objectStoreNames.contains("ops")) {
        db.createObjectStore("ops", { keyPath: "seq", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("ids")) {
        db.createObjectStore("ids", { keyPath: "temp" });
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
      reject(request.error ?? new Error("تعذر فتح قاعدة المكتب على الجهاز"));
    };
  });
  connection = opening;
  return opening;
};

const done = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const store = async (name: StoreName, mode: IDBTransactionMode) =>
  (await open()).transaction(name, mode).objectStore(name);

/** نسخة عادية: IndexedDB لا يقبل كائنات Vue التفاعلية */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const officeDb = {
  async response(key: string): Promise<CachedResponse | null> {
    return (await done((await store("responses", "readonly")).get(key))) ?? null;
  },

  /** أحدث رد محفوظ لنفس المسار بأي فلاتر (حين لم تُفتح هذه الفلاتر من قبل) */
  async latestFor(path: string): Promise<CachedResponse | null> {
    const index = (await store("responses", "readonly")).index("path");
    const rows = (await done(index.getAll(path))) as CachedResponse[];
    return rows.sort((a, b) => b.savedAt - a.savedAt)[0] ?? null;
  },

  async saveResponse(row: CachedResponse): Promise<void> {
    await done((await store("responses", "readwrite")).put(plain(row)));
  },

  async clearResponses(): Promise<void> {
    await done((await store("responses", "readwrite")).clear());
  },

  async ops(): Promise<OfficeOp[]> {
    return done((await store("ops", "readonly")).getAll()) as Promise<OfficeOp[]>;
  },

  async addOp(op: OfficeOp): Promise<void> {
    await done((await store("ops", "readwrite")).add(plain(op)));
  },

  async putOp(op: OfficeOp): Promise<void> {
    await done((await store("ops", "readwrite")).put(plain(op)));
  },

  async removeOp(seq: number): Promise<void> {
    await done((await store("ops", "readwrite")).delete(seq));
  },

  async ids(): Promise<Map<string, string>> {
    const rows = (await done(
      (await store("ids", "readonly")).getAll(),
    )) as { temp: string; real: string }[];
    return new Map(rows.map((row) => [row.temp, row.real]));
  },

  async mapId(temp: string, real: string): Promise<void> {
    await done((await store("ids", "readwrite")).put({ temp, real }));
  },
};
