import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getCurrentPlan: vi.fn(),
  getPlanBySlug: vi.fn(),
  env: {
    BILLING_DEFAULT_PROVIDER: "razorpay",
    BILLING_WEBHOOK_TOLERANCE_SECONDS: 300,
    FRONTEND_URL: "https://app.example.com",
    RAZORPAY_KEY_ID: "rzp_test_key",
    RAZORPAY_KEY_SECRET: "rzp_test_secret",
    RAZORPAY_WEBHOOK_SECRET: "razorpay_webhook_secret",
    STRIPE_SECRET_KEY: "stripe_secret",
    STRIPE_WEBHOOK_SECRET: "stripe_webhook_secret",
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_monthly",
    STRIPE_PRO_YEARLY_PRICE_ID: "price_pro_yearly",
    STRIPE_PREMIUM_MONTHLY_PRICE_ID: "price_premium_monthly",
    STRIPE_PREMIUM_YEARLY_PRICE_ID: "price_premium_yearly",
  },
}));

vi.mock("../config/env", () => ({ getEnv: () => mocked.env }));
vi.mock("../config/supabase", () => ({
  getSupabaseStorageClient: () => ({ from: mocked.from, rpc: mocked.rpc }),
}));
vi.mock("./billing.service", () => ({
  billingService: { getCurrentPlan: mocked.getCurrentPlan, getPlanBySlug: mocked.getPlanBySlug },
}));

import { billingProviderService } from "./billing-provider.service";

const event = {
  id: "evt-rzp-1",
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_123",
        order_id: "order_123",
      },
    },
  },
};

const rawBody = Buffer.from(JSON.stringify(event));
const validSignature = () => createHmac("sha256", mocked.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");

const finalUpdateChain = (result = { error: null }) => {
  const secondEq = vi.fn().mockResolvedValue(result);
  return { eq: vi.fn(() => ({ eq: secondEq })), secondEq };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.rpc.mockResolvedValue({ data: null, error: null });
});

describe("billingProviderService.handleWebhook", () => {
  it("rejects an invalid Razorpay signature before any database mutation", async () => {
    await expect(billingProviderService.handleWebhook("razorpay", rawBody, "deadbeef", event.id)).rejects.toMatchObject({
      statusCode: 400,
      code: "BILLING_SIGNATURE_INVALID",
    });
    expect(mocked.from).not.toHaveBeenCalled();
    expect(mocked.rpc).not.toHaveBeenCalled();
  });

  it("claims, activates, and completes a valid payment.captured event exactly once", async () => {
    const completion = finalUpdateChain();
    let webhookCalls = 0;
    mocked.from.mockImplementation((table: string) => {
      if (table !== "billing_webhook_events") throw new Error(`unexpected table ${table}`);
      webhookCalls += 1;
      if (webhookCalls === 1) {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (webhookCalls === 2) {
        return { update: vi.fn(() => completion) };
      }
      throw new Error("unexpected billing_webhook_events call");
    });

    await expect(billingProviderService.handleWebhook("razorpay", rawBody, validSignature(), event.id)).resolves.toEqual({ duplicate: false });

    expect(mocked.rpc).toHaveBeenCalledWith("activate_paid_subscription", expect.objectContaining({
      p_provider: "razorpay",
      p_provider_order_id: "order_123",
      p_provider_payment_id: "pay_123",
      p_provider_event_id: "evt-rzp-1",
    }));
    expect(completion.secondEq).toHaveBeenCalledWith("provider_event_id", "evt-rzp-1");
  });

  it("returns duplicate=true for an already processed event without activating again", async () => {
    let webhookCalls = 0;
    mocked.from.mockImplementation((table: string) => {
      if (table !== "billing_webhook_events") throw new Error(`unexpected table ${table}`);
      webhookCalls += 1;
      if (webhookCalls === 1) {
        return { insert: vi.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate" } }) };
      }
      if (webhookCalls === 2) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { status: "processed" }, error: null }),
              })),
            })),
          })),
        };
      }
      throw new Error("unexpected billing_webhook_events call");
    });

    await expect(billingProviderService.handleWebhook("razorpay", rawBody, validSignature(), event.id)).resolves.toEqual({ duplicate: true });
    expect(mocked.rpc).not.toHaveBeenCalled();
  });

  it("rejects validly signed but malformed JSON before claiming a webhook event", async () => {
    const malformed = Buffer.from("{not-json");
    const signature = createHmac("sha256", mocked.env.RAZORPAY_WEBHOOK_SECRET).update(malformed).digest("hex");

    await expect(billingProviderService.handleWebhook("razorpay", malformed, signature)).rejects.toMatchObject({
      statusCode: 400,
      code: "BILLING_WEBHOOK_INVALID",
    });
    expect(mocked.from).not.toHaveBeenCalled();
  });
});
