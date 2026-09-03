import { connectRedis } from "../config/redis";

const namespaced = (key: string): string => `careerguid:cache:${key}`;

export const cacheService = {
  async get(key: string): Promise<string | null> {
    try {
      const redis = await connectRedis();
      return await redis.get(namespaced(key));
    } catch {
      return null;
    }
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      const redis = await connectRedis();
      if (ttlSeconds) await redis.set(namespaced(key), value, { EX: ttlSeconds });
      else await redis.set(namespaced(key), value);
    } catch {
      // Cache is an optimization; database-backed product flows remain available.
    }
  },

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      await this.delete(key);
      return null;
    }
  },

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), Math.max(1, ttlSeconds));
  },

  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;
    const value = await loader();
    await this.setJson(key, value, ttlSeconds);
    return value;
  },

  async delete(key: string): Promise<void> {
    try {
      const redis = await connectRedis();
      await redis.del(namespaced(key));
    } catch {
      // Best-effort invalidation only.
    }
  },
};
