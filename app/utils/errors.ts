// utils/errors.ts

/** يستخرج رسالة خطأ قابلة للعرض من أي قيمة مرمية (catch يعطي unknown) */
export const getErrorMessage = (
  error: unknown,
  fallback = "حدث خطأ غير متوقع",
): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
};
