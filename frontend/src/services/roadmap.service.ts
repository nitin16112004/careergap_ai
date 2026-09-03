import { apiRequest } from "./api";
import type { RoadmapRecord } from "../types/roadmap";

export interface RoadmapTaskCompletionResult {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    duration_weeks: number | null;
    progress_percentage: number;
    generated_by: string;
    ai_response: Record<string, unknown>;
    is_active: boolean;
    weeks: Array<{
        id: string;
        roadmap_id: string;
        week_number: number;
        title: string;
        description: string | null;
        start_date: string | null;
        due_date: string | null;
        status: string;
        tasks: Array<{
            id: string;
            roadmap_id: string;
            week_id: string;
            task_title: string;
            task_description: string | null;
            resource_links: Array<{ label: string; url: string }>;
            status: string;
            due_date: string | null;
            completed_at: string | null;
            sort_order: number;
        }>;
    }>;
}

export interface RoadmapGenerationInput {
    skillAnalysisId?: string;
    roleId?: string;
    roleName?: string;
    targetRole?: string;
    durationWeeks?: number;
}

export const roadmapService = {
    async generate(input: RoadmapGenerationInput): Promise<RoadmapRecord> {
        return apiRequest<RoadmapRecord>("/roadmap/generate", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },

    async list(): Promise<RoadmapRecord[]> {
        return apiRequest<RoadmapRecord[]>("/roadmap");
    },

    async get(roadmapId: string): Promise<RoadmapRecord> {
        return apiRequest<RoadmapRecord>(`/roadmap/${roadmapId}`);
    },

    async updateTaskStatus(roadmapId: string, taskId: string, status: "pending" | "completed" | "skipped" | "overdue"): Promise<RoadmapTaskCompletionResult> {
        return apiRequest<RoadmapTaskCompletionResult>(`/roadmap/${roadmapId}/tasks/${taskId}`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
        });
    },

    async completeTask(roadmapId: string, taskId: string): Promise<RoadmapTaskCompletionResult> {
        return apiRequest<RoadmapTaskCompletionResult>(`/roadmap/${roadmapId}/tasks/${taskId}/complete`, {
            method: "PATCH",
            body: JSON.stringify({}),
        });
    },
};
