import type { RequestHandler } from "express";
import { checkDatabaseConnection } from "../database/client";
import { checkRedisConnection, connectRedis } from "../config/redis";
import { getEnv } from "../config/env";

const DEPENDENCY_TIMEOUT_MS = 2_000;
export const SCHEDULER_HEARTBEAT_KEY = "careerguid:scheduler:heartbeat";

type DependencyStatus = {
  status: "ok" | "degraded";
  latencyMs: number;
};

const withTimeout = async (check: () => Promise<void>): Promise<void> => {
  await Promise.race([
    check(),
    new Promise<never>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Dependency health check timed out")), DEPENDENCY_TIMEOUT_MS);
      timer.unref();
    }),
  ]);
};

const checkAiService = async (): Promise<void> => {
  const result = await fetch(`${getEnv().AI_SERVICE_URL.replace(/\/$/, "")}/health`, {
    signal: AbortSignal.timeout(DEPENDENCY_TIMEOUT_MS),
  });
  if (!result.ok) throw new Error(`AI service returned ${result.status}`);
};

const statusFor = async (check: () => Promise<void>): Promise<DependencyStatus> => {
  const started = performance.now();
  try {
    await withTimeout(check);
    return { status: "ok", latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { status: "degraded", latencyMs: Math.round(performance.now() - started) };
  }
};

const dependencyCheck = (service: string, check: () => Promise<void>): RequestHandler => async (_request, response) => {
  response.setHeader("cache-control", "no-store");
  const dependency = await statusFor(check);
  response.status(dependency.status === "ok" ? 200 : 503).json({
    status: dependency.status,
    service,
    latencyMs: dependency.latencyMs,
    ...(dependency.status === "ok" ? {} : { message: "Dependency unavailable", errorCode: `${service.toUpperCase().replace(/-/g, "_")}_UNAVAILABLE` }),
  });
};

export const health: RequestHandler = (_request, response) => {
  response.setHeader("cache-control", "no-store");
  response.json({
    status: "ok",
    service: "backend",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

export const readiness: RequestHandler = async (_request, response) => {
  response.setHeader("cache-control", "no-store");
  const [database, redis, aiService] = await Promise.all([
    statusFor(checkDatabaseConnection),
    statusFor(checkRedisConnection),
    statusFor(checkAiService),
  ]);
  const dependencies = { database, redis, aiService };
  const ready = Object.values(dependencies).every((dependency) => dependency.status === "ok");
  response.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "degraded",
    service: "backend",
    dependencies,
    timestamp: new Date().toISOString(),
  });
};

export const schedulerHealth: RequestHandler = async (_request, response) => {
  response.setHeader("cache-control", "no-store");
  try {
    const redis = await connectRedis();
    const heartbeat = await redis.get(SCHEDULER_HEARTBEAT_KEY);
    if (!heartbeat) throw new Error("Scheduler heartbeat is missing");
    const ageMs = Date.now() - Date.parse(heartbeat);
    if (!Number.isFinite(ageMs) || ageMs > 90_000) throw new Error("Scheduler heartbeat is stale");
    response.json({ status: "ok", service: "scheduler", heartbeat, ageMs });
  } catch {
    response.status(503).json({
      status: "degraded",
      service: "scheduler",
      message: "Scheduler heartbeat unavailable",
      errorCode: "SCHEDULER_UNAVAILABLE",
    });
  }
};

export const databaseHealth = dependencyCheck("database", checkDatabaseConnection);
export const redisHealth = dependencyCheck("redis", checkRedisConnection);
export const aiServiceHealth = dependencyCheck("ai-service", checkAiService);
