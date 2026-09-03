import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  from: vi.fn(),
  analysisInsert: vi.fn(),
  itemInsert: vi.fn(),
  profileUpdate: vi.fn(),
}));

vi.mock("../config/supabase", () => ({
  getSupabaseStorageClient: () => ({ from: mocked.from }),
}));

import { skillGapService } from "./skill-gap.service";

const roleSkills = [
  {
    id: "mapping-1",
    priority: "must_have",
    weight: 3,
    skill_level: "intermediate",
    skills: { id: "skill-ts", skill_name: "TypeScript", normalized_name: "typescript" },
  },
  {
    id: "mapping-2",
    priority: "good_to_have",
    weight: 2,
    skill_level: "intermediate",
    skills: { id: "skill-pg", skill_name: "PostgreSQL", normalized_name: "postgresql" },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  let profileCalls = 0;
  mocked.analysisInsert.mockReturnValue({
    select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: "analysis-1", user_id: "user-1", role_id: "role-1", match_score: 60 }, error: null }) }),
  });
  mocked.itemInsert.mockResolvedValue({ error: null });
  mocked.profileUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  mocked.from.mockImplementation((table: string) => {
    if (table === "profiles") {
      profileCalls += 1;
      if (profileCalls === 1) {
        return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-1", onboarding_completed: true, skills: ["TS", "Git"], target_job_role: null }, error: null }) }) }) };
      }
      return { update: mocked.profileUpdate };
    }
    if (table === "job_roles") {
      return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "role-1", role_name: "Backend Engineer", role_slug: "backend-engineer" }, error: null }) }) }) }) };
    }
    if (table === "role_skills") {
      return { select: () => ({ eq: () => ({ order: vi.fn().mockResolvedValue({ data: roleSkills, error: null }) }) }) };
    }
    if (table === "skill_aliases") {
      return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [{ skill_id: "skill-ts", normalized_alias: "ts" }], error: null }) }) };
    }
    if (table === "skill_analyses") return { insert: mocked.analysisInsert };
    if (table === "skill_analysis_items") return { insert: mocked.itemInsert };
    throw new Error(`unexpected table ${table}`);
  });
});

describe("skillGapService.analyze", () => {
  it("matches normalized aliases, computes a weighted score, and prioritizes missing skills", async () => {
    const result = await skillGapService.analyze("user-1", "role-1");

    expect(result).toMatchObject({
      id: "analysis-1",
      match_score: 60,
      learning_order: ["PostgreSQL"],
      role: { id: "role-1", role_name: "Backend Engineer" },
    });
    expect(mocked.analysisInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      role_id: "role-1",
      matched_skills: ["TypeScript"],
      missing_skills: ["PostgreSQL"],
      recommended_skills: ["PostgreSQL"],
      match_score: 60,
    }));
    expect(mocked.itemInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ skill_id: "skill-ts", status: "matched", priority: "high" }),
      expect.objectContaining({ skill_id: "skill-pg", status: "missing", priority: "medium" }),
    ]));
  });

  it("requires completed onboarding before analysis", async () => {
    mocked.from.mockImplementationOnce(() => ({
      select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-1", onboarding_completed: false, skills: ["TypeScript"] }, error: null }) }) }),
    }));

    await expect(skillGapService.analyze("user-1", "role-1")).rejects.toMatchObject({
      statusCode: 400,
      code: "ONBOARDING_REQUIRED",
    });
  });
});
