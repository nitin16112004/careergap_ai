import { Worker, type Job } from "bullmq";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { connectRedis, disconnectRedis, getBullMqConnection } from "../config/redis";
import { getSupabaseStorageClient } from "../config/supabase";
import { emailService } from "../services/email.service";
import type { ReminderEmailJobData } from "../types/reminder";
import { writeDeadLetter } from "./dead-letter";

const deliveredKey = (reminderLogId: string): string => `reminder-delivered:${reminderLogId}`;

const syncSentState = async (job: Job<ReminderEmailJobData>, providerMessageId: string): Promise<void> => {
  const client = getSupabaseStorageClient();
  const sentAt = new Date().toISOString();
  const [emailResult, reminderResult] = await Promise.all([
    client.from("email_logs").update({
      status: "sent",
      provider_message_id: providerMessageId,
      error_message: null,
      sent_at: sentAt,
    }).eq("id", job.data.emailLogId),
    client.from("reminder_logs").update({
      email_sent: true,
      email_status: "sent",
      email_error: null,
      sent_at: sentAt,
    }).eq("id", job.data.reminderLogId),
  ]);

  if (emailResult.error || reminderResult.error) {
    throw new Error("Unable to persist successful reminder email delivery state");
  }
};

const processReminderEmail = async (job: Job<ReminderEmailJobData>): Promise<void> => {
  const client = getSupabaseStorageClient();
  const reminderState = await client.from("reminder_logs")
    .select("email_sent,email_status")
    .eq("id", job.data.reminderLogId)
    .eq("user_id", job.data.userId)
    .maybeSingle();

  if (reminderState.error || !reminderState.data) {
    throw new Error("Reminder log not found for email delivery");
  }
  if (reminderState.data.email_sent || reminderState.data.email_status === "sent") return;

  const redis = await connectRedis();
  let providerMessageId = await redis.get(deliveredKey(job.data.reminderLogId));

  if (!providerMessageId) {
    const result = await emailService.sendTransactional({
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
      text: job.data.text,
      idempotencyKey: `reminder/${job.data.reminderLogId}`,
    });
    providerMessageId = result.providerMessageId;
    // Provider-level idempotency is the primary duplicate-send guard for retries.
    // This Redis receipt additionally lets a retry repair PostgreSQL state without
    // another provider call when DB synchronization failed after delivery.
    await redis.set(deliveredKey(job.data.reminderLogId), providerMessageId, { EX: 60 * 60 * 24 * 30 });
  }

  await syncSentState(job, providerMessageId);
};

const syncFailureState = async (job: Job<ReminderEmailJobData>, error: Error): Promise<void> => {
  const maxAttempts = job.opts.attempts ?? 1;
  const retryScheduled = job.attemptsMade < maxAttempts;
  const status = retryScheduled ? "queued" : "failed";
  const message = retryScheduled
    ? `Attempt ${job.attemptsMade} failed; retry scheduled.`
    : error.message.slice(0, 1000);
  const client = getSupabaseStorageClient();

  const [emailResult, reminderResult] = await Promise.all([
    client.from("email_logs").update({ status, error_message: message }).eq("id", job.data.emailLogId),
    client.from("reminder_logs").update({ email_status: status, email_error: message }).eq("id", job.data.reminderLogId),
  ]);

  if (emailResult.error || reminderResult.error) {
    logger.error({ jobId: job.id, reminderLogId: job.data.reminderLogId }, "unable to synchronize reminder email failure state");
  }

  if (!retryScheduled) {
    await writeDeadLetter({
      sourceQueue: "emailQueue",
      sourceJobId: job.id,
      attemptsMade: job.attemptsMade,
      errorMessage: error.message,
      context: {
        reminderLogId: job.data.reminderLogId,
        emailLogId: job.data.emailLogId,
        userId: job.data.userId,
        reminderType: job.data.reminderType,
      },
    });
  }
};

export const emailWorker = new Worker<ReminderEmailJobData>("emailQueue", processReminderEmail, {
  connection: getBullMqConnection(),
  concurrency: 5,
});

emailWorker.on("completed", (job) => {
  logger.info({ jobId: job.id, reminderLogId: job.data.reminderLogId, reminderType: job.data.reminderType }, "reminder email delivery completed");
});

emailWorker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id, reminderLogId: job?.data.reminderLogId, attemptsMade: job?.attemptsMade }, "reminder email delivery attempt failed");
  if (job) void syncFailureState(job, error);
});

let shuttingDown = false;
const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "email worker shutdown started");

  const timeout = setTimeout(() => {
    logger.error({ timeoutMs: getEnv().SHUTDOWN_TIMEOUT_MS }, "email worker graceful shutdown timed out");
    void emailWorker.close(true);
  }, getEnv().SHUTDOWN_TIMEOUT_MS);
  timeout.unref();

  try {
    await emailWorker.close();
    await disconnectRedis();
    logger.info("email worker shutdown completed");
  } catch (error) {
    logger.error({ err: error }, "email worker shutdown failed");
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
};

process.once("SIGINT", () => { void shutdown("SIGINT"); });
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("uncaughtException", (error) => {
  logger.fatal({ err: error }, "email worker uncaught exception");
  process.exitCode = 1;
  void shutdown("uncaughtException");
});
process.once("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "email worker unhandled rejection");
  process.exitCode = 1;
  void shutdown("unhandledRejection");
});
