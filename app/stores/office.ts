// stores/office.ts — لوحة التحكم أونلاين وأوفلاين (المبيعات، العملاء، الموردون،
// المخزون) — نفس طبقة تطبيق الكاشير (lib/core/offline في stb_pos):
//
// - القراءة: من السيرفر وتُحفظ؛ بلا اتصال تُعرض آخر نسخة، وفوقها ما في الطابور.
// - الحفظ: يُرسل فوراً، وبلا اتصال (أو خلف عملية تنتظر) يُحفظ في طابور يُرفع
//   بالترتيب حين يعود الاتصال. كل عملية بمفتاحها (Idempotency-Key): لا تتكرر.
// - ما أُنشئ بلا اتصال يحمل معرّفاً مؤقتاً (tmp-…) يُستبدل بالحقيقي عند الرفع.
// - ما يرفضه السيرفر يبقى بسببه حتى يُعاد رفعه أو يُلغى (شريط الطابور).
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { HttpError, NetworkError } from "../composables/useConnection";
import { officeDb, type CachedResponse, type OfficeOp } from "../offline/office-db";
import {
  isCreate,
  labelOf,
  newOpId,
  newTempId,
  optimistic,
  overlay,
  swapIds,
} from "../offline/office-rules";
import { useAuthStore } from "./auth";

/** يرسل عملية للسيرفر بجلسة المستخدم ويعيد ما في data (من useApi) */
export type OfficeSender = (request: {
  method: OfficeOp["method"];
  path: string;
  body: unknown;
  key: string;
}) => Promise<unknown>;

const OWNER_KEY = "stb-office-owner";
/** رد لا يعني رفض العملية: يُعاد رفعها لاحقاً كما هي */
const RETRY_LATER = [401, 402, 409, 429];

const pathOf = (url: string) => url.split("?")[0] ?? url;

export const useOfficeStore = defineStore("office", () => {
  const ops = ref<OfficeOp[]>([]);
  const syncing = ref(false);
  /** آخر مرة عُرضت فيها بيانات محفوظة بدل السيرفر (للشريط) */
  const servedFromCacheAt = ref<number | null>(null);
  let ids = new Map<string, string>();
  let sender: OfficeSender | null = null;
  let running: Promise<void> | null = null;
  let again = false;

  const owner = () => useAuthStore().userId ?? null;
  const mine = computed(() => ops.value.filter((op) => op.owner === owner()));
  const pending = computed(() => mine.value.filter((op) => !op.error));
  const failed = computed(() => mine.value.filter((op) => !!op.error));

  const load = async () => {
    ops.value = (await officeDb.ops()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    ids = await officeDb.ids();
  };

  // ─── القراءة ──────────────────────────────────────────────────────────────
  /** مستخدم آخر على نفس المتصفح: تُمسح ردود من قبله */
  const ensureOwner = async (user: string) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(OWNER_KEY);
    } catch {
      // التخزين محجوب: نكمل بلا مقارنة
    }
    if (saved === user) return;
    await officeDb.clearResponses();
    try {
      localStorage.setItem(OWNER_KEY, user);
    } catch {
      // لا شيء
    }
  };

  const remember = async (url: string, body: unknown) => {
    const user = owner();
    if (!user) return;
    await ensureOwner(user);
    await officeDb.saveResponse({
      key: url,
      owner: user,
      path: pathOf(url),
      body,
      savedAt: Date.now(),
    });
  };

  /** آخر نسخة محفوظة لهذه القراءة (أو لنفس المسار بفلاتر أخرى) */
  const recall = async (url: string): Promise<CachedResponse | null> => {
    const user = owner();
    if (!user) return null;
    const hit =
      (await officeDb.response(url)) ?? (await officeDb.latestFor(pathOf(url)));
    if (hit && hit.owner === user) {
      servedFromCacheAt.value = hit.savedAt;
      return hit;
    }
    // مستند أُنشئ بلا اتصال: لا نسخة له على السيرفر بعد، فيُبنى مما كُتب
    const created = mine.value.find(
      (op) => op.tempId && pathOf(url) === `${op.path}/${op.tempId}`,
    );
    return created
      ? { key: url, owner: user, path: url, body: optimistic(created, null), savedAt: Date.now() }
      : null;
  };

  /** ما تعرضه الصفحة: الرد وفوقه ما في الطابور */
  const view = (url: string, body: unknown) => overlay(url, body, mine.value);

  // ─── الحفظ ────────────────────────────────────────────────────────────────
  const hasWaiting = () => mine.value.length > 0;

  const prepare = (
    method: OfficeOp["method"],
    path: string,
    body: unknown,
  ): OfficeOp => ({
    id: newOpId(),
    owner: owner() ?? "",
    method,
    path,
    body: body ?? {},
    label: labelOf(method, path, body),
    tempId: isCreate(method, path) ? newTempId() : null,
    createdAt: Date.now(),
  });

  const resolve = <T>(value: T): T => swapIds(value, ids);

  const enqueue = async (op: OfficeOp) => {
    await officeDb.addOp(op);
    await load();
    void sync();
    // ما ستراه الصفحة: الكائن الذي حفظته، بمعرّف مؤقت وحالة "بانتظار الرفع"
    const known = op.tempId
      ? null
      : ((await recall(op.path.split("/").slice(0, 4).join("/")))?.body ?? null);
    return optimistic(op, known);
  };

  // ─── الرفع ────────────────────────────────────────────────────────────────
  const once = async () => {
    const user = owner();
    if (!user || !sender) return;
    syncing.value = true;
    try {
      await load();
      const failedTemps = new Set<string>();
      for (const op of ops.value) {
        if (op.owner !== user) continue;
        if (op.error) {
          if (op.tempId) failedTemps.add(op.tempId);
          continue;
        }
        const text = JSON.stringify([op.path, op.body]);
        if ([...failedTemps].some((temp) => text.includes(temp))) {
          await officeDb.putOp({
            ...op,
            error: "تعتمد على عملية لم يقبلها السيرفر — راجعها أولاً",
          });
          if (op.tempId) failedTemps.add(op.tempId);
          continue;
        }
        try {
          const data = await sender({
            method: op.method,
            path: resolve(op.path),
            body: resolve(op.body),
            key: op.id,
          });
          const realId =
            data && typeof data === "object" && "id" in data
              ? String((data as { id: unknown }).id)
              : null;
          if (op.tempId && realId) {
            await officeDb.mapId(op.tempId, realId);
            ids.set(op.tempId, realId);
          }
          await officeDb.removeOp(op.seq!);
        } catch (error) {
          const later =
            error instanceof NetworkError ||
            (error instanceof HttpError && RETRY_LATER.includes(error.status));
          if (later) break;
          await officeDb.putOp({
            ...op,
            error: error instanceof Error ? error.message : "رفضها السيرفر",
          });
          if (op.tempId) failedTemps.add(op.tempId);
        }
      }
    } finally {
      await load();
      syncing.value = false;
    }
  };

  const drain = async () => {
    do {
      again = false;
      await once();
    } while (again);
  };

  /** يرفع الطابور؛ طلب أثناء رفع جارٍ ينتظره ثم يُكمل ما أُضيف بعده */
  const sync = (): Promise<void> => {
    if (running) {
      again = true;
      return running;
    }
    running = drain().finally(() => {
      running = null;
    });
    return running;
  };

  const start = async (send: OfficeSender) => {
    sender = send;
    await load();
    void sync();
  };

  const retry = async (op: OfficeOp) => {
    await officeDb.putOp({ ...op, error: undefined });
    await load();
    await sync();
  };

  const discard = async (op: OfficeOp) => {
    if (op.seq !== undefined) await officeDb.removeOp(op.seq);
    await load();
  };

  return {
    ops: mine,
    pending,
    failed,
    syncing,
    servedFromCacheAt,
    remember,
    recall,
    view,
    hasWaiting,
    prepare,
    resolve,
    enqueue,
    sync,
    start,
    retry,
    discard,
  };
});
