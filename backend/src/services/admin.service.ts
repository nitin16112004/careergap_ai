import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

type ListUsersInput = { limit?: number; offset?: number; search?: string };
type JobRoleInput = { roleName: string; roleSlug: string; roleDescription?: string | null; category?: string | null; isActive?: boolean };
type SkillInput = { skillName: string; normalizedName: string; category?: string | null; description?: string | null };
type RoleSkillInput = { skillId: string; priority: "must_have" | "good_to_have" | "optional"; skillLevel?: "beginner" | "intermediate" | "advanced" | null; weight?: number };
type KnowledgeBaseInput = { title: string; category: string; content: string; sourceUrl?: string | null; metadata?: Record<string, unknown> };

const fail = (message: string, code: string): never => {
  throw new HttpError(500, message, code, false);
};

const audit = async (actorUserId: string, action: string, entityType: string, entityId?: string | null, oldData?: unknown, newData?: unknown): Promise<void> => {
  const { error } = await getSupabaseStorageClient().from("audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  });
  if (error) fail("Unable to persist admin audit log.", "ADMIN_AUDIT_LOG_FAILED");
};

const sanitizeSearch = (value: string): string => value.replace(/[(),]/g, " ").trim().slice(0, 120);

export const adminService = {
  async analytics() {
    const client = getSupabaseStorageClient();
    const [users, onboarded, roles, activeRoadmaps, failedAi, reminders, paidSubscriptions] = await Promise.all([
      client.from("profiles").select("id", { count: "exact", head: true }),
      client.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_completed", true),
      client.from("job_roles").select("id", { count: "exact", head: true }).eq("is_active", true),
      client.from("roadmaps").select("id", { count: "exact", head: true }).eq("is_active", true),
      client.from("ai_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      client.from("reminder_logs").select("id", { count: "exact", head: true }),
      client.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);
    const failed = [users, onboarded, roles, activeRoadmaps, failedAi, reminders, paidSubscriptions].find((result) => result.error);
    if (failed?.error) fail("Unable to load admin analytics.", "ADMIN_ANALYTICS_LOAD_FAILED");
    return {
      users: users.count ?? 0,
      onboardedUsers: onboarded.count ?? 0,
      activeJobRoles: roles.count ?? 0,
      activeRoadmaps: activeRoadmaps.count ?? 0,
      failedAiJobs: failedAi.count ?? 0,
      reminderLogs: reminders.count ?? 0,
      activePaidSubscriptions: paidSubscriptions.count ?? 0,
      generatedAt: new Date().toISOString(),
    };
  },

  async listUsers(input: ListUsersInput = {}) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
    const offset = Math.max(input.offset ?? 0, 0);
    let query = getSupabaseStorageClient()
      .from("profiles")
      .select("id,full_name,email,current_city,target_job_role,role,onboarding_completed,email_verified,last_activity_at,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    const search = input.search ? sanitizeSearch(input.search) : "";
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error, count } = await query;
    if (error) fail("Unable to load users.", "ADMIN_USERS_LOAD_FAILED");
    return { items: data ?? [], total: count ?? 0, limit, offset };
  },

  async getUser(userId: string) {
    const client = getSupabaseStorageClient();
    const [profile, resumes, analyses, roadmaps, subscriptions] = await Promise.all([
      client.from("profiles").select("*").eq("id", userId).maybeSingle(),
      client.from("resumes").select("id,file_name,file_type,parsing_status,is_active,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      client.from("skill_analyses").select("id,match_score,created_at,role_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      client.from("roadmaps").select("id,title,progress_percentage,is_active,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      client.from("subscriptions").select("id,status,billing_cycle,starts_at,ends_at,payment_provider,plan_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    if (profile.error) fail("Unable to load user profile.", "ADMIN_USER_LOAD_FAILED");
    if (!profile.data) throw new HttpError(404, "User profile not found.", "ADMIN_USER_NOT_FOUND");
    if (resumes.error || analyses.error || roadmaps.error || subscriptions.error) fail("Unable to load user details.", "ADMIN_USER_DETAILS_LOAD_FAILED");
    return { profile: profile.data, resumes: resumes.data ?? [], analyses: analyses.data ?? [], roadmaps: roadmaps.data ?? [], subscriptions: subscriptions.data ?? [] };
  },

  async listJobRoles() {
    const { data, error } = await getSupabaseStorageClient()
      .from("job_roles")
      .select("id,role_name,role_slug,role_description,category,is_active,created_at,updated_at,role_skills(id,priority,skill_level,weight,skills(id,skill_name,normalized_name,category))")
      .order("role_name");
    if (error) fail("Unable to load job roles.", "ADMIN_JOB_ROLES_LOAD_FAILED");
    return data ?? [];
  },

  async createJobRole(actorUserId: string, input: JobRoleInput) {
    const { data, error } = await getSupabaseStorageClient().from("job_roles").insert({
      role_name: input.roleName,
      role_slug: input.roleSlug,
      role_description: input.roleDescription ?? null,
      category: input.category ?? null,
      is_active: input.isActive ?? true,
    }).select("*").single();
    if (error || !data) throw new HttpError(400, "Unable to create job role. Check role name and slug uniqueness.", "ADMIN_JOB_ROLE_CREATE_FAILED");
    await audit(actorUserId, "job_role.created", "job_role", String(data.id), null, data);
    return data;
  },

  async updateJobRole(actorUserId: string, roleId: string, input: Partial<JobRoleInput>) {
    const client = getSupabaseStorageClient();
    const current = await client.from("job_roles").select("*").eq("id", roleId).maybeSingle();
    if (current.error) fail("Unable to load job role.", "ADMIN_JOB_ROLE_LOAD_FAILED");
    if (!current.data) throw new HttpError(404, "Job role not found.", "ADMIN_JOB_ROLE_NOT_FOUND");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.roleName !== undefined) patch.role_name = input.roleName;
    if (input.roleSlug !== undefined) patch.role_slug = input.roleSlug;
    if (input.roleDescription !== undefined) patch.role_description = input.roleDescription;
    if (input.category !== undefined) patch.category = input.category;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    const { data, error } = await client.from("job_roles").update(patch).eq("id", roleId).select("*").single();
    if (error || !data) throw new HttpError(400, "Unable to update job role.", "ADMIN_JOB_ROLE_UPDATE_FAILED");
    await audit(actorUserId, "job_role.updated", "job_role", roleId, current.data, data);
    return data;
  },

  async disableJobRole(actorUserId: string, roleId: string) {
    return this.updateJobRole(actorUserId, roleId, { isActive: false });
  },

  async listSkills() {
    const { data, error } = await getSupabaseStorageClient()
      .from("skills")
      .select("id,skill_name,normalized_name,category,description,created_at,skill_aliases(id,alias_name,normalized_alias)")
      .order("skill_name");
    if (error) fail("Unable to load skills.", "ADMIN_SKILLS_LOAD_FAILED");
    return data ?? [];
  },

  async createSkill(actorUserId: string, input: SkillInput) {
    const { data, error } = await getSupabaseStorageClient().from("skills").insert({
      skill_name: input.skillName,
      normalized_name: input.normalizedName,
      category: input.category ?? null,
      description: input.description ?? null,
    }).select("*").single();
    if (error || !data) throw new HttpError(400, "Unable to create skill. Check name uniqueness.", "ADMIN_SKILL_CREATE_FAILED");
    await audit(actorUserId, "skill.created", "skill", String(data.id), null, data);
    return data;
  },

  async updateSkill(actorUserId: string, skillId: string, input: Partial<SkillInput>) {
    const client = getSupabaseStorageClient();
    const current = await client.from("skills").select("*").eq("id", skillId).maybeSingle();
    if (current.error) fail("Unable to load skill.", "ADMIN_SKILL_LOAD_FAILED");
    if (!current.data) throw new HttpError(404, "Skill not found.", "ADMIN_SKILL_NOT_FOUND");
    const patch: Record<string, unknown> = {};
    if (input.skillName !== undefined) patch.skill_name = input.skillName;
    if (input.normalizedName !== undefined) patch.normalized_name = input.normalizedName;
    if (input.category !== undefined) patch.category = input.category;
    if (input.description !== undefined) patch.description = input.description;
    const { data, error } = await client.from("skills").update(patch).eq("id", skillId).select("*").single();
    if (error || !data) throw new HttpError(400, "Unable to update skill.", "ADMIN_SKILL_UPDATE_FAILED");
    await audit(actorUserId, "skill.updated", "skill", skillId, current.data, data);
    return data;
  },

  async deleteSkill(actorUserId: string, skillId: string) {
    const client = getSupabaseStorageClient();
    const current = await client.from("skills").select("*").eq("id", skillId).maybeSingle();
    if (current.error) fail("Unable to load skill.", "ADMIN_SKILL_LOAD_FAILED");
    if (!current.data) throw new HttpError(404, "Skill not found.", "ADMIN_SKILL_NOT_FOUND");
    const { error } = await client.from("skills").delete().eq("id", skillId);
    if (error) throw new HttpError(409, "Unable to delete skill because it is still referenced.", "ADMIN_SKILL_DELETE_FAILED");
    await audit(actorUserId, "skill.deleted", "skill", skillId, current.data, null);
  },

  async assignRoleSkill(actorUserId: string, roleId: string, input: RoleSkillInput) {
    const payload = {
      role_id: roleId,
      skill_id: input.skillId,
      priority: input.priority,
      skill_level: input.skillLevel ?? null,
      weight: Math.min(Math.max(input.weight ?? 1, 1), 10),
    };
    const { data, error } = await getSupabaseStorageClient().from("role_skills").upsert(payload, { onConflict: "role_id,skill_id" }).select("*").single();
    if (error || !data) throw new HttpError(400, "Unable to save required skill mapping.", "ADMIN_ROLE_SKILL_SAVE_FAILED");
    await audit(actorUserId, "job_role.skill_saved", "role_skill", String(data.id), null, data);
    return data;
  },

  async removeRoleSkill(actorUserId: string, roleId: string, skillId: string) {
    const client = getSupabaseStorageClient();
    const current = await client.from("role_skills").select("*").eq("role_id", roleId).eq("skill_id", skillId).maybeSingle();
    if (current.error) fail("Unable to load required skill mapping.", "ADMIN_ROLE_SKILL_LOAD_FAILED");
    if (!current.data) throw new HttpError(404, "Required skill mapping not found.", "ADMIN_ROLE_SKILL_NOT_FOUND");
    const { error } = await client.from("role_skills").delete().eq("role_id", roleId).eq("skill_id", skillId);
    if (error) fail("Unable to remove required skill mapping.", "ADMIN_ROLE_SKILL_DELETE_FAILED");
    await audit(actorUserId, "job_role.skill_removed", "role_skill", String(current.data.id), current.data, null);
  },

  async listKnowledgeBase() {
    const { data, error } = await getSupabaseStorageClient().from("knowledge_base_documents")
      .select("id,title,category,source_url,content,metadata,is_active,created_by,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) fail("Unable to load knowledge base.", "ADMIN_KB_LOAD_FAILED");
    return data ?? [];
  },

  async createKnowledgeBase(actorUserId: string, input: KnowledgeBaseInput) {
    const { data, error } = await getSupabaseStorageClient().from("knowledge_base_documents").insert({
      title: input.title,
      category: input.category,
      source_url: input.sourceUrl ?? null,
      content: input.content,
      metadata: input.metadata ?? {},
      created_by: actorUserId,
      is_active: true,
    }).select("id,title,category,source_url,content,metadata,is_active,created_by,created_at,updated_at").single();
    if (error || !data) throw new HttpError(400, "Unable to create knowledge-base document.", "ADMIN_KB_CREATE_FAILED");
    await audit(actorUserId, "knowledge_base.created", "knowledge_base_document", String(data.id), null, data);
    return data;
  },

  async deleteKnowledgeBase(actorUserId: string, documentId: string) {
    const client = getSupabaseStorageClient();
    const current = await client.from("knowledge_base_documents").select("id,title,category,is_active").eq("id", documentId).maybeSingle();
    if (current.error) fail("Unable to load knowledge-base document.", "ADMIN_KB_LOAD_FAILED");
    if (!current.data) throw new HttpError(404, "Knowledge-base document not found.", "ADMIN_KB_NOT_FOUND");
    const { error } = await client.from("knowledge_base_documents").delete().eq("id", documentId);
    if (error) fail("Unable to delete knowledge-base document.", "ADMIN_KB_DELETE_FAILED");
    await audit(actorUserId, "knowledge_base.deleted", "knowledge_base_document", documentId, current.data, null);
  },

  async reminderOverview() {
    const client = getSupabaseStorageClient();
    const { data, error } = await client.from("reminder_logs")
      .select("id,user_id,roadmap_id,week_id,reminder_type,pending_task_count,email_sent,email_status,email_error,sent_at,created_at,reason,metadata")
      .order("created_at", { ascending: false }).limit(200);
    if (error) fail("Unable to load reminder logs.", "ADMIN_REMINDERS_LOAD_FAILED");
    const userIds = [...new Set((data ?? []).map((item) => String(item.user_id)).filter(Boolean))];
    const profiles = userIds.length
      ? await client.from("profiles").select("id,full_name,email").in("id", userIds)
      : { data: [], error: null };
    if (profiles.error) fail("Unable to load reminder user summaries.", "ADMIN_REMINDER_USERS_LOAD_FAILED");
    const profileMap = new Map((profiles.data ?? []).map((profile) => [String(profile.id), profile]));
    return (data ?? []).map((item) => ({ ...item, profile: profileMap.get(String(item.user_id)) ?? null }));
  },

  async logs() {
    const client = getSupabaseStorageClient();
    const [auditLogs, failedAiJobs, failedEmails] = await Promise.all([
      client.from("audit_logs").select("id,actor_user_id,action,entity_type,entity_id,old_data,new_data,created_at").order("created_at", { ascending: false }).limit(200),
      client.from("ai_jobs").select("id,user_id,job_type,status,error_message,retry_count,created_at,updated_at,completed_at").eq("status", "failed").order("created_at", { ascending: false }).limit(100),
      client.from("email_logs").select("id,user_id,email_to,email_subject,email_type,status,error_message,created_at,sent_at").eq("status", "failed").order("created_at", { ascending: false }).limit(100),
    ]);
    if (auditLogs.error || failedAiJobs.error || failedEmails.error) fail("Unable to load admin logs.", "ADMIN_LOGS_LOAD_FAILED");
    return { auditLogs: auditLogs.data ?? [], failedAiJobs: failedAiJobs.data ?? [], failedEmails: failedEmails.data ?? [] };
  },
};
