import { apiRequest } from "./api";

export interface DashboardSummary {
  profile: Record<string, unknown>;
  profileCompletion: number;
  resume: Record<string, unknown> | null;
  skillAnalysis: Record<string, unknown> | null;
  roadmap: Record<string, unknown> | null;
  pendingTasks: number;
  completedTasks: number;
  generatedResume: Record<string, unknown> | null;
}

export const dashboardService = {
  summary: () => apiRequest<DashboardSummary>("/dashboard/summary"),
};
