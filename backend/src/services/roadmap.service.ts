import { randomUUID } from "node:crypto";
import { getSupabaseStorageClient } from "../config/supabase";
import type {
    GeneratedRoadmapPayload,
    RoadmapGenerationInput,
    RoadmapGenerationResult,
    RoadmapRecord,
    RoadmapTaskRecord,
    RoadmapWeekRecord,
} from "../types/roadmap";
import { HttpError } from "../utils/http-error";

const MAX_DOCS_FOR_CONTEXT = 8;

const cleanString = (value: unknown): string => typeof value === "string" ? value.trim() : "";

const uniqueStrings = (values: Array<string | undefined | null>): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of values) {
        const value = cleanString(item);
        if (!value || seen.has(value.toLowerCase())) continue;
        seen.add(value.toLowerCase());
        result.push(value);
    }
    return result;
};

const toIsoDate = (index: number, baseDate: Date): string => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + (index * 7));
    return next.toISOString().slice(0, 10);
};

const parseRoleName = (input: RoadmapGenerationInput): string => {
    const value = cleanString(input.roleName) || cleanString(input.targetRole) || "Career roadmap";
    return value || "Career roadmap";
};

const getProfile = async (userId: string): Promise<{ full_name?: string | null; target_job_role?: string | null; skills?: string[]; career_goal?: string | null }> => {
    const { data, error } = await getSupabaseStorageClient().from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new HttpError(500, "Unable to load the user profile for roadmap generation.", "ROADMAP_PROFILE_LOAD_FAILED", false);
    if (!data) throw new HttpError(404, "Profile not found.", "ROADMAP_PROFILE_NOT_FOUND");
    return data as { full_name?: string | null; target_job_role?: string | null; skills?: string[]; career_goal?: string | null };
};

const getSkillAnalysis = async (userId: string, skillAnalysisId?: string | null): Promise<{ id: string; user_id: string; role_id: string | null; current_skills: string[]; missing_skills: string[]; matched_skills: string[]; recommended_skills: string[]; analysis_result: Record<string, unknown> } | null> => {
    let query = getSupabaseStorageClient().from("skill_analyses").select("*").eq("user_id", userId);
    if (skillAnalysisId) {
        query = query.eq("id", skillAnalysisId);
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new HttpError(500, "Unable to load the skill gap analysis for roadmap generation.", "ROADMAP_SKILL_ANALYSIS_FAILED", false);
    if (!data) return null;
    return data as { id: string; user_id: string; role_id: string | null; current_skills: string[]; missing_skills: string[]; matched_skills: string[]; recommended_skills: string[]; analysis_result: Record<string, unknown> };
};

type KnowledgeBaseDocument = {
    id: string;
    title: string;
    category: string;
    content: string;
    source_url?: string | null;
    metadata?: Record<string, unknown>;
};

const getKnowledgeBaseDocuments = async (roleName: string, missingSkills: string[]): Promise<KnowledgeBaseDocument[]> => {
    const { data, error } = await getSupabaseStorageClient()
        .from("knowledge_base_documents")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw new HttpError(500, "Unable to load knowledge base content for the roadmap.", "ROADMAP_KB_LOAD_FAILED", false);

    const docs = (data ?? []) as KnowledgeBaseDocument[];
    const roleText = roleName.toLowerCase();

    const scored = docs
        .map((doc) => {
            const content = `${doc.title} ${doc.category ?? ""} ${doc.content ?? ""}`.toLowerCase();
            let score = 0;
            if (doc.title.toLowerCase().includes(roleText)) score += 4;
            if (doc.category?.toLowerCase().includes(roleText)) score += 2;
            for (const skill of missingSkills) {
                const normalized = skill.toLowerCase();
                if (content.includes(normalized)) score += 3;
            }
            return { doc, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, MAX_DOCS_FOR_CONTEXT)
        .map((entry) => entry.doc);

    return scored.length > 0 ? scored : docs.slice(0, MAX_DOCS_FOR_CONTEXT);
};

const validateGeneratedRoadmap = (payload: GeneratedRoadmapPayload): void => {
    if (!payload.title.trim()) throw new HttpError(400, "The generated roadmap is missing a title.", "ROADMAP_VALIDATION_FAILED");
    if (!payload.description.trim()) throw new HttpError(400, "The generated roadmap is missing a summary.", "ROADMAP_VALIDATION_FAILED");
    if (!Number.isInteger(payload.duration_weeks) || payload.duration_weeks <= 0) throw new HttpError(400, "The generated roadmap must include a valid duration in weeks.", "ROADMAP_VALIDATION_FAILED");
    if (!Array.isArray(payload.weeks) || payload.weeks.length === 0) throw new HttpError(400, "The generated roadmap must contain at least one week.", "ROADMAP_VALIDATION_FAILED");

    for (const week of payload.weeks) {
        if (!week.title.trim()) throw new HttpError(400, "Each roadmap week requires a title.", "ROADMAP_VALIDATION_FAILED");
        if (!Array.isArray(week.tasks) || week.tasks.length === 0) throw new HttpError(400, "Each roadmap week requires at least one task.", "ROADMAP_VALIDATION_FAILED");
        for (const task of week.tasks) {
            if (!task.task_title.trim()) throw new HttpError(400, "Each roadmap task requires a valid title.", "ROADMAP_VALIDATION_FAILED");
            const title = task.task_title.toLowerCase();
            if (title.includes("google") || title.includes("meta") || title.includes("microsoft")) {
                throw new HttpError(400, "Roadmap output contains unsupported external claims.", "ROADMAP_VALIDATION_FAILED");
            }
        }
    }
};

const buildRoadmapPayload = (userProfile: { full_name?: string | null; target_job_role?: string | null; skills?: string[]; career_goal?: string | null }, skillAnalysis: { missing_skills: string[]; recommended_skills: string[]; current_skills: string[]; matched_skills: string[] } | null, roleName: string, docs: KnowledgeBaseDocument[]): GeneratedRoadmapPayload => {
    const missingSkills = uniqueStrings([
        ...(skillAnalysis?.missing_skills ?? []),
        ...(skillAnalysis?.recommended_skills ?? []),
    ]);
    const baseSkills = missingSkills.length > 0 ? missingSkills : ["Foundational project execution", "Target role fundamentals"];
    const duration = Math.min(Math.max(4, Math.ceil(baseSkills.length / 2)), 12);
    const authorName = cleanString(userProfile.full_name) || "Your profile";
    const summary = `${authorName}'s ${roleName} roadmap is built from the current skills, target role, and missing-skill gaps already captured in the account.`;
    const weeks: GeneratedRoadmapPayload["weeks"] = [];

    for (let index = 0; index < duration; index += 1) {
        const weekSkills = baseSkills.slice(index * 2, index * 2 + 2);
        if (weekSkills.length === 0) break;

        const tasks = weekSkills.map((skill, taskIndex) => {
            const doc = docs.find((entry) => {
                const text = `${entry.title} ${entry.content}`.toLowerCase();
                return text.includes(skill.toLowerCase());
            });

            const taskTitle = skill.includes(" ") ? `Practice ${skill}` : `Strengthen ${skill}`;
            return {
                task_title: taskTitle,
                task_description: `Apply ${skill} in a practical project or exercise that matches the ${roleName} expectations captured in your profile and skill gap analysis.`,
                resource_links: doc && doc.source_url ? [{ label: doc.title, url: doc.source_url }] : [],
                status: "pending" as const,
                due_date: toIsoDate(taskIndex + (index * 2), new Date()),
            };
        });

        tasks.push({
            task_title: `Review and apply your ${roleName.toLowerCase()} progress`,
            task_description: "Review the concepts learned this week and reflect on which skills are still missing before moving to the next milestone.",
            resource_links: [],
            status: "pending",
            due_date: toIsoDate(index + 1, new Date()),
        });

        weeks.push({
            week_number: index + 1,
            title: `Week ${index + 1}: ${weekSkills[0] || "Core target-role fundamentals"}`,
            description: `This week focuses on the most relevant ${roleName.toLowerCase()} skills identified from the current skill gap and knowledge base documents.`,
            start_date: toIsoDate(index, new Date()),
            due_date: toIsoDate(index + 1, new Date()),
            tasks,
        });
    }

    return {
        title: `${roleName} Roadmap`,
        description: summary,
        duration_weeks: duration,
        generated_by: "rag",
        ai_response: {
            role_name: roleName,
            user_name: authorName,
            target_role: userProfile.target_job_role ?? roleName,
            current_skills: skillAnalysis?.current_skills ?? userProfile.skills ?? [],
            missing_skills: missingSkills,
            recommended_skills: skillAnalysis?.recommended_skills ?? [],
            career_goal: userProfile.career_goal ?? null,
            retrieved_documents: docs.map((doc) => ({ id: doc.title, title: doc.title, category: doc.category, source_url: doc.source_url ?? null })),
        },
        weeks,
    };
};

const insertRoadmapWeeks = async (roadmapId: string, weeks: GeneratedRoadmapPayload["weeks"]): Promise<Array<RoadmapWeekRecord & { tasks: RoadmapTaskRecord[] }>> => {
    const client = getSupabaseStorageClient();
    const weekRows: Array<RoadmapWeekRecord & { tasks: RoadmapTaskRecord[] }> = [];

    for (const week of weeks) {
        const { data: weekRow, error: weekError } = await client.from("roadmap_weeks").insert({
            roadmap_id: roadmapId,
            week_number: week.week_number,
            title: week.title,
            description: week.description,
            start_date: week.start_date ?? null,
            due_date: week.due_date ?? null,
            status: "pending",
        }).select("*").single();

        if (weekError || !weekRow) throw new HttpError(500, "Unable to save the roadmap week structure.", "ROADMAP_WEEK_SAVE_FAILED", false);

        const tasksPayload = week.tasks.map((task, index) => ({
            roadmap_id: roadmapId,
            week_id: weekRow.id,
            task_title: task.task_title,
            task_description: task.task_description ?? null,
            resource_links: task.resource_links ?? [],
            status: task.status ?? "pending",
            due_date: task.due_date ?? null,
            sort_order: index,
        }));

        const { data: taskRows, error: taskError } = await client.from("roadmap_tasks").insert(tasksPayload).select("*");
        if (taskError) throw new HttpError(500, "Unable to save roadmap tasks for the generated plan.", "ROADMAP_TASK_SAVE_FAILED", false);

        weekRows.push({
            ...(weekRow as RoadmapWeekRecord),
            tasks: (taskRows ?? []) as RoadmapTaskRecord[],
        });
    }

    return weekRows;
};

export const roadmapService = {
    async generate(userId: string, input: RoadmapGenerationInput): Promise<RoadmapGenerationResult> {
        const profile = await getProfile(userId);
        const roleName = parseRoleName(input);
        const skillAnalysis = await getSkillAnalysis(userId, input.skillAnalysisId ?? null);
        const resolvedRoleName = cleanString(profile.target_job_role) || roleName;
        const missingSkills = uniqueStrings([
            ...(skillAnalysis?.missing_skills ?? []),
            ...(skillAnalysis?.recommended_skills ?? []),
        ]);

        if (!resolvedRoleName || missingSkills.length === 0) {
            throw new HttpError(400, "A roadmap requires a target role and at least one missing skill.", "ROADMAP_INPUT_INSUFFICIENT");
        }

        const docs = await getKnowledgeBaseDocuments(resolvedRoleName, missingSkills);
        const payload = buildRoadmapPayload(profile, skillAnalysis, resolvedRoleName, docs);
        validateGeneratedRoadmap(payload);

        const client = getSupabaseStorageClient();
        const { data: roadmapRow, error: roadmapError } = await client.from("roadmaps").insert({
            user_id: userId,
            skill_analysis_id: skillAnalysis?.id ?? input.skillAnalysisId ?? null,
            role_id: input.roleId ?? null,
            title: payload.title,
            description: payload.description,
            duration_weeks: payload.duration_weeks,
            progress_percentage: 0,
            generated_by: payload.generated_by,
            ai_response: payload.ai_response,
            is_active: true,
        }).select("*").single();

        if (roadmapError || !roadmapRow) throw new HttpError(500, "Unable to save the generated roadmap record.", "ROADMAP_SAVE_FAILED", false);

        const { data: ragQueryRow } = await client.from("rag_queries").insert({
            id: randomUUID(),
            user_id: userId,
            query_text: `Generate a ${resolvedRoleName} roadmap using the profile and missing skills ${missingSkills.join(", ") || resolvedRoleName}`,
            retrieved_document_ids: docs.map((doc) => doc.id),
            response_summary: payload.description,
            model_used: "retrieval-grounded-roadmap",
        }).select("*").maybeSingle();

        const weekRows = await insertRoadmapWeeks(roadmapRow.id, payload.weeks);
        const response: RoadmapGenerationResult = {
            id: roadmapRow.id,
            user_id: userId,
            skill_analysis_id: skillAnalysis?.id ?? input.skillAnalysisId ?? null,
            role_id: input.roleId ?? null,
            title: roadmapRow.title,
            description: roadmapRow.description,
            duration_weeks: roadmapRow.duration_weeks,
            progress_percentage: roadmapRow.progress_percentage,
            generated_by: roadmapRow.generated_by,
            ai_response: (roadmapRow.ai_response ?? payload.ai_response) as Record<string, unknown>,
            is_active: roadmapRow.is_active,
            weeks: weekRows.map((week) => ({
                id: week.id,
                roadmap_id: roadmapRow.id,
                week_number: week.week_number,
                title: week.title,
                description: week.description,
                start_date: week.start_date,
                due_date: week.due_date,
                status: week.status,
                tasks: week.tasks.map((task) => ({
                    id: task.id,
                    roadmap_id: roadmapRow.id,
                    week_id: week.id,
                    task_title: task.task_title,
                    task_description: task.task_description,
                    resource_links: task.resource_links,
                    status: task.status,
                    due_date: task.due_date,
                    completed_at: task.completed_at,
                    sort_order: task.sort_order,
                })),
            })),
        };

        if (ragQueryRow) {
            response.ai_response = {
                ...response.ai_response,
                rag_query_id: ragQueryRow.id,
            };
        }

        return response;
    },

    async list(userId: string): Promise<RoadmapRecord[]> {
        const { data, error } = await getSupabaseStorageClient().from("roadmaps").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        if (error) throw new HttpError(500, "Unable to load your roadmaps.", "ROADMAP_LIST_FAILED", false);
        return (data ?? []) as RoadmapRecord[];
    },

    async get(userId: string, roadmapId: string): Promise<RoadmapGenerationResult> {
        const { data: roadmap, error: roadmapError } = await getSupabaseStorageClient().from("roadmaps").select("*").eq("id", roadmapId).eq("user_id", userId).maybeSingle();
        if (roadmapError) throw new HttpError(500, "Unable to load the requested roadmap.", "ROADMAP_FETCH_FAILED", false);
        if (!roadmap) throw new HttpError(404, "Roadmap not found.", "ROADMAP_NOT_FOUND");

        const { data: weeks, error: weekError } = await getSupabaseStorageClient().from("roadmap_weeks").select("*").eq("roadmap_id", roadmapId).order("week_number", { ascending: true });
        if (weekError) throw new HttpError(500, "Unable to load the roadmap weeks.", "ROADMAP_WEEK_FETCH_FAILED", false);

        const tasksByWeek = new Map<string, RoadmapTaskRecord[]>();
        const weekIds = (weeks ?? []).map((week) => week.id);
        if (weekIds.length > 0) {
            const { data: tasks, error: taskError } = await getSupabaseStorageClient().from("roadmap_tasks").select("*").in("week_id", weekIds).order("sort_order", { ascending: true });
            if (taskError) throw new HttpError(500, "Unable to load roadmap tasks.", "ROADMAP_TASK_FETCH_FAILED", false);
            for (const task of (tasks ?? []) as RoadmapTaskRecord[]) {
                const group = tasksByWeek.get(task.week_id) ?? [];
                group.push(task);
                tasksByWeek.set(task.week_id, group);
            }
        }

        return {
            id: roadmap.id,
            user_id: roadmap.user_id,
            skill_analysis_id: roadmap.skill_analysis_id,
            role_id: roadmap.role_id,
            title: roadmap.title,
            description: roadmap.description,
            duration_weeks: roadmap.duration_weeks,
            progress_percentage: roadmap.progress_percentage,
            generated_by: roadmap.generated_by,
            ai_response: (roadmap.ai_response ?? {}) as Record<string, unknown>,
            is_active: roadmap.is_active,
            weeks: (weeks ?? []).map((week) => ({
                id: week.id,
                roadmap_id: roadmap.id,
                week_number: week.week_number,
                title: week.title,
                description: week.description,
                start_date: week.start_date,
                due_date: week.due_date,
                status: week.status,
                tasks: (tasksByWeek.get(week.id) ?? []).map((task) => ({
                    id: task.id,
                    roadmap_id: task.roadmap_id,
                    week_id: task.week_id,
                    task_title: task.task_title,
                    task_description: task.task_description,
                    resource_links: task.resource_links,
                    status: task.status,
                    due_date: task.due_date,
                    completed_at: task.completed_at,
                    sort_order: task.sort_order,
                })),
            })),
        };
    },

    async update(userId: string, roadmapId: string, patch: Partial<{ title: string; description: string; durationWeeks: number; isActive: boolean; progressPercentage: number }>): Promise<RoadmapRecord> {
        const nextPatch: Record<string, unknown> = {};
        if (patch.title !== undefined) nextPatch.title = patch.title;
        if (patch.description !== undefined) nextPatch.description = patch.description;
        if (patch.durationWeeks !== undefined) nextPatch.duration_weeks = patch.durationWeeks;
        if (patch.isActive !== undefined) nextPatch.is_active = patch.isActive;
        if (patch.progressPercentage !== undefined) nextPatch.progress_percentage = patch.progressPercentage;

        const { data, error } = await getSupabaseStorageClient().from("roadmaps").update(nextPatch).eq("id", roadmapId).eq("user_id", userId).select("*").maybeSingle();
        if (error) throw new HttpError(500, "Unable to update the roadmap.", "ROADMAP_UPDATE_FAILED", false);
        if (!data) throw new HttpError(404, "Roadmap not found.", "ROADMAP_NOT_FOUND");
        return data as RoadmapRecord;
    },

    async updateTaskStatus(userId: string, roadmapId: string, taskId: string, nextStatus: RoadmapTaskRecord["status"]): Promise<RoadmapGenerationResult> {
        const client = getSupabaseStorageClient();
        const { data: roadmap, error: roadmapError } = await client.from("roadmaps").select("*").eq("id", roadmapId).eq("user_id", userId).maybeSingle();
        if (roadmapError) throw new HttpError(500, "Unable to load the requested roadmap.", "ROADMAP_FETCH_FAILED", false);
        if (!roadmap) throw new HttpError(404, "Roadmap not found.", "ROADMAP_NOT_FOUND");

        const { data: task, error: taskError } = await client.from("roadmap_tasks").select("*").eq("id", taskId).eq("roadmap_id", roadmapId).maybeSingle();
        if (taskError) throw new HttpError(500, "Unable to update the roadmap task.", "ROADMAP_TASK_UPDATE_FAILED", false);
        if (!task) throw new HttpError(404, "Roadmap task not found.", "ROADMAP_TASK_NOT_FOUND");

        const updatePayload: Record<string, unknown> = { status: nextStatus };
        if (nextStatus === "completed") {
            updatePayload.completed_at = new Date().toISOString();
        } else if (task.status === "completed") {
            updatePayload.completed_at = null;
        }

        const { data: updatedTask, error: updateTaskError } = await client.from("roadmap_tasks").update(updatePayload).eq("id", taskId).eq("roadmap_id", roadmapId).select("*").maybeSingle();
        if (updateTaskError) throw new HttpError(500, "Unable to update the roadmap task status.", "ROADMAP_TASK_UPDATE_FAILED", false);
        if (!updatedTask) throw new HttpError(404, "Roadmap task not found.", "ROADMAP_TASK_NOT_FOUND");

        const { data: remainingTasks, error: fetchTaskError } = await client.from("roadmap_tasks").select("*").eq("roadmap_id", roadmapId).order("sort_order", { ascending: true });
        if (fetchTaskError) throw new HttpError(500, "Unable to recalculate roadmap progress.", "ROADMAP_TASK_FETCH_FAILED", false);

        const totalTasks = (remainingTasks ?? []).length;
        const completedTasks = (remainingTasks ?? []).filter((entry) => entry.status === "completed").length;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const { data: updatedRoadmap, error: updateRoadmapError } = await client.from("roadmaps").update({ progress_percentage: progressPercentage }).eq("id", roadmapId).eq("user_id", userId).select("*").maybeSingle();
        if (updateRoadmapError) throw new HttpError(500, "Unable to save the updated roadmap progress.", "ROADMAP_PROGRESS_UPDATE_FAILED", false);
        if (!updatedRoadmap) throw new HttpError(404, "Roadmap not found.", "ROADMAP_NOT_FOUND");

        return await this.get(userId, roadmapId);
    },

    async completeTask(userId: string, roadmapId: string, taskId: string): Promise<RoadmapGenerationResult> {
        return this.updateTaskStatus(userId, roadmapId, taskId, "completed");
    },

    async delete(userId: string, roadmapId: string): Promise<void> {
        const { error } = await getSupabaseStorageClient().from("roadmaps").delete().eq("id", roadmapId).eq("user_id", userId);
        if (error) throw new HttpError(500, "Unable to delete the roadmap.", "ROADMAP_DELETE_FAILED", false);
    },
};
