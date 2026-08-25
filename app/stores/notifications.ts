import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "../composables/useApi";
import type {
  Notification,
  NotificationStats,
  PaginatedNotifications,
  NotificationCategory,
} from "@/types";

export const useNotificationsStore = defineStore("notifications", () => {
  const api = useApi();

  // State
  const myNotifications = ref<Notification[]>([]);
  const allNotifications = ref<PaginatedNotifications | null>(null);
  const stats = ref<NotificationStats | null>(null);
  const unreadCount = ref(0);
  const loading = ref(false);

  // Getters
  const hasUnread = computed(() => unreadCount.value > 0);

  // Actions - Employee
  const fetchMyNotifications = async (filters?: {
    isRead?: boolean;
    category?: NotificationCategory;
  }) => {
    loading.value = true;
    try {
      let query = "";
      if (filters) {
        const params = new URLSearchParams();
        if (filters.isRead !== undefined)
          params.append("isRead", String(filters.isRead));
        if (filters.category) params.append("category", filters.category);
        query = `?${params.toString()}`;
      }
      const res = await api.get<Notification[]>(`/notifications${query}`);
      myNotifications.value = res.data || [];
    } catch (error) {
      console.error("Failed to fetch my notifications:", error);
    } finally {
      loading.value = false;
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get<{ count: number }>(
        "/notifications/unread-count",
      );
      unreadCount.value = res.data?.count || 0;
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      // Update local state optimistically
      const notif = myNotifications.value.find((n) => n.id === id);
      if (notif) notif.isRead = true;
      if (unreadCount.value > 0) unreadCount.value--;
    } catch (error) {
      console.error("Failed to mark as read:", error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all");
      myNotifications.value.forEach((n) => (n.isRead = true));
      unreadCount.value = 0;
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      throw error;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.del(`/notifications/${id}`);
      myNotifications.value = myNotifications.value.filter((n) => n.id !== id);
      // Note: unread count might need adjustment if deleted was unread, but backend handles it.
      // For simplicity, we can re-fetch count or just decrement if it was unread.
    } catch (error) {
      console.error("Failed to delete notification:", error);
      throw error;
    }
  };

  // Actions - Admin
  const fetchAdminStats = async () => {
    try {
      const res = await api.get<NotificationStats>(
        "/notifications/admin/stats",
      );
      stats.value = res.data;
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    }
  };

  const fetchAllNotifications = async (filters?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    category?: NotificationCategory;
    recipientName?: string;
  }) => {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      if (filters) {
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));
        if (filters.isRead !== undefined)
          params.append("isRead", String(filters.isRead));
        if (filters.category) params.append("category", filters.category);
        if (filters.recipientName)
          params.append("recipientName", filters.recipientName);
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get<PaginatedNotifications>(
        `/notifications/admin/all${query}`,
      );
      allNotifications.value = res.data;
    } catch (error) {
      console.error("Failed to fetch all notifications:", error);
    } finally {
      loading.value = false;
    }
  };

  const markAsReadByAdmin = async (id: string) => {
    try {
      await api.post(`/notifications/admin/${id}/read`);
      if (allNotifications.value) {
        const notif = allNotifications.value.items.find((n) => n.id === id);
        if (notif) notif.isRead = true;
      }
      if (stats.value && stats.value.unread > 0) stats.value.unread--;
    } catch (error) {
      throw error;
    }
  };

  const deleteByAdmin = async (id: string) => {
    try {
      await api.del(`/notifications/admin/${id}`);
      if (allNotifications.value) {
        allNotifications.value.items = allNotifications.value.items.filter(
          (n) => n.id !== id,
        );
        allNotifications.value.total--;
      }
      if (stats.value) stats.value.total--;
    } catch (error) {
      throw error;
    }
  };

  const reset = () => {
    myNotifications.value = [];
    allNotifications.value = null;
    stats.value = null;
    unreadCount.value = 0;
  };

  return {
    myNotifications,
    allNotifications,
    stats,
    unreadCount,
    loading,
    hasUnread,
    fetchMyNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchAdminStats,
    fetchAllNotifications,
    markAsReadByAdmin,
    deleteByAdmin,
    reset,
  };
});
