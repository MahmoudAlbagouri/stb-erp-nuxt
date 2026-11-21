// utils/geo.ts — قراءة موقع على الخريطة من نص يلصقه المستخدم
//
// موقع مستلم التوصيل يُحفظ (اختيارياً) لتخطيط مسارات الطيارين لاحقاً — انظر
// docs/operations-research.md في الباك إند. يعمل بلا إنترنت: يقرأ الإحداثيات
// من النص نفسه ولا يفتح الرابط.

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const NUMBER = String.raw`-?\d{1,3}(?:\.\d+)?`;

/** أنماط الإحداثيات بالترتيب: الأدق أولاً */
const PATTERNS: RegExp[] = [
  // دبوس خرائط Google: ...!3d24.71!4d46.67
  new RegExp(String.raw`!3d(${NUMBER})!4d(${NUMBER})`),
  // ?q=24.71,46.67 أو &ll= أو query= أو destination=
  new RegExp(
    String.raw`[?&](?:q|ll|query|destination|daddr)=(${NUMBER})(?:,|%2C)\s*(${NUMBER})`,
    "i",
  ),
  // @24.71,46.67,15z (مركز الخريطة)
  new RegExp(String.raw`@(${NUMBER}),(${NUMBER})`),
  // geo:24.71,46.67
  new RegExp(String.raw`geo:(${NUMBER}),(${NUMBER})`, "i"),
  // إحداثيات مكتوبة: "24.7136, 46.6753"
  new RegExp(String.raw`^\s*(${NUMBER})\s*[,،\s]\s*(${NUMBER})\s*$`),
];

/**
 * الإحداثيات من رابط خرائط (Google / Apple / واتساب) أو من "خط العرض، خط الطول".
 * null إن لم يُفهم النص — والروابط المختصرة (maps.app.goo.gl) لا تحمل
 * إحداثيات: يُطلب فتحها ونسخ الرابط الكامل أو الإحداثيات.
 */
export const parseLocation = (text: string): GeoPoint | null => {
  const value = text.trim();
  if (!value) return null;
  for (const pattern of PATTERNS) {
    const match = value.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (inRange(latitude, longitude)) {
      return {
        latitude: Math.round(latitude * 1e6) / 1e6,
        longitude: Math.round(longitude * 1e6) / 1e6,
      };
    }
  }
  return null;
};

/** رابط يفتح الموقع على خرائط Google */
export const mapsLink = (point: GeoPoint): string =>
  `https://www.google.com/maps?q=${point.latitude},${point.longitude}`;

/** نص الموقع في الحقل: "24.713600, 46.675300" */
export const formatLocation = (point: GeoPoint): string =>
  `${point.latitude}, ${point.longitude}`;
