import "dotenv/config";
import http from "node:http";
import { app } from "./app";
import { disconnectRedis } from "./config/redis";
import { getEnv } from "./config/env";

const env = getEnv();
const server = http.createServer(app);
const SHUTDOWN_GRACE_MS = 15_000;
let shuttingDown = false;

server.requestTimeout = 120_000;
server.headersTimeout = 65_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 1_000;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received; draining HTTP connections`);

  const forceTimer = setTimeout(() => {
    console.error("Graceful shutdown deadline exceeded; closing remaining connections");
    server.closeAllConnections();
  }, SHUTDOWN_GRACE_MS);
  forceTimer.unref();

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  clearTimeout(forceTimer);
  await disconnectRedis();
  console.info("Backend shutdown complete");
};

export const startServer = async (): Promise<http.Server> => {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(env.PORT, () => {
      server.off("error", reject);
      resolve();
    });
  });
  console.info(`Backend listening on port ${env.PORT}`);
  return server;
};

process.once("SIGINT", () => void shutdown("SIGINT").finally(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown("SIGTERM").finally(() => process.exit(0)));

if (require.main === module) {
  startServer().catch((error: unknown) => {
    console.error("Backend startup failed", error);
    process.exitCode = 1;
  });
}
