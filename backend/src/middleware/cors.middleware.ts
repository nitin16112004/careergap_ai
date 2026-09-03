import cors from "cors";
import { getEnv } from "../config/env";
import { HttpError } from "../utils/http-error";

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, "");

export const allowedOrigins = (): string[] => {
  const env = getEnv();
  const configured = [
    env.FRONTEND_URL,
    ...env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
  ];

  if (env.NODE_ENV !== "production") {
    configured.push("http://localhost:5173", "http://localhost:5174");
  }

  return [...new Set(configured.map(normalizeOrigin))];
};

export const corsMiddleware = cors({
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 600,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins().includes(normalizeOrigin(origin))) return callback(null, true);
    return callback(new HttpError(403, "Origin is not allowed by CORS.", "CORS_ORIGIN_DENIED"));
  },
});
