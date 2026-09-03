import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
    from: vi.fn(),
}));

vi.mock("../config/supabase", () => ({
    getSupabaseStorageClient: () => ({ from: mocked.from }),
}));

import { roadmapService } from "./roadmap.service";

const userId = "d3c17b3a-5c62-4f68-a0ca-d1c4bea196c7";
const roleId = "6cf6dbba-90aa-485b-84d7-9ea4e99194b2";
const skillAnalysisId = "1d3d1545-03f8-4f9f-8916-1435a0d0b72b";

const table = () => {
    const chain: Record<string, any> = { data: null, error: null };
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
    mocked.from.mockImplementation(() => table());
});

describe("roadmapService", () => {
    it("generates an honest basic-template roadmap from the user's skill analysis", async () => {
        const profileTable = table();
        profileTable.data = {
            id: userId,
            full_name: "Ava Stone",
            skills: ["React", "TypeScript"],
            target_job_role: "Frontend Engineer",
            career_goal: "Build product experiences and design systems",
        };

        const analysisTable = table();
        analysisTable.data = {
            id: skillAnalysisId,
            user_id: userId,
            role_id: roleId,
            current_skills: ["React", "TypeScript"],
            missing_skills: ["Node.js", "System Design", "Redis", "Testing"],
            matched_skills: ["React", "TypeScript"],
            recommended_skills: ["Node.js", "System Design"],
            analysis_result: { learning_order: ["Node.js", "System Design", "Redis", "Testing"] },
        };

        const docsTable = table();
        docsTable.data = [
            {
                id: "doc-1",
                title: "Node.js fundamentals",
                category: "skill",
                content: "Build Node.js APIs and practice testing.",
                source_url: "https://example.com/node",
            },
            {
                id: "doc-2",
                title: "System design basics",
                category: "roadmap",
                content: "Learn system design and Redis-backed caching patterns.",
                source_url: "https://example.com/system-design",
            },
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
            generated_by: "basic_template",
            ai_response: null,
            is_active: true,
        };
        roadmapTable.single.mockResolvedValue({ data: roadmapTable.data, error: null });

        const weekTable = table();
        weekTable.data = {
            id: "week-1",
            roadmap_id: "roadmap-1",
            week_number: 1,
            title: "Week 1: Node.js",
            description: "This week focuses on the most relevant skills.",
            start_date: "2026-09-03",
            due_date: "2026-09-10",
            status: "pending",
        };
        weekTable.single.mockResolvedValue({ data: weekTable.data, error: null });

        const taskTable = table();
        taskTable.select.mockResolvedValue({
            data: [{
                id: "task-1",
                roadmap_id: "roadmap-1",
                week_id: "week-1",
                task_title: "Practice Node.js",
                task_description: "Apply Node.js in a practical project.",
                resource_links: [],
                status: "pending",
                due_date: "2026-09-10",
                completed_at: null,
                sort_order: 0,
            }],
            error: null,
        });

        mocked.from.mockImplementation((tableName: string) => {
            switch (tableName) {
                case "profiles": return profileTable;
                case "skill_analyses": return analysisTable;
                case "knowledge_base_documents": return docsTable;
                case "roadmaps": return roadmapTable;
                case "roadmap_weeks": return weekTable;
                case "roadmap_tasks": return taskTable;
                default: return table();
            }
        });

        const result = await roadmapService.generate(userId, {
            skillAnalysisId,
            roleName: "Frontend Engineer",
        });

        expect(result.generated_by).toBe("basic_template");
        expect(result.title).toContain("Frontend Engineer");
        expect(result.description).toContain("Ava Stone");
        expect(result.weeks.length).toBeGreaterThan(0);
        expect(result.ai_response.generation_mode).toBe("basic_template");
        expect(result.ai_response.context_documents).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "doc-1" }),
        ]));
        expect(mocked.from).not.toHaveBeenCalledWith("rag_queries");
        expect(roadmapTable.insert).toHaveBeenCalledWith(expect.objectContaining({
            generated_by: "basic_template",
            skill_analysis_id: skillAnalysisId,
            role_id: roleId,
        }));
    });

    it("requires a real skill-gap analysis before roadmap generation", async () => {
        const profileTable = table();
        profileTable.data = {
            id: userId,
            full_name: "Ava Stone",
            skills: ["React"],
            target_job_role: "Frontend Engineer",
        };
        const analysisTable = table();
        analysisTable.data = null;

        mocked.from.mockImplementation((tableName: string) => {
            if (tableName === "profiles") return profileTable;
            if (tableName === "skill_analyses") return analysisTable;
            return table();
        });

        await expect(roadmapService.generate(userId, { roleName: "Frontend Engineer" }))
            .rejects.toMatchObject({ code: "ROADMAP_SKILL_ANALYSIS_REQUIRED", statusCode: 400 });
        expect(mocked.from).not.toHaveBeenCalledWith("knowledge_base_documents");
        expect(mocked.from).not.toHaveBeenCalledWith("rag_queries");
    });

    it("returns the authenticated user's roadmap with week and task structure", async () => {
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
            generated_by: "basic_template",
            ai_response: { generation_mode: "basic_template" },
            is_active: true,
        };
        roadmapTable.maybeSingle.mockResolvedValue({ data: roadmapTable.data, error: null });

        const weekTable = table();
        weekTable.data = [{
            id: "week-3",
            roadmap_id: "roadmap-3",
            week_number: 1,
            title: "Week 1",
            description: "Foundation",
            start_date: "2026-09-03",
            due_date: "2026-09-10",
            status: "pending",
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
            due_date: "2026-09-10",
            completed_at: null,
            sort_order: 0,
        }];

        mocked.from.mockImplementation((tableName: string) => {
            if (tableName === "roadmaps") return roadmapTable;
            if (tableName === "roadmap_weeks") return weekTable;
            if (tableName === "roadmap_tasks") return taskTable;
            return table();
        });

        const result = await roadmapService.get(userId, "roadmap-3");
        expect(result.id).toBe("roadmap-3");
        expect(result.generated_by).toBe("basic_template");
        expect(result.weeks).toHaveLength(1);
        expect(result.weeks[0].tasks[0].task_title).toBe("Practice TypeScript");
    });

    it("marks a task complete and recalculates progress while enforcing roadmap ownership", async () => {
        const roadmapTable = table();
        const roadmap = {
            id: "roadmap-4",
            user_id: userId,
            skill_analysis_id: skillAnalysisId,
            role_id: roleId,
            title: "Roadmap progress",
            description: "Career roadmap",
            duration_weeks: 2,
            progress_percentage: 0,
            generated_by: "basic_template",
            ai_response: { generation_mode: "basic_template" },
            is_active: true,
        };
        roadmapTable.data = roadmap;
        roadmapTable.maybeSingle.mockResolvedValue({ data: roadmap, error: null });

        const weekTable = table();
        weekTable.data = [{
            id: "week-4",
            roadmap_id: "roadmap-4",
            week_number: 1,
            title: "Week 1",
            description: "Foundation",
            start_date: "2026-09-03",
            due_date: "2026-09-10",
            status: "pending",
        }];

        const taskTable = table();
        const pendingTask = {
            id: "task-4",
            roadmap_id: "roadmap-4",
            week_id: "week-4",
            task_title: "Practice testing",
            task_description: "Add automated tests.",
            resource_links: [],
            status: "pending",
            due_date: "2026-09-10",
            completed_at: null,
            sort_order: 0,
        };
        const completedTask = { ...pendingTask, status: "completed", completed_at: "2026-09-03T12:00:00.000Z" };
        taskTable.data = [pendingTask];
        taskTable.maybeSingle.mockResolvedValue({ data: pendingTask, error: null });
        taskTable.update.mockImplementation(() => {
            taskTable.data = [completedTask];
            taskTable.maybeSingle.mockResolvedValue({ data: completedTask, error: null });
            return taskTable;
        });

        roadmapTable.update.mockImplementation(() => {
            const updated = { ...roadmap, progress_percentage: 100 };
            roadmapTable.data = updated;
            roadmapTable.maybeSingle.mockResolvedValue({ data: updated, error: null });
            return roadmapTable;
        });

        mocked.from.mockImplementation((tableName: string) => {
            if (tableName === "roadmaps") return roadmapTable;
            if (tableName === "roadmap_weeks") return weekTable;
            if (tableName === "roadmap_tasks") return taskTable;
            return table();
        });

        const result = await roadmapService.updateTaskStatus(userId, "roadmap-4", "task-4", "completed");
        expect(result.progress_percentage).toBe(100);
        expect(result.weeks[0].tasks[0].status).toBe("completed");
        expect(roadmapTable.eq).toHaveBeenCalledWith("user_id", userId);
    });
});
