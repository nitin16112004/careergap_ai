import { apiRequest } from "./api";

export interface JobRole {
  id: string;
  role_name: string;
  role_slug: string;
  role_description?: string | null;
  category?: string | null;
}

export interface SkillAnalysis {
  id: string;
  role_id?: string;
  match_score: number;
  current_skills: string[];
  matched_skills: string[];
  missing_skills: string[];
  recommended_skills: string[];
  analysis_result?: Record<string, unknown>;
  role?: JobRole;
  job_roles?: JobRole;
  learning_order?: string[];
}

export const skillGapService = {
  listRoles: () => apiRequest<JobRole[]>("/job-roles"),
  analyze: (roleId: string, resumeId?: string) => apiRequest<SkillAnalysis>("/skill-gap/analyze", {
    method: "POST",
    body: JSON.stringify({ roleId, ...(resumeId ? { resumeId } : {}) }),
  }),
  latest: () => apiRequest<SkillAnalysis | null>("/skill-gap/latest"),
};
