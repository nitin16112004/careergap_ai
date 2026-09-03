import { z } from "zod";

export const reminderPreferencesUpdateSchema = z.object({
  body: z.object({
    emailEnabled: z.boolean().optional(),
    weeklyPendingEnabled: z.boolean().optional(),
    inactiveEnabled: z.boolean().optional(),
    motivationalEnabled: z.boolean().optional(),
  }).refine((value) => Object.keys(value).length > 0, { message: "At least one reminder preference is required." }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const reminderUserLogsSchema = z.object({
  body: z.unknown().optional(),
  query: z.object({}).passthrough(),
  params: z.object({ userId: z.string().uuid() }),
});
