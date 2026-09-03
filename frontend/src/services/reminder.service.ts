import { apiRequest } from "./api";

export interface ReminderPreferences {
  emailEnabled: boolean;
  weeklyPendingEnabled: boolean;
  inactiveEnabled: boolean;
  motivationalEnabled: boolean;
}

export interface ReminderLog {
  id: string;
  roadmap_id: string | null;
  week_id: string | null;
  reminder_type: "weekly_pending_task" | "inactive_user" | "motivational" | "roadmap_due";
  pending_task_count: number;
  email_sent: boolean;
  email_status: "queued" | "sent" | "failed";
  email_error?: string | null;
  sent_at: string | null;
  reason: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ReminderProgress {
  roadmapId: string;
  progressPercentage: number;
  expectedProgressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  skippedTasks: number;
  overdueTasks: number;
  currentWeek: {
    id: string;
    weekNumber: number;
    title: string;
    startDate: string | null;
    dueDate: string | null;
    pendingTasks: number;
    overdueTasks: number;
  } | null;
  behindSchedule: boolean;
}

export interface ReminderStatus {
  preferences: ReminderPreferences;
  lastReminder: ReminderLog | null;
  unreadNotifications: number;
  progress: ReminderProgress | null;
}

export const reminderService = {
  status: () => apiRequest<ReminderStatus>("/reminders/status"),
  preferences: () => apiRequest<ReminderPreferences>("/reminders/preferences"),
  updatePreferences: (patch: Partial<ReminderPreferences>) => apiRequest<ReminderPreferences>("/reminders/preferences", {
    method: "PUT",
    body: JSON.stringify(patch),
  }),
  logs: () => apiRequest<ReminderLog[]>("/reminders/logs"),
};
