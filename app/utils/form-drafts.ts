// utils/form-drafts.ts — تخزين مسودات النماذج على الجهاز (localStorage)
//
// المنطق في composables/useFormDraft. هنا القراءة والكتابة فقط، وكلها داخل
// try: التخزين قد يكون ممتلئاً أو ممنوعاً (تصفح خاص) — النموذج يعمل بدونه.

const PREFIX = "stb-draft:";

/** المسودة الأقدم من هذا تُهمل وتُمسح */
export const FORM_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface FormDraftRecord<T = unknown> {
  savedAt: number;
  /** updatedAt المستند كما فُتح (null لمستند جديد) — لنعرف إن تغيّر بعدها */
  version: string | null;
  data: T;
}

/** مفتاح مسودة: لكل شركة ومستخدم ونموذج ومستند (أو "new") مسودة واحدة */
export const formDraftKey = (
  scope: { tenantId: string | null; userId: string | null },
  form: string,
  documentId: string | null,
): string =>
  `${PREFIX}${scope.tenantId ?? "-"}:${scope.userId ?? "-"}:${form}:${documentId ?? "new"}`;

export const readFormDraft = <T>(key: string): FormDraftRecord<T> | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as FormDraftRecord<T>) : null;
  } catch {
    return null;
  }
};

export const writeFormDraft = (key: string, record: FormDraftRecord): void => {
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // ممتلئ أو ممنوع: يفوت حفظ المسودة فقط
  }
};

export const removeFormDraft = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // التخزين غير متاح
  }
};

/** يمسح كل مسودات النماذج على الجهاز (تسجيل الخروج) */
export const clearFormDrafts = (): void => {
  if (!import.meta.client) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // التخزين غير متاح
  }
};
