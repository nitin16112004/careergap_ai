import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

export interface RoadmapProgressSummary {
  roadmapId: string;
  progressPercentage: number;
  expectedProgressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  skippedTasks: number;
  overdueTasks: number;
  currentWeek: {
    id: string;
    weekNumber: number;
    title: string;
    startDate: string | null;
    dueDate: string | null;
    pendingTasks: number;
    overdueTasks: number;
  } | null;
  behindSchedule: boolean;
}

type WeekRow = {
  id: string;
  week_number: number;
  title: string;
  start_date: string | null;
  due_date: string | null;
};

type TaskRow = {
  id: string;
  week_id: string;
  status: string;
  due_date: string | null;
};

const todayDate = (): string => new Date().toISOString().slice(0, 10);
const isOpenTask = (status: string): boolean => status !== "completed" && status !== "skipped";

const pickCurrentWeek = (weeks: WeekRow[], today: string): WeekRow | null => {
  if (weeks.length === 0) return null;

  const inRange = weeks.find((week) => {
    const starts = !week.start_date || week.start_date <= today;
    const notEnded = !week.due_date || week.due_date >= today;
    return starts && notEnded;
  });
  if (inRange) return inRange;

  const upcoming = weeks.find((week) => !week.start_date || week.start_date > today || (week.due_date && week.due_date >= today));
  if (upcoming) return upcoming;

  return weeks[weeks.length - 1] ?? null;
};

export const calculateRoadmapProgress = (
  roadmap: { id: string; progress_percentage?: number | null; duration_weeks?: number | null },
  weeks: WeekRow[],
  tasks: TaskRow[],
  today = todayDate(),
): RoadmapProgressSummary => {
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const skippedTasks = tasks.filter((task) => task.status === "skipped").length;
  const pendingTasks = tasks.filter((task) => isOpenTask(task.status)).length;
  const overdueTasks = tasks.filter((task) => isOpenTask(task.status) && Boolean(task.due_date && task.due_date < today)).length;
  const totalTasks = tasks.length;
  const calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const currentWeek = pickCurrentWeek(weeks, today);
  const durationWeeks = Math.max(weeks.length, Number(roadmap.duration_weeks ?? 0), 1);
  const expectedProgressPercentage = currentWeek
    ? Math.round((Math.max(currentWeek.week_number - 1, 0) / durationWeeks) * 100)
    : calculatedProgress;

  const currentWeekTasks = currentWeek ? tasks.filter((task) => task.week_id === currentWeek.id) : [];
  const currentWeekPending = currentWeekTasks.filter((task) => isOpenTask(task.status)).length;
  const currentWeekOverdue = currentWeekTasks.filter((task) => isOpenTask(task.status) && Boolean(task.due_date && task.due_date < today)).length;
  const progressPercentage = Number.isFinite(Number(roadmap.progress_percentage))
    ? Math.max(0, Math.min(100, Number(roadmap.progress_percentage)))
    : calculatedProgress;

  return {
    roadmapId: roadmap.id,
    progressPercentage,
    expectedProgressPercentage,
    totalTasks,
    completedTasks,
    pendingTasks,
    skippedTasks,
    overdueTasks,
    currentWeek: currentWeek ? {
      id: currentWeek.id,
      weekNumber: currentWeek.week_number,
      title: currentWeek.title,
      startDate: currentWeek.start_date,
      dueDate: currentWeek.due_date,
      pendingTasks: currentWeekPending,
      overdueTasks: currentWeekOverdue,
    } : null,
    behindSchedule: overdueTasks > 0 || progressPercentage < expectedProgressPercentage,
  };
};

export const roadmapProgressService = {
  async get(userId: string, roadmapId: string): Promise<RoadmapProgressSummary> {
    const client = getSupabaseStorageClient();
    const { data: roadmap, error: roadmapError } = await client
      .from("roadmaps")
      .select("id,progress_percentage,duration_weeks")
      .eq("id", roadmapId)
      .eq("user_id", userId)
      .maybeSingle();

    if (roadmapError) throw new HttpError(500, "Unable to load roadmap progress.", "ROADMAP_PROGRESS_LOAD_FAILED", false);
    if (!roadmap) throw new HttpError(404, "Roadmap not found.", "ROADMAP_NOT_FOUND");

    const [weeksResult, tasksResult] = await Promise.all([
      client.from("roadmap_weeks").select("id,week_number,title,start_date,due_date").eq("roadmap_id", roadmapId).order("week_number", { ascending: true }),
      client.from("roadmap_tasks").select("id,week_id,status,due_date").eq("roadmap_id", roadmapId),
    ]);

    if (weeksResult.error || tasksResult.error) {
      throw new HttpError(500, "Unable to calculate roadmap progress.", "ROADMAP_PROGRESS_CALCULATION_FAILED", false);
    }

    return calculateRoadmapProgress(
      roadmap,
      (weeksResult.data ?? []) as WeekRow[],
      (tasksResult.data ?? []) as TaskRow[],
    );
  },
};
