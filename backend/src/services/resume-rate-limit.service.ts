import { createHash } from "node:crypto";
import { connectRedis } from "../config/redis";
import { HttpError } from "../utils/http-error";
import { RESUME_UPLOAD_LIMIT_PER_USER, RESUME_UPLOAD_WINDOW_SECONDS } from "../types/resume";

const keyFor = (userId: string): string => `resume-upload:${createHash("sha256").update(userId).digest("hex")}`;

export const assertResumeUploadAllowed = async (userId: string): Promise<void> => {
  try {
    const redis = await connectRedis();
    const count = await redis.incr(keyFor(userId));
    if (count === 1) await redis.expire(keyFor(userId), RESUME_UPLOAD_WINDOW_SECONDS);
    if (count > RESUME_UPLOAD_LIMIT_PER_USER) {
      throw new HttpError(429, "Resume upload limit reached. Please try again later.", "RESUME_UPLOAD_RATE_LIMITED");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    // Redis is an optional local dependency; the API remains usable during local
    // development while production deployments should monitor Redis health.
  }
};
