import { z } from "zod";

export const roadmapGenerateSchema = z.object({
    body: z.object({
        skillAnalysisId: z.string().uuid().nullable().optional(),
        roleId: z.string().uuid().nullable().optional(),
        roleName: z.string().trim().min(1).max(200).optional(),
        targetRole: z.string().trim().min(1).max(200).optional(),
        durationWeeks: z.coerce.number().int().min(1).max(24).optional(),
        generationMode: z.enum(["basic_template", "rag"]).default("basic_template"),
    }).refine((value) => Boolean(value.skillAnalysisId || value.roleId || value.roleName || value.targetRole), {
        message: "Provide a target role or skill analysis to generate a roadmap.",
        path: ["roleName"],
    }),
    query: z.record(z.unknown()).default({}),
    params: z.object({}).default({}),
});

export const roadmapJobIdSchema = z.object({
    body: z.record(z.unknown()).default({}),
    query: z.record(z.unknown()).default({}),
    params: z.object({ jobId: z.string().uuid("A valid AI roadmap job id is required") }),
});

export const roadmapIdSchema = z.object({
    body: z.record(z.unknown()).default({}),
    query: z.record(z.unknown()).default({}),
    params: z.object({ roadmapId: z.string().uuid("A valid roadmap id is required") }),
});

export const roadmapUpdateSchema = z.object({
    body: z.object({
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().min(1).max(4000).optional(),
        durationWeeks: z.coerce.number().int().min(1).max(24).optional(),
        isActive: z.boolean().optional(),
        progressPercentage: z.coerce.number().int().min(0).max(100).optional(),
    }).refine((value) => Object.keys(value).length > 0, { message: "At least one roadmap field is required." }),
    query: z.record(z.unknown()).default({}),
    params: z.object({ roadmapId: z.string().uuid("A valid roadmap id is required") }),
});

export const roadmapTaskUpdateSchema = z.object({
    body: z.object({
        status: z.enum(["pending", "completed", "skipped", "overdue"]).optional(),
    }).refine((value) => Object.keys(value).length > 0, {
        message: "Provide a valid task status update.",
    }),
    query: z.record(z.unknown()).default({}),
    params: z.object({
        roadmapId: z.string().uuid("A valid roadmap id is required"),
        taskId: z.string().uuid("A valid task id is required"),
    }),
});

export const roadmapTaskCompletionSchema = z.object({
    body: z.record(z.unknown()).default({}),
    query: z.record(z.unknown()).default({}),
    params: z.object({
        roadmapId: z.string().uuid("A valid roadmap id is required"),
        taskId: z.string().uuid("A valid task id is required"),
    }),
});
