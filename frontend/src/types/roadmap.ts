export type RoadmapTaskStatus = "pending" | "completed" | "skipped" | "overdue";

export interface RoadmapResourceLink {
    label: string;
    url: string;
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
    tasks: RoadmapTaskRecord[];
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
    weeks: RoadmapWeekRecord[];
}
