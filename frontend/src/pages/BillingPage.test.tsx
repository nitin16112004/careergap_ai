import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { BillingPage } from "./BillingPage";

const mocked = vi.hoisted(() => ({
  plans: vi.fn(),
  current: vi.fn(),
  history: vi.fn(),
  createCheckout: vi.fn(),
  verifyRazorpay: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("../services/billing.service", () => ({
  billingService: mocked,
}));

const freePlan = {
  id: "free-plan",
  plan_name: "Free",
  plan_slug: "free",
  description: "Start with the core career workflow.",
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
  description: "Unlock advanced roadmap and export tools.",
  price_monthly: 499,
  price_yearly: 4990,
  resume_upload_limit: 10,
  roadmap_generation_limit: 20,
  ats_resume_generation_limit: 10,
  ai_chat_limit: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.plans.mockResolvedValue([freePlan, proPlan]);
  mocked.current.mockResolvedValue({
    plan: freePlan,
    subscription: null,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    usage: [
      { key: "resume_upload", used: 1, limit: 1, remaining: 0 },
      { key: "roadmap_generation", used: 1, limit: 2, remaining: 1 },
      { key: "ats_resume_generation", used: 0, limit: 1, remaining: 1 },
      { key: "ai_chat", used: 0, limit: 0, remaining: 0 },
    ],
  });
  mocked.history.mockResolvedValue([]);
});

const renderBilling = (entry = "/billing") => render(<MemoryRouter initialEntries={[entry]}><BillingPage /></MemoryRouter>);

describe("BillingPage", () => {
  it("renders the current plan, usage limits, available plans, and empty history from one load", async () => {
    renderBilling();

    expect(await screen.findByRole("heading", { name: "Plan, usage, and upgrades" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Free" })).toBeInTheDocument();
    expect(screen.getByLabelText("Resume uploads: 1 of 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Roadmap generations: 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByText("No payments yet")).toBeInTheDocument();
    expect(mocked.plans).toHaveBeenCalledTimes(1);
    expect(mocked.current).toHaveBeenCalledTimes(1);
    expect(mocked.history).toHaveBeenCalledTimes(1);
    expect(mocked.createCheckout).not.toHaveBeenCalled();
  });

  it("switches between monthly and yearly prices without starting checkout", async () => {
    const user = userEvent.setup();
    renderBilling();
    await screen.findByRole("heading", { name: "Pro" });

    expect(screen.getByText(/₹499/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yearly" }));

    expect(screen.getByText(/₹4,990/)).toBeInTheDocument();
    expect(mocked.createCheckout).not.toHaveBeenCalled();
  });

  it("shows the signed-provider activation notice when returning from successful checkout", async () => {
    renderBilling("/billing?checkout=success&session_id=cs_test_123");

    await waitFor(() => expect(screen.getByText(/plan updates after signed provider confirmation/i)).toBeInTheDocument());
    expect(mocked.createCheckout).not.toHaveBeenCalled();
  });
});
