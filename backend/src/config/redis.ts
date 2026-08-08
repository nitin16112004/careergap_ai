import { createClient } from "redis";
import { getEnv } from "./env";

type RedisClient = ReturnType<typeof createClient>;
let client: RedisClient | undefined;
let connectionPromise: Promise<RedisClient> | undefined;

export const getRedisClient = (): RedisClient => {
  if (!client) {
    client = createClient({
      url: getEnv().REDIS_URL,
      socket: { reconnectStrategy: false },
    });
    client.on("error", (error) => {
      console.error("Redis client error", { message: error.message });
    });
  }
  return client;
};

export const connectRedis = async (): Promise<RedisClient> => {
  const redis = getRedisClient();
  if (redis.isOpen) return redis;
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
};

export const getBullMqConnection = () => {
  const redisUrl = new URL(getEnv().REDIS_URL);
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
  };
};
