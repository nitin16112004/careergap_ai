import { randomUUID } from "node:crypto";
import { getEnv } from "../config/env";
import { createQueue } from "../jobs/queues";
import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";
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

const extractStrings = (source: Record<string, unknown>, keys: string[]): string[] => {
    const values: string[] = [];
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim()) values.push(value.trim());
        else if (Array.isArray(value)) values.push(...safeStringArray(value));
    }
    return [...new Set(values)].slice(0, 100);
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

const scoringKeywords = (role: string, description?: string): string[] => {
    const text = `${role} ${description ?? ""}`.toLowerCase();
    const keywordSet = [
        "react", "typescript", "node", "javascript", "api", "sql", "postgresql", "supabase",
        "python", "fastapi", "resume", "frontend", "backend", "full stack", "product",
        "dashboard", "ux", "customer", "performance", "testing", "agile", "leadership",
        "communication", "problem solving", "design systems", "ai", "ml"
    ];
    return keywordSet.filter((entry) => text.includes(entry.toLowerCase()));
};

const analyzeResumeData = (resume: ResumeRecord, role: string, jobDescription?: string): ResumeBuilderAnalysis => {
    const source = (resume.extracted_data && typeof resume.extracted_data === "object") ? resume.extracted_data as Record<string, unknown> : {};
    const skillList = safeStringArray(source["skills"]).length ? safeStringArray(source["skills"]) : resume.extracted_skills;
    const extractedSkills = skillList.map((skill) => skill.trim());
    const roleKeywords = scoringKeywords(role, jobDescription);
    const matchedKeywords = roleKeywords.filter((keyword) => {
        const haystack = [resume.extracted_text ?? "", ...extractedSkills, ...extractStrings(source, ["name", "city", "email", "linkedin", "github", "portfolio"])].join(" ").toLowerCase();
        return haystack.includes(keyword.toLowerCase());
    });
    const missingSkills = roleKeywords.filter((keyword) => !matchedKeywords.includes(keyword));
    const skillCoverage = extractedSkills.length ? Math.min(100, Math.round((matchedKeywords.length / Math.max(roleKeywords.length, 1)) * 100)) : 0;
    const keywordMatch = Math.min(100, Math.round((matchedKeywords.length / Math.max(roleKeywords.length, 1)) * 100));
    const experienceRelevance = Math.min(100, Math.max(40, 80 - Math.max(0, roleKeywords.length - matchedKeywords.length) * 4));
    const sectionCompleteness = Math.min(100, 30 + (resume.extracted_skills.length ? 20 : 0) + (source["experience"] ? 20 : 0) + (source["projects"] ? 15 : 0) + (source["education"] ? 15 : 0));
    const formattingCompatibility = 92;
    const atsScore = Math.min(100, Math.round((keywordMatch * 0.35) + (skillCoverage * 0.25) + (experienceRelevance * 0.2) + (sectionCompleteness * 0.12) + (formattingCompatibility * 0.08)));

    const suggestions = [
        "Tighten the summary to emphasize the target role and measurable impact.",
        "Add role-specific evidence from your experience to improve ATS keyword alignment.",
        "Prioritize the most relevant tools and skills before secondary experience.",
    ].filter((_, index) => index < 3);

    return {
        atsScore,
        keywordMatch,
        skillsMatch: Math.max(60, skillCoverage),
        experienceRelevance: Math.max(50, experienceRelevance),
        sectionCompleteness,
        formattingCompatibility,
        suggestions,
        keywords: roleKeywords.slice(0, 12),
        missingSkills: missingSkills.slice(0, 12),
    };
};

const generateResumeContent = (resume: ResumeRecord, role: string, jobDescription?: string): GeneratedResumeContent => {
    const source = (resume.extracted_data && typeof resume.extracted_data === "object") ? resume.extracted_data as Record<string, unknown> : {};
    const skills = safeStringArray(source["skills"]).length ? safeStringArray(source["skills"]) : resume.extracted_skills;
    const experienceEntries = Array.isArray(source["experience"]) ? source["experience"] as Array<Record<string, unknown>> : [];
    const educationEntries = Array.isArray(source["education"]) ? source["education"] as Array<Record<string, unknown>> : [];
    const projectEntries = Array.isArray(source["projects"]) ? source["projects"] as Array<Record<string, unknown>> : [];
    const rawName = normalizeText(source["name"] ?? source["fullName"]) || normalizeText(resume.extracted_data && typeof resume.extracted_data === "object" ? (resume.extracted_data as Record<string, unknown>)["fullName"] : "") || "Candidate";

    const summary = [
        `${rawName} is a results-driven ${role.toLowerCase()} with experience building strong digital products and user-focused product experiences.`,
        `Brings hands-on experience in ${skills.slice(0, 4).join(", ") || "modern software delivery"} and a clear understanding of scalable, maintainable engineering workflows.`,
    ].join(" ");

    return {
        summary,
        skills: skills.slice(0, 12),
        experience: experienceEntries.length ? experienceEntries.slice(0, 3).map((entry, index) => ({
            role: `Professional Experience ${index + 1}`,
            details: normalizeText(entry["details"]) || `Applied role-relevant work in ${role}`,
            company: normalizeText(entry["company"]) || undefined,
            period: normalizeText(entry["period"]) || undefined,
        })) : [{ role: role, details: `Applied ${role.toLowerCase()} principles in project work and practical software delivery.` }],
        education: educationEntries.length ? educationEntries.slice(0, 2).map((entry) => ({
            institution: normalizeText(entry["institution"]) || normalizeText(entry["details"]) || "Education",
            details: normalizeText(entry["details"]) || "Education details provided by the user.",
        })) : [{ institution: "Education", details: "Add university or qualification details here." }],
        projects: projectEntries.length ? projectEntries.slice(0, 2).map((entry) => ({
            name: normalizeText(entry["name"]) || `Project ${entry["details"] ? "highlight" : "work"}`,
            details: normalizeText(entry["details"]) || "Project details preserved from the source resume and reframed for ATS clarity.",
            impact: normalizeText(entry["impact"]) || undefined,
        })) : [{ name: "Project Work", details: `Worked on role-relevant responsibilities aligned with ${role}.` }],
        certifications: [],
        links: {
            linkedin: normalizeText(source["linkedin"] ?? source["linkedinUrl"]),
            github: normalizeText(source["github"] ?? source["githubUrl"]),
            portfolio: normalizeText(source["portfolio"] ?? source["portfolioUrl"]),
        },
        personalInfo: {
            name: rawName,
            email: normalizeText(source["email"] ?? "") || "email@example.com",
            phone: normalizeText(source["phone"] ?? "") || "",
            city: normalizeText(source["city"] ?? "") || "",
        },
    };
};

const toGeneratedResumeRecord = async (userId: string, resume: ResumeRecord, role: string, jobDescription?: string, versionName?: string): Promise<GeneratedResumeRecord> => {
    const analysis = analyzeResumeData(resume, role, jobDescription);
    const content = generateResumeContent(resume, role, jobDescription);
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

    const { data, error } = await getSupabaseStorageClient().from("generated_resumes").insert(payload).select("*").single();
    if (error || !data) throw new HttpError(500, "Unable to save the generated resume.", "ATS_GENERATED_RESUME_SAVE_FAILED", false);
    return data as GeneratedResumeRecord;
};

export const atsResumeService = {
    async analyze(userId: string, resumeId: string, targetRole: string, jobDescription?: string): Promise<ResumeBuilderAnalysis> {
        const resume = await getResumeByOwnership(userId, resumeId);
        const analysis = analyzeResumeData(resume, targetRole, sanitizeJobDescription(jobDescription));
        return analysis;
    },

    async generate(userId: string, resumeId: string, targetRole: string, jobDescription?: string, versionName?: string): Promise<GeneratedResumeRecord & { analysis: ResumeBuilderAnalysis; resumeContent: GeneratedResumeContent; atsScore: number | null; atsKeywords: string[] }> {
        const resume = await getResumeByOwnership(userId, resumeId);
        const securitySafeDescription = sanitizeJobDescription(jobDescription);
        const analysis = analyzeResumeData(resume, targetRole, securitySafeDescription);
        const record = await toGeneratedResumeRecord(userId, resume, targetRole, securitySafeDescription, versionName);
        const content = generateResumeContent(resume, targetRole, securitySafeDescription);
        const response = {
            ...record,
            resume_content: content,
            resumeContent: content,
            ats_score: record.ats_score ?? analysis.atsScore,
            atsScore: record.ats_score ?? analysis.atsScore,
            ats_keywords: record.ats_keywords ?? analysis.keywords,
            atsKeywords: record.ats_keywords ?? analysis.keywords,
            analysis,
        };
        return response;
    },

    async getGeneratedList(userId: string): Promise<GeneratedResumeRecord[]> {
        const { data, error } = await getSupabaseStorageClient().from("generated_resumes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        if (error) throw new HttpError(500, "Unable to load generated resumes.", "ATS_GENERATED_RESUME_LIST_FAILED", false);
        return (data ?? []) as GeneratedResumeRecord[];
    },

    async getGenerated(userId: string, generatedResumeId: string): Promise<GeneratedResumeRecord> {
        return getGeneratedResume(userId, generatedResumeId);
    },

    async updateGenerated(userId: string, generatedResumeId: string, patch: Partial<GeneratedResumeRecord>): Promise<GeneratedResumeRecord> {
        const { data, error } = await getSupabaseStorageClient().from("generated_resumes").update(patch).eq("id", generatedResumeId).eq("user_id", userId).select("*").maybeSingle();
        if (error) throw new HttpError(500, "Unable to update the generated resume.", "ATS_GENERATED_RESUME_UPDATE_FAILED", false);
        if (!data) throw new HttpError(404, "Generated resume not found.", "ATS_GENERATED_RESUME_NOT_FOUND");
        return data as GeneratedResumeRecord;
    },

    async deleteGenerated(userId: string, generatedResumeId: string): Promise<void> {
        const { error } = await getSupabaseStorageClient().from("generated_resumes").delete().eq("id", generatedResumeId).eq("user_id", userId);
        if (error) throw new HttpError(500, "Unable to delete the generated resume.", "ATS_GENERATED_RESUME_DELETE_FAILED", false);
    },

    async queueGeneration(job: ResumeBuilderGenerationInput): Promise<{ queued: boolean; jobId?: string }> {
        try {
            const jobId = `ats-resume-${job.userId}-${randomUUID()}`;
            await resumeBuilderQueue.add("generate-ats-resume", job, { jobId, attempts: 3, backoff: { type: "exponential", delay: 2_000 } });
            return { queued: true, jobId };
        } catch (error) {
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
