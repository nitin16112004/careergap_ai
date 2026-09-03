import type { RequestHandler } from "express";
import { checkDatabaseConnection } from "../database/client";
import { checkRedisConnection } from "../config/redis";
import { getEnv } from "../config/env";

type DependencyName = "database" | "redis" | "ai-service";
type DependencyStatus = {
  status: "ok" | "degraded";
  latencyMs: number;
};

const withTimeout = async (check: () => Promise<void>): Promise<void> => {
  const timeoutMs = getEnv().HEALTHCHECK_TIMEOUT_MS;
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      check(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("Health check timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const checkAiService = async (): Promise<void> => {
  const baseUrl = getEnv().AI_SERVICE_URL.replace(/\/$/, "");
  const result = await fetch(`${baseUrl}/health`, {
    signal: AbortSignal.timeout(getEnv().HEALTHCHECK_TIMEOUT_MS),
  });
  if (!result.ok) throw new Error(`AI service returned ${result.status}`);
};

const measure = async (check: () => Promise<void>): Promise<DependencyStatus> => {
  const startedAt = performance.now();
  try {
    await withTimeout(check);
    return { status: "ok", latencyMs: Math.round(performance.now() - startedAt) };
  } catch {
    return { status: "degraded", latencyMs: Math.round(performance.now() - startedAt) };
  }
};

const checks: Record<DependencyName, () => Promise<void>> = {
  database: checkDatabaseConnection,
  redis: checkRedisConnection,
  "ai-service": checkAiService,
};

const dependencyCheck = (service: DependencyName): RequestHandler => async (request, response) => {
  const result = await measure(checks[service]);
  if (result.status === "ok") {
    response.json({ status: "ok", service, latencyMs: result.latencyMs });
    return;
  }

  request.log?.warn({ service, latencyMs: result.latencyMs }, "dependency health check failed");
  response.status(503).json({
    status: "degraded",
    service,
    latencyMs: result.latencyMs,
    message: "Dependency unavailable",
    errorCode: `${service.toUpperCase().replace(/-/g, "_")}_UNAVAILABLE`,
  });
};

export const health: RequestHandler = (_request, response) => {
  response.json({
    status: "ok",
    service: "backend",
    check: "liveness",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

export const readiness: RequestHandler = async (request, response) => {
  const [database, redis, aiService] = await Promise.all([
    measure(checkDatabaseConnection),
    measure(checkRedisConnection),
    measure(checkAiService),
  ]);
  const dependencies = { database, redis, "ai-service": aiService };
  const ready = Object.values(dependencies).every((dependency) => dependency.status === "ok");

  if (!ready) request.log?.warn({ dependencies }, "service readiness check degraded");
  response.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "degraded",
    service: "backend",
    check: "readiness",
    dependencies,
    timestamp: new Date().toISOString(),
  });
};

export const databaseHealth = dependencyCheck("database");
export const redisHealth = dependencyCheck("redis");
export const aiServiceHealth = dependencyCheck("ai-service");
