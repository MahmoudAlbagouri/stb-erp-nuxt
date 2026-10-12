// utils/support.ts — وضع الدعم: مالك النظام يعمل داخل شركة محددة.
//
// الفكرة: توكن التجديد يبقى توكن المالك دائماً، وتوكن الوصول يُستبدل بتوكن
// "دعم" يحمل معرّف الشركة. الكوكي SUPPORT_COOKIE يتذكر أي شركة، فعند تجديد
// الجلسة (كل ربع ساعة تقريباً) يُطلب توكن دعم جديد لنفس الشركة تلقائياً.

export const SUPPORT_COOKIE = "stb_support";

/** الشركة التي يعمل مالك النظام داخلها الآن */
export interface SupportTarget {
  tenantId: string;
  companyName: string;
}

export const supportCookieOptions = {
  maxAge: 60 * 60 * 24 * 7,
  sameSite: "lax",
  path: "/",
} as const;

/**
 * يطلب توكن دعم لشركة باستخدام توكن المالك. يعيد null إذا رفض السيرفر
 * (الشركة حُذفت، أو صاحب التوكن لم يعد مالك نظام).
 * انقطاع الشبكة يُرمى كخطأ ليتعامل معه المستدعي.
 */
export const requestSupportToken = async (
  baseUrl: string,
  ownerAccessToken: string,
  tenantId: string,
): Promise<string | null> => {
  const res = await fetch(`${baseUrl}/auth/support/${tenantId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ownerAccessToken}` },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { data?: { accessToken?: string } };
  return body.data?.accessToken ?? null;
};
