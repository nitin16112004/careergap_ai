import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

const jobRoleBody = z.object({
  roleName: z.string().trim().min(2).max(120),
  roleSlug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  roleDescription: optionalText(2000),
  category: optionalText(120),
  isActive: z.boolean().optional(),
});

export const adminCreateJobRoleSchema = z.object({ body: jobRoleBody });
export const adminUpdateJobRoleSchema = z.object({ body: jobRoleBody.partial().refine((value) => Object.keys(value).length > 0, "At least one job-role field is required.") });

const skillBody = z.object({
  skillName: z.string().trim().min(1).max(120),
  normalizedName: z.string().trim().min(1).max(120).regex(/^[a-z0-9+#.\-]+$/i),
  category: optionalText(120),
  description: optionalText(2000),
});

export const adminCreateSkillSchema = z.object({ body: skillBody });
export const adminUpdateSkillSchema = z.object({ body: skillBody.partial().refine((value) => Object.keys(value).length > 0, "At least one skill field is required.") });

export const adminRoleSkillSchema = z.object({
  body: z.object({
    skillId: z.string().uuid(),
    priority: z.enum(["must_have", "good_to_have", "optional"]),
    skillLevel: z.enum(["beginner", "intermediate", "advanced"]).nullable().optional(),
    weight: z.number().int().min(1).max(10).optional(),
  }),
});

export const adminKnowledgeBaseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    category: z.string().trim().min(2).max(120),
    content: z.string().trim().min(20).max(200000),
    sourceUrl: z.string().url().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});
