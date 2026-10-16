// composables/useFormDraft.ts — مسودة النموذج على الجهاز
//
// النماذج الطويلة (فاتورة بأربعين سطراً) تُحفظ على الجهاز أثناء الكتابة: إن
// أُغلقت النافذة أو التبويب، أو تعطل المتصفح، أو انتهت الجلسة قبل الحفظ، يجد
// المستخدم عمله حين يفتح النموذج مرة أخرى، فيختار استرجاعه أو تجاهله.
//
// المسودة على هذا الجهاز وحده ولا تُرفع لأي مكان. تُمسح بعد الحفظ الناجح،
// وبعد 7 أيام، وعند تسجيل الخروج (utils/form-drafts).
//
// في الصفحة:
//   const draft = useFormDraft("purchase-invoice", {
//     open: showForm,                  // إغلاق النافذة يحفظ آخر ما كُتب ويتوقف
//     documentId: () => form.id,       // null = مستند جديد
//     snapshot: () => form,            // ما يُحفظ (نسخة JSON)
//     apply: (data) => Object.assign(form, data),
//   });
//   بعد تعبئة النموذج عند فتحه   → draft.start(full?.updatedAt)
//   بعد نجاح الحفظ               → draft.saved(saved.updatedAt)
//   في النافذة                   → <FormDraftNotice :draft="draft" />
import {
  onScopeDispose,
  ref,
  watch,
  type Ref,
  type WatchStopHandle,
} from "vue";
import { useAuthStore } from "../stores/auth";
import {
  FORM_DRAFT_MAX_AGE_MS,
  formDraftKey,
  readFormDraft,
  removeFormDraft,
  writeFormDraft,
} from "../utils/form-drafts";

const SAVE_DELAY_MS = 500;

export interface FormDraftOffer {
  savedAt: number;
  /** عُدّل المستند على السيرفر بعد أن حُفظت هذه المسودة */
  outdated: boolean;
}

export interface FormDraft {
  /** مسودة محفوظة تنتظر قرار المستخدم (null = لا شيء) */
  offer: Ref<FormDraftOffer | null>;
  /** بدء المراقبة بعد تعبئة النموذج؛ `version` = updatedAt المستند المفتوح */
  start: (version?: string | null) => void;
  /** حُفظ على السيرفر: لا مسودة، ويُكمل المراقبة من هنا إن بقيت النافذة */
  saved: (version?: string | null) => void;
  restore: () => void;
  discard: () => void;
}

export const useFormDraft = <T>(
  form: string,
  options: {
    open: Ref<boolean>;
    documentId: () => string | null;
    snapshot: () => T;
    apply: (data: T) => void;
  },
): FormDraft => {
  const auth = useAuthStore();
  const offer = ref<FormDraftOffer | null>(null);

  let key: string | null = null;
  let version: string | null = null;
  /** النموذج كما فُتح أو كما حُفظ آخر مرة: لا مسودة ما دام مطابقاً له */
  let baseline = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopWatch: WatchStopHandle | null = null;

  const serialize = () => JSON.stringify(options.snapshot());

  /** بلا مستخدم معروف لا مسودة (لا نعرف لمن تكون) */
  const keyNow = () =>
    auth.userId
      ? formDraftKey(
          { tenantId: auth.tenantId, userId: auth.userId },
          form,
          options.documentId(),
        )
      : null;

  const save = (current: string) => {
    if (!key) return;
    if (current === baseline) removeFormDraft(key);
    else {
      writeFormDraft(key, {
        savedAt: Date.now(),
        version,
        data: JSON.parse(current),
      });
    }
  };

  /** ما ينتظر المهلة يُحفظ الآن (إغلاق النافذة أو التبويب) */
  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    save(serialize());
  };

  const onChange = (current: string) => {
    // بدأ يكتب دون أن يختار: النسخة القديمة لم تعد مطلوبة (يُكتب فوقها)
    offer.value = null;
    // مستند جديد حُفظ أول مرة: مسودته تتبع المستند من الآن
    const next = keyNow();
    if (next !== key) {
      if (key) removeFormDraft(key);
      key = next;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      save(current);
    }, SAVE_DELAY_MS);
  };

  const halt = () => {
    flush();
    stopWatch?.();
    stopWatch = null;
    if (import.meta.client) window.removeEventListener("pagehide", flush);
  };

  const start = (docVersion: string | null = null) => {
    // النموذج امتلأ بالمستند الجديد: ما كان ينتظر المهلة لا يُحفظ فوق مفتاح غيره
    if (timer) clearTimeout(timer);
    timer = null;
    halt();
    offer.value = null;
    if (!import.meta.client) return;

    key = keyNow();
    version = docVersion;
    baseline = serialize();
    const stored = key ? readFormDraft<T>(key) : null;
    if (stored && key) {
      const fresh = Date.now() - stored.savedAt < FORM_DRAFT_MAX_AGE_MS;
      if (fresh && JSON.stringify(stored.data) !== baseline) {
        offer.value = {
          savedAt: stored.savedAt,
          outdated:
            !!docVersion && !!stored.version && stored.version !== docVersion,
        };
      } else {
        removeFormDraft(key);
      }
    }
    stopWatch = watch(serialize, onChange);
    window.addEventListener("pagehide", flush);
  };

  const saved = (docVersion: string | null = null) => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (key) removeFormDraft(key);
    key = keyNow();
    if (key) removeFormDraft(key);
    offer.value = null;
    version = docVersion;
    baseline = serialize();
  };

  const restore = () => {
    const stored = key ? readFormDraft<T>(key) : null;
    offer.value = null;
    if (stored) options.apply(stored.data);
  };

  const discard = () => {
    if (key) removeFormDraft(key);
    offer.value = null;
  };

  watch(options.open, (isOpen) => {
    if (isOpen) return;
    halt();
    offer.value = null;
  });
  // الصفحة أُغلقت والنافذة مفتوحة: آخر ما كُتب يُحفظ
  onScopeDispose(halt);

  return { offer, start, saved, restore, discard };
};
