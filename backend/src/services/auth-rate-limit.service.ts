import { createHash } from "node:crypto";
import { connectRedis, getRedisClient } from "../config/redis";
import { HttpError } from "../utils/http-error";

const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_FAILURE_WINDOW_SECONDS = 60;
const VERIFICATION_RESEND_LIMIT = 3;
const VERIFICATION_RESEND_WINDOW_SECONDS = 10 * 60;
const PASSWORD_RESET_LIMIT = 3;
const PASSWORD_RESET_WINDOW_SECONDS = 15 * 60;

const digest = (value: string): string => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

const redisCounters = async (keys: string[], windowSeconds: number): Promise<number[]> => {
  try {
    const redis = await connectRedis();
    const values = await Promise.all(keys.map((key) => redis.incr(key)));
    await Promise.all(values.map((value, index) => value === 1 ? redis.expire(keys[index], windowSeconds) : Promise.resolve(true)));
    return values;
  } catch {
    // Redis is an availability dependency. If it is unavailable, Supabase
    // Auth remains usable and the health endpoint reports the degraded state.
    return keys.map(() => 0);
  }
};

const readCounters = async (keys: string[]): Promise<number[]> => {
  try {
    const redis = getRedisClient();
    if (!redis.isOpen) return keys.map(() => 0);
    const values = await Promise.all(keys.map((key) => redis.get(key)));
    return values.map((value) => Number(value ?? 0));
  } catch {
    return keys.map(() => 0);
  }
};

const keyPair = (prefix: string, email: string, ip: string): string[] => [
  `auth:${prefix}:email-ip:${digest(`${email}:${ip}`)}`,
  `auth:${prefix}:ip:${digest(ip)}`,
];

export const authRateLimitService = {
  async assertLoginAllowed(email: string, ip: string): Promise<void> {
    const counts = await readCounters(keyPair("login-fail", email, ip));
    if (counts.some((count) => count >= LOGIN_FAILURE_LIMIT)) {
      throw new HttpError(429, "Too many failed login attempts. Please wait 1 minute and try again.", "AUTH_LOGIN_RATE_LIMITED");
    }
  },

  async recordLoginFailure(email: string, ip: string): Promise<void> {
    await redisCounters(keyPair("login-fail", email, ip), LOGIN_FAILURE_WINDOW_SECONDS);
  },

  async clearLoginFailures(email: string, ip: string): Promise<void> {
    try {
      const redis = getRedisClient();
      if (redis.isOpen) await redis.del(keyPair("login-fail", email, ip));
    } catch {
      // Best effort only; a successful login is never blocked by Redis cleanup.
    }
  },

  async assertVerificationResendAllowed(email: string, ip: string): Promise<void> {
    const counts = await redisCounters(keyPair("verification-resend", email, ip), VERIFICATION_RESEND_WINDOW_SECONDS);
    if (counts.some((count) => count > VERIFICATION_RESEND_LIMIT)) {
      throw new HttpError(429, "Too many verification requests. Please try again later.", "AUTH_VERIFICATION_RATE_LIMITED");
    }
  },

  async assertPasswordResetAllowed(email: string, ip: string): Promise<void> {
    const counts = await redisCounters(keyPair("password-reset", email, ip), PASSWORD_RESET_WINDOW_SECONDS);
    if (counts.some((count) => count > PASSWORD_RESET_LIMIT)) {
      throw new HttpError(429, "Too many password reset requests. Please try again later.", "AUTH_RESET_RATE_LIMITED");
    }
  },
};
