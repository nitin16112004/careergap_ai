import { apiRequest } from "./api";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  reminder_log_id: string | null;
}

export const notificationService = {
  list: () => apiRequest<AppNotification[]>("/notifications"),
  markRead: (notificationId: string) => apiRequest<AppNotification>(`/notifications/${notificationId}/read`, { method: "PATCH", body: JSON.stringify({}) }),
  markAllRead: () => apiRequest<void>("/notifications/read-all", { method: "PATCH", body: JSON.stringify({}) }),
};
