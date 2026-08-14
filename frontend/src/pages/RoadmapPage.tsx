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
      const result = await roadmapService.completeTask(state.roadmap.id, taskId);
      const nextRoadmap = { ...state.roadmap, progress_percentage: result.progress_percentage, weeks: result.weeks as RoadmapRecord["weeks"] };
      setState((current) => ({ ...current, roadmap: nextRoadmap, submittingTaskId: null }));
      setSuccess("Task marked complete. Your roadmap progress has been updated.");
    } catch (caught) {
      setState((current) => ({ ...current, submittingTaskId: null }));
      setError(caught instanceof Error ? caught.message : "Unable to complete the roadmap task.");
    }
  };

  const totalTasks = state.roadmap?.weeks.reduce((count, week) => count + week.tasks.length, 0) ?? 0;
  const completedTasks = state.roadmap?.weeks.reduce((count, week) => count + week.tasks.filter((task) => task.status === "completed").length, 0) ?? 0;
  const progress = state.roadmap ? formatProgress(state.roadmap.progress_percentage) : 0;

  return (
    <AuthCard className="onboarding-card" eyebrow="Career roadmap" title="Your roadmap" subtitle="A retrieval-grounded plan that updates as you complete your weekly milestones.">
      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {state.loading ? (
        <div className="review-loading"><CircleDashed size={16} className="spin-icon" /> Loading roadmap...</div>
      ) : !state.roadmap ? (
        <div className="empty-state-box">
          <Sparkles size={18} />
          <div>
            <h3>No roadmap generated yet</h3>
            <p>Complete a skill-gap review to generate a roadmap for your target role.</p>
          </div>
          <Link to="/dashboard" className="button button-secondary">Back to dashboard</Link>
        </div>
      ) : (
        <>
          <div className="roadmap-overview">
            <div>
              <span className="eyebrow">{state.roadmap.title}</span>
              <h2>{state.roadmap.title}</h2>
              <p>{state.roadmap.description}</p>
            </div>
            <div className="roadmap-progress-card">
              <strong>{progress}%</strong>
              <span>{completedTasks} of {totalTasks} tasks complete</span>
              <div className="progress-bar"><span style={{ width: `${progress}%` }} /></div>
            </div>
          </div>

          <div className="roadmap-weeks-layout">
            {state.roadmap.weeks.map((week) => (
              <div className="roadmap-week-card" key={week.id}>
                <div className="roadmap-week-header">
                  <div>
                    <span className="eyebrow">Week {week.week_number}</span>
                    <h3>{week.title}</h3>
                  </div>
                  {week.due_date && <span className="roadmap-date">Due {week.due_date}</span>}
                </div>

                <p>{week.description}</p>

                <div className="roadmap-task-list">
                  {week.tasks.map((task) => {
                    const isComplete = task.status === "completed";
                    return (
                      <div className={`roadmap-task-item ${isComplete ? "completed" : ""}`} key={task.id}>
                        <div className="roadmap-task-main">
                          <div className="task-toggle">
                            <button type="button" className="task-check" aria-label={isComplete ? "Mark as incomplete" : "Mark as complete"} onClick={() => { void toggleTask(task.id); }} disabled={state.submittingTaskId === task.id}>
                              {isComplete ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                            </button>
                          </div>
                          <div>
                            <strong>{task.task_title}</strong>
                            {task.task_description && <p>{task.task_description}</p>}
                            {task.resource_links.length > 0 && (
                              <div className="roadmap-links">{task.resource_links.map((link) => <a key={`${task.id}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>
                            )}
                          </div>
                        </div>
                        <div className="task-status-pill">{isComplete ? "Completed" : "Pending"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="roadmap-footer-actions">
            <Button type="button" variant="secondary" onClick={() => void loadRoadmap()}><Sparkles size={15} /> Refresh roadmap</Button>
            <LoadingButton type="button" loading={state.submittingTaskId !== null} loadingLabel="Updating..." onClick={() => { if (state.roadmap?.weeks[0]?.tasks[0]) void toggleTask(state.roadmap.weeks[0].tasks[0].id); }}>
              <CheckCircle2 size={15} /> Complete next task
            </LoadingButton>
          </div>
        </>
      )}
    </AuthCard>
  );
};
