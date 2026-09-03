import { z } from "zod";

const resumeId = z.string().uuid("A valid resume id is required");

export const resumeIdParamsSchema = z.object({
  body: z.record(z.unknown()).default({}),
  query: z.record(z.unknown()).default({}),
  params: z.object({ resumeId }),
});

export const resumePatchSchema = z.object({
  body: z.object({
    extractedData: z.record(z.unknown()).optional(),
    extractedText: z.string().max(200_000).optional(),
    extractedSkills: z.array(z.string().trim().min(1).max(80)).max(200).optional(),
  }).refine((value) => Object.keys(value).length > 0, "At least one resume field is required"),
  query: z.record(z.unknown()).default({}),
  params: z.object({ resumeId }),
});
