// composables/useUpload.ts
// Central upload handler - all file upload logic goes through here

import { ref, computed } from "vue";
import { useApi } from "./useApi";
import type { FileRef } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadStatus = "idle" | "uploading" | "success" | "error";

/** ملف رُفع للخادم (FileRef) + معاينة محلية للصور */
export interface UploadedFile extends FileRef {
  previewUrl?: string; // Local object URL for images
}

export interface UploadOptions {
  /** API endpoint path, e.g. "/uploads/avatar" */
  endpoint: string;
  /** FormData field name the server expects (default: "file") */
  fieldName?: string;
  /** Accepted MIME types, e.g. ["image/jpeg", "image/png"] */
  accept?: string[];
  /** Max file size in bytes (default: 5MB) */
  maxSize?: number;
  /** Allow multiple files (default: false) */
  multiple?: boolean;
  /** Max number of files when multiple=true (default: 10) */
  maxFiles?: number;
  /** Extra FormData fields to send alongside the file */
  extraFields?: Record<string, string>;
  /** Called when upload succeeds */
  onSuccess?: (files: UploadedFile[]) => void;
  /** Called when upload fails */
  onError?: (message: string) => void;
}

export interface UploadState {
  status: UploadStatus;
  progress: number; // 0–100
  error: string | null;
  files: UploadedFile[];
}

// ─── Default Values ───────────────────────────────────────────────────────────

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_FIELD_NAME = "file";
const DEFAULT_MAX_FILES = 10;

// ─── Composable ───────────────────────────────────────────────────────────────

export const useUpload = (options: UploadOptions) => {
  // ✅ عبر useApi: نفس التوكن (Cookie) وتجديده التلقائي — كان يقرأ التوكن من
  // localStorage (غير موجود هناك) فيُرسل الرفع بدون Authorization
  const api = useApi();

  // ── Reactive State ──────────────────────────────────────────────────────────

  const status = ref<UploadStatus>("idle");
  const progress = ref(0);
  const error = ref<string | null>(null);
  const uploadedFiles = ref<UploadedFile[]>([]);

  // ── Computed ────────────────────────────────────────────────────────────────

  const isUploading = computed(() => status.value === "uploading");
  const isSuccess = computed(() => status.value === "success");
  const hasError = computed(() => status.value === "error");
  const hasFiles = computed(() => uploadedFiles.value.length > 0);

  const mergedOptions = computed(() => ({
    fieldName: DEFAULT_FIELD_NAME,
    maxSize: DEFAULT_MAX_SIZE,
    multiple: false,
    maxFiles: DEFAULT_MAX_FILES,
    ...options,
  }));

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateFiles = (files: File[]): string | null => {
    const opts = mergedOptions.value;

    if (!opts.multiple && files.length > 1) {
      return "يُسمح برفع ملف واحد فقط";
    }

    if (opts.multiple && files.length > opts.maxFiles!) {
      return `لا يمكن رفع أكثر من ${opts.maxFiles} ملفات`;
    }

    for (const file of files) {
      if (opts.accept && opts.accept.length > 0) {
        // ✅ التحقق المرن: يقبل MIME types أو الامتدادات (.pdf, .docx)
        const isAllowed = opts.accept.some((pattern) => {
          // 1. إذا كان النمط ينتهي بـ /* (مثل image/*)
          if (pattern.endsWith("/*")) {
            return file.type.startsWith(pattern.replace("/*", "/"));
          }

          // 2. إذا كان النمط يبدأ بنقطة (امتداد ملف مثل .pdf)
          if (pattern.startsWith(".")) {
            const ext = pattern.toLowerCase();
            const fileName = file.name.toLowerCase();
            return fileName.endsWith(ext);
          }

          // 3. المطابقة الكاملة لـ MIME type
          return file.type === pattern;
        });

        if (!isAllowed) {
          return `نوع الملف "${file.name}" غير مدعوم. الصيغ المسموحة: ${opts.accept.join(", ")}`;
        }
      }

      if (file.size > opts.maxSize!) {
        const maxMB = (opts.maxSize! / 1024 / 1024).toFixed(0);
        return `حجم الملف "${file.name}" يتجاوز الحد المسموح (${maxMB} MB)`;
      }
    }

    return null;
  };

  // ── Core Upload ─────────────────────────────────────────────────────────────

  const upload = async (files: File[]): Promise<UploadedFile[] | null> => {
    if (!files.length) return null;

    // Reset state
    error.value = null;
    progress.value = 0;
    status.value = "uploading";

    // Validate
    const validationError = validateFiles(files);
    if (validationError) {
      error.value = validationError;
      status.value = "error";
      options.onError?.(validationError);
      return null;
    }

    try {
      const opts = mergedOptions.value;
      const results: UploadedFile[] = [];

      // Upload each file (sequential to track progress cleanly)
      for (const [i, file] of files.entries()) {
        const formData = new FormData();
        formData.append(opts.fieldName!, file);

        // Attach extra fields
        if (opts.extraFields) {
          Object.entries(opts.extraFields).forEach(([key, val]) => {
            formData.append(key, val);
          });
        }

        // الخادم يعيد الملفات المحفوظة: [{ id, name, mimeType, size, url }]
        const res = await api.post<FileRef[]>(opts.endpoint, formData);
        const saved = res.data?.[0];
        if (!saved) throw new Error("لم يُرجع الخادم بيانات الملف");
        const uploaded: UploadedFile = {
          ...saved,
          previewUrl: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        };

        results.push(uploaded);

        // Update progress
        progress.value = Math.round(((i + 1) / files.length) * 100);
      }

      uploadedFiles.value = [...uploadedFiles.value, ...results];
      status.value = "success";
      options.onSuccess?.(results);
      return results;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "حدث خطأ أثناء رفع الملف";
      error.value = msg;
      status.value = "error";
      options.onError?.(msg);
      return null;
    }
  };

  // ── Upload from input event ─────────────────────────────────────────────────

  const uploadFromEvent = async (
    event: Event,
  ): Promise<UploadedFile[] | null> => {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ""; // reset so the same file can be re-selected
    return upload(files);
  };

  // ── Upload from drop event ──────────────────────────────────────────────────

  const uploadFromDrop = async (
    event: DragEvent,
  ): Promise<UploadedFile[] | null> => {
    const files = Array.from(event.dataTransfer?.files ?? []);
    return upload(files);
  };

  // ── Remove a file from local state ─────────────────────────────────────────

  const removeFile = (id: string) => {
    const file = uploadedFiles.value.find((f) => f.id === id);
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    uploadedFiles.value = uploadedFiles.value.filter((f) => f.id !== id);
    if (uploadedFiles.value.length === 0) reset();
  };

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = () => {
    status.value = "idle";
    progress.value = 0;
    error.value = null;
    // Revoke all preview URLs to avoid memory leaks
    uploadedFiles.value.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    uploadedFiles.value = [];
  };

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    // State
    status,
    progress,
    error,
    uploadedFiles,
    // Computed
    isUploading,
    isSuccess,
    hasError,
    hasFiles,
    // Methods
    upload,
    uploadFromEvent,
    uploadFromDrop,
    removeFile,
    reset,
  };
};
