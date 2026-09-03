import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "../config/env";
import { getSupabaseStorageClient } from "../config/supabase";
import type { BillingCheckoutResult, BillingCycle, BillingProvider } from "../types/billing";
import { HttpError } from "../utils/http-error";
import { billingService } from "./billing.service";

const safeEqualHex = (expected: string, actual: string): boolean => {
  try {
    const left = Buffer.from(expected, "hex");
    const right = Buffer.from(actual, "hex");
    return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
  } catch {
    return false;
  }
};

const addPeriod = (date: Date, cycle: BillingCycle): Date => {
  const next = new Date(date);
  if (cycle === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
};

const providerError = (provider: BillingProvider, status: number): HttpError => new HttpError(
  502,
  `${provider === "razorpay" ? "Razorpay" : "Stripe"} checkout is temporarily unavailable.`,
  "BILLING_PROVIDER_ERROR",
  status < 500,
);

const getProfileEmail = async (userId: string): Promise<string> => {
  const { data, error } = await getSupabaseStorageClient()
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.email) throw new HttpError(400, "A verified billing email is required.", "BILLING_EMAIL_REQUIRED");
  return String(data.email);
};

const stripePriceId = (planSlug: string, cycle: BillingCycle): string => {
  const env = getEnv();
  if (planSlug === "pro" && cycle === "monthly") return env.STRIPE_PRO_MONTHLY_PRICE_ID;
  if (planSlug === "pro" && cycle === "yearly") return env.STRIPE_PRO_YEARLY_PRICE_ID;
  if (planSlug === "premium" && cycle === "monthly") return env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;
  if (planSlug === "premium" && cycle === "yearly") return env.STRIPE_PREMIUM_YEARLY_PRICE_ID;
  return "";
};

const createTransaction = async (input: {
  userId: string;
  planId: string;
  provider: BillingProvider;
  providerOrderId: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  rawResponse: unknown;
}): Promise<void> => {
  const { error } = await getSupabaseStorageClient().from("payment_transactions").insert({
    user_id: input.userId,
    plan_id: input.planId,
    provider: input.provider,
    provider_order_id: input.providerOrderId,
    amount: input.amount,
    currency: input.currency,
    status: "created",
    billing_cycle: input.billingCycle,
    raw_response: input.rawResponse,
  });
  if (error) throw new HttpError(500, "Unable to create checkout transaction.", "BILLING_TRANSACTION_CREATE_FAILED", false);
};

const activateTransaction = async (input: {
  provider: BillingProvider;
  providerOrderId: string;
  providerPaymentId?: string | null;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  providerEventId?: string | null;
  rawResponse?: unknown;
}): Promise<void> => {
  const client = getSupabaseStorageClient();
  const { data: transaction, error: transactionError } = await client
    .from("payment_transactions")
    .select("id,user_id,plan_id,billing_cycle,status")
    .eq("provider", input.provider)
    .eq("provider_order_id", input.providerOrderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (transactionError || !transaction?.id || !transaction.plan_id) {
    throw new HttpError(404, "Checkout transaction was not found.", "BILLING_TRANSACTION_NOT_FOUND");
  }
  if (transaction.status === "paid") return;

  const cycle = transaction.billing_cycle === "yearly" ? "yearly" : "monthly";
  const startsAt = new Date();
  const endsAt = addPeriod(startsAt, cycle);

  const cancelExisting = await client.from("subscriptions")
    .update({ status: "cancelled", cancel_at_period_end: false, updated_at: startsAt.toISOString() })
    .eq("user_id", transaction.user_id)
    .eq("status", "active");
  if (cancelExisting.error) throw new HttpError(500, "Unable to replace current subscription.", "BILLING_SUBSCRIPTION_UPDATE_FAILED", false);

  const { data: subscription, error: subscriptionError } = await client.from("subscriptions").insert({
    user_id: transaction.user_id,
    plan_id: transaction.plan_id,
    status: "active",
    billing_cycle: cycle,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    payment_provider: input.provider,
    provider_subscription_id: input.providerSubscriptionId ?? null,
    provider_customer_id: input.providerCustomerId ?? null,
    cancel_at_period_end: input.provider === "razorpay",
    metadata: { providerOrderId: input.providerOrderId },
  }).select("id").single();
  if (subscriptionError || !subscription?.id) {
    throw new HttpError(500, "Unable to activate subscription.", "BILLING_SUBSCRIPTION_ACTIVATION_FAILED", false);
  }

  const transactionUpdate = await client.from("payment_transactions").update({
    subscription_id: subscription.id,
    provider_payment_id: input.providerPaymentId ?? null,
    provider_event_id: input.providerEventId ?? null,
    status: "paid",
    raw_response: input.rawResponse ?? {},
  }).eq("id", transaction.id);
  if (transactionUpdate.error) throw new HttpError(500, "Unable to persist payment success.", "BILLING_TRANSACTION_UPDATE_FAILED", false);
};

const markTransactionFailed = async (provider: BillingProvider, providerOrderId: string, rawResponse: unknown): Promise<void> => {
  const { error } = await getSupabaseStorageClient().from("payment_transactions")
    .update({ status: "failed", raw_response: rawResponse })
    .eq("provider", provider)
    .eq("provider_order_id", providerOrderId)
    .neq("status", "paid");
  if (error) throw new HttpError(500, "Unable to persist payment failure.", "BILLING_TRANSACTION_UPDATE_FAILED", false);
};

const claimWebhookEvent = async (provider: BillingProvider, eventId: string, eventType: string, payload: unknown): Promise<boolean> => {
  const { error } = await getSupabaseStorageClient().from("billing_webhook_events").insert({
    provider,
    provider_event_id: eventId,
    event_type: eventType,
    payload,
    status: "processing",
  });
  if (!error) return true;
  if ((error as { code?: string }).code === "23505") return false;
  throw new HttpError(500, "Unable to record billing webhook.", "BILLING_WEBHOOK_LOG_FAILED", false);
};

const completeWebhookEvent = async (provider: BillingProvider, eventId: string, error?: Error): Promise<void> => {
  const { error: updateError } = await getSupabaseStorageClient().from("billing_webhook_events").update({
    status: error ? "failed" : "processed",
    error_message: error ? error.message.slice(0, 1000) : null,
    processed_at: new Date().toISOString(),
  }).eq("provider", provider).eq("provider_event_id", eventId);
  if (updateError) throw new HttpError(500, "Unable to finalize billing webhook.", "BILLING_WEBHOOK_LOG_FAILED", false);
};

const verifyStripeSignature = (rawBody: Buffer, signatureHeader: string): boolean => {
  const secret = getEnv().STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const values = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = values.find((part) => part.startsWith("t="));
  const signatures = values.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const timestamp = Number(timestampPart?.slice(2));
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > getEnv().BILLING_WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  return signatures.some((signature) => safeEqualHex(expected, signature));
};

const verifyRazorpayWebhook = (rawBody: Buffer, signature: string): boolean => {
  const secret = getEnv().RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
};

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value && typeof value === "object" ? value as JsonRecord : {};
const stringValue = (value: unknown): string | null => typeof value === "string" && value.length > 0 ? value : null;

const processRazorpayWebhook = async (event: JsonRecord, eventId: string): Promise<void> => {
  const eventType = stringValue(event.event) ?? "unknown";
  const payload = record(event.payload);
  const payment = record(record(payload.payment).entity);
  const orderId = stringValue(payment.order_id);
  if (!orderId) return;

  if (eventType === "payment.captured") {
    await activateTransaction({
      provider: "razorpay",
      providerOrderId: orderId,
      providerPaymentId: stringValue(payment.id),
      providerEventId: eventId,
      rawResponse: event,
    });
  } else if (eventType === "payment.failed") {
    await markTransactionFailed("razorpay", orderId, event);
  }
};

const processStripeWebhook = async (event: JsonRecord, eventId: string): Promise<void> => {
  const eventType = stringValue(event.type) ?? "unknown";
  const object = record(record(record(event.data).object));
  const client = getSupabaseStorageClient();

  if (eventType === "checkout.session.completed") {
    const sessionId = stringValue(object.id);
    if (!sessionId) return;
    await activateTransaction({
      provider: "stripe",
      providerOrderId: sessionId,
      providerPaymentId: stringValue(object.payment_intent),
      providerSubscriptionId: stringValue(object.subscription),
      providerCustomerId: stringValue(object.customer),
      providerEventId: eventId,
      rawResponse: event,
    });
    return;
  }

  const providerSubscriptionId = stringValue(object.subscription) ?? (eventType.startsWith("customer.subscription.") ? stringValue(object.id) : null);
  if (!providerSubscriptionId) return;

  if (eventType === "invoice.payment_failed") {
    await client.from("subscriptions").update({ status: "payment_failed", updated_at: new Date().toISOString() })
      .eq("payment_provider", "stripe").eq("provider_subscription_id", providerSubscriptionId);
    return;
  }

  if (eventType === "customer.subscription.deleted") {
    await client.from("subscriptions").update({ status: "cancelled", cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq("payment_provider", "stripe").eq("provider_subscription_id", providerSubscriptionId);
    return;
  }

  if (eventType === "customer.subscription.updated") {
    const stripeStatus = stringValue(object.status);
    const periodEnd = typeof object.current_period_end === "number"
      ? new Date(object.current_period_end * 1000).toISOString()
      : undefined;
    const nextStatus = stripeStatus === "active" || stripeStatus === "trialing" ? "active" : stripeStatus === "past_due" ? "payment_failed" : undefined;
    const patch: Record<string, unknown> = {
      cancel_at_period_end: object.cancel_at_period_end === true,
      updated_at: new Date().toISOString(),
    };
    if (nextStatus) patch.status = nextStatus;
    if (periodEnd) patch.ends_at = periodEnd;
    await client.from("subscriptions").update(patch)
      .eq("payment_provider", "stripe").eq("provider_subscription_id", providerSubscriptionId);
  }
};

export const billingProviderService = {
  async createCheckout(userId: string, planSlug: string, billingCycle: BillingCycle, requestedProvider?: BillingProvider): Promise<BillingCheckoutResult> {
    const env = getEnv();
    const provider = requestedProvider ?? env.BILLING_DEFAULT_PROVIDER;
    const plan = await billingService.getPlanBySlug(planSlug);
    if (plan.plan_slug === "free") throw new HttpError(400, "The Free plan does not require checkout.", "BILLING_FREE_CHECKOUT_INVALID");
    if (plan.plan_slug !== "pro" && plan.plan_slug !== "premium") throw new HttpError(400, "This plan is not available for checkout.", "BILLING_PLAN_NOT_PURCHASABLE");
    const email = await getProfileEmail(userId);
    const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    if (!(price > 0)) throw new HttpError(400, "This plan has no valid checkout price.", "BILLING_PRICE_INVALID");

    if (provider === "razorpay") {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        throw new HttpError(503, "Razorpay is not configured.", "BILLING_PROVIDER_NOT_CONFIGURED");
      }
      if (plan.currency !== "INR") throw new HttpError(400, "Razorpay checkout is available only for INR plans.", "BILLING_CURRENCY_UNSUPPORTED");
      const amount = Math.round(price * 100);
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: plan.currency,
          receipt: `cg_${Date.now()}_${userId.slice(0, 8)}`,
          notes: { user_id: userId, email, plan_slug: plan.plan_slug, billing_cycle: billingCycle },
        }),
      });
      const body = await response.json().catch(() => ({})) as JsonRecord;
      if (!response.ok || !stringValue(body.id)) throw providerError(provider, response.status);
      const orderId = String(body.id);
      await createTransaction({ userId, planId: plan.id, provider, providerOrderId: orderId, amount: price, currency: plan.currency, billingCycle, rawResponse: body });
      return { provider, orderId, keyId: env.RAZORPAY_KEY_ID, amount, currency: plan.currency, planSlug: plan.plan_slug, planName: plan.plan_name, billingCycle };
    }

    const priceId = stripePriceId(plan.plan_slug, billingCycle);
    if (!env.STRIPE_SECRET_KEY || !priceId) throw new HttpError(503, "Stripe is not configured for this plan and billing cycle.", "BILLING_PROVIDER_NOT_CONFIGURED");
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", `${env.FRONTEND_URL.replace(/\/$/, "")}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${env.FRONTEND_URL.replace(/\/$/, "")}/billing?checkout=cancelled`);
    params.set("client_reference_id", userId);
    params.set("customer_email", email);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[user_id]", userId);
    params.set("metadata[plan_slug]", plan.plan_slug);
    params.set("metadata[billing_cycle]", billingCycle);
    params.set("subscription_data[metadata][user_id]", userId);
    params.set("subscription_data[metadata][plan_slug]", plan.plan_slug);
    params.set("subscription_data[metadata][billing_cycle]", billingCycle);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const body = await response.json().catch(() => ({})) as JsonRecord;
    const sessionId = stringValue(body.id);
    const checkoutUrl = stringValue(body.url);
    if (!response.ok || !sessionId || !checkoutUrl) throw providerError(provider, response.status);
    await createTransaction({ userId, planId: plan.id, provider, providerOrderId: sessionId, amount: price, currency: plan.currency, billingCycle, rawResponse: body });
    return { provider, sessionId, checkoutUrl, planSlug: plan.plan_slug, planName: plan.plan_name, billingCycle };
  },

  async verifyRazorpayPayment(userId: string, input: { orderId: string; paymentId: string; signature: string }): Promise<void> {
    const secret = getEnv().RAZORPAY_KEY_SECRET;
    if (!secret) throw new HttpError(503, "Razorpay is not configured.", "BILLING_PROVIDER_NOT_CONFIGURED");
    const expected = createHmac("sha256", secret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
    if (!safeEqualHex(expected, input.signature)) throw new HttpError(400, "Payment signature verification failed.", "BILLING_SIGNATURE_INVALID");

    const { data, error } = await getSupabaseStorageClient().from("payment_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "razorpay")
      .eq("provider_order_id", input.orderId)
      .maybeSingle();
    if (error || !data) throw new HttpError(404, "Checkout transaction was not found.", "BILLING_TRANSACTION_NOT_FOUND");

    await activateTransaction({ provider: "razorpay", providerOrderId: input.orderId, providerPaymentId: input.paymentId, rawResponse: { verifiedBy: "client_signature" } });
  },

  async handleWebhook(provider: BillingProvider, rawBody: Buffer, signature: string, suppliedEventId?: string): Promise<{ duplicate: boolean }> {
    if (provider === "razorpay") {
      if (!verifyRazorpayWebhook(rawBody, signature)) throw new HttpError(400, "Invalid Razorpay webhook signature.", "BILLING_SIGNATURE_INVALID");
    } else if (!verifyStripeSignature(rawBody, signature)) {
      throw new HttpError(400, "Invalid Stripe webhook signature.", "BILLING_SIGNATURE_INVALID");
    }

    let event: JsonRecord;
    try {
      event = JSON.parse(rawBody.toString("utf8")) as JsonRecord;
    } catch {
      throw new HttpError(400, "Billing webhook payload is invalid JSON.", "BILLING_WEBHOOK_INVALID");
    }

    const eventType = stringValue(provider === "razorpay" ? event.event : event.type) ?? "unknown";
    const eventId = suppliedEventId || stringValue(event.id) || createHash("sha256").update(rawBody).digest("hex");
    const claimed = await claimWebhookEvent(provider, eventId, eventType, event);
    if (!claimed) return { duplicate: true };

    try {
      if (provider === "razorpay") await processRazorpayWebhook(event, eventId);
      else await processStripeWebhook(event, eventId);
      await completeWebhookEvent(provider, eventId);
      return { duplicate: false };
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error("Billing webhook processing failed");
      await completeWebhookEvent(provider, eventId, normalized);
      throw error;
    }
  },

  async cancelAtPeriodEnd(userId: string): Promise<void> {
    const { subscription } = await billingService.getCurrentPlan(userId);
    if (!subscription || subscription.status !== "active") throw new HttpError(400, "There is no paid subscription to cancel.", "BILLING_NO_ACTIVE_SUBSCRIPTION");

    if (subscription.payment_provider === "stripe" && subscription.provider_subscription_id) {
      const secret = getEnv().STRIPE_SECRET_KEY;
      if (!secret) throw new HttpError(503, "Stripe is not configured.", "BILLING_PROVIDER_NOT_CONFIGURED");
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "cancel_at_period_end=true",
      });
      if (!response.ok) throw providerError("stripe", response.status);
    }

    const { error } = await getSupabaseStorageClient().from("subscriptions").update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id).eq("user_id", userId);
    if (error) throw new HttpError(500, "Unable to update subscription cancellation.", "BILLING_SUBSCRIPTION_UPDATE_FAILED", false);
  },
};
