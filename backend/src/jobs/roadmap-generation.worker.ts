import { Worker, type Job } from "bullmq";
import { getBullMqConnection } from "../config/redis";
import { getSupabaseStorageClient } from "../config/supabase";
import { ragRoadmapService } from "../services/rag-roadmap.service";
import type { RoadmapGenerationInput } from "../types/roadmap";

type RagRoadmapJobData = {
  aiJobId: string;
  userId: string;
  input: RoadmapGenerationInput;
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
    console.error("Unable to synchronize RAG retry state", {
      jobId: job.id,
      aiJobId: job.data.aiJobId,
      attemptsMade: job.attemptsMade,
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
    console.error("Unable to record successful RAG retry count", {
      jobId: job.id,
      aiJobId: job.data.aiJobId,
      attemptsMade: job.attemptsMade,
    });
  }
};

export const roadmapGenerationWorker = new Worker<RagRoadmapJobData>("roadmapGenerationQueue", async (job) => {
  await ragRoadmapService.process(job.data.aiJobId, job.data.userId, job.data.input);
}, {
  connection: getBullMqConnection(),
  concurrency: 2,
});

roadmapGenerationWorker.on("completed", (job) => {
  console.info("RAG roadmap generation completed", {
    jobId: job.id,
    aiJobId: job.data.aiJobId,
    attemptsMade: job.attemptsMade,
  });
  void syncCompletedRetryCount(job);
});

roadmapGenerationWorker.on("failed", (job, error) => {
  console.error("RAG roadmap generation attempt failed", {
    jobId: job?.id,
    aiJobId: job?.data.aiJobId,
    attemptsMade: job?.attemptsMade,
    message: error.message,
  });
  if (job) void syncRetryState(job, error);
});

const shutdown = async (): Promise<void> => {
  await roadmapGenerationWorker.close();
  process.exit(0);
};

process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
