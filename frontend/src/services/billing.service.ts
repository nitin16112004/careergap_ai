import { apiRequest } from "./api";

export type BillingProvider = "razorpay" | "stripe";
export type BillingCycle = "monthly" | "yearly";
export type UsageKey = "resume_upload" | "roadmap_generation" | "ats_resume_generation" | "ai_chat";

export type BillingPlan = {
  id: string;
  plan_name: string;
  plan_slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  resume_upload_limit: number | null;
  roadmap_generation_limit: number | null;
  ats_resume_generation_limit: number | null;
  ai_chat_limit: number | null;
  is_active: boolean;
};

export type BillingSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "free" | "active" | "cancelled" | "expired" | "payment_failed";
  billing_cycle: "monthly" | "yearly" | "none";
  starts_at: string;
  ends_at: string | null;
  payment_provider: string | null;
  provider_subscription_id: string | null;
  cancel_at_period_end?: boolean;
};

export type BillingUsageItem = {
  key: UsageKey;
  used: number;
  limit: number | null;
  remaining: number | null;
};

export type CurrentBilling = {
  plan: BillingPlan;
  subscription: BillingSubscription | null;
  periodStart: string;
  periodEnd: string;
  usage: BillingUsageItem[];
};

export type BillingHistoryItem = {
  id: string;
  subscription_id: string | null;
  plan_id: string | null;
  provider: BillingProvider;
  provider_payment_id: string | null;
  provider_order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed" | "refunded";
  billing_cycle: BillingCycle | "none";
  created_at: string;
};

export type CheckoutResult =
  | {
      provider: "razorpay";
      orderId: string;
      keyId: string;
      amount: number;
      currency: string;
      planSlug: string;
      planName: string;
      billingCycle: BillingCycle;
    }
  | {
      provider: "stripe";
      sessionId: string;
      checkoutUrl: string;
      planSlug: string;
      planName: string;
      billingCycle: BillingCycle;
    };

export const billingService = {
  plans: () => apiRequest<BillingPlan[]>("/billing/plans"),
  current: () => apiRequest<CurrentBilling>("/billing/current-plan"),
  history: () => apiRequest<BillingHistoryItem[]>("/billing/history"),
  createCheckout: (planSlug: "pro" | "premium", billingCycle: BillingCycle, provider?: BillingProvider) => apiRequest<CheckoutResult>("/billing/create-checkout", {
    method: "POST",
    body: JSON.stringify({ planSlug, billingCycle, provider }),
  }),
  verifyRazorpay: (input: { orderId: string; paymentId: string; signature: string }) => apiRequest<void>("/billing/verify-razorpay", {
    method: "POST",
    body: JSON.stringify(input),
  }),
  cancel: () => apiRequest<void>("/billing/cancel", { method: "POST" }),
};
