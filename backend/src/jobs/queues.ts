import { Queue } from "bullmq";
import { getBullMqConnection } from "../config/redis";

export const queueNames = [
  "emailQueue",
  "resumeParsingQueue",
  "roadmapGenerationQueue",
  "resumeBuilderQueue",
  "weeklyReminderQueue",
] as const;

export type QueueName = (typeof queueNames)[number];

export const createQueue = (name: QueueName): Queue => new Queue(name, {
  connection: getBullMqConnection(),
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: 100 },
});
