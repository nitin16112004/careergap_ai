import { z } from "zod";

const emptyBody = z.record(z.unknown()).default({});
const emptyQuery = z.record(z.unknown()).default({});
const emptyParams = z.record(z.unknown()).default({});

export const roleIdSchema = z.object({
  body: emptyBody,
  query: emptyQuery,
  params: z.object({ roleId: z.string().uuid() }),
});

export const analysisIdSchema = z.object({
  body: emptyBody,
  query: emptyQuery,
  params: z.object({ analysisId: z.string().uuid() }),
});

export const analyzeSkillGapSchema = z.object({
  body: z.object({
    roleId: z.string().uuid(),
    resumeId: z.string().uuid().optional(),
  }),
  query: emptyQuery,
  params: emptyParams,
});
