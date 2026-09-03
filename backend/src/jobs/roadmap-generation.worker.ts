import { Worker, type Job } from "bullmq";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { getBullMqConnection } from "../config/redis";
import { getSupabaseStorageClient } from "../config/supabase";
import { writeDeadLetter } from "./dead-letter";
import { ragRoadmapService } from "../services/rag-roadmap.service";
import type { RoadmapGenerationInput } from "../types/roadmap";

type RagRoadmapJobData = {
  aiJobId: string;
  userId: string;
  input: RoadmapGenerationInput;
};

const refundTerminalUsage = async (job: Job<RagRoadmapJobData>): Promise<void> => {
  const { error } = await getSupabaseStorageClient().rpc("refund_rag_usage_once", {
    p_ai_job_id: job.data.aiJobId,
  });
  if (error) {
    logger.error({ err: error, jobId: job.id, aiJobId: job.data.aiJobId }, "unable to refund terminal RAG usage reservation");
  }
};

const syncRetryState = async (job: Job<RagRoadmapJobData>, error: Error): Promise<void> => {
  const maxAttempts = job.opts.attempts ?? 1;
  const retryScheduled = job.attemptsMade < maxAttempts;
  const values = retryScheduled
    ? {
        status: "queued",
        retry_count: job.attemptsMade,
        error_message: `Attempt ${job.attemptsMade} failed; retry scheduled.`,
        completed_at: null,
      }
    : {
        status: "failed",
        retry_count: job.attemptsMade,
        error_message: error.message.slice(0, 1000),
        completed_at: new Date().toISOString(),
      };

  const { error: updateError } = await getSupabaseStorageClient()
    .from("ai_jobs")
    .update(values)
    .eq("id", job.data.aiJobId)
    .eq("job_type", "roadmap_rag");

  if (updateError) {
    logger.error({ err: updateError, jobId: job.id, aiJobId: job.data.aiJobId, attemptsMade: job.attemptsMade }, "unable to synchronize RAG retry state");
  }

  if (!retryScheduled) {
    await refundTerminalUsage(job);
    await writeDeadLetter({
      sourceQueue: "roadmapGenerationQueue",
      sourceJobId: job.id,
      attemptsMade: job.attemptsMade,
      errorMessage: error.message,
      context: { aiJobId: job.data.aiJobId },
    });
  }
};

const syncCompletedRetryCount = async (job: Job<RagRoadmapJobData>): Promise<void> => {
  if (job.attemptsMade <= 0) return;
  const { error } = await getSupabaseStorageClient()
    .from("ai_jobs")
    .update({ retry_count: job.attemptsMade })
    .eq("id", job.data.aiJobId)
    .eq("job_type", "roadmap_rag");
  if (error) {
    logger.error({ err: error, jobId: job.id, aiJobId: job.data.aiJobId, attemptsMade: job.attemptsMade }, "unable to record successful RAG retry count");
  }
};

export const roadmapGenerationWorker = new Worker<RagRoadmapJobData>("roadmapGenerationQueue", async (job) => {
  await ragRoadmapService.process(job.data.aiJobId, job.data.userId, job.data.input);
}, {
  connection: getBullMqConnection(),
  concurrency: 2,
});

roadmapGenerationWorker.on("completed", (job) => {
  logger.info({ jobId: job.id, aiJobId: job.data.aiJobId, attemptsMade: job.attemptsMade }, "RAG roadmap generation completed");
  void syncCompletedRetryCount(job);
});

roadmapGenerationWorker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id, aiJobId: job?.data.aiJobId, attemptsMade: job?.attemptsMade }, "RAG roadmap generation attempt failed");
  if (job) void syncRetryState(job, error);
});

let shuttingDown = false;
const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "roadmap worker shutdown started");

  const timeout = setTimeout(() => {
    logger.error({ timeoutMs: getEnv().SHUTDOWN_TIMEOUT_MS }, "roadmap worker graceful shutdown timed out");
    void roadmapGenerationWorker.close(true);
  }, getEnv().SHUTDOWN_TIMEOUT_MS);
  timeout.unref();

  try {
    await roadmapGenerationWorker.close();
    logger.info("roadmap worker shutdown completed");
  } catch (error) {
    logger.error({ err: error }, "roadmap worker shutdown failed");
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
};

process.once("SIGINT", () => { void shutdown("SIGINT"); });
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("uncaughtException", (error) => {
  logger.fatal({ err: error }, "roadmap worker uncaught exception");
  process.exitCode = 1;
  void shutdown("uncaughtException");
});
process.once("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "roadmap worker unhandled rejection");
  process.exitCode = 1;
  void shutdown("unhandledRejection");
});
