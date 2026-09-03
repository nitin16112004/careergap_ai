import { CheckCircle2, CircleDashed, Clock3, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { Button, LoadingButton } from "../components/auth/Button";
import { ErrorMessage, SuccessMessage } from "../components/auth/FeedbackMessage";
import { roadmapService } from "../services/roadmap.service";
import type { RoadmapRecord } from "../types/roadmap";

interface RoadmapPageState {
    roadmap: RoadmapRecord | null;
    loading: boolean;
    submittingTaskId: string | null;
}

const formatProgress = (value: number): number => Math.max(0, Math.min(100, value));

const describeStatus = (status: string | null | undefined): string => {
    if (status === "completed") return "Completed";
    if (status === "skipped") return "Skipped";
    if (status === "overdue") return "Overdue";
    return "Pending";
};

export const RoadmapPage = (): JSX.Element => {
    const [state, setState] = useState<RoadmapPageState>({ roadmap: null, loading: true, submittingTaskId: null });
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<string>();

    useEffect(() => {
        void loadRoadmap();
    }, []);

    const loadRoadmap = async (): Promise<void> => {
        setError(undefined);
        setState((current) => ({ ...current, loading: true }));
        try {
            const [firstRoadmap] = await roadmapService.list();
            if (!firstRoadmap) {
                setState((current) => ({ ...current, roadmap: null, loading: false }));
                return;
            }
            const detail = await roadmapService.get(firstRoadmap.id);
            setState((current) => ({ ...current, roadmap: detail as RoadmapRecord, loading: false }));
        } catch (caught) {
            setState((current) => ({ ...current, loading: false }));
            setError(caught instanceof Error ? caught.message : "Unable to load your roadmap.");
        }
    };

    const toggleTask = async (taskId: string): Promise<void> => {
        if (!state.roadmap) return;
        setError(undefined);
        setSuccess(undefined);
        setState((current) => ({ ...current, submittingTaskId: taskId }));
        try {
            const targetTask = state.roadmap.weeks.flatMap((week) => week.tasks).find((task) => task.id === taskId);
            const nextStatus = targetTask?.status === "completed" ? "pending" : "completed";
            const result = await roadmapService.updateTaskStatus(state.roadmap.id, taskId, nextStatus);
            const nextRoadmap = { ...state.roadmap, progress_percentage: result.progress_percentage, weeks: result.weeks as RoadmapRecord["weeks"] };
            setState((current) => ({ ...current, roadmap: nextRoadmap, submittingTaskId: null }));
            setSuccess("Task completed");
        } catch (caught) {
            setState((current) => ({ ...current, submittingTaskId: null }));
            setError(caught instanceof Error ? caught.message : "Unable to complete the roadmap task.");
        }
    };

    const totalTasks = state.roadmap?.weeks.reduce((count, week) => count + week.tasks.length, 0) ?? 0;
    const completedTasks = state.roadmap?.weeks.reduce((count, week) => count + week.tasks.filter((task) => task.status === "completed").length, 0) ?? 0;
    const progress = state.roadmap ? formatProgress(state.roadmap.progress_percentage) : 0;
    const targetRole = state.roadmap?.ai_response?.target_role ?? state.roadmap?.title ?? "Career roadmap";
    const missingSkills = Array.isArray(state.roadmap?.ai_response?.missing_skills) ? state.roadmap.ai_response.missing_skills as string[] : [];

    return (
        <AuthCard className="onboarding-card" eyebrow="Career roadmap" title="Your roadmap" subtitle="A skill-gap-driven MVP plan that updates as you complete your weekly milestones. Full embedding + pgvector + LLM RAG is a later documented phase.">
            <ErrorMessage>{error}</ErrorMessage>
            <SuccessMessage>{success}</SuccessMessage>

            {state.loading ? (
                <div className="review-loading"><CircleDashed className="spin-icon" size={18} /> Loading your roadmap...</div>
            ) : !state.roadmap ? (
                <div className="empty-state-box">
                    <Sparkles size={18} />
                    <div>
                        <h3>No roadmap yet</h3>
                        <p>Complete your skill-gap analysis first, then generate a weekly plan from your actual missing skills.</p>
                    </div>
                    <Link className="button button-primary" to="/skill-gap">Analyze skill gap</Link>
                </div>
            ) : (
                <>
                    <section className="roadmap-summary-card">
                        <div className="roadmap-summary-copy">
                            <span className="eyebrow">Target role</span>
                            <h2>{String(targetRole)}</h2>
                            <p>{state.roadmap.description}</p>
                        </div>
                        <div className="roadmap-progress-stat">
                            <strong>{progress}%</strong>
                            <span>{completedTasks} of {totalTasks} tasks complete</span>
                        </div>
                    </section>

                    <div className="progress-bar" aria-label={`${progress}% roadmap complete`}>
                        <span style={{ width: `${progress}%` }} />
                    </div>

                    {missingSkills.length > 0 && (
                        <section className="roadmap-missing-skills">
                            <span className="eyebrow">Skills this plan is closing</span>
                            <div className="skill-chip-list">
                                {missingSkills.map((skill) => <span className="skill-chip missing" key={skill}>{skill}</span>)}
                            </div>
                        </section>
                    )}

                    <div className="roadmap-week-list">
                        {state.roadmap.weeks.map((week) => (
                            <section className="roadmap-week-card" key={week.id}>
                                <header className="roadmap-week-header">
                                    <div>
                                        <span className="eyebrow">Week {week.week_number}</span>
                                        <h2>{week.title}</h2>
                                        {week.description && <p>{week.description}</p>}
                                    </div>
                                    {week.due_date && <span className="roadmap-due-date"><Clock3 size={14} /> Due {week.due_date}</span>}
                                </header>
                                <div className="roadmap-task-list">
                                    {week.tasks.map((task) => {
                                        const completed = task.status === "completed";
                                        return (
                                            <article className={`roadmap-task ${completed ? "roadmap-task-complete" : ""}`} key={task.id}>
                                                <button
                                                    type="button"
                                                    className="roadmap-task-check"
                                                    aria-label={completed ? `Reopen ${task.task_title}` : `Complete ${task.task_title}`}
                                                    onClick={() => { void toggleTask(task.id); }}
                                                    disabled={state.submittingTaskId === task.id}
                                                >
                                                    {state.submittingTaskId === task.id ? <CircleDashed className="spin-icon" size={18} /> : completed ? <CheckCircle2 size={18} /> : <span />}
                                                </button>
                                                <div className="roadmap-task-copy">
                                                    <div className="roadmap-task-heading"><strong>{task.task_title}</strong><span>{describeStatus(task.status)}</span></div>
                                                    {task.task_description && <p>{task.task_description}</p>}
                                                    {task.resource_links.length > 0 && (
                                                        <div className="roadmap-resource-links">
                                                            {task.resource_links.map((resource, index) => <a key={`${resource.url}-${index}`} href={resource.url} target="_blank" rel="noreferrer">{resource.label}</a>)}
                                                        </div>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="review-bottom-actions">
                        <Button type="button" variant="secondary" onClick={() => { void loadRoadmap(); }}>Refresh roadmap</Button>
                        <Link className="button button-secondary" to="/dashboard">Back to dashboard</Link>
                    </div>
                </>
            )}
        </AuthCard>
    );
};
