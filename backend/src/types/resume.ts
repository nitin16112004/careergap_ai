export const RESUME_BUCKET = "resumes";
export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024;
export const RESUME_UPLOAD_WINDOW_SECONDS = 60 * 60;
export const RESUME_UPLOAD_LIMIT_PER_USER = 10;

export const RESUME_MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export type ResumeFileType = keyof typeof RESUME_MIME_TYPES;
export type ResumeParsingStatus = "pending" | "processing" | "completed" | "failed";

export interface ResumeJobData {
  resumeId: string;
  userId: string;
  storagePath: string;
  fileName: string;
  fileType: string;
}

export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  city: string;
  education: Array<Record<string, string>>;
  skills: string[];
  experience: Array<Record<string, string>>;
  projects: Array<Record<string, string>>;
  linkedin: string;
  github: string;
  portfolio: string;
  rawText?: string;
  [key: string]: unknown;
}

export interface ResumeRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  extracted_text: string | null;
  extracted_data: ParsedResumeData | Record<string, unknown>;
  extracted_skills: string[];
  parsing_status: ResumeParsingStatus;
  parsing_error: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
