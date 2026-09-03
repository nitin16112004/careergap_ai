import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../config/supabase", () => ({
  getSupabaseStorageClient: () => ({ rpc: mocked.rpc, from: mocked.from }),
}));

import { billingService } from "./billing.service";

const freePlan = {
  id: "free-plan",
  plan_name: "Free",
  plan_slug: "free",
  description: "Free plan",
  price_monthly: 0,
  price_yearly: 0,
  currency: "INR",
  resume_upload_limit: 1,
  roadmap_generation_limit: 2,
  ats_resume_generation_limit: 1,
  ai_chat_limit: 0,
  is_active: true,
};

const proPlan = {
  ...freePlan,
  id: "pro-plan",
  plan_name: "Pro",
  plan_slug: "pro",
  price_monthly: 499,
  price_yearly: 4990,
  resume_upload_limit: 10,
  roadmap_generation_limit: 20,
  ats_resume_generation_limit: 10,
  ai_chat_limit: 100,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("billingService.consume", () => {
  it("returns the atomic usage decision when the plan has remaining capacity", async () => {
    mocked.rpc.mockResolvedValue({
      data: { allowed: true, planSlug: "free", limit: 2, used: 1, remaining: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      error: null,
    });

    await expect(billingService.consume("user-1", "roadmap_generation")).resolves.toMatchObject({ allowed: true, remaining: 1 });
    expect(mocked.rpc).toHaveBeenCalledWith("consume_plan_usage", {
      p_user_id: "user-1",
      p_usage_key: "roadmap_generation",
      p_amount: 1,
    });
  });

  it("turns an exhausted plan decision into an upgradeable payment-required error", async () => {
    mocked.rpc.mockResolvedValue({
      data: { allowed: false, planSlug: "free", limit: 1, used: 1, remaining: 0, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      error: null,
    });

    await expect(billingService.consume("user-1", "resume_upload")).rejects.toMatchObject({
      statusCode: 402,
      code: "PLAN_LIMIT_REACHED",
    });
  });
});

describe("billingService paid features", () => {
  it("blocks AI RAG and ATS download features on Free", async () => {
    vi.spyOn(billingService, "getCurrentPlan").mockResolvedValue({ plan: freePlan, subscription: null });

    await expect(billingService.requireFeature("user-1", "advanced_roadmap")).rejects.toMatchObject({ code: "PLAN_UPGRADE_REQUIRED", statusCode: 402 });
    await expect(billingService.requireFeature("user-1", "ats_download")).rejects.toMatchObject({ code: "PLAN_UPGRADE_REQUIRED", statusCode: 402 });
  });

  it("allows paid features on Pro", async () => {
    vi.spyOn(billingService, "getCurrentPlan").mockResolvedValue({
      plan: proPlan,
      subscription: {
        id: "subscription-1",
        user_id: "user-1",
        plan_id: "pro-plan",
        status: "active",
        billing_cycle: "monthly",
        starts_at: "2026-09-01T00:00:00.000Z",
        ends_at: "2026-10-01T00:00:00.000Z",
        payment_provider: "razorpay",
        provider_subscription_id: null,
      },
    });

    await expect(billingService.requireFeature("user-1", "advanced_roadmap")).resolves.toMatchObject({ plan_slug: "pro" });
    await expect(billingService.requireFeature("user-1", "weekly_reminders")).resolves.toMatchObject({ plan_slug: "pro" });
  });
});
