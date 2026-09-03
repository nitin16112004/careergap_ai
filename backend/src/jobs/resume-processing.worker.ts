import { Worker } from "bullmq";
import { getEnv } from "../config/env";
import { getBullMqConnection } from "../config/redis";
import { logger } from "../config/logger";
import { getSupabaseStorageClient } from "../config/supabase";
import { writeDeadLetter } from "./dead-letter";
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
  const response = await fetch(`${getEnv().AI_SERVICE_URL.replace(/\/$/, "")}/parse-resume`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(getEnv().AI_REQUEST_TIMEOUT_MS),
  });
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
  logger.info({ jobId: job.id, resumeId: job.data.resumeId, attemptsMade: job.attemptsMade }, "resume parsing completed");
});

resumeProcessingWorker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id, resumeId: job?.data.resumeId, attemptsMade: job?.attemptsMade }, "resume parsing attempt failed");
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    void resumeService.markProcessingFailed(job.data, error.message).catch((updateError: unknown) => {
      logger.error({ err: updateError, jobId: job.id, resumeId: job.data.resumeId }, "unable to record resume parsing failure");
    });
    void writeDeadLetter({
      sourceQueue: "resumeParsingQueue",
      sourceJobId: job.id,
      attemptsMade: job.attemptsMade,
      errorMessage: error.message,
      context: { resumeId: job.data.resumeId },
    });
  }
});

let shuttingDown = false;
const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "resume worker shutdown started");

  const timeout = setTimeout(() => {
    logger.error({ timeoutMs: getEnv().SHUTDOWN_TIMEOUT_MS }, "resume worker graceful shutdown timed out");
    void resumeProcessingWorker.close(true);
  }, getEnv().SHUTDOWN_TIMEOUT_MS);
  timeout.unref();

  try {
    await resumeProcessingWorker.close();
    logger.info("resume worker shutdown completed");
  } catch (error) {
    logger.error({ err: error }, "resume worker shutdown failed");
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
};

process.once("SIGINT", () => { void shutdown("SIGINT"); });
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("uncaughtException", (error) => {
  logger.fatal({ err: error }, "resume worker uncaught exception");
  process.exitCode = 1;
  void shutdown("uncaughtException");
});
process.once("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "resume worker unhandled rejection");
  process.exitCode = 1;
  void shutdown("unhandledRejection");
});
