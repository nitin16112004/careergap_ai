import { AlertTriangle, Bell, CheckCircle2, CircleDashed, Clock3, Settings2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { Button } from "../components/auth/Button";
import { ErrorMessage, SuccessMessage } from "../components/auth/FeedbackMessage";
import { reminderService, type ReminderStatus } from "../services/reminder.service";
import { roadmapService, type RoadmapProgressResult } from "../services/roadmap.service";
import type { RoadmapRecord } from "../types/roadmap";

interface RoadmapPageState {
    roadmap: RoadmapRecord | null;
    progress: RoadmapProgressResult | null;
    reminder: ReminderStatus | null;
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

const formatReminderDate = (value: string | null | undefined): string => {
    if (!value) return "Not sent yet";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export const RoadmapPage = (): JSX.Element => {
    const { roadmapId } = useParams<{ roadmapId: string }>();
    const [state, setState] = useState<RoadmapPageState>({ roadmap: null, progress: null, reminder: null, loading: true, submittingTaskId: null });
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<string>();

    const loadRoadmap = useCallback(async (): Promise<void> => {
        setError(undefined);
        setState((current) => ({ ...current, loading: true }));
        try {
            let detail: RoadmapRecord | null = null;
            if (roadmapId) {
                detail = await roadmapService.get(roadmapId) as RoadmapRecord;
            } else {
                const [firstRoadmap] = await roadmapService.list();
                if (firstRoadmap) detail = await roadmapService.get(firstRoadmap.id) as RoadmapRecord;
            }

            if (!detail) {
                setState((current) => ({ ...current, roadmap: null, progress: null, reminder: null, loading: false }));
                return;
            }

            const [progress, reminder] = await Promise.all([
                roadmapService.progress(detail.id),
                reminderService.status(),
            ]);
            setState((current) => ({ ...current, roadmap: detail, progress, reminder, loading: false }));
        } catch (caught) {
            setState((current) => ({ ...current, loading: false }));
            setError(caught instanceof Error ? caught.message : "Unable to load your roadmap.");
        }
    }, [roadmapId]);

    useEffect(() => {
        void loadRoadmap();
    }, [loadRoadmap]);

    const toggleTask = async (taskId: string): Promise<void> => {
        if (!state.roadmap) return;
        setError(undefined);
        setSuccess(undefined);
        setState((current) => ({ ...current, submittingTaskId: taskId }));
        try {
            const targetTask = state.roadmap.weeks.flatMap((week) => week.tasks).find((task) => task.id === taskId);
            const nextStatus = targetTask?.status === "completed" ? "pending" : "completed";
            const result = await roadmapService.updateTaskStatus(state.roadmap.id, taskId, nextStatus);
            const [progress, reminder] = await Promise.all([
                roadmapService.progress(state.roadmap.id),
                reminderService.status(),
            ]);
            const nextRoadmap = { ...state.roadmap, progress_percentage: result.progress_percentage, weeks: result.weeks as RoadmapRecord["weeks"] };
            setState((current) => ({ ...current, roadmap: nextRoadmap, progress, reminder, submittingTaskId: null }));
            setSuccess(nextStatus === "completed" ? "Task completed" : "Task reopened");
        } catch (caught) {
            setState((current) => ({ ...current, submittingTaskId: null }));
            setError(caught instanceof Error ? caught.message : "Unable to update the roadmap task.");
        }
    };

    const totalTasks = state.progress?.totalTasks ?? state.roadmap?.weeks.reduce((count, week) => count + week.tasks.length, 0) ?? 0;
    const completedTasks = state.progress?.completedTasks ?? state.roadmap?.weeks.reduce((count, week) => count + week.tasks.filter((task) => task.status === "completed").length, 0) ?? 0;
    const progress = state.progress ? formatProgress(state.progress.progressPercentage) : state.roadmap ? formatProgress(state.roadmap.progress_percentage) : 0;
    const targetRole = state.roadmap?.ai_response?.target_role ?? state.roadmap?.title ?? "Career roadmap";
    const missingSkills = Array.isArray(state.roadmap?.ai_response?.missing_skills) ? state.roadmap.ai_response.missing_skills as string[] : [];
    const generationMode = state.roadmap?.generated_by === "rag" ? "AI RAG" : "Basic plan";
    const subtitle = state.roadmap?.generated_by === "rag"
        ? "Generated from your skill gap using embeddings, pgvector retrieval, retrieved knowledge-base context, and a validated LLM response."
        : "A deterministic skill-gap plan built from your saved profile and current analysis. You can generate an AI RAG version from Skill Gap Analysis when providers are configured.";
    const lastReminder = state.reminder?.lastReminder;

    return (
        <AuthCard className="onboarding-card" eyebrow="Career roadmap" title="Your roadmap" subtitle={subtitle}>
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
                    {state.progress?.behindSchedule && (
                        <div className="reminder-banner reminder-banner-warning">
                            <AlertTriangle size={19} />
                            <div>
                                <strong>You have pending work for the current roadmap checkpoint.</strong>
                                <span>{state.progress.overdueTasks > 0 ? `${state.progress.overdueTasks} overdue task${state.progress.overdueTasks === 1 ? "" : "s"} need attention.` : `Your current progress is ${state.progress.progressPercentage}% vs about ${state.progress.expectedProgressPercentage}% expected.`}</span>
                            </div>
                        </div>
                    )}

                    {lastReminder && (
                        <div className="reminder-banner reminder-banner-info">
                            <Bell size={19} />
                            <div>
                                <strong>Last reminder: {formatReminderDate(lastReminder.sent_at ?? lastReminder.created_at)}</strong>
                                <span>{lastReminder.reason || "A roadmap reminder was generated for this plan."}</span>
                            </div>
                            <Link className="text-link" to="/settings"><Settings2 size={14} /> Settings</Link>
                        </div>
                    )}

                    <section className="roadmap-summary-card">
                        <div className="roadmap-summary-copy">
                            <span className="eyebrow">{generationMode} · Target role</span>
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

                    {state.progress?.currentWeek && (
                        <section className="roadmap-progress-detail">
                            <div><span className="eyebrow">Current checkpoint</span><strong>Week {state.progress.currentWeek.weekNumber}: {state.progress.currentWeek.title}</strong></div>
                            <div><strong>{state.progress.currentWeek.pendingTasks}</strong><span>pending</span></div>
                            <div><strong>{state.progress.currentWeek.overdueTasks}</strong><span>overdue</span></div>
                            <div><strong>{state.progress.expectedProgressPercentage}%</strong><span>expected progress</span></div>
                        </section>
                    )}

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
                                        const overdue = !completed && Boolean(task.due_date && task.due_date < new Date().toISOString().slice(0, 10));
                                        return (
                                            <article className={`roadmap-task ${completed ? "roadmap-task-complete" : ""} ${overdue ? "roadmap-task-overdue" : ""}`} key={task.id}>
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
                                                    <div className="roadmap-task-heading"><strong>{task.task_title}</strong><span>{overdue ? "Overdue" : describeStatus(task.status)}</span></div>
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
                        <Link className="button button-secondary" to="/settings">Reminder settings</Link>
                        <Link className="button button-secondary" to="/dashboard">Back to dashboard</Link>
                    </div>
                </>
            )}
        </AuthCard>
    );
};
