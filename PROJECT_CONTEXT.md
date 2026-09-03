# CareerGuid AI — Project Context

## Authoritative Documentation

Product and implementation decisions must follow the six documents under `documentation/` and their Markdown copies under `documentation/extracted/`:

1. Product Requirements Document (PRD)
2. Technical Requirements Document (TRD)
3. Backend Schema
4. Implementation Plan
5. UI/UX Design Brief
6. Web Flow Document

Use the PRD for product behavior/scope, Web Flow for journeys and redirects, UI/UX brief for presentation/accessibility, TRD for architecture/security/performance, Backend Schema for database ownership/RLS/storage, and Implementation Plan for build order.

## Product Definition

CareerGuid AI (also referenced as SkillSight in the documentation) is a resume-first career guidance platform for students, freshers, bootcamp learners, and job seekers.

Primary journey:

1. Sign up and verify email.
2. Upload PDF/DOCX resume.
3. Parse profile details.
4. Review/correct extracted data.
5. Add target role and career preferences.
6. Persist profile with source traceability.
7. Compare current skills against role requirements.
8. Prioritize missing skills.
9. Generate deterministic or true-RAG weekly roadmap.
10. Complete roadmap tasks and track progress.
11. Receive automatic roadmap reminders when appropriate.
12. Improve an ATS-oriented resume without fabricating user facts.
13. Enforce plan usage and support explicit billing/upgrade flows.
14. Continue into full admin, public pages, deployment, and polish.

Every product screen should answer: **what should the user do next?**

## Required Stack

- Frontend: React + TypeScript + Vite.
- Backend: Node.js + Express + TypeScript modular monolith.
- AI service: Python FastAPI.
- Database/Auth/Storage: Supabase.
- Vector retrieval: Supabase pgvector.
- Queue/cache/rate limiting/scheduler state: Redis + BullMQ.
- Deployment: Docker, Docker Compose, Nginx.

MongoDB is not part of the documented architecture.

## Branch / Review Structure

Stable development baseline: `dev`.

Dependent phase branches:

- `feat/mvp-backbone` — Version 1.0 MVP, draft PR #1.
- `feat/ats-v1-1` — Version 1.1 ATS, draft PR #2 targeting MVP.
- `feat/rag-v1-2` — Version 1.2 true RAG, draft PR #3 targeting ATS.
- `feat/v1-3-hardening` — Version 1.3 production hardening, draft PR #5 targeting RAG.
- `feat/v1-4-reminders` — Version 1.4 progress/reminder automation targeting Version 1.3.
- `feat/billing-upgrade` — documented Phase 14 payment/upgrade flow targeting Version 1.4.

Do not flatten these phase boundaries only to simplify history. Keep contracts reviewable and do not merge dependent phases out of order.

## Implemented Product Phases

### Version 1.0 MVP

- Supabase Auth + JWT-protected backend routes.
- Verification, forgot/reset password, refresh, logout, `/me`.
- Redis-backed auth rate limiting.
- Private PDF/DOCX resume upload/validation.
- BullMQ resume parsing.
- FastAPI deterministic resume extraction.
- Resume review/edit + final onboarding.
- `profile_field_sources` traceability.
- `onboarding_completed` route enforcement.
- Job roles + weighted skill-gap analysis.
- Persisted skill analyses/items.
- Live dashboard.
- Honest `basic_template` roadmap.
- Roadmap task completion/progress.

### Version 1.1 ATS

- No artificial score floor/demo fallback.
- Content grounded in reviewed user facts.
- No invented employers/projects/education/certifications/achievements.
- Editable generated resume versions.
- Private PDF/DOCX export.
- Signed short-lived download URLs.
- Regression tests for factual grounding and file signatures.

### Version 1.2 true RAG

Pipeline:

`profile + skill analysis + role -> embedding -> pgvector similarity retrieval -> retrieved knowledge -> validated LLM roadmap -> BullMQ worker -> Supabase persistence`

Guarantees:

- `basic_template` and `rag` are truthful separate modes.
- Missing provider configuration fails closed.
- Embeddings are exactly 1536 finite values for current schema.
- Retrieval uses service-role-only pgvector RPC.
- LLM output is validated by Pydantic and backend before persistence.
- Resource references are restricted to retrieved context.
- Empty retrieval returns a real RAG-not-ready error.
- RAG is asynchronous through `ai_jobs` + `roadmapGenerationQueue`.
- Retry state/count synchronizes with `ai_jobs`.
- `rag_queries` records model/retrieval/latency/error metadata.
- Curated KB seed contains no fake precomputed embeddings.
- Admin-only KB indexing uses configured embedding provider.
- Frontend offers separate **Generate AI roadmap** and **Use basic plan** actions.

### Version 1.3 production hardening

Implemented on `feat/v1-3-hardening`:

- Structured Pino logging and sensitive-field redaction.
- `X-Request-Id` correlation through request/response/error payloads.
- Severity-aware HTTP logs.
- Liveness + dependency-aware readiness endpoints.
- DB/Redis/AI latency probes.
- Production Helmet/CSP/HSTS/referrer/opener/resource policy.
- Env-driven CORS allowlist and explicit denied-origin errors.
- Trusted proxy configuration.
- Redis reconnect/backoff/connect timeout and `rediss://` support.
- Bounded backend/worker graceful shutdown.
- Dead-letter records for exhausted resume/RAG jobs.
- Admin runtime + queue operational summaries.
- Production frontend image and SPA Nginx.
- Public edge Nginx with backend/frontend internal networking.
- Redis authenticated/internal by default.
- Scale-friendly Compose without fixed `container_name` values.
- CI gates for npm high-severity audits, typecheck/tests/build, Python dependency/compile/tests, Compose, Docker images, and Nginx syntax.
- Dependabot for npm/pip/Actions/Docker.

### Version 1.4 progress + reminder automation

Implemented on `feat/v1-4-reminders`:

#### Canonical progress

- `GET /api/v1/roadmap/:roadmapId/progress`.
- Calculates total/completed/pending/skipped/overdue tasks.
- Detects current roadmap week from persisted week dates.
- Calculates current-week pending/overdue work.
- Calculates actual vs expected checkpoint progress.
- Exposes `behindSchedule` without mutating task status merely because a due date passed.
- Dashboard and roadmap reminder UX consume this same progress contract.

#### Activity tracking

- `profiles.last_activity_at` added through the Version 1.4 migration.
- Authenticated API activity updates it through a Redis throttle rather than on every request.
- Activity tracking fails open so transient tracking failure does not block user requests.

#### Reminder preferences and persistence

- New `reminder_preferences` table with:
  - master email toggle
  - weekly-pending toggle
  - inactivity toggle
  - motivational toggle
- User-owned RLS for preference reads/writes.
- Scheduler reminder logs cannot be forged by normal direct-user RLS inserts.
- `reminder_logs` stores durable dedupe key, reason, metadata, delivery status/error, sent time.
- `notifications` and `email_logs` link back to reminder logs.

#### Reminder policy

A weekly scan evaluates one newest active roadmap per user and selects at most one reminder using priority:

1. `inactive_user` — no activity for configured inactivity period (default 7 days).
2. `weekly_pending_task` — current roadmap week still has pending tasks.
3. `motivational` — progress is behind expected checkpoint / overdue work exists.

Master/per-type preference switches are respected.

Deterministic dedupe keys plus PostgreSQL uniqueness protect against duplicate scans/retries/races. Weekly reminder dedupe remains schema-enforced as defense in depth.

#### Scheduler + delivery

- BullMQ `weeklyReminderQueue` uses durable Job Scheduler state in Redis.
- Default schedule: Monday 09:00 in configured `REMINDER_CRON_TIMEZONE`.
- Scheduler creates persisted reminder/notification/email records before email delivery.
- Dedicated `emailQueue` worker handles transactional email asynchronously.
- Resend-compatible provider boundary for real delivery.
- Local `console` provider is allowed only outside production; production fails closed.
- Email jobs retry with exponential backoff.
- After provider acceptance, a Redis delivery receipt is saved before DB synchronization so a DB-sync retry can repair state without sending the email twice.
- Exhausted email jobs write to the Version 1.3 `deadLetterQueue`.

#### APIs

User:

- `GET /api/v1/reminders/status`
- `GET /api/v1/reminders/preferences`
- `PUT /api/v1/reminders/preferences`
- `GET /api/v1/reminders/logs`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/read-all`
- `PATCH /api/v1/notifications/:notificationId/read`
- `GET /api/v1/roadmap/:roadmapId/progress`

Admin-only:

- `POST /api/v1/reminders/check-weekly`
- `GET /api/v1/reminders/logs/:userId`

Normal users do not get a manual "send reminder" capability.

#### Frontend

- `/settings` reminder preferences.
- Recent reminder delivery history.
- In-app notification history + unread count.
- Exact `/roadmap/:roadmapId` route.
- Dashboard reminder status, last reason/date, overdue counts, unread notifications.
- Roadmap behind-schedule banner.
- Current-week pending/overdue/expected progress.
- Last reminder reason/date + link to reminder settings.

#### Runtime topology

Default Compose now contains:

- `edge`
- `frontend`
- `backend`
- `ai-service`
- `resume-worker`
- `roadmap-worker`
- `email-worker`
- `reminder-scheduler`
- `redis`

Reminder/email processes remain internal services and share the same Supabase/Redis contracts as the backend.

### Phase 14 payment + upgrade

Implemented on `feat/billing-upgrade` as a direct descendant of Version 1.4.

#### Plans and usage

- Canonical `plans`, `subscriptions`, `payment_transactions`, and `usage_counters` tables are used.
- Seeded Free, Pro, and Premium plans carry monthly/yearly prices and documented usage-limit columns.
- `consume_plan_usage(...)` atomically locks/creates the monthly counter before incrementing it.
- Limit exhaustion returns HTTP `402` with `PLAN_LIMIT_REACHED`.
- Resume upload, roadmap generation, and ATS resume generation reserve metered usage before work starts.
- Synchronous failures refund the reserved unit.
- Terminal failed async RAG generation calls `refund_rag_usage_once(...)` so the original month is refunded exactly once.

#### Paid entitlements

An active Pro/Premium subscription is required for current paid feature gates:

- true RAG/advanced roadmap generation
- ATS PDF/DOCX download
- weekly reminder-email entitlement selection

Expired or missing paid subscriptions resolve back to the Free plan.

#### Provider/payment boundary

- Razorpay order checkout is supported for INR plans.
- Razorpay browser payment signatures are verified server-side before activation.
- Razorpay webhook signatures are verified from the preserved raw request body.
- Stripe hosted Checkout is supported in subscription mode using configured Price IDs.
- Stripe webhook signatures include timestamp tolerance validation.
- `billing_webhook_events` provides provider-event idempotency and failed-event retry state.
- `activate_paid_subscription(...)` locks the checkout transaction so browser callback and webhook activation can race safely.
- Payment failure does not grant paid entitlement.
- Subscription cancellation/payment-failure state is persisted.

#### Billing APIs

Public/provider-authenticated:

- `GET /api/v1/billing/plans`
- `POST /api/v1/billing/webhook`
- `POST /api/v1/billing/webhook/:provider`

Authenticated user:

- `GET /api/v1/billing/current-plan`
- `GET /api/v1/billing/history`
- `POST /api/v1/billing/create-checkout`
- `POST /api/v1/billing/verify-razorpay`
- `POST /api/v1/billing/cancel`

#### Frontend

- `/billing` shows current plan and monthly usage.
- Pricing/upgrade actions support monthly/yearly paid-plan selection.
- Provider checkout state and explicit errors are surfaced.
- Billing history is backed by persisted payment transactions.
- Cancellation state remains visible to the user.

#### Setup guide

See `BILLING_PAYMENT_SETUP.md` for migrations, provider environment variables, webhook endpoints, live sandbox/provider testing, and the release-validation boundary.

## Security / Integrity Rules

- Verify Supabase JWTs on protected APIs.
- Keep service-role and provider credentials server-only.
- Keep RLS enabled for defense in depth.
- Check ownership before service-role user-data reads/writes.
- Validate resume type/signature/size.
- Use Redis-backed limits for security/cost-sensitive actions.
- Never commit Supabase/Redis/LLM/email/payment secrets.
- Never fabricate ATS resume facts.
- Treat LLM output as untrusted until validated.
- Never label deterministic generation as RAG.
- Never silently turn RAG failure into fake RAG success.
- Do not expose scheduler-only reminder creation to normal users.
- Use DB-level reminder and billing-webhook idempotency, not only in-memory checks.
- Verify payment-provider signatures before changing subscription state.
- Do not grant user JWTs direct execution of service-role billing enforcement RPCs.
- Do not log JWTs/passwords/OTPs/secrets or unnecessary sensitive profile/payment data.

## Validation Standard

Before merging a phase:

- Backend high-severity audit passes.
- Backend TypeScript typecheck passes.
- Backend tests pass.
- Backend production build passes.
- Frontend high-severity audit passes.
- Frontend TypeScript typecheck passes.
- Frontend tests pass.
- Frontend production build passes.
- AI dependency/compile/tests pass when Python is in scope.
- Compose model validates.
- Backend/frontend/AI Docker images build.
- Edge Nginx config validates.
- Route ownership/admin/error/empty/success paths are tested where relevant.
- External-service validation boundaries are stated honestly.

Repository CI does **not** prove live external integration.

## Live Validation Boundary

Before a real release, explicitly live-validate:

- Supabase migrations + RLS/storage policies
- auth/onboarding/skill-gap/dashboard
- ATS private storage/PDF/DOCX
- provider-backed RAG + KB indexing
- Redis auth/TLS/private networking
- HTTPS/domain configuration
- deployed readiness
- resume/RAG/email worker processing
- weekly scheduler execution
- reminder duplicate prevention
- real Resend sender/API delivery
- failed-email retries + dead-letter state
- Razorpay and/or Stripe sandbox/live checkout
- payment signature verification + webhook idempotency
- payment failure/expiry/cancellation transitions
- plan usage enforcement + refund behavior
- billing ownership/history visibility
- centralized logs/error tracking/alerts
- queue backlog alerts
- backup/recovery procedures

See:

- `RAG_ROADMAP_SETUP.md`
- `V1_3_PRODUCTION_HARDENING.md`
- `V1_4_REMINDERS_SETUP.md`
- `BILLING_PAYMENT_SETUP.md`

## Remaining Documented Build Order

1. Live-validate Versions 1.0–1.4 and the payment/upgrade phase in a real configured environment, using sandbox/test payment providers before live mode.
2. Complete the documented admin application beyond current KB/ops/reminder APIs.
3. Build public landing/features/pricing pages.
4. Complete remaining profile/settings product surfaces.
5. Broaden integration/E2E testing and release automation.
6. Add centralized production monitoring and finish UX/performance/accessibility polish.

Do not treat a green repository CI run as proof that Supabase, RAG providers, transactional email, payment providers, DNS/TLS, or production monitoring are configured correctly.