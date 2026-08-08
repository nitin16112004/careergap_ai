import "dotenv/config";
import http from "node:http";
import { app } from "./app";
import { disconnectRedis } from "./config/redis";
import { getEnv } from "./config/env";

const env = getEnv();
const server = http.createServer(app);

const shutdown = async (signal: string): Promise<void> => {
  console.info(`${signal} received; shutting down`);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectRedis();
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
