import { z } from "zod";

export const notificationIdSchema = z.object({
  body: z.unknown().optional(),
  query: z.object({}).passthrough(),
  params: z.object({ notificationId: z.string().uuid() }),
});
