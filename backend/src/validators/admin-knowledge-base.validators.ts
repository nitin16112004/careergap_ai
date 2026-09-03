import { z } from "zod";

export const knowledgeBaseReindexSchema = z.object({
  body: z.object({
    force: z.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }).default({}),
  query: z.record(z.unknown()).default({}),
  params: z.object({}).default({}),
});
