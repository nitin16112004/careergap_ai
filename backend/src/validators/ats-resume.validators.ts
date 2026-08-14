import { z } from "zod";

const resumeId = z.string().uuid("A valid resume id is required");

export const atsAnalyzeSchema = z.object({
  body: z.object({
    resumeId: resumeId.optional(),
    targetRole: z.string().trim().min(2, "Please pick a target role").max(200),
    jobDescription: z.string().max(30_000).optional(),
  }),
  query: z.record(z.unknown()).default({}),
  params: z.object({}),
});

export const atsGenerateSchema = z.object({
  body: z.object({
    resumeId: resumeId.optional(),
    targetRole: z.string().trim().min(2, "Please pick a target role").max(200),
    jobDescription: z.string().max(30_000).optional(),
    versionName: z.string().trim().min(1).max(80).optional(),
  }),
  query: z.record(z.unknown()).default({}),
  params: z.object({}),
});

export const atsGeneratedIdSchema = z.object({
  body: z.record(z.unknown()).default({}),
  query: z.record(z.unknown()).default({}),
  params: z.object({ generatedResumeId: z.string().uuid("A valid generated resume id is required") }),
});

export const atsUpdateSchema = z.object({
  body: z.object({
    targetRole: z.string().trim().min(2).max(200).optional(),
    versionName: z.string().trim().min(1).max(80).optional(),
    atsScore: z.number().min(0).max(100).optional(),
    atsKeywords: z.array(z.string().trim().min(1).max(80)).max(200).optional(),
    resumeContent: z.record(z.unknown()).optional(),
  }).refine((value) => Object.keys(value).length > 0, "At least one generated resume field is required"),
  query: z.record(z.unknown()).default({}),
  params: z.object({ generatedResumeId: z.string().uuid("A valid generated resume id is required") }),
});
