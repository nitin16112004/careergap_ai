import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

export const notificationService = {
  async list(userId: string) {
    const { data, error } = await getSupabaseStorageClient().from("notifications")
      .select("id,title,message,type,link_url,is_read,created_at,read_at,reminder_log_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new HttpError(500, "Unable to load notifications.", "NOTIFICATIONS_LOAD_FAILED", false);
    return data ?? [];
  },

  async markRead(userId: string, notificationId: string) {
    const { data, error } = await getSupabaseStorageClient().from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select("id,title,message,type,link_url,is_read,created_at,read_at,reminder_log_id")
      .maybeSingle();
    if (error) throw new HttpError(500, "Unable to update notification.", "NOTIFICATION_UPDATE_FAILED", false);
    if (!data) throw new HttpError(404, "Notification not found.", "NOTIFICATION_NOT_FOUND");
    return data;
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await getSupabaseStorageClient().from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw new HttpError(500, "Unable to update notifications.", "NOTIFICATIONS_UPDATE_FAILED", false);
  },
};
