export type BillingProvider = "razorpay" | "stripe";
export type BillingCycle = "monthly" | "yearly";
export type UsageKey = "resume_upload" | "roadmap_generation" | "ats_resume_generation" | "ai_chat";
export type BillingFeature = "advanced_roadmap" | "ats_download" | "weekly_reminders";

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
  provider_customer_id?: string | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, unknown>;
};

export type UsageDecision = {
  allowed: boolean;
  planSlug: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
};

export type BillingCheckoutResult =
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
