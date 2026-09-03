import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  from: vi.fn(),
  queueAdd: vi.fn(),
  queueClose: vi.fn(),
  getUsersWithFeature: vi.fn(),
  hasFeature: vi.fn(),
}));

vi.mock("../config/env", () => ({
  getEnv: () => ({
    NODE_ENV: "test",
    LOG_LEVEL: "info",
    FRONTEND_URL: "https://app.example.com",
    REMINDER_INACTIVE_DAYS: 7,
    REMINDER_SCAN_BATCH_SIZE: 500,
    REMINDER_EMAIL_JOB_ATTEMPTS: 3,
  }),
}));

vi.mock("../config/supabase", () => ({
  getSupabaseStorageClient: () => ({ from: mocked.from }),
}));

vi.mock("../jobs/queues", () => ({
  createQueue: () => ({ add: mocked.queueAdd, close: mocked.queueClose }),
}));

vi.mock("./billing.service", () => ({
  billingService: {
    getUsersWithFeature: mocked.getUsersWithFeature,
    hasFeature: mocked.hasFeature,
  },
}));

import { reminderService } from "./reminder.service";

const preferenceRow = {
  user_id: "user-1",
  email_enabled: true,
  weekly_pending_enabled: false,
  inactive_enabled: true,
  motivational_enabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.queueClose.mockResolvedValue(undefined);
  mocked.queueAdd.mockResolvedValue(undefined);
  mocked.getUsersWithFeature.mockResolvedValue(new Set<string>());
  mocked.hasFeature.mockResolvedValue(false);
});

describe("reminderService preferences", () => {
  it("returns safe default preferences when the user has no saved row", async () => {
    mocked.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
    });

    await expect(reminderService.getPreferences("user-1")).resolves.toEqual({
      emailEnabled: true,
      weeklyPendingEnabled: true,
      inactiveEnabled: true,
      motivationalEnabled: true,
    });
  });

  it("merges a partial preference patch and persists the complete preference state", async () => {
    const upsert = vi.fn(() => ({
      select: () => ({ single: vi.fn().mockResolvedValue({ data: { ...preferenceRow, email_enabled: false }, error: null }) }),
    }));
    mocked.from
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: preferenceRow, error: null }) }) }) })
      .mockReturnValueOnce({ upsert });

    await expect(reminderService.updatePreferences("user-1", { emailEnabled: false })).resolves.toEqual({
      emailEnabled: false,
      weeklyPendingEnabled: false,
      inactiveEnabled: true,
      motivationalEnabled: false,
    });

    expect(upsert).toHaveBeenCalledWith({
      user_id: "user-1",
      email_enabled: false,
      weekly_pending_enabled: false,
      inactive_enabled: true,
      motivational_enabled: false,
    }, { onConflict: "user_id" });
  });
});

describe("reminderService.scanAndEnqueue", () => {
  it("closes the queue and returns a zero scan cleanly when no active roadmaps exist", async () => {
    mocked.from.mockImplementation((table: string) => {
      if (table !== "roadmaps") throw new Error(`unexpected table ${table}`);
      return { select: () => ({ eq: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) }) };
    });

    await expect(reminderService.scanAndEnqueue()).resolves.toEqual({
      scannedUsers: 0,
      scannedRoadmaps: 0,
      queuedReminders: 0,
      duplicatesSkipped: 0,
      skippedDisabled: 0,
      errors: 0,
    });
    expect(mocked.queueAdd).not.toHaveBeenCalled();
    expect(mocked.queueClose).toHaveBeenCalledTimes(1);
  });

  it("does not enqueue reminder email jobs for users whose plan lacks weekly reminders", async () => {
    const roadmap = { id: "roadmap-1", user_id: "user-1", title: "Backend Engineer", duration_weeks: 4, progress_percentage: 10, created_at: "2026-09-01T00:00:00.000Z" };
    mocked.getUsersWithFeature.mockResolvedValue(new Set<string>());
    mocked.from.mockImplementation((table: string) => {
      if (table === "roadmaps") return { select: () => ({ eq: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [roadmap], error: null }) }) }) }) };
      if (table === "profiles") return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [{ id: "user-1", email: "user@example.com", full_name: "User One", last_activity_at: "2026-08-01T00:00:00.000Z", onboarding_completed: true }], error: null }) }) };
      if (table === "reminder_preferences") return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
      if (table === "roadmap_weeks") return { select: () => ({ in: () => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) };
      if (table === "roadmap_tasks") return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
      throw new Error(`unexpected table ${table}`);
    });

    await expect(reminderService.scanAndEnqueue()).resolves.toMatchObject({
      scannedUsers: 1,
      scannedRoadmaps: 1,
      skippedDisabled: 1,
      queuedReminders: 0,
      errors: 0,
    });
    expect(mocked.getUsersWithFeature).toHaveBeenCalledWith(["user-1"], "weekly_reminders");
    expect(mocked.queueAdd).not.toHaveBeenCalled();
    expect(mocked.queueClose).toHaveBeenCalledTimes(1);
  });
});
