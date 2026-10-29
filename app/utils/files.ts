// utils/files.ts — الملفات المرفوعة (FileRef): نوعها ورابط تحميلها
import type { FileRef } from "@/types";

/** صورة يعرضها المتصفح مباشرة (النوع من محتوى الملف كما فحصه الخادم) */
export const isImageFile = (file: FileRef): boolean =>
  file.mimeType.startsWith("image/");

export const isPdfFile = (file: FileRef): boolean =>
  file.mimeType === "application/pdf";

/** الرابط نفسه، والخادم يرسل الملف للحفظ بدل العرض */
export const downloadUrl = (file: FileRef): string =>
  `${file.url}${file.url.includes("?") ? "&" : "?"}download=1`;
