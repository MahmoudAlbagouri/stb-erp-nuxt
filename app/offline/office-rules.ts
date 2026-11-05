// offline/office-rules.ts — ما يعمل بلا إنترنت في لوحة التحكم، وكيف يظهر
//
// المبيعات والعملاء والموردون والمخزون: القراءة من آخر نسخة محفوظة، والحفظ
// في طابور يُرفع حين يعود الاتصال. السيرفر يتحقق من كل عملية عند رفعها،
// ويعطي المستندات أرقامها الرسمية حينها (لا فجوات في الترقيم).
import type { OfficeOp } from "./office-db";

export const TEMP_PREFIX = "tmp-";
const TEMP_PATTERN = /tmp-[0-9a-f-]{36}/g;

/** القراءات التي تُحفظ للعمل بلا إنترنت */
const CACHED = [
  /^\/sales\//,
  /^\/purchasing\//,
  /^\/inventory\//,
  /^\/catalog\//,
  /^\/branches/,
  /^\/subscriptions\/me\/access$/,
];

/** عمليات الحفظ التي تنتظر في الطابور بلا إنترنت */
const QUEUED = [
  /^\/sales\/(customers|invoices|payments|returns)(\/|$)/,
  /^\/purchasing\/(suppliers|invoices|payments|returns)(\/|$)/,
  /^\/inventory\/(transfers|adjustments)(\/|$)/,
];

const pathOf = (url: string) => url.split("?")[0] ?? url;

export const isCachedRead = (url: string) =>
  CACHED.some((rule) => rule.test(pathOf(url)));

export const isQueuedWrite = (url: string) =>
  QUEUED.some((rule) => rule.test(pathOf(url)));

export const newOpId = () => `op-${crypto.randomUUID()}`;
export const newTempId = () => `${TEMP_PREFIX}${crypto.randomUUID()}`;

/** يستبدل المعرّفات المؤقتة التي وصلت السيرفر بمعرّفاتها الحقيقية */
export const swapIds = <T>(value: T, ids: Map<string, string>): T => {
  if (!ids.size || value === undefined) return value;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const swapped = text.replace(TEMP_PATTERN, (temp) => ids.get(temp) ?? temp);
  return (typeof value === "string" ? swapped : JSON.parse(swapped)) as T;
};

/** إنشاء = POST على مجموعة (لا على إجراء مثل /issue) */
export const isCreate = (method: string, path: string) =>
  method === "POST" &&
  /^\/(sales\/(customers|invoices|payments|returns)|purchasing\/(suppliers|invoices|payments|returns)|inventory\/(transfers|adjustments))$/.test(
    pathOf(path),
  );

/** الحالة التي يصير إليها المستند بعد إجراء */
const ACTION_STATUS: Record<string, string> = {
  issue: "issued",
  post: "posted",
  send: "in_transit",
  receive: "received",
  cancel: "cancelled",
};

const NAMES: [RegExp, string][] = [
  [/^\/sales\/customers/, "عميل"],
  [/^\/sales\/invoices/, "فاتورة بيع"],
  [/^\/sales\/payments/, "سند قبض"],
  [/^\/sales\/returns/, "مرتجع بيع"],
  [/^\/purchasing\/suppliers/, "مورد"],
  [/^\/purchasing\/invoices/, "فاتورة شراء"],
  [/^\/purchasing\/payments/, "سند صرف"],
  [/^\/purchasing\/returns/, "مرتجع شراء"],
  [/^\/inventory\/transfers/, "تحويل مخزني"],
  [/^\/inventory\/adjustments/, "تسوية مخزون"],
];

const ACTION_LABEL: Record<string, string> = {
  issue: "إصدار",
  post: "اعتماد",
  send: "إرسال",
  receive: "استلام",
  cancel: "إلغاء",
};

/** وصف العملية للمستخدم: «عميل جديد: محمد»، «إصدار فاتورة بيع» */
export const labelOf = (method: string, path: string, body: unknown): string => {
  const clean = pathOf(path);
  const name = NAMES.find(([rule]) => rule.test(clean))?.[1] ?? "عملية";
  const action = clean.split("/").pop() ?? "";
  const title =
    typeof body === "object" && body && "name" in body
      ? `: ${String((body as { name: unknown }).name)}`
      : "";
  if (method === "DELETE") return `حذف ${name}`;
  if (ACTION_LABEL[action]) return `${ACTION_LABEL[action]} ${name}`;
  if (method === "PATCH") return `تعديل ${name}${title}`;
  if (method === "POST" && isCreate(method, clean)) {
    return name.startsWith("سند") || name.startsWith("تسوية")
      ? `${name}${title}`
      : `${name} جديد${name.startsWith("فاتورة") ? "ة" : ""}${title}`;
  }
  return `${name}${title}`;
};

/** ما تعيده الصفحة فوراً لعملية حُفظت في الطابور (قبل رد السيرفر) */
export const optimistic = (op: OfficeOp, current: unknown): unknown => {
  const body = (op.body ?? {}) as Record<string, unknown>;
  const action = pathOf(op.path).split("/").pop() ?? "";
  const base = {
    pendingSync: true,
    // الرقم الرسمي يعطيه السيرفر عند الرفع
    number: "بانتظار الرفع",
    updatedAt: null,
  };
  if (op.tempId) {
    return {
      status: "draft",
      lines: [],
      total: 0,
      balance: 0,
      isActive: true,
      ...body,
      ...base,
      id: op.tempId,
    };
  }
  const status = ACTION_STATUS[action];
  const known = typeof current === "object" && current ? current : {};
  return { ...known, ...(status ? {} : body), ...(status ? { status } : {}), ...base };
};

/** ما أُجري هنا على عنصر لم يصل السيرفر: تعديله وحالته بعد الإجراء */
const patchItem =
  (collection: string, ops: OfficeOp[]) =>
  (item: Record<string, unknown>): Record<string, unknown> => {
    let next = item;
    const own = `${collection}/${String(item.id)}`;
    for (const op of ops) {
      if (op.path !== own && !op.path.startsWith(`${own}/`)) continue;
      const action = op.path.slice(own.length + 1);
      if (!action && op.method === "PATCH") {
        next = { ...next, ...(op.body as object), pendingSync: true };
      } else if (ACTION_STATUS[action]) {
        next = { ...next, status: ACTION_STATUS[action], pendingSync: true };
      }
    }
    return next;
  };

/**
 * يضع ما في الطابور فوق رد محفوظ أو جديد: الجديد أول القائمة، والمعدَّل بما
 * كُتب فيه، والمستند الذي أُجري عليه إجراء بحالته الجديدة.
 */
export const overlay = (url: string, body: unknown, ops: OfficeOp[]): unknown => {
  const path = pathOf(url);
  if (!ops.length || typeof body !== "object" || !body) return body;

  const page = body as { data?: unknown };
  if (Array.isArray(page.data)) {
    const created = ops
      .filter((op) => op.tempId && op.path === path)
      .map((op) => optimistic(op, null) as Record<string, unknown>);
    return {
      ...page,
      data: [...created, ...(page.data as Record<string, unknown>[])].map(
        patchItem(path, ops),
      ),
    };
  }
  if (Array.isArray(body)) {
    return (body as Record<string, unknown>[]).map(patchItem(path, ops));
  }
  // مستند واحد: مجموعته المسار بلا آخر جزء
  const collection = path.slice(0, path.lastIndexOf("/"));
  return patchItem(collection, ops)(body as Record<string, unknown>);
};
