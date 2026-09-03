import { connectRedis, disconnectRedis } from "../config/redis";
import { SCHEDULER_HEARTBEAT_KEY } from "../controllers/health.controller";

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TTL_SECONDS = 90;
let timer: NodeJS.Timeout | undefined;

const writeHeartbeat = async (): Promise<void> => {
  const redis = await connectRedis();
  await redis.set(SCHEDULER_HEARTBEAT_KEY, new Date().toISOString(), { EX: HEARTBEAT_TTL_SECONDS });
};

export const startScheduler = async (): Promise<void> => {
  await writeHeartbeat();
  timer = setInterval(() => {
    void writeHeartbeat().catch((error: unknown) => {
      console.error("Scheduler heartbeat failed", {
        message: error instanceof Error ? error.message : "Unknown scheduler heartbeat error",
      });
    });
  }, HEARTBEAT_INTERVAL_MS);
  timer.unref();
  console.info("Scheduler heartbeat started", { intervalMs: HEARTBEAT_INTERVAL_MS });
};

const shutdown = async (signal: string): Promise<void> => {
  console.info("Scheduler shutting down", { signal });
  if (timer) clearInterval(timer);
  await disconnectRedis();
};

process.once("SIGINT", () => { void shutdown("SIGINT").finally(() => process.exit(0)); });
process.once("SIGTERM", () => { void shutdown("SIGTERM").finally(() => process.exit(0)); });

if (require.main === module) {
  void startScheduler().catch((error: unknown) => {
    console.error("Scheduler startup failed", {
      message: error instanceof Error ? error.message : "Unknown scheduler startup error",
    });
    process.exitCode = 1;
  });
}
