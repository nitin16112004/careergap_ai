import { z } from "zod";

export const roleIdSchema = z.object({
  params: z.object({ roleId: z.string().uuid() }),
});

export const analysisIdSchema = z.object({
  params: z.object({ analysisId: z.string().uuid() }),
});

export const analyzeSkillGapSchema = z.object({
  body: z.object({
    roleId: z.string().uuid(),
    resumeId: z.string().uuid().optional(),
  }),
});
