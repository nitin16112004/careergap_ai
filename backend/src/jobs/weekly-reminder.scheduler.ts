import { Worker } from "bullmq";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { getBullMqConnection } from "../config/redis";
import { reminderService } from "../services/reminder.service";
import { createQueue } from "./queues";

const schedulerQueue = createQueue("weeklyReminderQueue");

export const weeklyReminderWorker = new Worker("weeklyReminderQueue", async (job) => {
  if (job.name !== "scan-weekly-reminders") {
    logger.warn({ jobId: job.id, name: job.name }, "unknown weekly reminder job ignored");
    return { ignored: true };
  }

  const result = await reminderService.scanAndEnqueue();
  logger.info({ jobId: job.id, ...result }, "weekly reminder scan completed");
  return result;
}, {
  connection: getBullMqConnection(),
  concurrency: 1,
});

const registerScheduler = async (): Promise<void> => {
  const env = getEnv();
  await schedulerQueue.upsertJobScheduler(
    "weekly-reminder-scan",
    {
      pattern: env.REMINDER_CRON_PATTERN,
      tz: env.REMINDER_CRON_TIMEZONE,
    },
    {
      name: "scan-weekly-reminders",
      data: { source: "scheduler" },
      opts: {
        attempts: 2,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    },
  );
  logger.info({ pattern: env.REMINDER_CRON_PATTERN, timezone: env.REMINDER_CRON_TIMEZONE }, "weekly reminder scheduler registered");
};

weeklyReminderWorker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id, attemptsMade: job?.attemptsMade }, "weekly reminder scan failed");
});

let shuttingDown = false;
const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "weekly reminder scheduler shutdown started");

  const timeout = setTimeout(() => {
    logger.error({ timeoutMs: getEnv().SHUTDOWN_TIMEOUT_MS }, "weekly reminder scheduler graceful shutdown timed out");
    void weeklyReminderWorker.close(true);
  }, getEnv().SHUTDOWN_TIMEOUT_MS);
  timeout.unref();

  try {
    await Promise.all([
      weeklyReminderWorker.close(),
      schedulerQueue.close(),
    ]);
    logger.info("weekly reminder scheduler shutdown completed");
  } catch (error) {
    logger.error({ err: error }, "weekly reminder scheduler shutdown failed");
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
};

void registerScheduler().catch((error) => {
  logger.fatal({ err: error }, "weekly reminder scheduler registration failed");
  process.exitCode = 1;
  void shutdown("registration-failed");
});

process.once("SIGINT", () => { void shutdown("SIGINT"); });
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("uncaughtException", (error) => {
  logger.fatal({ err: error }, "weekly reminder scheduler uncaught exception");
  process.exitCode = 1;
  void shutdown("uncaughtException");
});
process.once("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "weekly reminder scheduler unhandled rejection");
  process.exitCode = 1;
  void shutdown("unhandledRejection");
});
