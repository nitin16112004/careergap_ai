import { randomUUID } from "node:crypto";
import { getEnv } from "../config/env";
import { createQueue } from "../jobs/queues";
import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";
import { resumeExportService, type ResumeExportResult } from "./resume-export.service";
import type { ResumeBuilderAnalysis, ResumeBuilderGenerationInput, GeneratedResumeContent, GeneratedResumeRecord } from "../types/ats-resume";
import type { ResumeRecord } from "../types/resume";

const resumeBuilderQueue = createQueue("resumeBuilderQueue");

const normalizeText = (value: unknown): string => typeof value === "string" ? value.trim() : "";

const safeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean);
};

const sanitizeJobDescription = (input?: string): string => {
    if (!input) return "";
    return input.slice(0, 30_000).replace(/[\u0000-\u001F\u007F]/g, " ");
};

const sourceObject = (resume: ResumeRecord): Record<string, unknown> =>
    resume.extracted_data && typeof resume.extracted_data === "object" ? resume.extracted_data as Record<string, unknown> : {};

const extractStrings = (source: Record<string, unknown>, keys: string[]): string[] => {
    const values: string[] = [];
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim()) values.push(value.trim());
        else if (Array.isArray(value)) {
            for (const entry of value) {
                if (typeof entry === "string" && entry.trim()) values.push(entry.trim());
                else if (entry && typeof entry === "object") {
                    values.push(...Object.values(entry as Record<string, unknown>).filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()));
                }
            }
        }
    }
    return [...new Set(values)].slice(0, 200);
};

const getResumeByOwnership = async (userId: string, resumeId: string): Promise<ResumeRecord> => {
    const { data, error } = await getSupabaseStorageClient().from("resumes").select("*").eq("id", resumeId).eq("user_id", userId).maybeSingle();
    if (error) throw new HttpError(500, "Unable to load the resume for ATS analysis.", "ATS_RESUME_LOOKUP_FAILED", false);
    if (!data) throw new HttpError(404, "Resume not found.", "ATS_RESUME_NOT_FOUND");
    return data as ResumeRecord;
};

const getGeneratedResume = async (userId: string, generatedResumeId: string): Promise<GeneratedResumeRecord> => {
    const { data, error } = await getSupabaseStorageClient().from("generated_resumes").select("*").eq("id", generatedResumeId).eq("user_id", userId).maybeSingle();
    if (error) throw new HttpError(500, "Unable to load the generated resume.", "ATS_GENERATED_RESUME_LOOKUP_FAILED", false);
    if (!data) throw new HttpError(404, "Generated resume not found.", "ATS_GENERATED_RESUME_NOT_FOUND");
    return data as GeneratedResumeRecord;
};

const keywordDictionary = [
    "react", "typescript", "node", "node.js", "javascript", "api", "rest", "graphql", "sql", "postgresql", "supabase",
    "python", "fastapi", "django", "java", "spring", "aws", "azure", "gcp", "docker", "kubernetes", "redis", "git",
    "frontend", "backend", "full stack", "product", "dashboard", "ux", "ui", "customer", "performance", "testing",
    "unit testing", "integration testing", "agile", "leadership", "communication", "problem solving", "design systems",
    "system design", "microservices", "ai", "machine learning", "ml", "data analysis", "analytics", "figma", "ci/cd",
];

const roleKeywords = (role: string, description?: string): string[] => {
    const text = `${role} ${description ?? ""}`.toLowerCase();
    const dictionaryMatches = keywordDictionary.filter((entry) => text.includes(entry));
    const roleTokens = role.toLowerCase().split(/[^a-z0-9+#.]+/).filter((token) => token.length >= 3 && !["and", "the", "for", "with"].includes(token));
    return [...new Set([...dictionaryMatches, ...roleTokens])].slice(0, 40);
};

const evidenceText = (resume: ResumeRecord): string => {
    const source = sourceObject(resume);
    const values = extractStrings(source, ["skills", "experience", "projects", "education", "certifications", "summary"]);
    return [resume.extracted_text ?? "", ...resume.extracted_skills, ...values].join(" ").toLowerCase();
};

const experienceText = (resume: ResumeRecord): string => {
    const source = sourceObject(resume);
    return extractStrings(source, ["experience"]).join(" ").toLowerCase();
};

const percent = (matched: number, total: number): number => total > 0 ? Math.round((matched / total) * 100) : 0;

const analyzeResumeData = (resume: ResumeRecord, role: string, jobDescription?: string): ResumeBuilderAnalysis => {
    const source = sourceObject(resume);
    const skillList = safeStringArray(source["skills"]).length ? safeStringArray(source["skills"]) : resume.extracted_skills;
    const targetKeywords = roleKeywords(role, jobDescription);
    const allEvidence = evidenceText(resume);
    const workEvidence = experienceText(resume);
    const matchedKeywords = targetKeywords.filter((keyword) => allEvidence.includes(keyword.toLowerCase()));
    const matchedExperienceKeywords = targetKeywords.filter((keyword) => workEvidence.includes(keyword.toLowerCase()));
    const missingKeywords = targetKeywords.filter((keyword) => !matchedKeywords.includes(keyword));
    const normalizedSkills = skillList.map((skill) => skill.toLowerCase());
    const matchedSkillKeywords = targetKeywords.filter((keyword) => normalizedSkills.some((skill) => skill.includes(keyword) || keyword.includes(skill)));

    const keywordMatch = percent(matchedKeywords.length, targetKeywords.length);
    const skillsMatch = percent(matchedSkillKeywords.length, targetKeywords.length);
    const experienceRelevance = workEvidence ? percent(matchedExperienceKeywords.length, targetKeywords.length) : 0;
    const sectionSignals = [
        normalizeText(source["name"] ?? source["fullName"]),
        normalizeText(source["email"]),
        skillList.length ? "skills" : "",
        Array.isArray(source["experience"]) && source["experience"].length ? "experience" : "",
        Array.isArray(source["projects"]) && source["projects"].length ? "projects" : "",
        Array.isArray(source["education"]) && source["education"].length ? "education" : "",
    ];
    const sectionCompleteness = percent(sectionSignals.filter(Boolean).length, sectionSignals.length);
    const formattingCompatibility = 90;
    const atsScore = Math.round(
        (keywordMatch * 0.4) +
        (skillsMatch * 0.25) +
        (experienceRelevance * 0.2) +
        (sectionCompleteness * 0.1) +
        (formattingCompatibility * 0.05)
    );

    const suggestions: string[] = [];
    if (missingKeywords.length) suggestions.push(`Review whether you can truthfully demonstrate these target keywords: ${missingKeywords.slice(0, 6).join(", ")}.`);
    if (!workEvidence) suggestions.push("Add real work, internship, freelance, or project evidence if you have it; the builder will not invent experience for you.");
    if (!skillList.length) suggestions.push("Add the skills you can genuinely demonstrate before generating a tailored version.");
    if (sectionCompleteness < 80) suggestions.push("Complete missing profile sections so the ATS version can stay factual while still being useful.");
    if (!suggestions.length) suggestions.push("Your reviewed resume covers the main configured role signals. Strengthen impact with truthful, measurable evidence where available.");

    return {
        atsScore: Math.max(0, Math.min(100, atsScore)),
        keywordMatch,
        skillsMatch,
        experienceRelevance,
        sectionCompleteness,
        formattingCompatibility,
        suggestions: suggestions.slice(0, 4),
        keywords: targetKeywords.slice(0, 20),
        missingSkills: missingKeywords.slice(0, 20),
    };
};

const recordArray = (value: unknown): Array<Record<string, unknown>> =>
    Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object") : [];

const generateResumeContent = (resume: ResumeRecord, role: string): GeneratedResumeContent => {
    const source = sourceObject(resume);
    const skills = safeStringArray(source["skills"]).length ? safeStringArray(source["skills"]) : resume.extracted_skills;
    const experienceEntries = recordArray(source["experience"]);
    const educationEntries = recordArray(source["education"]);
    const projectEntries = recordArray(source["projects"]);
    const rawName = normalizeText(source["name"] ?? source["fullName"]);
    const certifications = safeStringArray(source["certifications"]);

    const summary = skills.length
        ? `Targeting ${role} opportunities. Reviewed profile skills include ${skills.slice(0, 6).join(", ")}.`
        : `Targeting ${role} opportunities based on the reviewed resume profile.`;

    const experience = experienceEntries.flatMap((entry) => {
        const roleName = normalizeText(entry["role"] ?? entry["title"]);
        const details = normalizeText(entry["details"] ?? entry["description"]);
        const company = normalizeText(entry["company"] ?? entry["organization"]);
        const period = normalizeText(entry["period"] ?? entry["duration"] ?? entry["dates"]);
        if (!roleName && !details && !company && !period) return [];
        return [{ role: roleName || "Experience", details, ...(company ? { company } : {}), ...(period ? { period } : {}) }];
    });

    const education = educationEntries.flatMap((entry) => {
        const institution = normalizeText(entry["institution"] ?? entry["school"] ?? entry["university"]);
        const details = normalizeText(entry["details"] ?? entry["degree"] ?? entry["qualification"]);
        if (!institution && !details) return [];
        return [{ institution: institution || "Education", details }];
    });

    const projects = projectEntries.flatMap((entry) => {
        const name = normalizeText(entry["name"] ?? entry["title"]);
        const details = normalizeText(entry["details"] ?? entry["description"]);
        const impact = normalizeText(entry["impact"]);
        if (!name && !details && !impact) return [];
        return [{ name: name || "Project", details, ...(impact ? { impact } : {}) }];
    });

    return {
        summary,
        skills: [...new Set(skills)].slice(0, 20),
        experience,
        education,
        projects,
        certifications,
        links: {
            linkedin: normalizeText(source["linkedin"] ?? source["linkedinUrl"]) || undefined,
            github: normalizeText(source["github"] ?? source["githubUrl"]) || undefined,
            portfolio: normalizeText(source["portfolio"] ?? source["portfolioUrl"]) || undefined,
        },
        personalInfo: {
            name: rawName,
            email: normalizeText(source["email"]),
            phone: normalizeText(source["phone"]),
            city: normalizeText(source["city"] ?? source["currentCity"]),
        },
    };
};

const toGeneratedResumeRecord = async (userId: string, resume: ResumeRecord, role: string, jobDescription?: string, versionName?: string): Promise<GeneratedResumeRecord> => {
    const analysis = analyzeResumeData(resume, role, jobDescription);
    const content = generateResumeContent(resume, role);
    const client = getSupabaseStorageClient();

    const { error: retireError } = await client.from("generated_resumes").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    if (retireError) throw new HttpError(500, "Unable to prepare a new generated resume version.", "ATS_GENERATED_RESUME_RETIRE_FAILED", false);

    const payload = {
        id: randomUUID(),
        user_id: userId,
        source_resume_id: resume.id,
        target_role: role,
        version_name: versionName ?? `v${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
        resume_content: content,
        ats_keywords: analysis.keywords,
        ats_score: analysis.atsScore,
        pdf_url: null,
        docx_url: null,
        pdf_storage_path: null,
        docx_storage_path: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from("generated_resumes").insert(payload).select("*").single();
    if (error || !data) throw new HttpError(500, "Unable to save the generated resume.", "ATS_GENERATED_RESUME_SAVE_FAILED", false);
    return data as GeneratedResumeRecord;
};

export const atsResumeService = {
    async analyze(userId: string, resumeId: string, targetRole: string, jobDescription?: string): Promise<ResumeBuilderAnalysis> {
        const resume = await getResumeByOwnership(userId, resumeId);
        return analyzeResumeData(resume, targetRole, sanitizeJobDescription(jobDescription));
    },

    async generate(userId: string, resumeId: string, targetRole: string, jobDescription?: string, versionName?: string): Promise<GeneratedResumeRecord & { analysis: ResumeBuilderAnalysis; resumeContent: GeneratedResumeContent; atsScore: number | null; atsKeywords: string[] }> {
        const resume = await getResumeByOwnership(userId, resumeId);
        const securitySafeDescription = sanitizeJobDescription(jobDescription);
        const analysis = analyzeResumeData(resume, targetRole, securitySafeDescription);
        const record = await toGeneratedResumeRecord(userId, resume, targetRole, securitySafeDescription, versionName);
        const content = record.resume_content;
        return {
            ...record,
            resumeContent: content,
            atsScore: record.ats_score ?? analysis.atsScore,
            atsKeywords: record.ats_keywords ?? analysis.keywords,
            analysis,
        };
    },

    async getGeneratedList(userId: string): Promise<GeneratedResumeRecord[]> {
        const { data, error } = await getSupabaseStorageClient().from("generated_resumes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        if (error) throw new HttpError(500, "Unable to load generated resumes.", "ATS_GENERATED_RESUME_LIST_FAILED", false);
        return (data ?? []) as GeneratedResumeRecord[];
    },

    async getGenerated(userId: string, generatedResumeId: string): Promise<GeneratedResumeRecord> {
        return getGeneratedResume(userId, generatedResumeId);
    },

    async updateGenerated(userId: string, generatedResumeId: string, patch: Record<string, unknown>): Promise<GeneratedResumeRecord> {
        await getGeneratedResume(userId, generatedResumeId);
        const databasePatch: Record<string, unknown> = {};
        if (patch.targetRole !== undefined) databasePatch.target_role = patch.targetRole;
        if (patch.versionName !== undefined) databasePatch.version_name = patch.versionName;
        if (patch.atsScore !== undefined) databasePatch.ats_score = patch.atsScore;
        if (patch.atsKeywords !== undefined) databasePatch.ats_keywords = patch.atsKeywords;
        if (patch.resumeContent !== undefined) databasePatch.resume_content = patch.resumeContent;
        databasePatch.updated_at = new Date().toISOString();

        const { data, error } = await getSupabaseStorageClient().from("generated_resumes").update(databasePatch).eq("id", generatedResumeId).eq("user_id", userId).select("*").maybeSingle();
        if (error) throw new HttpError(500, "Unable to update the generated resume.", "ATS_GENERATED_RESUME_UPDATE_FAILED", false);
        if (!data) throw new HttpError(404, "Generated resume not found.", "ATS_GENERATED_RESUME_NOT_FOUND");
        return data as GeneratedResumeRecord;
    },

    async exportGenerated(userId: string, generatedResumeId: string, format: "pdf" | "docx"): Promise<ResumeExportResult> {
        const record = await getGeneratedResume(userId, generatedResumeId);
        return resumeExportService.export(userId, record, format);
    },

    async deleteGenerated(userId: string, generatedResumeId: string): Promise<void> {
        const record = await getGeneratedResume(userId, generatedResumeId);
        const client = getSupabaseStorageClient();
        const paths = [record.pdf_storage_path, record.docx_storage_path].filter((value): value is string => Boolean(value));
        if (paths.length) {
            const { error: storageError } = await client.storage.from("generated-resumes").remove(paths);
            if (storageError) throw new HttpError(502, "Unable to remove generated resume files.", "ATS_GENERATED_RESUME_STORAGE_DELETE_FAILED", false);
        }
        const { error } = await client.from("generated_resumes").delete().eq("id", generatedResumeId).eq("user_id", userId);
        if (error) throw new HttpError(500, "Unable to delete the generated resume.", "ATS_GENERATED_RESUME_DELETE_FAILED", false);
    },

    async queueGeneration(job: ResumeBuilderGenerationInput): Promise<{ queued: boolean; jobId?: string }> {
        try {
            const jobId = `ats-resume-${job.userId}-${randomUUID()}`;
            await resumeBuilderQueue.add("generate-ats-resume", job, { jobId, attempts: 3, backoff: { type: "exponential", delay: 2_000 } });
            return { queued: true, jobId };
        } catch {
            throw new HttpError(503, "ATS resume generation is temporarily unavailable. Please try again.", "ATS_GENERATION_QUEUE_UNAVAILABLE");
        }
    },

    async getAiServiceHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${getEnv().AI_SERVICE_URL.replace(/\/$/, "")}/health`);
            return response.ok;
        } catch {
            return false;
        }
    },
};

export type AtsResumeService = typeof atsResumeService;
