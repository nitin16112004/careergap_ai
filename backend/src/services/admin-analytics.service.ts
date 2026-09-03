import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

export const adminAnalyticsService = {
  async get() {
    const client = getSupabaseStorageClient();
    const [users, onboarded, resumes, roadmaps, reminderEmails, failedAi, activeRoles, paidSubscriptions] = await Promise.all([
      client.from("profiles").select("id", { count: "exact", head: true }),
      client.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_completed", true),
      client.from("resumes").select("id", { count: "exact", head: true }),
      client.from("roadmaps").select("id", { count: "exact", head: true }),
      client.from("reminder_logs").select("id", { count: "exact", head: true }).eq("email_sent", true),
      client.from("ai_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      client.from("job_roles").select("id", { count: "exact", head: true }).eq("is_active", true),
      client.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const results = [users, onboarded, resumes, roadmaps, reminderEmails, failedAi, activeRoles, paidSubscriptions];
    if (results.some((result) => result.error)) {
      throw new HttpError(500, "Unable to load admin analytics.", "ADMIN_ANALYTICS_LOAD_FAILED", false);
    }

    return {
      users: users.count ?? 0,
      onboardedUsers: onboarded.count ?? 0,
      resumeUploads: resumes.count ?? 0,
      roadmapsGenerated: roadmaps.count ?? 0,
      reminderEmailsSent: reminderEmails.count ?? 0,
      failedAiJobs: failedAi.count ?? 0,
      activeJobRoles: activeRoles.count ?? 0,
      activePaidSubscriptions: paidSubscriptions.count ?? 0,
      generatedAt: new Date().toISOString(),
    };
  },
};
