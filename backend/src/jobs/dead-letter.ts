import { Queue } from "bullmq";
import { getBullMqConnection } from "../config/redis";
import { logger } from "../config/logger";

export interface DeadLetterInput {
  sourceQueue: string;
  sourceJobId: string | number | null | undefined;
  attemptsMade: number;
  errorMessage: string;
  context?: Record<string, string | number | boolean | null | undefined>;
}

export const writeDeadLetter = async (input: DeadLetterInput): Promise<void> => {
  const queue = new Queue("deadLetterQueue", {
    connection: getBullMqConnection(),
    defaultJobOptions: {
      removeOnComplete: 500,
      removeOnFail: 500,
    },
  });

  try {
    await queue.add("exhausted-job", {
      sourceQueue: input.sourceQueue,
      sourceJobId: input.sourceJobId ?? null,
      attemptsMade: input.attemptsMade,
      errorMessage: input.errorMessage.slice(0, 1000),
      context: input.context ?? {},
      failedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, sourceQueue: input.sourceQueue, sourceJobId: input.sourceJobId }, "dead-letter enqueue failed");
  } finally {
    await queue.close().catch(() => undefined);
  }
};
