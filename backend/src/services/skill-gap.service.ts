import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

const normalize = (value: string): string => value.toLowerCase().replace(/[.+#/_\-\s]/g, "").trim();

const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

export const skillGapService = {
  async listJobRoles() {
    const { data, error } = await getSupabaseStorageClient()
      .from("job_roles")
      .select("id,role_name,role_slug,role_description,category")
      .eq("is_active", true)
      .order("role_name");
    if (error) throw new HttpError(500, "Unable to load job roles.", "JOB_ROLES_LOAD_FAILED", false);
    return data ?? [];
  },

  async getRoleSkills(roleId: string) {
    const { data, error } = await getSupabaseStorageClient()
      .from("role_skills")
      .select("id,priority,weight,skill_level,skills(id,skill_name,normalized_name)")
      .eq("role_id", roleId)
      .order("weight", { ascending: false });
    if (error) throw new HttpError(500, "Unable to load required skills.", "ROLE_SKILLS_LOAD_FAILED", false);
    return data ?? [];
  },

  async analyze(userId: string, roleId: string, resumeId?: string) {
    const client = getSupabaseStorageClient();
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id,onboarding_completed,skills,target_job_role")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new HttpError(500, "Unable to load your profile.", "PROFILE_LOAD_FAILED", false);
    if (!profile) throw new HttpError(404, "Profile not found.", "PROFILE_NOT_FOUND");
    if (!profile.onboarding_completed) {
      throw new HttpError(400, "Complete onboarding before analyzing your skill gap.", "ONBOARDING_REQUIRED");
    }

    if (resumeId) {
      const { data: ownedResume, error: resumeError } = await client
        .from("resumes")
        .select("id")
        .eq("id", resumeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (resumeError) throw new HttpError(500, "Unable to validate the resume.", "RESUME_LOOKUP_FAILED", false);
      if (!ownedResume) throw new HttpError(404, "Resume not found.", "RESUME_NOT_FOUND");
    }

    const userSkills = Array.isArray(profile.skills)
      ? profile.skills.filter((skill): skill is string => typeof skill === "string")
      : [];
    if (!userSkills.length) throw new HttpError(400, "Please add at least one skill to your profile.", "PROFILE_SKILLS_REQUIRED");

    const { data: role, error: roleError } = await client
      .from("job_roles")
      .select("id,role_name,role_slug")
      .eq("id", roleId)
      .eq("is_active", true)
      .maybeSingle();
    if (roleError) throw new HttpError(500, "Unable to load the selected job role.", "JOB_ROLE_LOAD_FAILED", false);
    if (!role) throw new HttpError(404, "Job role not found.", "JOB_ROLE_NOT_FOUND");

    const roleSkills = await this.getRoleSkills(roleId);
    if (!roleSkills.length) throw new HttpError(400, "This job role has no configured skills yet.", "ROLE_SKILLS_EMPTY");

    const skillIds = roleSkills.flatMap((item: any) => item.skills?.id ? [item.skills.id] : []);
    const { data: aliases, error: aliasError } = skillIds.length
      ? await client.from("skill_aliases").select("skill_id,normalized_alias").in("skill_id", skillIds)
      : { data: [], error: null };
    if (aliasError) throw new HttpError(500, "Unable to normalize skills.", "SKILL_ALIAS_LOAD_FAILED", false);

    const aliasesBySkill = new Map<string, Set<string>>();
    for (const alias of aliases ?? []) {
      const set = aliasesBySkill.get(alias.skill_id) ?? new Set<string>();
      set.add(normalize(alias.normalized_alias));
      aliasesBySkill.set(alias.skill_id, set);
    }

    const normalizedUser = new Set(userSkills.map(normalize));
    const matched: string[] = [];
    const missing: string[] = [];
    const items: Array<{ skill_id: string; skill_name: string; status: "matched" | "missing"; priority: "high" | "medium" | "low"; reason: string }> = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const requirement of roleSkills as any[]) {
      const skill = requirement.skills;
      if (!skill?.id || !skill?.skill_name) continue;
      const weight = Math.max(1, Number(requirement.weight) || 1);
      totalWeight += weight;
      const canonical = normalize(skill.normalized_name || skill.skill_name);
      const candidates = new Set([canonical, ...(aliasesBySkill.get(skill.id) ?? [])]);
      const isMatched = [...candidates].some((candidate) => normalizedUser.has(candidate));
      const priority: "high" | "medium" | "low" = requirement.priority === "must_have" ? "high" : requirement.priority === "good_to_have" ? "medium" : "low";

      if (isMatched) {
        matchedWeight += weight;
        matched.push(skill.skill_name);
      } else {
        missing.push(skill.skill_name);
      }

      items.push({
        skill_id: skill.id,
        skill_name: skill.skill_name,
        status: isMatched ? "matched" : "missing",
        priority,
        reason: isMatched
          ? `Already present in your profile for ${role.role_name}.`
          : `${skill.skill_name} is a ${String(requirement.priority).replace("_", " ")} skill for ${role.role_name}.`,
      });
    }

    const matchScore = totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0;
    const recommended = items
      .filter((item) => item.status === "missing")
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
      .map((item) => item.skill_name);

    const { data: analysis, error: saveError } = await client
      .from("skill_analyses")
      .insert({
        user_id: userId,
        resume_id: resumeId ?? null,
        role_id: roleId,
        current_skills: userSkills,
        matched_skills: matched,
        missing_skills: missing,
        recommended_skills: recommended,
        match_score: matchScore,
        analysis_result: { role_name: role.role_name, learning_order: recommended },
      })
      .select("*")
      .single();
    if (saveError || !analysis) throw new HttpError(500, "Unable to save skill gap analysis.", "SKILL_GAP_SAVE_FAILED", false);

    if (items.length) {
      const { error: itemError } = await client.from("skill_analysis_items").insert(
        items.map((item) => ({ ...item, analysis_id: analysis.id }))
      );
      if (itemError) throw new HttpError(500, "Unable to save skill analysis details.", "SKILL_GAP_ITEMS_SAVE_FAILED", false);
    }

    await client.from("profiles").update({ target_job_role: role.role_name }).eq("id", userId);
    return { ...analysis, role, learning_order: recommended };
  },

  async latest(userId: string) {
    const { data, error } = await getSupabaseStorageClient()
      .from("skill_analyses")
      .select("*,job_roles(id,role_name,role_slug)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new HttpError(500, "Unable to load skill gap analysis.", "SKILL_GAP_LOAD_FAILED", false);
    return data;
  },

  async get(userId: string, analysisId: string) {
    const { data, error } = await getSupabaseStorageClient()
      .from("skill_analyses")
      .select("*,skill_analysis_items(*)")
      .eq("id", analysisId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new HttpError(500, "Unable to load skill gap analysis.", "SKILL_GAP_LOAD_FAILED", false);
    if (!data) throw new HttpError(404, "Skill gap analysis not found.", "SKILL_GAP_NOT_FOUND");
    return data;
  },
};
