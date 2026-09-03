import { z } from "zod";

export const adminKnowledgeUpdateSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    category: z.string().trim().min(2).max(120).optional(),
    content: z.string().trim().min(20).max(200000).optional(),
    sourceUrl: z.string().url().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().optional(),
  }).refine((value) => Object.keys(value).length > 0, "At least one document field is required."),
});
