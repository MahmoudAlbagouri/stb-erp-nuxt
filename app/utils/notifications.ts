// utils/notifications.ts — عرض الإشعارات: الأيقونات، الألوان، الأوقات، قراءة البث
import type { Component } from "vue";
import {
  Banknote,
  Bell,
  BookX,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CircleMinus,
  Coins,
  Crown,
  FileCheck,
  FileText,
  Fingerprint,
  Gift,
  HandCoins,
  IdCard,
  Info,
  Landmark,
  LogOut,
  Megaphone,
  PackageX,
  Receipt,
  Scale,
  Sparkles,
  Truck,
  UserCheck,
  UserPlus,
  Wallet,
  WifiOff,
} from "lucide-vue-next";
import type {
  NotificationDetail,
  NotificationSeverity,
} from "../types/notifications";
import { formatCurrency, formatDate, formatDateTime } from "./format";

/** أسماء الأيقونات في سجل الأنواع (الباك إند) ← مكوّناتها */
const ICONS: Record<string, Component> = {
  megaphone: Megaphone,
  "calendar-plus": CalendarPlus,
  "calendar-check": CalendarCheck,
  "hand-coins": HandCoins,
  landmark: Landmark,
  "log-out": LogOut,
  "file-check": FileCheck,
  "file-text": FileText,
  "id-card": IdCard,
  "user-check": UserCheck,
  "user-plus": UserPlus,
  sparkles: Sparkles,
  wallet: Wallet,
  gift: Gift,
  "circle-minus": CircleMinus,
  banknote: Banknote,
  scale: Scale,
  fingerprint: Fingerprint,
  "wifi-off": WifiOff,
  "package-x": PackageX,
  truck: Truck,
  receipt: Receipt,
  "calendar-clock": CalendarClock,
  coins: Coins,
  "book-x": BookX,
  crown: Crown,
  "building-2": Building2,
  info: Info,
};

export const notificationIcon = (name?: string | null): Component =>
  (name && ICONS[name]) || Bell;

export const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  info: "معلومة",
  success: "تم",
  warning: "تنبيه",
  danger: "عاجل",
};

/** خطورة رسائل الإدارة كما يختارها المرسل */
export const MESSAGE_SEVERITY_LABEL = {
  info: "عادية",
  warning: "مهمة",
  danger: "عاجلة",
} as const;

/** «الآن» / «منذ 5 د» / «منذ 3 س» / «منذ يومين» / تاريخ لما هو أقدم من أسبوع */
export const timeAgo = (iso: string): string => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days === 2) return "منذ يومين";
  if (days < 7) return `منذ ${days} أيام`;
  return formatDate(iso);
};

/** قيمة سطر في التفاصيل بصيغتها: تاريخ، وقت بتوقيت الشركة، مبلغ بعملتها */
export const detailValue = (detail: NotificationDetail): string => {
  if (detail.value === null || detail.value === "") return "—";
  switch (detail.format) {
    case "date":
      return formatDate(`${String(detail.value).slice(0, 10)}T00:00:00`);
    case "datetime":
      return formatDateTime(detail.value);
    case "money":
      return formatCurrency(detail.value);
    default:
      return String(detail.value);
  }
};

/**
 * الأيام المتبقية حتى موعد (data.dueDate في تنبيهات الانتهاء) محسوبة الآن،
 * لا كما كُتبت وقت الإشعار: «باقي 12 يوماً» / «اليوم» / «انتهى منذ 3 أيام».
 */
export const dueText = (data: Record<string, unknown>): string | null => {
  const due = typeof data.dueDate === "string" ? data.dueDate : null;
  if (!due) return null;
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - start) / 86_400_000);
  if (days === 0) return "ينتهي اليوم";
  if (days === 1) return "ينتهي غداً";
  if (days > 1) return `باقي ${days} ${days <= 10 ? "أيام" : "يوماً"}`;
  const ago = -days;
  return `انتهى منذ ${ago} ${ago === 1 ? "يوم" : ago <= 10 ? "أيام" : "يوماً"}`;
};

/**
 * يقرأ بثاً (text/event-stream) ويستدعي onEvent لكل حدث مكتمل حتى ينتهي
 * الاتصال أو يُلغى. التعليقات (": ping") تُتجاهل.
 */
export const readEventStream = async (
  res: Response,
  onEvent: (event: string, data: string) => void,
): Promise<void> => {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let end = buffer.indexOf("\n\n");
    while (end >= 0) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (data.length) onEvent(event, data.join("\n"));
      end = buffer.indexOf("\n\n");
    }
  }
};
