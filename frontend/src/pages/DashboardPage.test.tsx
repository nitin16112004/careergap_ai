import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";

const mocked = vi.hoisted(() => ({ summary: vi.fn() }));

vi.mock("../services/dashboard.service", () => ({
  dashboardService: { summary: mocked.summary },
}));

const populatedSummary = {
  profile: {
    full_name: "Ava Stone",
    target_job_role: "Backend Engineer",
    work_preference: "hybrid",
  },
  profileCompletion: 88,
  resume: { id: "resume-1", file_name: "ava-resume.pdf" },
  skillAnalysis: { id: "analysis-1", match_score: 62, missing_skills: ["PostgreSQL", "Redis"] },
  roadmap: { id: "roadmap-1", progress_percentage: 25 },
  pendingTasks: 6,
  completedTasks: 2,
  overdueTasks: 2,
  generatedResume: { id: "ats-1", ats_score: 84, target_role: "Backend Engineer" },
  reminder: {
    preferences: { emailEnabled: true, weeklyPendingEnabled: true, inactiveEnabled: true, motivationalEnabled: true },
    includedInPlan: true,
    unreadNotifications: 3,
    lastReminder: {
      id: "reminder-1",
      roadmap_id: "roadmap-1",
      week_id: "week-1",
      reminder_type: "weekly_pending_task" as const,
      pending_task_count: 6,
      email_sent: true,
      email_status: "sent" as const,
      sent_at: "2026-09-03T09:00:00.000Z",
      reason: "You have pending roadmap tasks.",
      created_at: "2026-09-03T09:00:00.000Z",
    },
    progress: {
      roadmapId: "roadmap-1",
      progressPercentage: 25,
      expectedProgressPercentage: 50,
      totalTasks: 8,
      completedTasks: 2,
      pendingTasks: 6,
      skippedTasks: 0,
      overdueTasks: 2,
      currentWeek: {
        id: "week-1",
        weekNumber: 2,
        title: "Database foundations",
        startDate: "2026-09-01",
        dueDate: "2026-09-07",
        pendingTasks: 3,
        overdueTasks: 1,
      },
      behindSchedule: true,
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.summary.mockResolvedValue(populatedSummary);
});

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);

describe("DashboardPage", () => {
  it("renders stored profile, skill, roadmap, reminder, and ATS metrics with the correct next action", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Welcome, Ava" })).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("2 overdue")).toBeInTheDocument();
    expect(screen.getByText("Automatic reminders enabled")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue roadmap/i })).toHaveAttribute("href", "/roadmap/roadmap-1");
    expect(screen.getByText(/behind the current roadmap checkpoint/i)).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
  });

  it("guides a profile without analysis or roadmap to start skill-gap analysis", async () => {
    mocked.summary.mockResolvedValue({
      ...populatedSummary,
      skillAnalysis: null,
      roadmap: null,
      pendingTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      generatedResume: null,
      reminder: {
        ...populatedSummary.reminder,
        unreadNotifications: 0,
        lastReminder: null,
        progress: null,
      },
    });
    renderPage();

    expect(await screen.findByRole("link", { name: /analyze skill gap/i })).toHaveAttribute("href", "/skill-gap");
    expect(screen.getByRole("heading", { name: "No skill analysis yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No roadmap yet" })).toBeInTheDocument();
  });

  it("shows the dashboard error state when the summary request fails", async () => {
    mocked.summary.mockRejectedValue(new Error("Dashboard service unavailable"));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Dashboard unavailable" })).toBeInTheDocument();
    expect(screen.getByText("Dashboard service unavailable")).toBeInTheDocument();
  });
});
