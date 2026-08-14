import { apiRequest } from "./api";
import type { ExtractedResumeData, ResumeRecord, ResumeResponse } from "../types/resume";
import type { GeneratedResumeSnapshot, ResumeBuilderAnalysis } from "../types/ats-resume";

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
    return apiRequest<GeneratedResumeSnapshot>(`/resume-builder/generated/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteGeneratedResume(id: string): Promise<void> {
    return apiRequest<void>(`/resume-builder/generated/${id}`, { method: "DELETE" });
  },
};
