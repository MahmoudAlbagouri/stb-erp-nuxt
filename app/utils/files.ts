// utils/files.ts — الملفات المرفوعة (صور/PDF): نوعها واسمها من رابطها

const pathOf = (url: string): string => url.split(/[?#]/)[0] ?? "";

/** صورة يعرضها المتصفح مباشرة (jfif صورة JPEG بامتداد مختلف) */
export const isImageFile = (url: string): boolean =>
  /\.(jpe?g|jfif|png|webp|gif|svg|bmp|avif)$/i.test(pathOf(url));

export const isPdfFile = (url: string): boolean => /\.pdf$/i.test(pathOf(url));

/** اسم الملف من آخر مقطع في الرابط */
export const fileNameOf = (url: string): string => {
  const name = pathOf(url).split("/").pop() || "";
  try {
    return decodeURIComponent(name) || "ملف";
  } catch {
    return name || "ملف";
  }
};
