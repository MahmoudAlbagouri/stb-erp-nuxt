// utils/farm-codes.ts — رموز QR في المزارع: عقد ثابت بين اللوحة المطبوعة،
// والشاشة الميدانية، وتطبيق الجوال القادم (أندرويد وآبل).
//
// المحتوى رابط عادي على دومين الويب، فيعمل بثلاث طرق بلا إعادة طباعة:
//   1. كاميرا أي جوال: تفتح الرابط ← الشاشة الميدانية على النخلة
//   2. ماسح الشاشة الميدانية: يقرأ الرابط ويفتح النخلة من بيانات الجوال (بلا إنترنت)
//   3. تطبيق الجوال: يسجّل الدومين (App Links / Universal Links) فيفتح الرابط بنفسه
//
// الصيغة (لا تتغير — لوحات معلّقة على النخيل سنوات):
//   نخلة:  {origin}/field?plant={uuid}
//   حصاد:  {origin}/field?harvest={uuid}
// والمقبول عند المسح أيضاً: المعرّف وحده (uuid)، أو الوسم مكتوباً (A-B1-R3-07).

export const FARM_CODE_PATH = "/field";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FarmCode =
  | { kind: "plant"; id: string }
  | { kind: "harvest"; id: string }
  | { kind: "tag"; tag: string };

/** دومين الويب العام (وقت الطباعة) */
const currentOrigin = () =>
  typeof window === "undefined" ? "" : window.location.origin;

export const plantCode = (id: string, origin = currentOrigin()) =>
  `${origin}${FARM_CODE_PATH}?plant=${id}`;

export const harvestCode = (id: string, origin = currentOrigin()) =>
  `${origin}${FARM_CODE_PATH}?harvest=${id}`;

/** ما قرأه الماسح ← نخلة أو حصاد أو وسم؛ null = فارغ أو رابط لا يخص المزارع */
export const parseFarmCode = (raw: string): FarmCode | null => {
  const text = raw.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const plant = url.searchParams.get("plant");
      if (plant && UUID.test(plant)) return { kind: "plant", id: plant.toLowerCase() };
      const harvest = url.searchParams.get("harvest");
      if (harvest && UUID.test(harvest)) return { kind: "harvest", id: harvest.toLowerCase() };
    } catch {
      // رابط مشوّه: ليس رمز مزرعة
    }
    return null;
  }
  if (UUID.test(text)) return { kind: "plant", id: text.toLowerCase() };
  return { kind: "tag", tag: text };
};
