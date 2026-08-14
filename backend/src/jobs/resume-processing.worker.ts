import { Worker } from "bullmq";
import { getEnv } from "../config/env";
import { getBullMqConnection } from "../config/redis";
import { getSupabaseStorageClient } from "../config/supabase";
import type { ParsedResumeData, ResumeJobData } from "../types/resume";
import { RESUME_BUCKET } from "../types/resume";
import { resumeService } from "../services/resume.service";

const parseAiResponse = (body: unknown): ParsedResumeData => {
  if (!body || typeof body !== "object") throw new Error("AI service returned an invalid response");
  const payload = body as { data?: unknown; profile?: unknown };
  const candidate = payload.data ?? payload.profile ?? body;
  if (!candidate || typeof candidate !== "object") throw new Error("AI service returned no parsed profile");
  return candidate as ParsedResumeData;
};

const parseResume = async (job: ResumeJobData): Promise<void> => {
  const { data: file, error: downloadError } = await getSupabaseStorageClient().storage.from(RESUME_BUCKET).download(job.storagePath);
  if (downloadError || !file) throw new Error("Unable to download resume from private storage");

  const form = new FormData();
  form.append("file", new Blob([await file.arrayBuffer()], { type: job.fileType }), job.fileName);
  const response = await fetch(`${getEnv().AI_SERVICE_URL.replace(/\/$/, "")}/parse-resume`, { method: "POST", body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`AI service failed with status ${response.status}`);
  await resumeService.saveParsedResult(job, parseAiResponse(body));
};

export const resumeProcessingWorker = new Worker<ResumeJobData>("resumeParsingQueue", async (job) => {
  await parseResume(job.data);
}, {
  connection: getBullMqConnection(),
  concurrency: 3,
});

resumeProcessingWorker.on("completed", (job) => {
  console.info("Resume parsing completed", { jobId: job.id, resumeId: job.data.resumeId });
});
resumeProcessingWorker.on("failed", (job, error) => {
  console.error("Resume parsing failed", { jobId: job?.id, resumeId: job?.data.resumeId, message: error.message });
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    void resumeService.markProcessingFailed(job.data, error.message).catch((updateError: unknown) => {
      console.error("Unable to record resume parsing failure", { jobId: job.id, message: updateError instanceof Error ? updateError.message : "Unknown error" });
    });
  }
});

const shutdown = async (): Promise<void> => {
  await resumeProcessingWorker.close();
  process.exit(0);
};
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
