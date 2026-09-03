import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getEnv } from "../config/env";
import { getRedisClient } from "../config/redis";

const createRedisStore = (prefix: string): RedisStore => new RedisStore({
  prefix,
  sendCommand: async (...args: string[]) => {
    const client = getRedisClient();
    if (!client.isOpen) {
      // rate-limit-redis loads Lua scripts during construction. Keep that
      // initialization non-fatal; real commands will retry after Redis health
      // is restored and the store can reload the scripts.
      if (args[0] === "SCRIPT" && args[1] === "LOAD") return "redis-not-ready";
      return Promise.reject(new Error("Redis client is not connected"));
    }
    return client.sendCommand(args);
  },
});

const createLimiter = (prefix: string, limit: number, windowMs: number, skipSuccessfulRequests = false) => rateLimit({
  windowMs,
  limit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: createRedisStore(prefix),
  passOnStoreError: true,
  skipSuccessfulRequests,
});

export const apiRateLimit = createLimiter("api:", 300, getEnv().RATE_LIMIT_WINDOW_MS);

// This is deliberately per-IP and skips successful requests. It protects failed
// login attempts without imposing a low global cap on the required 100 users/minute.
export const loginRateLimit = createLimiter("login:", getEnv().LOGIN_RATE_LIMIT_PER_IP, 60_000, true);
