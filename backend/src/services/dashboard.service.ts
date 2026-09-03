import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

export const dashboardService = {
  async getSummary(userId: string) {
    const client = getSupabaseStorageClient();
    const [profileResult, resumeResult, analysisResult, roadmapResult, generatedResumeResult] = await Promise.all([
      client.from("profiles").select("*").eq("id", userId).maybeSingle(),
      client.from("resumes").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      client.from("skill_analyses").select("*,job_roles(role_name)").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      client.from("roadmaps").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      client.from("generated_resumes").select("id,target_role,ats_score,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const failed = [profileResult, resumeResult, analysisResult, roadmapResult, generatedResumeResult].find((result) => result.error);
    if (failed?.error) throw new HttpError(500, "Unable to load dashboard.", "DASHBOARD_LOAD_FAILED", false);
    if (!profileResult.data) throw new HttpError(404, "Profile not found.", "PROFILE_NOT_FOUND");

    const profile = profileResult.data;
    const requiredValues = [
      profile.full_name,
      profile.email,
      profile.phone,
      profile.education,
      Array.isArray(profile.skills) && profile.skills.length ? profile.skills : null,
      profile.target_job_role,
      profile.preferred_location,
      profile.work_preference,
    ];
    const profileCompletion = Math.round((requiredValues.filter(Boolean).length / requiredValues.length) * 100);

    let pendingTasks = 0;
    let completedTasks = 0;
    if (roadmapResult.data?.id) {
      const { data: tasks, error } = await client.from("roadmap_tasks").select("status").eq("roadmap_id", roadmapResult.data.id);
      if (error) throw new HttpError(500, "Unable to load roadmap tasks.", "DASHBOARD_TASKS_FAILED", false);
      pendingTasks = (tasks ?? []).filter((task) => task.status !== "completed").length;
      completedTasks = (tasks ?? []).filter((task) => task.status === "completed").length;
    }

    return {
      profile,
      profileCompletion,
      resume: resumeResult.data,
      skillAnalysis: analysisResult.data,
      roadmap: roadmapResult.data,
      pendingTasks,
      completedTasks,
      generatedResume: generatedResumeResult.data,
    };
  },
};
