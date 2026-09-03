import { createClient } from "redis";
import { getEnv } from "./env";
import { logger } from "./logger";

type RedisClient = ReturnType<typeof createClient>;
let client: RedisClient | undefined;
let connectionPromise: Promise<RedisClient> | undefined;

const reconnectStrategy = (retries: number): number | Error => {
  if (retries > 12) return new Error("Redis reconnect attempts exhausted");
  return Math.min(250 * 2 ** Math.min(retries, 5), 5_000);
};

export const getRedisClient = (): RedisClient => {
  if (!client) {
    client = createClient({
      url: getEnv().REDIS_URL,
      socket: {
        connectTimeout: getEnv().REDIS_CONNECT_TIMEOUT_MS,
        keepAlive: true,
        reconnectStrategy,
      },
    });
    client.on("error", (error) => {
      logger.error({ err: error }, "redis client error");
    });
    client.on("reconnecting", () => {
      logger.warn("redis reconnecting");
    });
    client.on("ready", () => {
      logger.info("redis ready");
    });
  }
  return client;
};

export const connectRedis = async (): Promise<RedisClient> => {
  const redis = getRedisClient();
  if (redis.isReady) return redis;
  if (!connectionPromise) {
    connectionPromise = redis.connect().then(() => redis).finally(() => {
      connectionPromise = undefined;
    });
  }
  return connectionPromise;
};

export const checkRedisConnection = async (): Promise<void> => {
  const redis = await connectRedis();
  const response = await redis.ping();
  if (response !== "PONG") throw new Error("Redis ping failed");
};

export const disconnectRedis = async (): Promise<void> => {
  if (client?.isOpen) await client.quit();
  client = undefined;
  connectionPromise = undefined;
};

export const getBullMqConnection = () => {
  const redisUrl = new URL(getEnv().REDIS_URL);
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    connectTimeout: getEnv().REDIS_CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
  };
};
