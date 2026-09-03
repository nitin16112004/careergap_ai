import { describe, expect, it } from "vitest";
import { calculateRoadmapProgress } from "./roadmap-progress.service";

const roadmap = { id: "roadmap-1", progress_percentage: 25, duration_weeks: 4 };
const weeks = [
  { id: "week-1", week_number: 1, title: "Week 1", start_date: "2026-08-24", due_date: "2026-08-30" },
  { id: "week-2", week_number: 2, title: "Week 2", start_date: "2026-08-31", due_date: "2026-09-06" },
  { id: "week-3", week_number: 3, title: "Week 3", start_date: "2026-09-07", due_date: "2026-09-13" },
  { id: "week-4", week_number: 4, title: "Week 4", start_date: "2026-09-14", due_date: "2026-09-20" },
];

describe("calculateRoadmapProgress", () => {
  it("calculates task counts, current week, expected progress, and overdue work", () => {
    const result = calculateRoadmapProgress(roadmap, weeks, [
      { id: "task-1", week_id: "week-1", status: "completed", due_date: "2026-08-29" },
      { id: "task-2", week_id: "week-1", status: "skipped", due_date: "2026-08-30" },
      { id: "task-3", week_id: "week-2", status: "pending", due_date: "2026-09-02" },
      { id: "task-4", week_id: "week-2", status: "pending", due_date: "2026-09-06" },
    ], "2026-09-04");

    expect(result).toMatchObject({
      progressPercentage: 25,
      expectedProgressPercentage: 25,
      totalTasks: 4,
      completedTasks: 1,
      pendingTasks: 2,
      skippedTasks: 1,
      overdueTasks: 1,
      behindSchedule: true,
    });
    expect(result.currentWeek).toMatchObject({
      id: "week-2",
      weekNumber: 2,
      pendingTasks: 2,
      overdueTasks: 1,
    });
  });

  it("marks progress behind schedule when completion trails the current checkpoint", () => {
    const result = calculateRoadmapProgress(
      { ...roadmap, progress_percentage: 25 },
      weeks,
      [
        { id: "task-1", week_id: "week-1", status: "completed", due_date: "2026-08-30" },
        { id: "task-2", week_id: "week-2", status: "pending", due_date: "2026-09-06" },
        { id: "task-3", week_id: "week-3", status: "pending", due_date: "2026-09-13" },
        { id: "task-4", week_id: "week-4", status: "pending", due_date: "2026-09-20" },
      ],
      "2026-09-08",
    );

    expect(result.currentWeek?.weekNumber).toBe(3);
    expect(result.expectedProgressPercentage).toBe(50);
    expect(result.progressPercentage).toBe(25);
    expect(result.behindSchedule).toBe(true);
  });

  it("does not count completed or skipped tasks as pending or overdue", () => {
    const result = calculateRoadmapProgress(
      { ...roadmap, progress_percentage: 50 },
      weeks,
      [
        { id: "task-1", week_id: "week-1", status: "completed", due_date: "2026-08-20" },
        { id: "task-2", week_id: "week-1", status: "skipped", due_date: "2026-08-20" },
      ],
      "2026-09-04",
    );

    expect(result.pendingTasks).toBe(0);
    expect(result.overdueTasks).toBe(0);
  });
});
