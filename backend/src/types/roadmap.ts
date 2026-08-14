export type RoadmapTaskStatus = "pending" | "completed" | "skipped" | "overdue";

export interface RoadmapResourceLink {
    label: string;
    url: string;
}

export interface RoadmapTaskDraft {
    task_title: string;
    task_description?: string;
    resource_links?: RoadmapResourceLink[];
    status?: RoadmapTaskStatus;
    due_date?: string | null;
}

export interface RoadmapWeekDraft {
    week_number: number;
    title: string;
    description: string;
    start_date?: string | null;
    due_date?: string | null;
    tasks: RoadmapTaskDraft[];
}

export interface GeneratedRoadmapPayload {
    title: string;
    description: string;
    duration_weeks: number;
    generated_by: "rag" | "basic_template";
    ai_response: Record<string, unknown>;
    weeks: RoadmapWeekDraft[];
}

export interface RoadmapRecord {
    id: string;
    user_id: string;
    skill_analysis_id: string | null;
    role_id: string | null;
    title: string;
    description: string | null;
    duration_weeks: number | null;
    progress_percentage: number;
    generated_by: string;
    ai_response: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RoadmapWeekRecord {
    id: string;
    roadmap_id: string;
    week_number: number;
    title: string;
    description: string | null;
    start_date: string | null;
    due_date: string | null;
    status: RoadmapTaskStatus;
    created_at: string;
    updated_at: string;
}

export interface RoadmapTaskRecord {
    id: string;
    roadmap_id: string;
    week_id: string;
    task_title: string;
    task_description: string | null;
    resource_links: RoadmapResourceLink[];
    status: RoadmapTaskStatus;
    due_date: string | null;
    completed_at: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface RoadmapGenerationInput {
    userId?: string;
    skillAnalysisId?: string | null;
    roleId?: string | null;
    roleName?: string;
    durationWeeks?: number;
    targetRole?: string;
}

export interface RoadmapGenerationResult {
    id: string;
    user_id: string;
    skill_analysis_id: string | null;
    role_id: string | null;
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
        status: RoadmapTaskStatus;
        tasks: Array<{
            id: string;
            roadmap_id: string;
            week_id: string;
            task_title: string;
            task_description: string | null;
            resource_links: RoadmapResourceLink[];
            status: RoadmapTaskStatus;
            due_date: string | null;
            completed_at: string | null;
            sort_order: number;
        }>;
    }>;
}
