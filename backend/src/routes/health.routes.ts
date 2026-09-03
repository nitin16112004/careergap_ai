import { Router } from "express";
import { aiServiceHealth, databaseHealth, health, readiness, redisHealth, schedulerHealth } from "../controllers/health.controller";

export const healthRoutes = Router();
healthRoutes.get("/health", health);
healthRoutes.get("/health/live", health);
healthRoutes.get("/health/ready", readiness);
healthRoutes.get("/health/db", databaseHealth);
healthRoutes.get("/health/redis", redisHealth);
healthRoutes.get("/health/ai-service", aiServiceHealth);
healthRoutes.get("/health/scheduler", schedulerHealth);
