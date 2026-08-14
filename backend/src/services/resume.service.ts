import { randomUUID } from "node:crypto";
import type { Express } from "express";
import { getSupabaseStorageClient } from "../config/supabase";
import { createQueue } from "../jobs/queues";
import { assertResumeUploadAllowed } from "./resume-rate-limit.service";
import {
  MAX_RESUME_FILE_SIZE,
  RESUME_BUCKET,
  RESUME_MIME_TYPES,
  type ParsedResumeData,
  type ResumeJobData,
  type ResumeRecord,
} from "../types/resume";
import { HttpError } from "../utils/http-error";

const resumeParsingQueue = createQueue("resumeParsingQueue");

const extensionFor = (fileName: string): "pdf" | "docx" | null => {
  const extension = fileName.toLowerCase().split(".").pop();
  return extension === "pdf" || extension === "docx" ? extension : null;
};

const hasValidSignature = (file: Express.Multer.File, extension: "pdf" | "docx"): boolean => {
  if (extension === "pdf") return file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
};

const toPublicRecord = async (record: ResumeRecord): Promise<ResumeRecord & { signed_url?: string }> => {
  const { data } = await getSupabaseStorageClient().storage.from(RESUME_BUCKET).createSignedUrl(record.storage_path, 900);
  return data?.signedUrl ? { ...record, signed_url: data.signedUrl } : record;
};

const findOwnedResume = async (userId: string, resumeId: string): Promise<ResumeRecord> => {
  const { data, error } = await getSupabaseStorageClient()
    .from("resumes")
    .select("*")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Unable to load resume.", "RESUME_LOOKUP_FAILED", false);
  if (!data) throw new HttpError(404, "Resume not found.", "RESUME_NOT_FOUND");
  return data as ResumeRecord;
};

const updateOwnedResume = async (userId: string, resumeId: string, patch: Record<string, unknown>): Promise<ResumeRecord> => {
  const { data, error } = await getSupabaseStorageClient()
    .from("resumes")
    .update(patch)
    .eq("id", resumeId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new HttpError(500, "Unable to update resume.", "RESUME_UPDATE_FAILED", false);
  if (!data) throw new HttpError(404, "Resume not found.", "RESUME_NOT_FOUND");
  return data as ResumeRecord;
};

const queueParsingJob = async (job: ResumeJobData): Promise<void> => {
  try {
    await resumeParsingQueue.add("parse-resume", job, {
      jobId: `resume-${job.resumeId}-${randomUUID()}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
    });
  } catch (error) {
    await updateOwnedResume(job.userId, job.resumeId, {
      parsing_status: "failed",
      parsing_error: "Unable to queue resume parsing job.",
    });
    throw new HttpError(503, "Resume processing is temporarily unavailable. Please try again.", "RESUME_QUEUE_UNAVAILABLE");
  }
};

export const resumeService = {
  async upload(userId: string, file?: Express.Multer.File): Promise<ResumeRecord & { signed_url?: string; queued: boolean }> {
    if (!file) throw new HttpError(400, "Please choose a resume file.", "RESUME_FILE_REQUIRED");
    if (file.size <= 0 || file.size > MAX_RESUME_FILE_SIZE) {
      throw new HttpError(413, "Resume file must be 5 MB or smaller.", "RESUME_FILE_TOO_LARGE");
    }

    const extension = extensionFor(file.originalname);
    if (!extension || file.mimetype !== RESUME_MIME_TYPES[extension] || !hasValidSignature(file, extension)) {
      throw new HttpError(400, "Please upload a valid PDF or DOCX resume.", "RESUME_FILE_TYPE_INVALID");
    }

    await assertResumeUploadAllowed(userId);
    const resumeId = randomUUID();
    const storagePath = `${userId}/${resumeId}.${extension}`;
    const storage = getSupabaseStorageClient().storage.from(RESUME_BUCKET);
    const { error: uploadError } = await storage.upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw new HttpError(502, "Resume upload failed. Please try again.", "RESUME_STORAGE_UPLOAD_FAILED", false);

    const client = getSupabaseStorageClient();
    const { data, error } = await client.from("resumes").insert({
      id: resumeId,
      user_id: userId,
      file_name: file.originalname,
      file_url: storagePath,
      storage_path: storagePath,
      file_type: file.mimetype,
      file_size: file.size,
      parsing_status: "pending",
      extracted_data: {},
      extracted_skills: [],
      is_active: true,
    }).select("*").single();

    if (error || !data) {
      await storage.remove([storagePath]);
      throw new HttpError(500, "Unable to save resume metadata.", "RESUME_METADATA_SAVE_FAILED", false);
    }

    // Only retire the prior active resume after this upload has durable metadata.
    // A failed metadata insert must not leave the user without an active resume.
    await client.from("resumes").update({ is_active: false }).eq("user_id", userId).neq("id", resumeId).eq("is_active", true);

    // The explicit process endpoint owns queueing so clients can retry after a
    // transient queue outage without uploading the file again.
    return { ...(await toPublicRecord(data as ResumeRecord)), queued: false };
  },

  async process(userId: string, resumeId: string): Promise<ResumeRecord & { queued: boolean }> {
    const record = await findOwnedResume(userId, resumeId);
    if (record.parsing_status === "completed") return { ...(await toPublicRecord(record)), queued: false };
    if (record.parsing_status === "processing") return { ...(await toPublicRecord(record)), queued: true };

    const processing = await updateOwnedResume(userId, resumeId, { parsing_status: "processing", parsing_error: null });
    await queueParsingJob({
      resumeId,
      userId,
      storagePath: processing.storage_path,
      fileName: processing.file_name,
      fileType: processing.file_type,
    });
    return { ...(await toPublicRecord(processing)), queued: true };
  },

  async get(userId: string, resumeId: string): Promise<ResumeRecord & { signed_url?: string }> {
    return toPublicRecord(await findOwnedResume(userId, resumeId));
  },

  async update(userId: string, resumeId: string, input: { extractedData?: Record<string, unknown>; extractedText?: string; extractedSkills?: string[] }): Promise<ResumeRecord & { signed_url?: string }> {
    const patch: Record<string, unknown> = {};
    if (input.extractedData) patch.extracted_data = input.extractedData as ParsedResumeData;
    if (input.extractedText !== undefined) patch.extracted_text = input.extractedText;
    if (input.extractedSkills) patch.extracted_skills = input.extractedSkills;
    const record = await updateOwnedResume(userId, resumeId, patch);
    return toPublicRecord(record);
  },

  async markProcessingFailed(job: ResumeJobData, message: string): Promise<void> {
    await updateOwnedResume(job.userId, job.resumeId, { parsing_status: "failed", parsing_error: message });
  },

  async saveParsedResult(job: ResumeJobData, data: ParsedResumeData): Promise<void> {
    const skills = Array.isArray(data.skills) ? data.skills.filter((skill): skill is string => typeof skill === "string") : [];
    await updateOwnedResume(job.userId, job.resumeId, {
      extracted_data: data,
      extracted_text: typeof data.rawText === "string" ? data.rawText : null,
      extracted_skills: skills,
      parsing_status: "completed",
      parsing_error: null,
    });
  },
};

export type ResumeService = typeof resumeService;
