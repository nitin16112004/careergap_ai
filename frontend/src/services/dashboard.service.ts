import type { ReminderStatus } from "./reminder.service";
import { apiRequest } from "./api";

export interface DashboardSummary {
  profile: Record<string, unknown>;
  profileCompletion: number;
  resume: Record<string, unknown> | null;
  skillAnalysis: Record<string, unknown> | null;
  roadmap: Record<string, unknown> | null;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  generatedResume: Record<string, unknown> | null;
  reminder: ReminderStatus;
}

export const dashboardService = {
  summary: () => apiRequest<DashboardSummary>("/dashboard/summary"),
};
