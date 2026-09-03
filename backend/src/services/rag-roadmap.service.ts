import { createHash } from "node:crypto";
import { getEnv } from "../config/env";
import { connectRedis } from "../config/redis";
import { getSupabaseStorageClient } from "../config/supabase";
import { createQueue } from "../jobs/queues";
import type { GeneratedRoadmapPayload, RoadmapGenerationInput, RoadmapGenerationResult, RoadmapTaskRecord, RoadmapWeekRecord } from "../types/roadmap";
import { HttpError } from "../utils/http-error";

const RAG_DAILY_LIMIT = 20;
const RAG_DAILY_WINDOW_SECONDS = 24 * 60 * 60;
const MAX_RETRIEVED_DOCUMENTS = 8;
const MATCH_THRESHOLD = 0.15;

type UserProfile = {
  id: string;
  full_name?: string | null;
  target_job_role?: string | null;
  skills?: string[] | null;
  career_goal?: string | null;
};

type SkillAnalysis = {
  id: string;
  user_id: string;
  role_id: string | null;
  current_skills: string[];
  missing_skills: string[];
  matched_skills: string[];
  recommended_skills: string[];
};

type RetrievedDocument = {
  id: string;
  title: string;
  category: string;
  source_url: string | null;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

type AiEmbeddingResponse = {
  embedding: number[];
  model: string;
};

type AiRoadmapTask = {
  title: string;
  description: string;
  resource_document_ids: string[];
};

type AiRoadmapWeek = {
  week_number: number;
  title: string;
  description: string;
  tasks: AiRoadmapTask[];
};

type AiRoadmapResponse = {
  roadmap: {
    title: string;
    description: string;
    duration_weeks: number;
    weeks: AiRoadmapWeek[];
  };
  model: string;
};

export type RagRoadmapJobStatus = "queued" | "processing" | "completed" | "failed";

export interface RagRoadmapJobResult {
  id: string;
  status: RagRoadmapJobStatus;
  errorMessage: string | null;
  roadmapId: string | null;
  roadmap?: RoadmapGenerationResult | null;
  createdAt: string;
  completedAt: string | null;
}

const cleanString = (value: unknown): string => typeof value === "string" ? value.trim() : "";

const uniqueStrings = (values: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = cleanString(raw);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
};

const isoDatePlusDays = (days: number): string => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const userRateKey = (userId: string): string => `roadmap-rag:${createHash("sha256").update(userId).digest("hex")}`;

const assertRagRateLimit = async (userId: string): Promise<void> => {
  try {
    const redis = await connectRedis();
    const key = userRateKey(userId);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, RAG_DAILY_WINDOW_SECONDS);
    if (count > RAG_DAILY_LIMIT) {
      throw new HttpError(429, "Daily AI roadmap generation limit reached. Try again later.", "RAG_ROADMAP_RATE_LIMITED");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    // Redis outages should not silently transform RAG into a fake fallback.
    // Generation may continue, while Redis health remains an operational alert.
  }
};

const loadProfile = async (userId: string): Promise<UserProfile> => {
  const { data, error } = await getSupabaseStorageClient()
    .from("profiles")
    .select("id, full_name, target_job_role, skills, career_goal")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Unable to load profile for AI roadmap generation.", "RAG_PROFILE_LOAD_FAILED", false);
  if (!data) throw new HttpError(404, "Profile not found.", "RAG_PROFILE_NOT_FOUND");
  return data as UserProfile;
};

const loadSkillAnalysis = async (userId: string, skillAnalysisId?: string | null): Promise<SkillAnalysis> => {
  let query = getSupabaseStorageClient().from("skill_analyses").select("*").eq("user_id", userId);
  if (skillAnalysisId) query = query.eq("id", skillAnalysisId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new HttpError(500, "Unable to load skill-gap analysis for AI roadmap generation.", "RAG_SKILL_ANALYSIS_LOAD_FAILED", false);
  if (!data) throw new HttpError(400, "Run a skill-gap analysis before generating an AI roadmap.", "RAG_SKILL_ANALYSIS_REQUIRED");
  return data as SkillAnalysis;
};

const resolveRoleName = (profile: UserProfile, input: RoadmapGenerationInput): string => {
  const roleName = cleanString(profile.target_job_role) || cleanString(input.roleName) || cleanString(input.targetRole);
  if (!roleName) throw new HttpError(400, "A target role is required for AI roadmap generation.", "RAG_TARGET_ROLE_REQUIRED");
  return roleName;
};

const buildQueryText = (profile: UserProfile, analysis: SkillAnalysis, roleName: string): string => {
  const missing = uniqueStrings([...analysis.missing_skills, ...analysis.recommended_skills]);
  return [
    `Target role: ${roleName}`,
    `Current skills: ${uniqueStrings(analysis.current_skills).join(", ") || "none listed"}`,
    `Missing skills: ${missing.join(", ")}`,
    `Career goal: ${cleanString(profile.career_goal) || "not specified"}`,
    "Retrieve practical learning topics, project practice, interview preparation, and credible learning resources for a week-wise roadmap.",
  ].join("\n");
};

const aiPost = async <T>(path: string, payload: unknown): Promise<T> => {
  const baseUrl = getEnv().AI_SERVICE_URL.replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new HttpError(502, "AI service is unavailable for roadmap generation.", "RAG_AI_SERVICE_UNAVAILABLE", false);
  }

  const body = await response.json().catch(() => ({})) as { detail?: unknown } & Record<string, unknown>;
  if (!response.ok) {
    const detail = typeof body.detail === "string" ? body.detail : `AI service returned HTTP ${response.status}`;
    const status = response.status === 503 ? 503 : 502;
    throw new HttpError(status, detail, response.status === 503 ? "RAG_PROVIDER_NOT_CONFIGURED" : "RAG_AI_PROVIDER_FAILED", false);
  }
  return body as T;
};

const createQueryEmbedding = async (queryText: string): Promise<AiEmbeddingResponse> => {
  const response = await aiPost<AiEmbeddingResponse>("/embeddings", { input: queryText });
  if (!Array.isArray(response.embedding) || response.embedding.length !== 1536 || !response.embedding.every((item) => typeof item === "number" && Number.isFinite(item))) {
    throw new HttpError(502, "AI service returned an invalid 1536-dimensional embedding.", "RAG_EMBEDDING_INVALID", false);
  }
  return response;
};

const retrieveDocuments = async (embedding: number[]): Promise<RetrievedDocument[]> => {
  const { data, error } = await getSupabaseStorageClient().rpc("match_knowledge_base_documents", {
    query_embedding: embedding,
    match_count: MAX_RETRIEVED_DOCUMENTS,
    match_threshold: MATCH_THRESHOLD,
  });
  if (error) throw new HttpError(500, "Vector search failed while retrieving roadmap knowledge.", "RAG_VECTOR_SEARCH_FAILED", false);
  const docs = (data ?? []) as RetrievedDocument[];
  if (docs.length === 0) {
    throw new HttpError(
      422,
      "The RAG knowledge base has no indexed content relevant to this roadmap. Index knowledge-base embeddings before retrying.",
      "RAG_KNOWLEDGE_BASE_NOT_READY",
    );
  }
  return docs;
};

const validateAiRoadmap = (response: AiRoadmapResponse, documents: RetrievedDocument[]): void => {
  const plan = response?.roadmap;
  if (!plan || !cleanString(plan.title) || !cleanString(plan.description)) {
    throw new HttpError(502, "AI service returned an invalid roadmap payload.", "RAG_ROADMAP_INVALID", false);
  }
  if (!Number.isInteger(plan.duration_weeks) || plan.duration_weeks <= 0 || !Array.isArray(plan.weeks) || plan.weeks.length !== plan.duration_weeks) {
    throw new HttpError(502, "AI roadmap duration and week structure do not match.", "RAG_ROADMAP_INVALID", false);
  }
  const documentIds = new Set(documents.map((document) => document.id));
  for (let index = 0; index < plan.weeks.length; index += 1) {
    const week = plan.weeks[index];
    if (week.week_number !== index + 1 || !cleanString(week.title) || !Array.isArray(week.tasks) || week.tasks.length === 0) {
      throw new HttpError(502, "AI roadmap contains an invalid week structure.", "RAG_ROADMAP_INVALID", false);
    }
    for (const task of week.tasks) {
      if (!cleanString(task.title) || !cleanString(task.description)) {
        throw new HttpError(502, "AI roadmap contains an invalid task.", "RAG_ROADMAP_INVALID", false);
      }
      if ((task.resource_document_ids ?? []).some((id) => !documentIds.has(id))) {
        throw new HttpError(502, "AI roadmap referenced context that was not retrieved.", "RAG_CONTEXT_REFERENCE_INVALID", false);
      }
    }
  }
};

const toGeneratedPayload = (
  response: AiRoadmapResponse,
  documents: RetrievedDocument[],
  profile: UserProfile,
  analysis: SkillAnalysis,
  embeddingModel: string,
): GeneratedRoadmapPayload => {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const weeks = response.roadmap.weeks.map((week) => ({
    week_number: week.week_number,
    title: week.title,
    description: week.description,
    start_date: isoDatePlusDays((week.week_number - 1) * 7),
    due_date: isoDatePlusDays(week.week_number * 7),
    tasks: week.tasks.map((task) => ({
      task_title: task.title,
      task_description: task.description,
      resource_links: uniqueStrings(task.resource_document_ids).flatMap((documentId) => {
        const document = byId.get(documentId);
        return document?.source_url ? [{ label: document.title, url: document.source_url }] : [];
      }),
      status: "pending" as const,
      due_date: isoDatePlusDays(week.week_number * 7),
    })),
  }));

  return {
    title: response.roadmap.title,
    description: response.roadmap.description,
    duration_weeks: response.roadmap.duration_weeks,
    generated_by: "rag",
    ai_response: {
      generation_mode: "rag",
      llm_model: response.model,
      embedding_model: embeddingModel,
      target_role: profile.target_job_role,
      current_skills: analysis.current_skills,
      missing_skills: analysis.missing_skills,
      recommended_skills: analysis.recommended_skills,
      retrieved_documents: documents.map((document) => ({
        id: document.id,
        title: document.title,
        category: document.category,
        source_url: document.source_url,
        similarity: document.similarity,
      })),
    },
    weeks,
  };
};

const insertWeeks = async (roadmapId: string, payload: GeneratedRoadmapPayload): Promise<Array<RoadmapWeekRecord & { tasks: RoadmapTaskRecord[] }>> => {
  const client = getSupabaseStorageClient();
  const result: Array<RoadmapWeekRecord & { tasks: RoadmapTaskRecord[] }> = [];
  for (const week of payload.weeks) {
    const { data: weekRow, error: weekError } = await client.from("roadmap_weeks").insert({
      roadmap_id: roadmapId,
      week_number: week.week_number,
      title: week.title,
      description: week.description,
      start_date: week.start_date ?? null,
      due_date: week.due_date ?? null,
      status: "pending",
    }).select("*").single();
    if (weekError || !weekRow) throw new HttpError(500, "Unable to save AI roadmap weeks.", "RAG_WEEK_SAVE_FAILED", false);

    const taskRowsInput = week.tasks.map((task, index) => ({
      roadmap_id: roadmapId,
      week_id: weekRow.id,
      task_title: task.task_title,
      task_description: task.task_description ?? null,
      resource_links: task.resource_links ?? [],
      status: "pending",
      due_date: task.due_date ?? week.due_date ?? null,
      sort_order: index,
    }));
    const { data: taskRows, error: taskError } = await client.from("roadmap_tasks").insert(taskRowsInput).select("*");
    if (taskError) throw new HttpError(500, "Unable to save AI roadmap tasks.", "RAG_TASK_SAVE_FAILED", false);
    result.push({ ...(weekRow as RoadmapWeekRecord), tasks: (taskRows ?? []) as RoadmapTaskRecord[] });
  }
  return result;
};

const persistRoadmap = async (userId: string, analysis: SkillAnalysis, input: RoadmapGenerationInput, payload: GeneratedRoadmapPayload): Promise<RoadmapGenerationResult> => {
  const client = getSupabaseStorageClient();
  await client.from("roadmaps").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
  const { data: roadmap, error } = await client.from("roadmaps").insert({
    user_id: userId,
    skill_analysis_id: analysis.id,
    role_id: analysis.role_id ?? input.roleId ?? null,
    title: payload.title,
    description: payload.description,
    duration_weeks: payload.duration_weeks,
    progress_percentage: 0,
    generated_by: "rag",
    ai_response: payload.ai_response,
    is_active: true,
  }).select("*").single();
  if (error || !roadmap) throw new HttpError(500, "Unable to save the AI-generated roadmap.", "RAG_ROADMAP_SAVE_FAILED", false);
  const weeks = await insertWeeks(roadmap.id, payload);
  return {
    id: roadmap.id,
    user_id: userId,
    skill_analysis_id: analysis.id,
    role_id: roadmap.role_id,
    title: roadmap.title,
    description: roadmap.description,
    duration_weeks: roadmap.duration_weeks,
    progress_percentage: roadmap.progress_percentage,
    generated_by: roadmap.generated_by,
    ai_response: roadmap.ai_response as Record<string, unknown>,
    is_active: roadmap.is_active,
    weeks: weeks.map((week) => ({
      id: week.id,
      roadmap_id: roadmap.id,
      week_number: week.week_number,
      title: week.title,
      description: week.description,
      start_date: week.start_date,
      due_date: week.due_date,
      status: week.status,
      tasks: week.tasks.map((task) => ({
        id: task.id,
        roadmap_id: roadmap.id,
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
};

const writeRagQueryLog = async (input: {
  userId: string;
  queryText: string;
  embedding: number[];
  documents: RetrievedDocument[];
  modelUsed: string;
  responseSummary?: string | null;
  latencyMs: number;
  errorCode?: string | null;
}): Promise<void> => {
  const { error } = await getSupabaseStorageClient().from("rag_queries").insert({
    user_id: input.userId,
    query_text: input.queryText,
    query_embedding: input.embedding,
    retrieved_document_ids: input.documents.map((document) => document.id),
    retrieved_document_scores: input.documents.map((document) => ({ id: document.id, similarity: document.similarity })),
    response_summary: input.responseSummary ?? null,
    model_used: input.modelUsed,
    latency_ms: input.latencyMs,
    error_code: input.errorCode ?? null,
  });
  if (error) console.error("Unable to save RAG query log", { code: input.errorCode ?? "RAG_LOG_FAILED" });
};

const markJob = async (jobId: string, values: Record<string, unknown>): Promise<void> => {
  const { error } = await getSupabaseStorageClient().from("ai_jobs").update(values).eq("id", jobId);
  if (error) throw new HttpError(500, "Unable to update AI roadmap job state.", "RAG_JOB_UPDATE_FAILED", false);
};

export const ragRoadmapService = {
  async enqueue(userId: string, input: RoadmapGenerationInput): Promise<RagRoadmapJobResult> {
    await assertRagRateLimit(userId);
    const profile = await loadProfile(userId);
    const analysis = await loadSkillAnalysis(userId, input.skillAnalysisId ?? null);
    resolveRoleName(profile, input);
    if (uniqueStrings([...analysis.missing_skills, ...analysis.recommended_skills]).length === 0) {
      throw new HttpError(400, "AI roadmap generation needs at least one missing or recommended skill.", "RAG_MISSING_SKILLS_REQUIRED");
    }

    const { data: aiJob, error } = await getSupabaseStorageClient().from("ai_jobs").insert({
      user_id: userId,
      job_type: "roadmap_rag",
      status: "queued",
      input_payload: { ...input, skillAnalysisId: analysis.id },
    }).select("*").single();
    if (error || !aiJob) throw new HttpError(500, "Unable to create AI roadmap job.", "RAG_JOB_CREATE_FAILED", false);

    try {
      const queue = createQueue("roadmapGenerationQueue");
      await queue.add("generate-rag-roadmap", {
        aiJobId: aiJob.id,
        userId,
        input: { ...input, skillAnalysisId: analysis.id },
      }, { attempts: 3, backoff: { type: "exponential", delay: 5_000 }, jobId: aiJob.id });
      await queue.close();
    } catch (queueError) {
      await getSupabaseStorageClient().from("ai_jobs").update({ status: "failed", error_message: "Unable to enqueue roadmap generation." }).eq("id", aiJob.id);
      throw new HttpError(503, "AI roadmap queue is unavailable.", "RAG_QUEUE_UNAVAILABLE", false);
    }

    return {
      id: aiJob.id,
      status: "queued",
      errorMessage: null,
      roadmapId: null,
      createdAt: aiJob.created_at,
      completedAt: null,
    };
  },

  async process(aiJobId: string, userId: string, input: RoadmapGenerationInput): Promise<RoadmapGenerationResult> {
    const started = Date.now();
    await markJob(aiJobId, { status: "processing", started_at: new Date().toISOString(), error_message: null });
    const profile = await loadProfile(userId);
    const analysis = await loadSkillAnalysis(userId, input.skillAnalysisId ?? null);
    const roleName = resolveRoleName(profile, input);
    const queryText = buildQueryText(profile, analysis, roleName);
    let embedding: AiEmbeddingResponse | null = null;
    let documents: RetrievedDocument[] = [];

    try {
      embedding = await createQueryEmbedding(queryText);
      documents = await retrieveDocuments(embedding.embedding);
      const aiResponse = await aiPost<AiRoadmapResponse>("/generate-roadmap", {
        target_role: roleName,
        current_skills: uniqueStrings(analysis.current_skills),
        missing_skills: uniqueStrings(analysis.missing_skills),
        recommended_skills: uniqueStrings(analysis.recommended_skills),
        career_goal: cleanString(profile.career_goal) || null,
        duration_weeks: input.durationWeeks ?? null,
        documents: documents.map((document) => ({
          id: document.id,
          title: document.title,
          category: document.category,
          content: document.content,
          source_url: document.source_url,
          similarity: document.similarity,
        })),
      });
      validateAiRoadmap(aiResponse, documents);
      const payload = toGeneratedPayload(aiResponse, documents, profile, analysis, embedding.model);
      const roadmap = await persistRoadmap(userId, analysis, input, payload);
      await writeRagQueryLog({
        userId,
        queryText,
        embedding: embedding.embedding,
        documents,
        modelUsed: `${embedding.model} + ${aiResponse.model}`,
        responseSummary: `${roadmap.title} (${roadmap.duration_weeks ?? 0} weeks)`,
        latencyMs: Date.now() - started,
      });
      await markJob(aiJobId, {
        status: "completed",
        output_payload: { roadmapId: roadmap.id },
        completed_at: new Date().toISOString(),
        error_message: null,
      });
      return roadmap;
    } catch (error) {
      const code = error instanceof HttpError ? error.code : "RAG_GENERATION_FAILED";
      if (embedding) {
        await writeRagQueryLog({
          userId,
          queryText,
          embedding: embedding.embedding,
          documents,
          modelUsed: embedding.model,
          responseSummary: null,
          latencyMs: Date.now() - started,
          errorCode: code,
        });
      }
      await markJob(aiJobId, {
        status: "failed",
        error_message: error instanceof Error ? error.message.slice(0, 1000) : "RAG roadmap generation failed.",
        completed_at: new Date().toISOString(),
      }).catch(() => undefined);
      throw error;
    }
  },

  async getJob(userId: string, jobId: string): Promise<RagRoadmapJobResult> {
    const { data, error } = await getSupabaseStorageClient().from("ai_jobs").select("*").eq("id", jobId).eq("user_id", userId).eq("job_type", "roadmap_rag").maybeSingle();
    if (error) throw new HttpError(500, "Unable to load AI roadmap job.", "RAG_JOB_LOAD_FAILED", false);
    if (!data) throw new HttpError(404, "AI roadmap job not found.", "RAG_JOB_NOT_FOUND");
    const output = (data.output_payload ?? {}) as { roadmapId?: unknown };
    const roadmapId = typeof output.roadmapId === "string" ? output.roadmapId : null;
    return {
      id: data.id,
      status: data.status as RagRoadmapJobStatus,
      errorMessage: data.error_message ?? null,
      roadmapId,
      createdAt: data.created_at,
      completedAt: data.completed_at ?? null,
    };
  },
};
