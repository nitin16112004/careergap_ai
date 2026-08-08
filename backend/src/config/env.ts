import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  FRONTEND_URL: z.string().url(),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_URL: z.string().url(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  LOGIN_RATE_LIMIT_PER_IP: z.coerce.number().int().positive().default(20),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export const getEnv = (): Env => {
  if (!cachedEnv) cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
};

export const resetEnvForTests = (): void => {
  cachedEnv = undefined;
};
