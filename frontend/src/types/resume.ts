export interface ResumeEducation {
  details: string;
  [key: string]: unknown;
}

export interface ResumeExperience {
  details: string;
  [key: string]: unknown;
}

export interface ResumeProject {
  details: string;
  [key: string]: unknown;
}

export interface ExtractedResumeData {
  name: string;
  fullName?: string;
  email: string;
  phone: string;
  city: string;
  education: ResumeEducation[];
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  linkedin: string;
  github: string;
  portfolio: string;
  rawText?: string;
  [key: string]: unknown;
}

export type ResumeParsingStatus = "pending" | "processing" | "completed" | "failed";

export interface ResumeRecord {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  signed_url?: string;
  storage_path: string;
  extracted_data: ExtractedResumeData | Record<string, unknown>;
  extracted_text: string | null;
  extracted_skills: string[];
  parsing_status: ResumeParsingStatus;
  parsing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeResponse {
  resume: ResumeRecord;
  queued?: boolean;
}
