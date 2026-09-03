import { ArrowUpRight, CalendarClock, Check, CircleDashed, Crown, ReceiptIndianRupee, ShieldCheck, WalletCards, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { Button, LoadingButton } from "../components/auth/Button";
import { ErrorMessage, SuccessMessage } from "../components/auth/FeedbackMessage";
import { ApiError } from "../services/api";
import { billingService, type BillingCycle, type BillingHistoryItem, type BillingPlan, type BillingProvider, type CurrentBilling } from "../services/billing.service";

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: { description?: string };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
};

type RazorpayConstructor = new (options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccess) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
}) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const loadRazorpay = async (): Promise<void> => {
  if (window.Razorpay) return;
  const existing = document.querySelector<HTMLScriptElement>('script[data-careerguid-razorpay="true"]');
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay Checkout.")), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.careerguidRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
};

const usageLabels: Record<string, string> = {
  resume_upload: "Resume uploads",
  roadmap_generation: "Roadmap generations",
  ats_resume_generation: "ATS resume generations",
  ai_chat: "AI career chat",
};

const planFeatures = (plan: BillingPlan): string[] => {
  const values = [
    `${plan.resume_upload_limit ?? "Unlimited"} resume uploads / month`,
    `${plan.roadmap_generation_limit ?? "Unlimited"} roadmap generations / month`,
    `${plan.ats_resume_generation_limit ?? "Unlimited"} ATS resume generations / month`,
  ];
  if (plan.plan_slug === "free") values.push("Basic skill-gap and roadmap tools");
  if (plan.plan_slug === "pro" || plan.plan_slug === "premium") values.push("AI RAG roadmap", "ATS PDF/DOCX downloads", "Weekly roadmap reminders");
  if ((plan.ai_chat_limit ?? 0) > 0) values.push(`${plan.ai_chat_limit} AI career chat messages / month`);
  return values;
};

const formatMoney = (amount: number, currency: string): string => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency,
  maximumFractionDigits: 0,
}).format(amount);

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export const BillingPage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [billing, setBilling] = useState<CurrentBilling | null>(null);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [provider, setProvider] = useState<BillingProvider>("razorpay");
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requestedPlan = searchParams.get("plan");

  const loadBilling = useCallback(async (): Promise<void> => {
    const [nextPlans, nextBilling, nextHistory] = await Promise.all([
      billingService.plans(),
      billingService.current(),
      billingService.history(),
    ]);
    setPlans(nextPlans);
    setBilling(nextBilling);
    setHistory(nextHistory);
  }, []);

  useEffect(() => {
    let active = true;
    void loadBilling()
      .then(() => {
        if (!active) return;
        const checkoutState = searchParams.get("checkout");
        if (checkoutState === "success") {
          setSuccess("Payment returned successfully. Your plan updates after signed provider confirmation.");
        } else if (checkoutState === "cancelled") {
          setError("Checkout was cancelled. No plan change was made.");
        }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load billing details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loadBilling, searchParams]);

  const selectedPlan = useMemo(() => {
    if (requestedPlan === "pro" || requestedPlan === "premium") return plans.find((plan) => plan.plan_slug === requestedPlan) ?? null;
    return null;
  }, [plans, requestedPlan]);

  const choosePlan = (planSlug: string): void => {
    if (planSlug === "free") return;
    const next = new URLSearchParams(searchParams);
    next.set("plan", planSlug);
    next.delete("checkout");
    next.delete("session_id");
    setSearchParams(next);
    setError("");
    setSuccess("");
  };

  const checkout = async (plan: BillingPlan): Promise<void> => {
    if (plan.plan_slug !== "pro" && plan.plan_slug !== "premium") return;
    setCheckoutPlan(plan.plan_slug);
    setError("");
    setSuccess("");
    try {
      const checkoutResult = await billingService.createCheckout(plan.plan_slug, cycle, provider);
      if (checkoutResult.provider === "stripe") {
        window.location.assign(checkoutResult.checkoutUrl);
        return;
      }

      await loadRazorpay();
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable in this browser.");

      const instance = new window.Razorpay({
        key: checkoutResult.keyId,
        amount: checkoutResult.amount,
        currency: checkoutResult.currency,
        name: "CareerGuid AI",
        description: `${checkoutResult.planName} · ${checkoutResult.billingCycle}`,
        order_id: checkoutResult.orderId,
        handler: async (payment) => {
          try {
            await billingService.verifyRazorpay({
              orderId: checkoutResult.orderId,
              paymentId: payment.razorpay_payment_id,
              signature: payment.razorpay_signature,
            });
            await loadBilling();
            setSuccess("Payment verified. Your paid plan is active.");
          } catch (caught) {
            if (caught instanceof ApiError && caught.code === "BILLING_PAYMENT_NOT_CAPTURED") {
              setSuccess("Payment is authorised and awaiting capture. Your plan will activate after provider confirmation.");
            } else {
              setError(caught instanceof Error ? caught.message : "Unable to verify payment.");
            }
          } finally {
            setCheckoutPlan(null);
          }
        },
        modal: { ondismiss: () => setCheckoutPlan(null) },
      });
      instance.on("payment.failed", (failure) => {
        setCheckoutPlan(null);
        setError(failure.error?.description || "Payment failed. Please retry or choose another payment method.");
      });
      instance.open();
    } catch (caught) {
      setCheckoutPlan(null);
      setError(caught instanceof Error ? caught.message : "Unable to start checkout.");
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    setCancelling(true);
    setError("");
    setSuccess("");
    try {
      await billingService.cancel();
      await loadBilling();
      setConfirmCancel(false);
      setSuccess("Cancellation scheduled. Paid access remains available until the current period ends.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to schedule cancellation.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <AuthCard className="onboarding-card" eyebrow="Billing" title="Loading your plan" subtitle="Fetching plan, usage, and payment status."><div className="review-loading"><CircleDashed className="spin-icon" size={18} /> Loading billing...</div></AuthCard>;
  }

  const currentPlanSlug = billing?.plan.plan_slug ?? "free";
  const hasPaidSubscription = Boolean(billing?.subscription?.status === "active");

  return (
    <AuthCard className="onboarding-card billing-card" eyebrow="Billing" title="Plan, usage, and upgrades" subtitle="See exactly what your plan includes, what you have used this month, and what happens before you pay.">
      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      <section className="billing-current-grid">
        <article className="billing-current-panel">
          <div className="billing-panel-icon"><WalletCards size={20} /></div>
          <div>
            <span className="eyebrow">Current plan</span>
            <h2>{billing?.plan.plan_name ?? "Free"}</h2>
            <p>{billing?.plan.description || "Your active CareerGuid AI plan."}</p>
          </div>
          <span className={`billing-status billing-status-${hasPaidSubscription ? "paid" : "free"}`}>{hasPaidSubscription ? "Active" : "Free"}</span>
          {billing?.subscription?.ends_at && <div className="billing-period-note"><CalendarClock size={16} /><span>{billing.subscription.cancel_at_period_end ? "Access ends" : "Current period ends"} {formatDate(billing.subscription.ends_at)}</span></div>}
          {hasPaidSubscription && !billing?.subscription?.cancel_at_period_end && (
            <div className="billing-cancel-area">
              {!confirmCancel ? <Button type="button" variant="ghost" onClick={() => setConfirmCancel(true)}>Cancel at period end</Button> : <div className="billing-cancel-confirm"><span>Keep paid access until the current period ends, then stop renewal?</span><LoadingButton type="button" variant="secondary" loading={cancelling} loadingLabel="Scheduling..." onClick={() => { void cancelSubscription(); }}>Confirm cancellation</LoadingButton><Button type="button" variant="ghost" onClick={() => setConfirmCancel(false)}>Keep plan</Button></div>}
            </div>
          )}
        </article>

        <article className="billing-usage-panel">
          <div className="section-heading"><div><span className="eyebrow">Usage limits</span><h2>This month</h2></div><Zap size={18} /></div>
          <div className="billing-usage-list">
            {(billing?.usage ?? []).map((item) => {
              const denominator = item.limit ?? Math.max(item.used, 1);
              const percent = item.limit == null ? 0 : Math.min(100, Math.round((item.used / Math.max(denominator, 1)) * 100));
              return <div className="billing-usage-item" key={item.key}>
                <div><strong>{usageLabels[item.key] ?? item.key}</strong><span>{item.used} / {item.limit ?? "∞"}</span></div>
                <div className="billing-usage-track" aria-label={`${usageLabels[item.key] ?? item.key}: ${item.used} of ${item.limit ?? "unlimited"}`}><span style={{ width: `${percent}%` }} /></div>
              </div>;
            })}
          </div>
          <small>Usage resets for these seeded plans on the first day of each calendar month.</small>
        </article>
      </section>

      <section className="billing-plans-section">
        <div className="section-heading"><div><span className="eyebrow">Available plans</span><h2>Choose the level you need</h2></div><Crown size={19} /></div>
        <div className="billing-cycle-toggle" role="group" aria-label="Billing cycle">
          <button type="button" className={cycle === "monthly" ? "active" : ""} onClick={() => setCycle("monthly")}>Monthly</button>
          <button type="button" className={cycle === "yearly" ? "active" : ""} onClick={() => setCycle("yearly")}>Yearly</button>
        </div>

        <div className="billing-plan-grid">
          {plans.map((plan) => {
            const isCurrent = plan.plan_slug === currentPlanSlug;
            const price = cycle === "yearly" ? plan.price_yearly : plan.price_monthly;
            const isSelected = selectedPlan?.plan_slug === plan.plan_slug;
            return <article className={`billing-plan ${isSelected ? "billing-plan-selected" : ""} ${plan.plan_slug === "pro" ? "billing-plan-featured" : ""}`} key={plan.id}>
              <div className="billing-plan-heading"><div><span className="eyebrow">{plan.plan_slug === "premium" ? "Highest limits" : plan.plan_slug === "pro" ? "Recommended" : "Starter"}</span><h3>{plan.plan_name}</h3></div>{isCurrent && <span className="billing-current-chip">Current</span>}</div>
              <div className="billing-price"><strong>{formatMoney(price, plan.currency)}</strong><span>{price > 0 ? `/${cycle === "yearly" ? "year" : "month"}` : "forever"}</span></div>
              <p>{plan.description}</p>
              <ul>{planFeatures(plan).map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}</ul>
              {plan.plan_slug === "free"
                ? <Button type="button" variant="secondary" disabled>Included</Button>
                : isCurrent || hasPaidSubscription
                  ? <Button type="button" variant="secondary" disabled>{isCurrent ? "Current plan" : "Cancel current plan first"}</Button>
                  : <LoadingButton type="button" loading={checkoutPlan === plan.plan_slug} loadingLabel="Starting checkout..." onClick={() => { choosePlan(plan.plan_slug); void checkout(plan); }}>{isSelected ? "Continue to payment" : `Choose ${plan.plan_name}`}</LoadingButton>}
            </article>;
          })}
        </div>

        {!hasPaidSubscription && selectedPlan && <div className="billing-checkout-strip">
          <div><ShieldCheck size={18} /><span><strong>{selectedPlan.plan_name} selected.</strong> Provider credentials stay server-side and access changes only after signed payment confirmation.</span></div>
          <label>Payment provider<select value={provider} onChange={(event) => setProvider(event.target.value as BillingProvider)}><option value="razorpay">Razorpay</option><option value="stripe">Stripe</option></select></label>
        </div>}
      </section>

      <section className="billing-history-section">
        <div className="section-heading"><div><span className="eyebrow">Billing history</span><h2>Recent transactions</h2></div><ReceiptIndianRupee size={19} /></div>
        {history.length === 0 ? <div className="empty-state-box"><ReceiptIndianRupee size={18} /><div><h3>No payments yet</h3><p>Your completed and failed checkout attempts will appear here.</p></div></div> : <div className="billing-history-table" role="table" aria-label="Billing history">
          <div className="billing-history-row billing-history-head" role="row"><span>Provider</span><span>Amount</span><span>Status</span><span>Date</span></div>
          {history.slice(0, 20).map((item) => <div className="billing-history-row" role="row" key={item.id}><span>{item.provider}</span><span>{formatMoney(Number(item.amount), item.currency)}</span><span className={`billing-transaction-status billing-transaction-${item.status}`}>{item.status}</span><span>{formatDate(item.created_at)}</span></div>)}
        </div>}
      </section>

      <div className="review-bottom-actions"><Link className="button button-secondary" to="/dashboard">Back to dashboard</Link><Link className="text-link billing-support-link" to="/settings">Reminder settings <ArrowUpRight size={14} /></Link></div>
    </AuthCard>
  );
};
