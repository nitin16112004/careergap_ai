import { Worker } from "bullmq";
import { getBullMqConnection } from "../config/redis";
import { ragRoadmapService } from "../services/rag-roadmap.service";
import type { RoadmapGenerationInput } from "../types/roadmap";

type RagRoadmapJobData = {
  aiJobId: string;
  userId: string;
  input: RoadmapGenerationInput;
};

export const roadmapGenerationWorker = new Worker<RagRoadmapJobData>("roadmapGenerationQueue", async (job) => {
  await ragRoadmapService.process(job.data.aiJobId, job.data.userId, job.data.input);
}, {
  connection: getBullMqConnection(),
  concurrency: 2,
});

roadmapGenerationWorker.on("completed", (job) => {
  console.info("RAG roadmap generation completed", { jobId: job.id, aiJobId: job.data.aiJobId });
});

roadmapGenerationWorker.on("failed", (job, error) => {
  console.error("RAG roadmap generation failed", {
    jobId: job?.id,
    aiJobId: job?.data.aiJobId,
    attemptsMade: job?.attemptsMade,
    message: error.message,
  });
});

const shutdown = async (): Promise<void> => {
  await roadmapGenerationWorker.close();
  process.exit(0);
};

process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
