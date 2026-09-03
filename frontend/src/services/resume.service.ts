import { apiRequest } from "./api";
import type { ExtractedResumeData, ResumeRecord, ResumeResponse } from "../types/resume";
import type { GeneratedResumeSnapshot, ResumeBuilderAnalysis, ResumeExportResult } from "../types/ats-resume";

export const resumeService = {
  async upload(file: File): Promise<ResumeResponse> {
    const form = new FormData();
    form.append("file", file);
    const result = await apiRequest<ResumeRecord & { queued?: boolean }>("/resumes/upload", { method: "POST", body: form });
    return { resume: result, queued: result.queued };
  },

  async process(resumeId: string): Promise<ResumeResponse> {
    const result = await apiRequest<ResumeRecord & { queued?: boolean }>(`/resumes/process/${resumeId}`, { method: "POST", body: JSON.stringify({}) });
    return { resume: result, queued: result.queued };
  },

  async get(resumeId: string): Promise<ResumeRecord> {
    return apiRequest<ResumeRecord>(`/resumes/${resumeId}`);
  },

  async update(resumeId: string, extractedData: ExtractedResumeData): Promise<ResumeRecord> {
    return apiRequest<ResumeRecord>(`/resumes/${resumeId}`, {
      method: "PATCH",
      body: JSON.stringify({ extractedData, extractedSkills: extractedData.skills }),
    });
  },

  async analyzeResume(resumeId: string, targetRole: string, jobDescription?: string): Promise<ResumeBuilderAnalysis> {
    return apiRequest<ResumeBuilderAnalysis>("/resume-builder/analyze", {
      method: "POST",
      body: JSON.stringify({ resumeId, targetRole, jobDescription }),
    });
  },

  async generateResume(resumeId: string, targetRole: string, jobDescription?: string, versionName?: string): Promise<GeneratedResumeSnapshot> {
    return apiRequest<GeneratedResumeSnapshot>("/resume-builder/generate", {
      method: "POST",
      body: JSON.stringify({ resumeId, targetRole, jobDescription, versionName }),
    });
  },

  async getGeneratedResumes(): Promise<GeneratedResumeSnapshot[]> {
    return apiRequest<GeneratedResumeSnapshot[]>("/resume-builder/generated");
  },

  async getGeneratedResume(id: string): Promise<GeneratedResumeSnapshot> {
    return apiRequest<GeneratedResumeSnapshot>(`/resume-builder/generated/${id}`);
  },

  async updateGeneratedResume(id: string, patch: Partial<GeneratedResumeSnapshot>): Promise<GeneratedResumeSnapshot> {
    const body: Record<string, unknown> = {};
    if (patch.target_role !== undefined) body.targetRole = patch.target_role;
    if (patch.version_name !== undefined) body.versionName = patch.version_name;
    if (patch.ats_score !== undefined) body.atsScore = patch.ats_score;
    if (patch.ats_keywords !== undefined) body.atsKeywords = patch.ats_keywords;
    if (patch.resume_content !== undefined) body.resumeContent = patch.resume_content;
    return apiRequest<GeneratedResumeSnapshot>(`/resume-builder/generated/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async exportGeneratedResume(id: string, format: "pdf" | "docx"): Promise<ResumeExportResult> {
    return apiRequest<ResumeExportResult>(`/resume-builder/generated/${id}/export/${format}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async deleteGeneratedResume(id: string): Promise<void> {
    return apiRequest<void>(`/resume-builder/generated/${id}`, { method: "DELETE" });
  },
};
