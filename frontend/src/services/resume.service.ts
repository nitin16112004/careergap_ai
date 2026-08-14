import { apiRequest } from "./api";
import type { ExtractedResumeData, ResumeRecord, ResumeResponse } from "../types/resume";

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
};
