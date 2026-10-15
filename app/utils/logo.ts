// utils/logo.ts — تجهيز شعار الشركة قبل رفعه
//
// الشعار يُحفظ صورةً صغيرة (Data URL) لا ملفاً: تطبعه شاشة الكاشير بلا إنترنت
// وتقرؤه تقارير PDF. هنا يُصغَّر في المتصفح ليبقى تحت حد السيرفر.

/** حد السيرفر لطول الـ Data URL (SetTenantLogoDto) */
export const MAX_LOGO_LENGTH = 300_000;
/** أطول ضلع للشعار بعد التصغير: يكفي للفاتورة A4 والإيصال الحراري */
const MAX_SIDE = 480;
/** أكبر ملف يُقبل قبل التصغير */
export const MAX_LOGO_FILE = 5 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذرت قراءة الصورة — جرّب ملفاً آخر"));
    };
    image.src = url;
  });

const render = (
  image: HTMLImageElement,
  side: number,
  type: "image/png" | "image/jpeg",
): string => {
  const scale = Math.min(1, side / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("المتصفح لا يدعم تجهيز الصور");
  // JPEG بلا شفافية: خلفية بيضاء كالورق
  if (type === "image/jpeg") {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.88);
};

/**
 * يحوّل ملف الشعار إلى Data URL مصغّر: PNG (يحفظ الشفافية)، وإن بقي كبيراً
 * فـ JPEG، ثم مقاس أصغر.
 */
export const prepareLogo = async (file: File): Promise<string> => {
  if (!LOGO_TYPES.includes(file.type)) {
    throw new Error("الشعار يجب أن يكون صورة PNG أو JPG أو WebP");
  }
  if (file.size > MAX_LOGO_FILE) {
    throw new Error("حجم الصورة أكبر من 5 ميجا — اختر صورة أصغر");
  }
  const image = await loadImage(file);
  for (const side of [MAX_SIDE, 360, 240]) {
    const png = render(image, side, "image/png");
    if (png.length <= MAX_LOGO_LENGTH) return png;
    const jpeg = render(image, side, "image/jpeg");
    if (jpeg.length <= MAX_LOGO_LENGTH) return jpeg;
  }
  throw new Error("تعذر تصغير الشعار للحجم المسموح — اختر صورة أبسط");
};
