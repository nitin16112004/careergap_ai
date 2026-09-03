import { connectRedis } from "../config/redis";

export const cacheService = {
  async get(key: string): Promise<string | null> {
    const redis = await connectRedis();
    return redis.get(key);
  },
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const redis = await connectRedis();
    if (ttlSeconds) await redis.set(key, value, { EX: ttlSeconds });
    else await redis.set(key, value);
  },
  async delete(key: string): Promise<void> {
    const redis = await connectRedis();
    await redis.del(key);
  },
};
