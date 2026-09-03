import { getSupabaseStorageClient } from "../config/supabase";
import type { BillingFeature, BillingPlan, BillingSubscription, UsageDecision, UsageKey } from "../types/billing";
import { HttpError } from "../utils/http-error";

const PLAN_SELECT = "id,plan_name,plan_slug,description,price_monthly,price_yearly,currency,resume_upload_limit,roadmap_generation_limit,ats_resume_generation_limit,ai_chat_limit,is_active";
const USAGE_KEYS: UsageKey[] = ["resume_upload", "roadmap_generation", "ats_resume_generation", "ai_chat"];
const PAID_PLAN_SLUGS = ["pro", "premium"];

const asNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePlan = (row: Record<string, unknown>): BillingPlan => ({
  id: String(row.id),
  plan_name: String(row.plan_name),
  plan_slug: String(row.plan_slug),
  description: typeof row.description === "string" ? row.description : null,
  price_monthly: asNumber(row.price_monthly),
  price_yearly: asNumber(row.price_yearly),
  currency: typeof row.currency === "string" ? row.currency : "INR",
  resume_upload_limit: row.resume_upload_limit == null ? null : asNumber(row.resume_upload_limit),
  roadmap_generation_limit: row.roadmap_generation_limit == null ? null : asNumber(row.roadmap_generation_limit),
  ats_resume_generation_limit: row.ats_resume_generation_limit == null ? null : asNumber(row.ats_resume_generation_limit),
  ai_chat_limit: row.ai_chat_limit == null ? null : asNumber(row.ai_chat_limit),
  is_active: row.is_active !== false,
});

const currentMonthBounds = (): { periodStart: string; periodEnd: string } => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
};

const limitFor = (plan: BillingPlan, key: UsageKey): number | null => {
  if (key === "resume_upload") return plan.resume_upload_limit;
  if (key === "roadmap_generation") return plan.roadmap_generation_limit;
  if (key === "ats_resume_generation") return plan.ats_resume_generation_limit;
  return plan.ai_chat_limit;
};

const paidPlan = (plan: BillingPlan): boolean => PAID_PLAN_SLUGS.includes(plan.plan_slug);

export const billingService = {
  async getPlans(): Promise<BillingPlan[]> {
    const { data, error } = await getSupabaseStorageClient()
      .from("plans")
      .select(PLAN_SELECT)
      .eq("is_active", true)
      .order("price_monthly", { ascending: true });
    if (error) throw new HttpError(500, "Unable to load billing plans.", "BILLING_PLANS_LOAD_FAILED", false);
    return (data ?? []).map((row) => normalizePlan(row as Record<string, unknown>));
  },

  async getPlanBySlug(planSlug: string): Promise<BillingPlan> {
    const { data, error } = await getSupabaseStorageClient()
      .from("plans")
      .select(PLAN_SELECT)
      .eq("plan_slug", planSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) throw new HttpError(404, "Billing plan not found.", "BILLING_PLAN_NOT_FOUND");
    return normalizePlan(data as Record<string, unknown>);
  },

  async getCurrentPlan(userId: string): Promise<{ plan: BillingPlan; subscription: BillingSubscription | null }> {
    const client = getSupabaseStorageClient();
    const nowIso = new Date().toISOString();
    const expiryResult = await client.from("subscriptions").update({ status: "expired", updated_at: nowIso })
      .eq("user_id", userId)
      .eq("status", "active")
      .not("ends_at", "is", null)
      .lte("ends_at", nowIso);
    if (expiryResult.error) throw new HttpError(500, "Unable to normalize subscription state.", "BILLING_SUBSCRIPTION_UPDATE_FAILED", false);

    const { data: subscription, error: subscriptionError } = await client
      .from("subscriptions")
      .select("id,user_id,plan_id,status,billing_cycle,starts_at,ends_at,payment_provider,provider_subscription_id,provider_customer_id,cancel_at_period_end,metadata")
      .eq("user_id", userId)
      .eq("status", "active")
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) throw new HttpError(500, "Unable to load current subscription.", "BILLING_SUBSCRIPTION_LOAD_FAILED", false);

    if (subscription?.plan_id) {
      const { data: planRow, error: planError } = await client
        .from("plans")
        .select(PLAN_SELECT)
        .eq("id", subscription.plan_id)
        .eq("is_active", true)
        .maybeSingle();
      if (planError || !planRow) throw new HttpError(500, "Current billing plan is unavailable.", "BILLING_PLAN_LOAD_FAILED", false);
      return { plan: normalizePlan(planRow as Record<string, unknown>), subscription: subscription as BillingSubscription };
    }

    return { plan: await this.getPlanBySlug("free"), subscription: null };
  },

  async getUsage(userId: string) {
    const { plan, subscription } = await this.getCurrentPlan(userId);
    const { periodStart, periodEnd } = currentMonthBounds();
    const { data, error } = await getSupabaseStorageClient()
      .from("usage_counters")
      .select("usage_key,usage_count,period_start,period_end")
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd);
    if (error) throw new HttpError(500, "Unable to load usage limits.", "BILLING_USAGE_LOAD_FAILED", false);

    const counts = new Map<string, number>();
    for (const row of data ?? []) counts.set(String(row.usage_key), asNumber(row.usage_count));

    return {
      plan,
      subscription,
      periodStart,
      periodEnd,
      usage: USAGE_KEYS.map((key) => {
        const used = counts.get(key) ?? 0;
        const limit = limitFor(plan, key);
        return { key, used, limit, remaining: limit == null ? null : Math.max(limit - used, 0) };
      }),
    };
  },

  async consume(userId: string, usageKey: UsageKey, amount = 1): Promise<UsageDecision> {
    const { data, error } = await getSupabaseStorageClient().rpc("consume_plan_usage", {
      p_user_id: userId,
      p_usage_key: usageKey,
      p_amount: amount,
    });
    if (error || !data || typeof data !== "object") {
      throw new HttpError(500, "Unable to enforce plan usage.", "BILLING_USAGE_ENFORCEMENT_FAILED", false);
    }

    const decision = data as unknown as UsageDecision;
    if (!decision.allowed) {
      throw new HttpError(402, `You have reached your ${decision.planSlug} plan limit for this billing period. Upgrade to continue.`, "PLAN_LIMIT_REACHED");
    }
    return decision;
  },

  async refund(userId: string, usageKey: UsageKey, amount = 1): Promise<void> {
    const { error } = await getSupabaseStorageClient().rpc("refund_plan_usage", {
      p_user_id: userId,
      p_usage_key: usageKey,
      p_amount: amount,
    });
    if (error) throw new HttpError(500, "Unable to refund reserved plan usage.", "BILLING_USAGE_REFUND_FAILED", false);
  },

  async getUsersWithFeature(userIds: string[], _feature: BillingFeature): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const client = getSupabaseStorageClient();
    const plansResult = await client.from("plans").select("id").in("plan_slug", PAID_PLAN_SLUGS).eq("is_active", true);
    if (plansResult.error) throw new HttpError(500, "Unable to load paid plan entitlements.", "BILLING_PLANS_LOAD_FAILED", false);
    const planIds = (plansResult.data ?? []).map((row) => String(row.id));
    if (planIds.length === 0) return new Set();

    const subscriptionsResult = await client.from("subscriptions")
      .select("user_id,plan_id,ends_at")
      .in("user_id", userIds)
      .in("plan_id", planIds)
      .eq("status", "active");
    if (subscriptionsResult.error) throw new HttpError(500, "Unable to load user entitlements.", "BILLING_SUBSCRIPTION_LOAD_FAILED", false);

    const now = Date.now();
    return new Set((subscriptionsResult.data ?? [])
      .filter((row) => !row.ends_at || Date.parse(String(row.ends_at)) > now)
      .map((row) => String(row.user_id)));
  },

  async hasFeature(userId: string, _feature: BillingFeature): Promise<boolean> {
    const { plan } = await this.getCurrentPlan(userId);
    return paidPlan(plan);
  },

  async requireFeature(userId: string, feature: BillingFeature): Promise<BillingPlan> {
    const { plan } = await this.getCurrentPlan(userId);
    if (paidPlan(plan)) return plan;

    const message = feature === "advanced_roadmap"
      ? "AI RAG roadmaps require a Pro or Premium plan."
      : feature === "ats_download"
        ? "ATS resume downloads require a Pro or Premium plan."
        : "Weekly reminder emails require a Pro or Premium plan.";
    throw new HttpError(402, message, "PLAN_UPGRADE_REQUIRED");
  },

  async getHistory(userId: string) {
    const { data, error } = await getSupabaseStorageClient()
      .from("payment_transactions")
      .select("id,subscription_id,plan_id,provider,provider_payment_id,provider_order_id,amount,currency,status,billing_cycle,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new HttpError(500, "Unable to load billing history.", "BILLING_HISTORY_LOAD_FAILED", false);
    return data ?? [];
  },
};
