# CareerGuid AI — Billing / Payment Setup

This document describes the implementation and live-validation contract for the documented **Phase 14 — Payment and Upgrade Flow** built on top of `feat/v1-4-reminders`.

The authoritative product requirements remain the files under `documentation/` and `documentation/extracted/`. This guide explains how the current code satisfies that contract and what still requires real provider/environment validation.

## Scope

The billing phase implements:

- Free, Pro, and Premium plans.
- Monthly usage counters for:
  - resume uploads
  - roadmap generation
  - ATS resume generation
  - AI chat
- Atomic usage reservation before metered operations.
- Usage refund when a reserved synchronous operation fails.
- One-time async RAG usage refund after terminal worker failure.
- Paid feature gates for advanced RAG roadmaps, ATS downloads, and reminder-email entitlements.
- Billing page with current plan, usage, pricing/upgrade actions, cancellation state, and transaction history.
- Razorpay checkout for INR plans.
- Stripe hosted subscription checkout.
- Provider-signature verification.
- Idempotent webhook processing.
- Persisted subscriptions and payment transaction history.
- Cancel-at-period-end support.

## Branch Contract

Billing work lives on:

```text
feat/v1-4-reminders
        |
        v
feat/billing-upgrade
```

Keep this dependency intact while the phase stack is under review. Do not retarget or flatten the branch only to simplify history.

## Database Migrations

Apply all migrations in order, including:

```text
supabase/migrations/202609040004_billing_enforcement.sql
supabase/migrations/202609040005_billing_async_refunds.sql
```

The billing enforcement migration extends the canonical billing schema with:

- provider customer/subscription metadata
- provider-event idempotency fields
- `billing_webhook_events`
- `consume_plan_usage(...)`
- `refund_plan_usage(...)`
- `activate_paid_subscription(...)`

The async refund migration adds:

- `refund_rag_usage_once(...)`

These RPCs are service-role-only. Do not grant normal authenticated users direct execution rights.

## Seed Plans

`supabase/seed.sql` configures the current development plan catalog:

| Plan | Monthly | Yearly | Resume uploads | Roadmaps | ATS generations | AI chat |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Free | INR 0 | INR 0 | 1 | 2 | 1 | 0 |
| Pro | INR 499 | INR 4,990 | 10 | 20 | 10 | 100 |
| Premium | INR 999 | INR 9,990 | 25 | 50 | 25 | 500 |

Treat these as seed/configuration values, not hard-coded product logic. Production pricing should be reviewed before release.

## Backend Environment

Provider credentials are backend-only. Never expose them through `VITE_*` variables.

```dotenv
BILLING_DEFAULT_PROVIDER=razorpay
BILLING_WEBHOOK_TOLERANCE_SECONDS=300

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_PREMIUM_MONTHLY_PRICE_ID=
STRIPE_PREMIUM_YEARLY_PRICE_ID=
```

Also configure the normal backend/Supabase variables, especially `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `FRONTEND_URL`.

## Billing APIs

Public/provider-authenticated endpoints:

```text
GET  /api/v1/billing/plans
POST /api/v1/billing/webhook
POST /api/v1/billing/webhook/:provider
```

Authenticated user endpoints:

```text
GET  /api/v1/billing/current-plan
GET  /api/v1/billing/history
POST /api/v1/billing/create-checkout
POST /api/v1/billing/verify-razorpay
POST /api/v1/billing/cancel
```

Webhook routes do not use a user JWT. They are authenticated by provider signatures and require the preserved raw request body.

## Razorpay Flow

Current Razorpay flow:

1. Authenticated user selects Pro/Premium and billing cycle.
2. Backend creates a Razorpay order using backend credentials.
3. Backend persists a `payment_transactions` row with status `created`.
4. Frontend completes Razorpay checkout.
5. Backend verifies the Razorpay payment signature before browser-driven activation.
6. Provider webhook signature is independently verified for webhook-driven activation/failure handling.
7. `activate_paid_subscription(...)` atomically activates the entitlement and marks the transaction paid.

For a live environment configure the Razorpay webhook URL to one of:

```text
https://<backend-host>/api/v1/billing/webhook/razorpay
https://<backend-host>/api/v1/billing/webhook
```

The provider-specific route is preferred because it removes provider inference ambiguity.

## Stripe Flow

Current Stripe flow uses hosted Checkout in `subscription` mode:

1. Backend chooses the configured Stripe Price ID for plan + cycle.
2. Backend creates a Checkout Session and persists its session ID as the provider order ID.
3. Stripe redirects back to `/billing` after checkout.
4. `checkout.session.completed` activates the subscription.
5. Subscription/invoice webhooks synchronize cancellation and payment-failure state.

Configure the Stripe webhook URL as:

```text
https://<backend-host>/api/v1/billing/webhook/stripe
```

The code rejects Stripe webhook timestamps outside `BILLING_WEBHOOK_TOLERANCE_SECONDS`.

## Usage Enforcement

Metered operations reserve usage before executing:

- resume upload -> `resume_upload`
- basic/RAG roadmap generation -> `roadmap_generation`
- ATS resume generation -> `ats_resume_generation`

When the plan limit is reached, the API returns HTTP `402` with code:

```text
PLAN_LIMIT_REACHED
```

Synchronous failures refund the reserved unit.

RAG roadmap generation is asynchronous. A terminal worker failure calls `refund_rag_usage_once(...)`, which uses the AI job creation month and marks the AI job payload so the same reservation cannot be refunded twice.

## Paid Feature Gates

Current paid-plan feature gates require an active Pro or Premium subscription for:

- advanced RAG roadmap generation
- ATS PDF/DOCX download
- weekly reminder-email entitlement selection

Free users still retain the product behavior allowed by their usage limits and non-paid feature paths.

## Webhook Idempotency

`billing_webhook_events` stores provider + provider-event ID with a unique constraint.

Behavior:

- first event -> claimed and processed
- duplicate already-processing/processed event -> acknowledged without repeating side effects
- previously failed event -> can be reclaimed and retried

Payment activation itself is also protected by the transaction row lock in `activate_paid_subscription(...)` so browser verification and provider webhook delivery can race safely.

## Frontend Validation

Validate `/billing` with a real authenticated session:

- current plan renders correctly
- each usage counter shows used/limit/remaining
- Free plan cannot create checkout
- Pro/Premium monthly/yearly choices use the expected amount
- provider errors render as explicit failures
- checkout cancellation returns cleanly to billing
- successful checkout updates current plan after provider confirmation
- transaction history displays persisted payments
- cancel-at-period-end state is visible
- upgrade-required API errors route the user back to billing without losing context

## Live Provider Checklist

Repository CI does **not** prove a real payment integration. Before release, validate all of the following in provider test/sandbox mode first:

- [ ] Supabase migrations applied successfully.
- [ ] `supabase/seed.sql` applied and Free/Pro/Premium plans are active.
- [ ] Razorpay test checkout creates an order and a local transaction.
- [ ] Razorpay browser signature verification rejects a tampered signature.
- [ ] Razorpay webhook signature verification rejects a tampered payload.
- [ ] Duplicate Razorpay webhook delivery does not create duplicate subscriptions.
- [ ] Stripe test Checkout uses the correct Price ID for every paid plan/cycle.
- [ ] Stripe webhook timestamp/signature validation succeeds only for genuine events.
- [ ] Duplicate Stripe webhook delivery is idempotent.
- [ ] Payment failure does not grant entitlement.
- [ ] Successful payment grants the expected paid entitlement.
- [ ] Expired subscriptions fall back to Free.
- [ ] Cancel-at-period-end preserves access until `ends_at`.
- [ ] Free resume upload limit is enforced.
- [ ] Free roadmap generation limit is enforced.
- [ ] Free ATS generation limit is enforced.
- [ ] Failed synchronous metered operations refund usage.
- [ ] Terminal failed async RAG work refunds usage once.
- [ ] Billing/history records are visible only to the owning user.
- [ ] Provider secrets never appear in frontend bundles, logs, or API payloads.

## Automated Validation

The billing branch is covered by the existing Product CI pipeline. Before merging, keep all existing backend/frontend/AI/infrastructure gates green and retain billing-specific regression coverage for:

- atomic plan usage
- limit rejection (`402`, `PLAN_LIMIT_REACHED`)
- usage refund behavior
- paid entitlements
- webhook signature/idempotency logic
- subscription activation/state transitions

## Release Boundary

Do not describe billing as production-validated until real sandbox/live-provider testing has been completed. A green CI run proves repository-level behavior only; it does not prove provider credentials, webhook delivery, Supabase migration state, DNS/TLS, or production payment configuration.
