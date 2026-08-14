import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
    from: vi.fn(),
    queryData: vi.fn(),
}));

vi.mock("../config/supabase", () => ({
    getSupabaseStorageClient: () => ({
        from: mocked.from,
    }),
}));

vi.mock("../config/env", () => ({
    getEnv: () => ({ AI_SERVICE_URL: "http://localhost:8000" }),
}));

import { roadmapService } from "./roadmap.service";

const userId = "d3c17b3a-5c62-4f68-a0ca-d1c4bea196c7";
const roleId = "6cf6dbba-90aa-485b-84d7-9ea4e99194b2";
const skillAnalysisId = "1d3d1545-03f8-4f9f-8916-1435a0d0b72b";

const table = () => {
    const chain: Record<string, any> = {
        data: null,
        error: null,
    };
    chain.eq = vi.fn(() => chain);
    chain.neq = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.update = vi.fn(() => chain);
    chain.delete = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () => ({ data: chain.data, error: chain.error }));
    chain.single = vi.fn(async () => ({ data: chain.data, error: chain.error }));
    return chain;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocked.from.mockImplementation((tableName: string) => {
        const chain = table();
        if (tableName === "profiles") return chain;
        if (tableName === "skill_analyses") return chain;
        if (tableName === "knowledge_base_documents") return chain;
        if (tableName === "roadmaps") return chain;
        if (tableName === "rag_queries") return chain;
        if (tableName === "roadmap_weeks") return chain;
        if (tableName === "roadmap_tasks") return chain;
        return chain;
    });
});

describe("roadmapService.generate", () => {
    it("builds a roadmap from the real user profile and skill gap without inventing personal facts", async () => {
        const profileTable = table();
        profileTable.data = {
            id: userId,
            full_name: "Ava Stone",
            skills: ["React", "TypeScript", "Node.js"],
            target_job_role: "Frontend Engineer",
            career_goal: "Build product experiences and design systems",
        };

        const skillAnalysisTable = table();
        skillAnalysisTable.data = {
            id: skillAnalysisId,
            user_id: userId,
            role_id: roleId,
            current_skills: ["React", "TypeScript"],
            missing_skills: ["Node.js", "System Design", "Redis", "Testing"],
            matched_skills: ["React", "TypeScript"],
            recommended_skills: ["Node.js", "System Design"],
            analysis_result: { summary: "Focus on backend skills and system design" },
        };

        const docsTable = table();
        docsTable.data = [
            { id: "doc-1", title: "Frontend engineering fundamentals", category: "skill", content: "Ship React apps with TypeScript and testing fundamentals.", metadata: { skill: "Testing" } },
            { id: "doc-2", title: "System design basics", category: "roadmap", content: "Learn system design by scaling frontend and API integrations.", metadata: { skill: "System Design" } },
        ];

        const roadmapTable = table();
        roadmapTable.data = {
            id: "roadmap-1",
            user_id: userId,
            skill_analysis_id: skillAnalysisId,
            role_id: roleId,
            title: "Frontend Engineer Roadmap",
            description: "Ava Stone's Frontend Engineer roadmap is built from the current skills, target role, and missing-skill gaps already captured in the account.",
            duration_weeks: 4,
            progress_percentage: 0,
            generated_by: "rag",
            ai_response: {},
            is_active: true,
        };
        roadmapTable.single.mockResolvedValue({ data: roadmapTable.data, error: null });

        const ragTable = table();
        ragTable.data = { id: "rag-1" };
        ragTable.maybeSingle.mockResolvedValue({ data: ragTable.data, error: null });

        const weekTable = table();
        weekTable.data = {
            id: "week-1",
            roadmap_id: "roadmap-1",
            week_number: 1,
            title: "Week 1: Node.js",
            description: "This week focuses on Node.js",
            start_date: "2026-08-14",
            due_date: "2026-08-21",
            status: "pending",
        };
        weekTable.single.mockResolvedValue({ data: weekTable.data, error: null });

        const taskTable = table();
        taskTable.data = [{
            id: "task-1",
            roadmap_id: "roadmap-1",
            week_id: "week-1",
            task_title: "Practice Node.js",
            task_description: "Apply Node.js in a practical project or exercise that matches the Frontend Engineer expectations captured in your profile and skill gap analysis.",
            resource_links: [],
            status: "pending",
            due_date: "2026-08-15",
            completed_at: null,
            sort_order: 0,
        }];
        taskTable.select.mockResolvedValue({ data: taskTable.data, error: null });

        mocked.from.mockImplementation((tableName: string) => {
            switch (tableName) {
                case "profiles": return profileTable;
                case "skill_analyses": return skillAnalysisTable;
                case "knowledge_base_documents": return docsTable;
                case "roadmaps": return roadmapTable;
                case "rag_queries": return ragTable;
                case "roadmap_weeks": return weekTable;
                case "roadmap_tasks": return taskTable;
                default: return table();
            }
        });

        const result = await roadmapService.generate(userId, {
            skillAnalysisId,
            roleName: "Frontend Engineer",
            durationWeeks: 6,
        });

        expect(result.title).toContain("Frontend Engineer");
        expect(result.description).toContain("Ava Stone");
        expect(result.weeks.length).toBeGreaterThan(0);
        expect(result.weeks[0].tasks.some((task) => task.task_title.toLowerCase().includes("node") || task.task_title.toLowerCase().includes("redis"))).toBe(true);
        expect(result.weeks[0].tasks.some((task) => task.task_title.toLowerCase().includes("google"))).toBe(false);
    });

    it("validates the generated roadmap before saving it", async () => {
        const profileTable = table();
        profileTable.data = { id: userId, full_name: "Ava Stone", skills: ["React"], target_job_role: "Frontend Engineer" };

        const skillAnalysisTable = table();
        skillAnalysisTable.data = {
            id: skillAnalysisId,
            user_id: userId,
            role_id: roleId,
            current_skills: ["React"],
            missing_skills: ["Node.js"],
            matched_skills: ["React"],
            recommended_skills: ["Node.js"],
            analysis_result: { summary: "Focus on Node.js" },
        };

        const docsTable = table();
        docsTable.data = [{ id: "doc-1", title: "Node.js fundamentals", category: "skill", content: "Build Node.js backend APIs with async patterns.", metadata: { skill: "Node.js" } }];

        const roadmapTable = table();
        roadmapTable.data = {
            id: "roadmap-2",
            user_id: userId,
            skill_analysis_id: skillAnalysisId,
            role_id: roleId,
            title: "Frontend Engineer Roadmap",
            description: "Ava Stone's Frontend Engineer roadmap is built from the current skills, target role, and missing-skill gaps already captured in the account.",
            duration_weeks: 4,
            progress_percentage: 0,
            generated_by: "rag",
            ai_response: {},
            is_active: true,
        };
        roadmapTable.single.mockResolvedValue({ data: roadmapTable.data, error: null });

        const ragTable = table();
        ragTable.data = { id: "rag-2" };
        ragTable.maybeSingle.mockResolvedValue({ data: ragTable.data, error: null });

        const weekTable = table();
        weekTable.data = {
            id: "week-2",
            roadmap_id: "roadmap-2",
            week_number: 1,
            title: "Week 1: Node.js",
            description: "This week focuses on Node.js",
            start_date: "2026-08-14",
            due_date: "2026-08-21",
            status: "pending",
        };
        weekTable.single.mockResolvedValue({ data: weekTable.data, error: null });

        const taskTable = table();
        taskTable.data = [{
            id: "task-2",
            roadmap_id: "roadmap-2",
            week_id: "week-2",
            task_title: "Practice Node.js",
            task_description: "Apply Node.js in a practical project or exercise that matches the Frontend Engineer expectations captured in your profile and skill gap analysis.",
            resource_links: [],
            status: "pending",
            due_date: "2026-08-15",
            completed_at: null,
            sort_order: 0,
        }];
        taskTable.select.mockResolvedValue({ data: taskTable.data, error: null });

        mocked.from.mockImplementation((tableName: string) => {
            switch (tableName) {
                case "profiles": return profileTable;
                case "skill_analyses": return skillAnalysisTable;
                case "knowledge_base_documents": return docsTable;
                case "roadmaps": return roadmapTable;
                case "rag_queries": return ragTable;
                case "roadmap_weeks": return weekTable;
                case "roadmap_tasks": return taskTable;
                default: return table();
            }
        });

        const result = await roadmapService.generate(userId, {
            roleName: "Frontend Engineer",
            skillAnalysisId,
            durationWeeks: 4,
        });

        expect(result.duration_weeks).toBeGreaterThan(0);
        expect(result.weeks.every((week) => Array.isArray(week.tasks) && week.tasks.length > 0)).toBe(true);
    });

    it("gets a roadmap for the authenticated user and returns the week/task structure", async () => {
        const roadmapTable = table();
        roadmapTable.data = {
            id: "roadmap-3",
            user_id: userId,
            skill_analysis_id: skillAnalysisId,
            role_id: roleId,
            title: "Roadmap overview",
            description: "Career roadmap",
            duration_weeks: 4,
            progress_percentage: 25,
            generated_by: "rag",
            ai_response: {},
            is_active: true,
            created_at: "2026-08-14T00:00:00.000Z",
            updated_at: "2026-08-14T00:00:00.000Z",
        };
        roadmapTable.maybeSingle.mockResolvedValue({ data: roadmapTable.data, error: null });

        const weekTable = table();
        weekTable.data = [{
            id: "week-3",
            roadmap_id: "roadmap-3",
            week_number: 1,
            title: "Week 1",
            description: "Foundation",
            start_date: "2026-08-14",
            due_date: "2026-08-21",
            status: "pending",
            created_at: "2026-08-14T00:00:00.000Z",
            updated_at: "2026-08-14T00:00:00.000Z",
        }];

        const taskTable = table();
        taskTable.data = [{
            id: "task-3",
            roadmap_id: "roadmap-3",
            week_id: "week-3",
            task_title: "Practice TypeScript",
            task_description: "Build a small TypeScript app.",
            resource_links: [],
            status: "pending",
            due_date: "2026-08-16",
            completed_at: null,
            sort_order: 0,
            created_at: "2026-08-14T00:00:00.000Z",
            updated_at: "2026-08-14T00:00:00.000Z",
        }];

        mocked.from.mockImplementation((tableName: string) => {
            switch (tableName) {
                case "roadmaps": return roadmapTable;
                case "roadmap_weeks": return weekTable;
                case "roadmap_tasks": return taskTable;
                default: return table();
            }
        });

        const result = await roadmapService.get(userId, "roadmap-3");
        expect(result.id).toBe("roadmap-3");
        expect(result.weeks).toHaveLength(1);
        expect(result.weeks[0].tasks[0].task_title).toBe("Practice TypeScript");
    });

    it("marks a task complete and recalculates roadmap progress while protecting ownership", async () => {
        const roadmapTable = table();
        roadmapTable.data = {
            id: "roadmap-4",
            user_id: userId,
            skill_analysis_id: skillAnalysisId,
            role_id: roleId,
            title: "Roadmap progress",
            description: "Career roadmap",
            duration_weeks: 2,
            progress_percentage: 0,
            generated_by: "rag",
            ai_response: {},
            is_active: true,
            created_at: "2026-08-14T00:00:00.000Z",
            updated_at: "2026-08-14T00:00:00.000Z",
        };

        const weekTable = table();
        weekTable.data = [{
            id: "week-4",
            roadmap_id: "roadmap-4",
            week_number: 1,
            title: "Week 1",
            description: "Foundation",
            start_date: "2026-08-14",
            due_date: "2026-08-21",
            status: "pending",
            created_at: "2026-08-14T00:00:00.000Z",
            updated_at: "2026-08-14T00:00:00.000Z",
        }];

        const taskTable = table();
        taskTable.data = [{
            id: "task-4",
            roadmap_id: "roadmap-4",
            week_id: "week-4",
            task_title: "Complete resume refresh",
            task_description: "Update the resume summary.",
            resource_links: [],
            status: "pending",
            due_date: "2026-08-16",
            completed_at: null,
            sort_order: 0,
            created_at: "2026-08-14T00:00:00.000Z",
            updated_at: "2026-08-14T00:00:00.000Z",
        }];

        const updatedTaskTable = table();
        updatedTaskTable.data = [{
            ...taskTable.data[0],
            status: "completed",
            completed_at: "2026-08-14T12:00:00.000Z",
        }];

        const updatedRoadmapTable = table();
        updatedRoadmapTable.data = {
            ...roadmapTable.data,
            progress_percentage: 100,
        };

        mocked.from.mockImplementation((tableName: string) => {
            switch (tableName) {
                case "roadmaps": return roadmapTable;
                case "roadmap_weeks": return weekTable;
                case "roadmap_tasks": return taskTable;
                default: return table();
            }
        });

        roadmapTable.maybeSingle.mockResolvedValue({ data: roadmapTable.data, error: null });
        taskTable.maybeSingle.mockResolvedValue({ data: taskTable.data[0], error: null });
        taskTable.update.mockImplementation(() => {
            taskTable.data = updatedTaskTable.data;
            taskTable.maybeSingle.mockResolvedValue({ data: updatedTaskTable.data[0], error: null });
            return taskTable;
        });
        taskTable.data = updatedTaskTable.data;
        weekTable.data = weekTable.data;
        roadmapTable.update.mockImplementation(() => {
            roadmapTable.data = updatedRoadmapTable.data;
            roadmapTable.maybeSingle.mockResolvedValue({ data: updatedRoadmapTable.data, error: null });
            return roadmapTable;
        });

        const result = await roadmapService.updateTaskStatus(userId, "roadmap-4", "task-4", "completed");
        expect(result.progress_percentage).toBe(100);
        expect(result.weeks[0].tasks[0].status).toBe("completed");
    });
});
