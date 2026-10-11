// utils/download.ts

export type ReportFormat = "excel" | "pdf";

export const reportExtension = (type: ReportFormat): string =>
  type === "excel" ? "xlsx" : "pdf";

/** تاريخ اليوم بصيغة YYYY-MM-DD (لأسماء ملفات التقارير) */
export const todayStamp = (): string =>
  new Date().toISOString().split("T")[0] ?? "";

/** يحفظ Blob كملف على جهاز المستخدم */
export const saveBlob = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};
