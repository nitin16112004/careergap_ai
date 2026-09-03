import { connectRedis } from "../config/redis";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { getSupabaseStorageClient } from "../config/supabase";

const activityKey = (userId: string): string => `activity-touch:${userId}`;

export const activityService = {
  async touch(userId: string): Promise<void> {
    try {
      const redis = await connectRedis();
      const acquired = await redis.set(activityKey(userId), "1", {
        NX: true,
        EX: getEnv().ACTIVITY_TOUCH_INTERVAL_SECONDS,
      });
      if (acquired !== "OK") return;

      const { error } = await getSupabaseStorageClient()
        .from("profiles")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) {
        logger.warn({ userId }, "unable to persist user activity timestamp");
      }
    } catch (error) {
      // Activity tracking is intentionally fail-open. A temporary Redis/DB issue
      // must never block an otherwise valid authenticated API request.
      logger.warn({ err: error, userId }, "user activity tracking skipped");
    }
  },
};
