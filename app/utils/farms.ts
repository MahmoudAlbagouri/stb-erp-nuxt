// utils/farms.ts — أسماء قوائم المزارع الثابتة بالعربي، ومساعدات العرض
import type {
  CropCategory,
  DatePrecision,
  FarmOperationStatus,
  FarmOperationType,
  FarmOwnership,
  FarmUnitKind,
  GeoRing,
  HarvestGrade,
  HarvestRejectReason,
  InspectionStatus,
  IrrigationMethod,
  PestType,
  PlantRemovalReason,
  PlantSex,
  PlantSource,
  PlantStatus,
  PlantingEndReason,
  PlantingStatus,
  SoilType,
  TrackingMode,
  WaterSourceKind,
} from "@/types/farms";

export const OWNERSHIP: Record<FarmOwnership, string> = {
  owned: "ملك",
  leased: "مستأجرة",
  partnership: "شراكة",
  other: "أخرى",
};

export const UNIT_KIND: Record<FarmUnitKind, string> = {
  sector: "قطاع",
  block: "حوش",
  row: "صف",
  field: "حقل",
  greenhouse: "صوبة",
  bed: "مصطبة",
  nursery: "مشتل",
  other: "أخرى",
};

export const SOIL: Record<SoilType, string> = {
  sandy: "رملية",
  loamy_sand: "رملية طميية",
  loam: "طميية",
  clay: "طينية",
  silt: "غرينية",
  saline: "مالحة",
  calcareous: "جيرية",
  other: "أخرى",
};

export const IRRIGATION: Record<IrrigationMethod, string> = {
  drip: "تنقيط",
  bubbler: "فقاعي",
  sprinkler: "رش",
  pivot: "محوري",
  flood: "غمر",
  manual: "يدوي",
  none: "بلا ري",
};

export const WATER_SOURCE: Record<WaterSourceKind, string> = {
  well: "بئر",
  network: "شبكة",
  canal: "قناة",
  tank: "خزان",
  desalination: "تحلية",
  rainwater: "مياه أمطار",
  other: "أخرى",
};

export const CROP_CATEGORY: Record<CropCategory, string> = {
  palm: "نخيل",
  fruit_tree: "أشجار فاكهة",
  field_crop: "محاصيل حقلية",
  vegetable: "خضار",
  forage: "أعلاف",
  greenhouse: "زراعات صوب",
  ornamental: "زينة",
  other: "أخرى",
};

export const TRACKING: Record<TrackingMode, string> = {
  individual: "نخلة نخلة (سجل)",
  count: "بالعدد",
  area: "بالمساحة",
};

export const PRECISION: Record<DatePrecision, string> = {
  day: "باليوم",
  month: "بالشهر",
  year: "بالسنة",
  estimated: "تقديري",
};

export const PLANTING_STATUS: Record<PlantingStatus, { label: string; badge: string }> = {
  planned: { label: "مخططة", badge: "badge--pending" },
  active: { label: "قائمة", badge: "badge--active" },
  closed: { label: "منتهية", badge: "badge--inactive" },
  failed: { label: "فاشلة", badge: "badge--terminated" },
};

export const END_REASON: Record<PlantingEndReason, string> = {
  completed: "اكتمل الحصاد",
  crop_failure: "فشل المحصول",
  pest: "آفة",
  disease: "مرض",
  frost: "صقيع",
  heat: "حرارة",
  drought: "جفاف",
  flood: "غرق",
  salinity: "ملوحة",
  removed: "قُلعت",
  other: "أخرى",
};

export const PLANT_SEX: Record<PlantSex, string> = {
  female: "أنثى",
  male: "فحل",
  unknown: "غير محدد",
};

export const PLANT_SOURCE: Record<PlantSource, string> = {
  offshoot: "فسيلة",
  tissue_culture: "زراعة نسيجية",
  seedling: "شتلة",
  seed: "بذرة",
  nursery: "مشتل",
  existing: "موجودة سابقاً",
  other: "أخرى",
};

export const PLANT_STATUS: Record<PlantStatus, { label: string; badge: string }> = {
  healthy: { label: "سليمة", badge: "badge--active" },
  infested: { label: "مصابة بآفة", badge: "badge--terminated" },
  diseased: { label: "مريضة", badge: "badge--terminated" },
  weak: { label: "ضعيفة", badge: "badge--pending" },
  dead: { label: "ميتة", badge: "badge--inactive" },
  removed: { label: "مقلوعة", badge: "badge--inactive" },
};

export const REMOVAL_REASON: Record<PlantRemovalReason, string> = {
  dead: "ماتت",
  pest: "آفة",
  disease: "مرض",
  replaced: "استُبدلت",
  transplanted: "نُقلت",
  storm: "عاصفة",
  salinity: "ملوحة",
  excess_male: "فحل زائد",
  other: "أخرى",
};

export const OPERATION_TYPE: Record<FarmOperationType, string> = {
  irrigation: "ري",
  fertilization: "تسميد",
  spraying: "رش / مكافحة",
  pollination: "تلقيح",
  pruning: "تقليم",
  frond_removal: "تكريب",
  thinning: "خف",
  bagging: "تكميم",
  bunch_tying: "تدلية العذوق",
  offshoot_removal: "فصل فسائل",
  weeding: "إزالة حشائش",
  tillage: "حرث وتجهيز",
  sowing: "بذر / زراعة",
  transplanting: "شتل",
  mowing: "حش",
  soil_test: "تحليل تربة/مياه",
  cleaning: "تنظيف",
  maintenance: "صيانة",
  other: "أخرى",
};

export const FARM_OPERATION_STATUS: Record<FarmOperationStatus, { label: string; badge: string }> = {
  planned: { label: "مخططة", badge: "badge--pending" },
  done: { label: "منفّذة", badge: "badge--active" },
  cancelled: { label: "ملغاة", badge: "badge--inactive" },
};

export const GRADE: Record<HarvestGrade, string> = {
  extra: "ممتاز",
  first: "أولى",
  second: "ثانية",
  third: "ثالثة",
  industrial: "تصنيع / علف",
};

export const REJECT_REASON: Record<HarvestRejectReason, string> = {
  pest: "آفة",
  disease: "مرض",
  damage: "تلف",
  overripe: "زائد النضج",
  underripe: "غير ناضج",
  weather: "طقس",
  sorting: "فرز",
  other: "أخرى",
};

export const PEST: Record<PestType, string> = {
  red_palm_weevil: "سوسة النخيل الحمراء",
  dubas_bug: "الدوباس",
  lesser_date_moth: "الحميرة",
  date_spider_mite: "عنكبوت الغبار",
  scale_insect: "الحشرة القشرية",
  longhorn_borer: "حفار ساق النخيل",
  termites: "النمل الأبيض",
  bayoud: "البيوض",
  black_scorch: "اللفحة السوداء",
  inflorescence_rot: "خياس الطلع",
  aphids: "المن",
  whitefly: "الذبابة البيضاء",
  thrips: "التربس",
  leaf_miner: "صانعة الأنفاق",
  fruit_fly: "ذبابة الفاكهة",
  powdery_mildew: "البياض الدقيقي",
  downy_mildew: "البياض الزغبي",
  root_rot: "عفن الجذور",
  viral: "فيروسي",
  nematodes: "النيماتودا",
  weeds: "حشائش",
  rodents: "قوارض",
  birds: "طيور",
  locust: "جراد",
  nutrient_deficiency: "نقص عناصر",
  other: "أخرى",
};

export const SEVERITY = ["لا شيء", "خفيفة", "متوسطة", "شديدة", "حرجة"];

export const INSPECTION_STATUS: Record<InspectionStatus, { label: string; badge: string }> = {
  open: { label: "مفتوح", badge: "badge--terminated" },
  treating: { label: "قيد العلاج", badge: "badge--pending" },
  resolved: { label: "انتهى", badge: "badge--active" },
};

/** الأنواع التي تُدخل كمية مياه */
export const WATER_TYPES: readonly FarmOperationType[] = ["irrigation"];
/** الأنواع التي يُسأل فيها عن مدخلات من المخزن */
export const INPUT_TYPES: readonly FarmOperationType[] = [
  "fertilization",
  "spraying",
  "sowing",
  "transplanting",
  "other",
  "maintenance",
];

/** م² ← "1.25 هكتار" أو "850 م²" */
export const formatArea = (m2?: number | null): string => {
  if (m2 === null || m2 === undefined) return "—";
  if (m2 >= 10000) return `${formatNumber(Math.round((m2 / 10000) * 100) / 100)} هكتار`;
  return `${formatNumber(Math.round(m2))} م²`;
};

/** مساحة مضلع على الكرة بالمتر المربع (نفس حساب السيرفر) */
export const ringAreaM2 = (ring: GeoRing): number => {
  if (ring.length < 3) return 0;
  const rad = (d: number) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lng1, lat1] = ring[i]!;
    const [lng2, lat2] = ring[(i + 1) % ring.length]!;
    total += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.round(Math.abs((total * 6378137 * 6378137) / 2) * 100) / 100;
};

/** وحدات مرتبة كشجرة بمسافة بادئة للقوائم المنسدلة */
export const unitOptionLabel = (unit: {
  name: string;
  code?: string | null;
  depth: number;
  kind: FarmUnitKind;
}) =>
  `${"— ".repeat(Math.max(0, unit.depth - 1))}${UNIT_KIND[unit.kind]}: ${unit.name}${unit.code ? ` (${unit.code})` : ""}`;
