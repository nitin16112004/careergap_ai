import { apiRequest } from "./api";

export type WorkPreference = "remote" | "hybrid" | "onsite";

export interface OnboardingProfileInput {
  fullName: string;
  email: string;
  phone: string;
  currentCity?: string | null;
  education?: unknown;
  workExperience?: unknown;
  skills: string[];
  projects: Array<Record<string, unknown>>;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  targetJobRole: string;
  preferredLocation: string;
  workPreference: WorkPreference;
  expectedSalary?: string | null;
  noticePeriod?: string | null;
  careerGoal?: string | null;
  resumeId?: string;
  fieldSources?: Record<string, "resume" | "manual" | "ai" | "system">;
}

export interface OnboardingProfileRecord {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  current_city: string | null;
  education: string | null;
  work_experience: string | null;
  skills: string[];
  projects: Array<Record<string, unknown>>;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  target_job_role: string | null;
  preferred_location: string | null;
  work_preference: WorkPreference | null;
  expected_salary: string | null;
  notice_period: string | null;
  career_goal: string | null;
  onboarding_completed: boolean;
}

export const onboardingService = {
  getProfile: () => apiRequest<OnboardingProfileRecord>("/onboarding/profile"),
  save: (input: OnboardingProfileInput) => apiRequest<OnboardingProfileRecord>("/onboarding/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  }),
  complete: (input: OnboardingProfileInput) => apiRequest<OnboardingProfileRecord>("/onboarding/complete", {
    method: "POST",
    body: JSON.stringify(input),
  }),
};
