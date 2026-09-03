import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  FRONTEND_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().default(""),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(180_000).default(90_000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_URL: z.string().url(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  LOGIN_RATE_LIMIT_PER_IP: z.coerce.number().int().positive().default(20),
  HEALTHCHECK_TIMEOUT_MS: z.coerce.number().int().min(250).max(10_000).default(2_000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(5_000),
  EMAIL_PROVIDER: z.enum(["resend", "console"]).default("console"),
  EMAIL_PROVIDER_BASE_URL: z.string().url().default("https://api.resend.com"),
  EMAIL_PROVIDER_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default(""),
  REMINDER_CRON_PATTERN: z.string().min(1).default("0 0 9 * * 1"),
  REMINDER_CRON_TIMEZONE: z.string().min(1).default("UTC"),
  REMINDER_INACTIVE_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  REMINDER_SCAN_BATCH_SIZE: z.coerce.number().int().min(1).max(2_000).default(500),
  REMINDER_EMAIL_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  ACTIVITY_TOUCH_INTERVAL_SECONDS: z.coerce.number().int().min(30).max(3_600).default(300),

  BILLING_DEFAULT_PROVIDER: z.enum(["razorpay", "stripe"]).default("razorpay"),
  BILLING_WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().min(60).max(3_600).default(300),
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().default(""),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().default(""),
  STRIPE_PREMIUM_MONTHLY_PRICE_ID: z.string().default(""),
  STRIPE_PREMIUM_YEARLY_PRICE_ID: z.string().default(""),
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
