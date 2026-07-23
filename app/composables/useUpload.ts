// composables/useUpload.ts
// Central upload handler - all file upload logic goes through here

import { ref, computed } from "vue";
import { useRuntimeConfig } from "nuxt/app";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // URL returned from server
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
  const config = useRuntimeConfig();
  const BASE_URL = config.public.apiBase as string;

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

  // ── Auth Header ─────────────────────────────────────────────────────────────

  const getAuthHeader = (): Record<string, string> => {
    if (!import.meta.client) return {};
    const token = localStorage.getItem("stb_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ── Validation ──────────────────────────────────────────────────────────────

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
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append(opts.fieldName!, file);

        // Attach extra fields
        if (opts.extraFields) {
          Object.entries(opts.extraFields).forEach(([key, val]) => {
            formData.append(key, val);
          });
        }

        const response = await fetch(`${BASE_URL}${opts.endpoint}`, {
          method: "POST",
          headers: getAuthHeader(),
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || `فشل رفع الملف (${response.status})`);
        }

        const data = await response.json();

        // Build UploadedFile — STB API response shape:
        // { data: { data: { data: [{ url, filename, mimetype, size }] } } }
        const fileInfo = data?.data?.data?.[0];
        const uploaded: UploadedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: fileInfo?.url ?? "",
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
