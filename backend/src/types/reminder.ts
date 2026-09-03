export type ReminderType = "weekly_pending_task" | "inactive_user" | "motivational" | "roadmap_due";

export interface ReminderPreferences {
  emailEnabled: boolean;
  weeklyPendingEnabled: boolean;
  inactiveEnabled: boolean;
  motivationalEnabled: boolean;
}

export interface ReminderEmailJobData {
  reminderLogId: string;
  emailLogId: string;
  userId: string;
  to: string;
  reminderType: ReminderType;
  subject: string;
  html: string;
  text: string;
}

export interface ReminderScanResult {
  scannedUsers: number;
  scannedRoadmaps: number;
  queuedReminders: number;
  duplicatesSkipped: number;
  skippedDisabled: number;
  errors: number;
}
