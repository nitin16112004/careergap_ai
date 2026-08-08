import type { RequestHandler } from "express";
import { checkDatabaseConnection } from "../database/client";
import { checkRedisConnection } from "../config/redis";
import { getEnv } from "../config/env";

const dependencyCheck = (service: string, check: () => Promise<void>): RequestHandler => async (_request, response) => {
  try {
    await check();
    response.json({ status: "ok", service });
  } catch (error) {
    response.status(503).json({
      status: "degraded",
      service,
      message: "Dependency unavailable",
      errorCode: `${service.toUpperCase()}_UNAVAILABLE`,
    });
    void error;
  }
};

export const health: RequestHandler = (_request, response) => {
  response.json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString(),
  });
};

export const databaseHealth = dependencyCheck("database", checkDatabaseConnection);
export const redisHealth = dependencyCheck("redis", checkRedisConnection);

export const aiServiceHealth: RequestHandler = async (_request, response) => {
  try {
    const result = await fetch(`${getEnv().AI_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(1_000),
    });
    if (!result.ok) throw new Error(`AI service returned ${result.status}`);
    response.json({ status: "ok", service: "ai-service" });
  } catch (error) {
    response.status(503).json({
      status: "degraded",
      service: "ai-service",
      message: "Dependency unavailable",
      errorCode: "AI_SERVICE_UNAVAILABLE",
    });
    void error;
  }
};
