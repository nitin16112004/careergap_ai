import { apiRequest } from "./api";

export type AdminAnalytics = {
  users: number;
  onboardedUsers: number;
  activeJobRoles: number;
  activeRoadmaps: number;
  failedAiJobs: number;
  reminderLogs: number;
  activePaidSubscriptions: number;
  generatedAt: string;
};

export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string;
  current_city: string | null;
  target_job_role: string | null;
  role: "user" | "admin";
  onboarding_completed: boolean;
  email_verified: boolean;
  last_activity_at?: string | null;
  created_at: string;
};

export type AdminSkill = {
  id: string;
  skill_name: string;
  normalized_name: string;
  category: string | null;
  description: string | null;
  skill_aliases?: Array<{ id: string; alias_name: string; normalized_alias: string }>;
};

export type AdminRoleSkill = {
  id: string;
  priority: "must_have" | "good_to_have" | "optional";
  skill_level: "beginner" | "intermediate" | "advanced" | null;
  weight: number;
  skills: Pick<AdminSkill, "id" | "skill_name" | "normalized_name" | "category"> | null;
};

export type AdminJobRole = {
  id: string;
  role_name: string;
  role_slug: string;
  role_description: string | null;
  category: string | null;
  is_active: boolean;
  role_skills?: AdminRoleSkill[];
};

export type AdminKnowledgeDocument = {
  id: string;
  title: string;
  category: string;
  source_url: string | null;
  content: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminReminder = {
  id: string;
  user_id: string;
  reminder_type: string;
  email_status: string;
  email_sent: boolean;
  email_error: string | null;
  sent_at: string | null;
  created_at: string;
  reason?: string | null;
  profile?: { id: string; full_name: string | null; email: string } | null;
};

export type AdminLogs = {
  auditLogs: Array<{ id: string; actor_user_id: string | null; action: string; entity_type: string | null; entity_id: string | null; created_at: string }>;
  failedAiJobs: Array<{ id: string; user_id: string | null; job_type: string; error_message: string | null; retry_count: number; created_at: string }>;
  failedEmails: Array<{ id: string; user_id: string | null; email_to: string; email_subject: string; email_type: string; error_message: string | null; created_at: string }>;
};

export type AdminUserDetail = {
  profile: Record<string, unknown> & AdminUser;
  resumes: Array<Record<string, unknown>>;
  analyses: Array<Record<string, unknown>>;
  roadmaps: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
};

const json = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });
const put = (value: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(value) });

export const adminService = {
  analytics: () => apiRequest<AdminAnalytics>("/admin/analytics"),
  users: (search = "") => apiRequest<{ items: AdminUser[]; total: number; limit: number; offset: number }>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  user: (userId: string) => apiRequest<AdminUserDetail>(`/admin/users/${encodeURIComponent(userId)}`),
  jobRoles: () => apiRequest<AdminJobRole[]>("/admin/job-roles"),
  createJobRole: (input: { roleName: string; roleSlug: string; roleDescription?: string | null; category?: string | null }) => apiRequest<AdminJobRole>("/admin/job-roles", json(input)),
  updateJobRole: (roleId: string, input: Partial<{ roleName: string; roleSlug: string; roleDescription: string | null; category: string | null; isActive: boolean }>) => apiRequest<AdminJobRole>(`/admin/job-roles/${encodeURIComponent(roleId)}`, put(input)),
  disableJobRole: (roleId: string) => apiRequest<AdminJobRole>(`/admin/job-roles/${encodeURIComponent(roleId)}`, { method: "DELETE" }),
  skills: () => apiRequest<AdminSkill[]>("/admin/skills"),
  createSkill: (input: { skillName: string; normalizedName: string; category?: string | null; description?: string | null }) => apiRequest<AdminSkill>("/admin/skills", json(input)),
  updateSkill: (skillId: string, input: Partial<{ skillName: string; normalizedName: string; category: string | null; description: string | null }>) => apiRequest<AdminSkill>(`/admin/skills/${encodeURIComponent(skillId)}`, put(input)),
  deleteSkill: (skillId: string) => apiRequest<void>(`/admin/skills/${encodeURIComponent(skillId)}`, { method: "DELETE" }),
  assignRoleSkill: (roleId: string, input: { skillId: string; priority: AdminRoleSkill["priority"]; skillLevel?: AdminRoleSkill["skill_level"]; weight?: number }) => apiRequest<AdminRoleSkill>(`/admin/job-roles/${encodeURIComponent(roleId)}/skills`, json(input)),
  removeRoleSkill: (roleId: string, skillId: string) => apiRequest<void>(`/admin/job-roles/${encodeURIComponent(roleId)}/skills/${encodeURIComponent(skillId)}`, { method: "DELETE" }),
  knowledgeBase: () => apiRequest<AdminKnowledgeDocument[]>("/admin/knowledge-base"),
  createKnowledgeBase: (input: { title: string; category: string; content: string; sourceUrl?: string | null }) => apiRequest<AdminKnowledgeDocument>("/admin/knowledge-base", json(input)),
  deleteKnowledgeBase: (documentId: string) => apiRequest<void>(`/admin/knowledge-base/${encodeURIComponent(documentId)}`, { method: "DELETE" }),
  reindexKnowledgeBase: () => apiRequest<unknown>("/admin/knowledge-base/reindex", json({ force: false, limit: 100 })),
  reminders: () => apiRequest<AdminReminder[]>("/admin/reminders"),
  logs: () => apiRequest<AdminLogs>("/admin/logs"),
  queues: () => apiRequest<unknown>("/admin/ops/queues"),
};
