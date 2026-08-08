import { Router } from "express";
import { aiServiceHealth, databaseHealth, health, redisHealth } from "../controllers/health.controller";

export const healthRoutes = Router();
healthRoutes.get("/health", health);
healthRoutes.get("/health/db", databaseHealth);
healthRoutes.get("/health/redis", redisHealth);
healthRoutes.get("/health/ai-service", aiServiceHealth);
