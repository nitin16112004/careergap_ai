import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle,
  };
  return {
    chain,
    maybeSingle,
    from: vi.fn(() => chain),
    verifyRazorpayPayment: vi.fn(),
    env: { RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: "rzp_test_secret" },
  };
});

vi.mock("../config/env", () => ({ getEnv: () => mocked.env }));
vi.mock("../config/supabase", () => ({ getSupabaseStorageClient: () => ({ from: mocked.from }) }));
vi.mock("./billing-provider.service", () => ({
  billingProviderService: { verifyRazorpayPayment: mocked.verifyRazorpayPayment },
}));

import { billingPaymentVerificationService } from "./billing-payment-verification.service";

const input = { orderId: "order_123", paymentId: "pay_123", signature: "a".repeat(64) };
const transaction = { id: "txn-1", amount: 499, currency: "INR" };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocked.env.RAZORPAY_KEY_ID = "rzp_test_key";
  mocked.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
  mocked.maybeSingle.mockResolvedValue({ data: transaction, error: null });
  mocked.verifyRazorpayPayment.mockResolvedValue(undefined);
});

const providerResponse = (body: Record<string, unknown>, ok = true, status = 200) => vi.spyOn(globalThis, "fetch").mockResolvedValue({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body),
} as any);

describe("billingPaymentVerificationService.verifyRazorpayAndActivate", () => {
  it("fails before touching storage when Razorpay server credentials are absent", async () => {
    mocked.env.RAZORPAY_KEY_ID = "";
    mocked.env.RAZORPAY_KEY_SECRET = "";

    await expect(billingPaymentVerificationService.verifyRazorpayAndActivate("user-1", input)).rejects.toMatchObject({
      statusCode: 503,
      code: "BILLING_PROVIDER_NOT_CONFIGURED",
    });
    expect(mocked.from).not.toHaveBeenCalled();
  });

  it("rejects verification when the checkout transaction is not owned by the user", async () => {
    mocked.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(billingPaymentVerificationService.verifyRazorpayAndActivate("user-1", input)).rejects.toMatchObject({
      statusCode: 404,
      code: "BILLING_TRANSACTION_NOT_FOUND",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not activate an authorised payment that has not been captured", async () => {
    providerResponse({ order_id: input.orderId, status: "authorized", amount: 49_900, currency: "INR" });

    await expect(billingPaymentVerificationService.verifyRazorpayAndActivate("user-1", input)).rejects.toMatchObject({
      statusCode: 409,
      code: "BILLING_PAYMENT_NOT_CAPTURED",
    });
    expect(mocked.verifyRazorpayPayment).not.toHaveBeenCalled();
  });

  it("rejects captured payments whose provider order or amount does not match the stored checkout", async () => {
    providerResponse({ order_id: "order_other", status: "captured", amount: 49_900, currency: "INR" });
    await expect(billingPaymentVerificationService.verifyRazorpayAndActivate("user-1", input)).rejects.toMatchObject({ code: "BILLING_PAYMENT_MISMATCH" });

    vi.restoreAllMocks();
    providerResponse({ order_id: input.orderId, status: "captured", amount: 49_800, currency: "INR" });
    await expect(billingPaymentVerificationService.verifyRazorpayAndActivate("user-1", input)).rejects.toMatchObject({ code: "BILLING_PAYMENT_MISMATCH" });
    expect(mocked.verifyRazorpayPayment).not.toHaveBeenCalled();
  });

  it("delegates activation only after Razorpay confirms exact captured order, amount, and currency", async () => {
    const fetchSpy = providerResponse({ order_id: input.orderId, status: "captured", amount: 49_900, currency: "INR" });

    await expect(billingPaymentVerificationService.verifyRazorpayAndActivate("user-1", input)).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledWith("https://api.razorpay.com/v1/payments/pay_123", expect.objectContaining({
      headers: { Authorization: expect.stringMatching(/^Basic /) },
    }));
    expect(mocked.verifyRazorpayPayment).toHaveBeenCalledWith("user-1", input);
  });

  it("maps provider HTTP failures to a billing provider error without activation", async () => {
    providerResponse({ error: "upstream" }, false, 503);

    await expect(billingPaymentVerificationService.verifyRazorpayAndActivate("user-1", input)).rejects.toMatchObject({
      statusCode: 502,
      code: "BILLING_PROVIDER_ERROR",
    });
    expect(mocked.verifyRazorpayPayment).not.toHaveBeenCalled();
  });
});
