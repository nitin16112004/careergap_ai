import "dotenv/config";
import http from "node:http";
import { app } from "./app";
import { disconnectRedis } from "./config/redis";
import { getEnv } from "./config/env";
import { logger } from "./config/logger";

const env = getEnv();
const server = http.createServer(app);
let shuttingDown = false;

const closeServer = async (): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
};

const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "backend shutdown started");

  const timeout = setTimeout(() => {
    logger.error({ timeoutMs: env.SHUTDOWN_TIMEOUT_MS }, "backend graceful shutdown timed out");
    server.closeAllConnections();
  }, env.SHUTDOWN_TIMEOUT_MS);
  timeout.unref();

  try {
    server.closeIdleConnections();
    await closeServer();
    await disconnectRedis();
    logger.info("backend shutdown completed");
  } catch (error) {
    logger.error({ err: error }, "backend shutdown failed");
    exitCode = 1;
  } finally {
    clearTimeout(timeout);
    process.exitCode = exitCode;
  }
};

export const startServer = async (): Promise<http.Server> => {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(env.PORT, () => {
      server.off("error", reject);
      resolve();
    });
  });
  logger.info({ port: env.PORT, environment: env.NODE_ENV }, "backend listening");
  return server;
};

process.once("SIGINT", () => { void shutdown("SIGINT"); });
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception");
  void shutdown("uncaughtException", 1);
});
process.once("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled rejection");
  void shutdown("unhandledRejection", 1);
});

if (require.main === module) {
  startServer().catch((error: unknown) => {
    logger.fatal({ err: error }, "backend startup failed");
    process.exitCode = 1;
  });
}
