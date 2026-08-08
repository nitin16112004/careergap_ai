import cors from "cors";
import { getEnv } from "../config/env";

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, "");

export const allowedOrigins = (): string[] => {
  const configured = [getEnv().FRONTEND_URL];
  if (getEnv().NODE_ENV !== "production") {
    configured.push("http://localhost:5173", "http://localhost:5174");
  }
  return [...new Set(configured.map(normalizeOrigin))];
};

export const corsMiddleware = cors({
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
  origin: (origin, callback) => {
    if (!origin || allowedOrigins().includes(normalizeOrigin(origin))) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
});
