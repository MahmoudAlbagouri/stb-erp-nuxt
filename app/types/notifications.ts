// types/notifications.ts — مركز الإشعارات (يطابق موديول notifications في الباك إند)
import type { Paginated } from "./catalog";

export type NotificationSeverity = "info" | "success" | "warning" | "danger";

export type NotificationGroup =
  | "messages"
  | "requests"
  | "hr"
  | "payroll"
  | "attendance"
  | "inventory"
  | "finance"
  | "pos"
  | "accounting"
  | "subscription"
  | "system";

/** سطر في تفاصيل الإشعار: يُعرض كما هو، والصيغة تحدد طريقة عرض القيمة */
export interface NotificationDetail {
  label: string;
  value: string | number | null;
  format?: "text" | "date" | "datetime" | "money";
}

/** إشعار في صندوق المستخدم (القائمة، التفاصيل، والبث اللحظي) */
export interface NotificationItem {
  id: string;
  /** مفتاح من سجل الأنواع (leave_request، iqama_expiry...) */
  type: string;
  group: NotificationGroup;
  severity: NotificationSeverity;
  title: string;
  body: string;
  details: NotificationDetail[];
  /** dueDate (YYYY-MM-DD) في تنبيهات الانتهاء: تُحسب منه الأيام حيّاً */
  data: Record<string, unknown>;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
  requiresAck: boolean;
  createdAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  sender: { id: string; name: string } | null;
}

export interface InboxPage extends Paginated<NotificationItem> {
  unread: number;
}

export interface UnreadSummary {
  count: number;
  byGroup: Partial<Record<NotificationGroup, number>>;
}

export interface NotificationTypeDef {
  key: string;
  label: string;
  group: NotificationGroup;
  /** اسم أيقونة lucide (kebab-case) */
  icon: string;
  /** false: لا يُكتم */
  mutable: boolean;
}

export interface NotificationCatalog {
  groups: { key: NotificationGroup; label: string }[];
  types: NotificationTypeDef[];
}

export interface InboxFilters {
  page?: number;
  limit?: number;
  unread?: boolean;
  group?: NotificationGroup | null;
}

// ─── لوحة المدير ───────────────────────────────────────────

export interface AdminNotificationRow {
  id: string;
  type: string;
  group: NotificationGroup;
  severity: NotificationSeverity;
  title: string;
  body: string;
  details: NotificationDetail[];
  link: string | null;
  requiresAck: boolean;
  createdAt: string;
  sender: { id: string; name: string } | null;
  recipients: number;
  read: number;
  acknowledged: number;
  /** اسم المستلم حين يكون واحداً */
  recipientName: string | null;
}

export interface NotificationRecipientRow {
  userId: string;
  name: string;
  employeeCode: string | null;
  readAt: string | null;
  acknowledgedAt: string | null;
}

export interface NotificationAdminStats {
  total: number;
  last7Days: number;
  deliveries: number;
  unreadDeliveries: number;
  urgentUnread: number;
  byGroup: Partial<Record<NotificationGroup, number>>;
}

export interface AdminNotificationsFilters {
  page?: number;
  limit?: number;
  group?: NotificationGroup | null;
  search?: string;
}

export interface ChecksResult {
  ran: string[];
  failed: { check: string; error: string }[];
}

// ─── رسائل الإدارة ─────────────────────────────────────────

export type MessageAudienceKind = "all" | "employees" | "branches" | "departments";

export interface MessageAudience {
  kind: MessageAudienceKind;
  ids?: string[];
}

export type MessageSeverity = "info" | "warning" | "danger";

export interface SendMessagePayload {
  title: string;
  body: string;
  severity: MessageSeverity;
  requiresAck: boolean;
  audience: MessageAudience;
}

export interface MessageReach {
  recipients: number;
  withoutAccount: {
    count: number;
    sample: { id: string; fullName: string; employeeCode: string }[];
  };
}

/** ما يعرضه درج التفاصيل: إشعار من صندوقي، أو إشعار في لوحة المدير */
export type NotificationDetailTarget =
  | { kind: "inbox"; item: NotificationItem }
  | { kind: "admin"; item: AdminNotificationRow };
