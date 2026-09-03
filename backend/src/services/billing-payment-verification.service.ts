import { getEnv } from "../config/env";
import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";
import { billingProviderService } from "./billing-provider.service";

const providerUnavailable = (status: number): HttpError => new HttpError(
  502,
  "Razorpay payment verification is temporarily unavailable.",
  "BILLING_PROVIDER_ERROR",
  status < 500,
);

export const billingPaymentVerificationService = {
  async verifyRazorpayAndActivate(userId: string, input: { orderId: string; paymentId: string; signature: string }): Promise<void> {
    const env = getEnv();
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new HttpError(503, "Razorpay is not configured.", "BILLING_PROVIDER_NOT_CONFIGURED");
    }

    const transactionResult = await getSupabaseStorageClient().from("payment_transactions")
      .select("id,amount,currency")
      .eq("user_id", userId)
      .eq("provider", "razorpay")
      .eq("provider_order_id", input.orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (transactionResult.error || !transactionResult.data) {
      throw new HttpError(404, "Checkout transaction was not found.", "BILLING_TRANSACTION_NOT_FOUND");
    }

    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.paymentId)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      },
    });
    const payment = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw providerUnavailable(response.status);

    if (payment.order_id !== input.orderId) {
      throw new HttpError(400, "Payment does not belong to this checkout order.", "BILLING_PAYMENT_MISMATCH");
    }
    if (payment.status !== "captured") {
      throw new HttpError(409, "Payment is not captured yet. Access will activate after provider confirmation.", "BILLING_PAYMENT_NOT_CAPTURED");
    }

    const expectedAmount = Math.round(Number(transactionResult.data.amount) * 100);
    const providerAmount = Number(payment.amount);
    const providerCurrency = typeof payment.currency === "string" ? payment.currency : "";
    if (!Number.isFinite(providerAmount) || providerAmount !== expectedAmount || providerCurrency !== transactionResult.data.currency) {
      throw new HttpError(400, "Captured payment amount does not match this checkout.", "BILLING_PAYMENT_MISMATCH");
    }

    await billingProviderService.verifyRazorpayPayment(userId, input);
  },
};
