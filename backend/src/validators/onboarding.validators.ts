import { z } from "zod";

const text = z.string().trim().max(2_000);
const nullableText = text.nullish().transform((value) => value ?? null);

const projectSchema = z.object({
  name: z.string().trim().max(200).optional(),
  details: z.string().trim().max(2_000).optional(),
  description: z.string().trim().max(2_000).optional(),
}).passthrough();

export const onboardingProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().min(7).max(40),
    currentCity: nullableText,
    education: z.union([z.string(), z.array(z.unknown())]).optional(),
    workExperience: z.union([z.string(), z.array(z.unknown())]).optional(),
    skills: z.array(z.string().trim().min(1).max(100)).min(1).max(100),
    projects: z.array(projectSchema).max(50).default([]),
    linkedinUrl: z.string().trim().url().or(z.literal("")).optional(),
    githubUrl: z.string().trim().url().or(z.literal("")).optional(),
    portfolioUrl: z.string().trim().url().or(z.literal("")).optional(),
    targetJobRole: z.string().trim().min(2).max(160),
    preferredLocation: z.string().trim().min(2).max(160),
    workPreference: z.enum(["remote", "hybrid", "onsite"]),
    expectedSalary: nullableText,
    noticePeriod: nullableText,
    careerGoal: nullableText,
    resumeId: z.string().uuid().optional(),
    fieldSources: z.record(z.enum(["resume", "manual", "ai", "system"])).optional(),
  }),
  query: z.record(z.unknown()).default({}),
  params: z.record(z.unknown()).default({}),
});

export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>["body"];
