import { getSupabaseStorageClient } from "../config/supabase";
import type { OnboardingProfileInput } from "../validators/onboarding.validators";
import { HttpError } from "../utils/http-error";

const serialize = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value : JSON.stringify(value);
};

const assertOwnedResume = async (userId: string, resumeId?: string): Promise<void> => {
  if (!resumeId) return;
  const { data, error } = await getSupabaseStorageClient()
    .from("resumes")
    .select("id")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Unable to validate the resume.", "ONBOARDING_RESUME_LOOKUP_FAILED", false);
  if (!data) throw new HttpError(404, "Resume not found.", "RESUME_NOT_FOUND");
};

const profilePatch = (input: OnboardingProfileInput) => ({
  full_name: input.fullName,
  email: input.email.toLowerCase(),
  phone: input.phone,
  current_city: input.currentCity,
  education: serialize(input.education),
  work_experience: serialize(input.workExperience),
  skills: [...new Set(input.skills.map((skill) => skill.trim()).filter(Boolean))],
  projects: input.projects,
  linkedin_url: input.linkedinUrl || null,
  github_url: input.githubUrl || null,
  portfolio_url: input.portfolioUrl || null,
  target_job_role: input.targetJobRole,
  preferred_location: input.preferredLocation,
  work_preference: input.workPreference,
  expected_salary: input.expectedSalary,
  notice_period: input.noticePeriod,
  career_goal: input.careerGoal,
});

const upsertFieldSources = async (userId: string, input: OnboardingProfileInput): Promise<void> => {
  const values: Record<string, unknown> = {
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    current_city: input.currentCity,
    education: input.education,
    work_experience: input.workExperience,
    skills: input.skills,
    projects: input.projects,
    linkedin_url: input.linkedinUrl,
    github_url: input.githubUrl,
    portfolio_url: input.portfolioUrl,
    target_job_role: input.targetJobRole,
    preferred_location: input.preferredLocation,
    work_preference: input.workPreference,
    expected_salary: input.expectedSalary,
    notice_period: input.noticePeriod,
    career_goal: input.careerGoal,
  };
  const manualFields = new Set(["target_job_role", "preferred_location", "work_preference", "expected_salary", "notice_period", "career_goal"]);
  const rows = Object.entries(values).map(([fieldName, value]) => ({
    user_id: userId,
    field_name: fieldName,
    field_value: serialize(value),
    source: input.fieldSources?.[fieldName] ?? (manualFields.has(fieldName) ? "manual" : "resume"),
    confidence_score: null,
    is_review_required: false,
  }));

  const { error } = await getSupabaseStorageClient()
    .from("profile_field_sources")
    .upsert(rows, { onConflict: "user_id,field_name" });
  if (error) throw new HttpError(500, "Unable to save profile field sources.", "PROFILE_FIELD_SOURCE_SAVE_FAILED", false);
};

const saveProfile = async (userId: string, input: OnboardingProfileInput, complete: boolean) => {
  await assertOwnedResume(userId, input.resumeId);
  const { data, error } = await getSupabaseStorageClient()
    .from("profiles")
    .update({ ...profilePatch(input), ...(complete ? { onboarding_completed: true } : {}) })
    .eq("id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new HttpError(500, "Unable to save your profile.", "PROFILE_SAVE_FAILED", false);
  if (!data) throw new HttpError(404, "Profile not found.", "PROFILE_NOT_FOUND");
  await upsertFieldSources(userId, input);
  return data;
};

export const onboardingService = {
  async getProfile(userId: string) {
    const { data, error } = await getSupabaseStorageClient()
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new HttpError(500, "Unable to load your profile.", "PROFILE_LOAD_FAILED", false);
    if (!data) throw new HttpError(404, "Profile not found.", "PROFILE_NOT_FOUND");
    return data;
  },
  saveProfile: (userId: string, input: OnboardingProfileInput) => saveProfile(userId, input, false),
  complete: (userId: string, input: OnboardingProfileInput) => saveProfile(userId, input, true),
};
