# CareerGuid AI — Phase 16 Testing & Reliability

## Purpose

Phase 16 makes the existing product stack safer to change and easier to release. It does not introduce a new product feature. It adds deterministic automated coverage around the documented frontend, backend, AI, billing, reminder, and admin contracts, while keeping live-provider validation explicitly separate from repository CI.

Branch contract:

- Head: `feat/phase16-testing`
- Base: `feat/admin-panel`
- Do not merge this phase ahead of Phase 15 Admin Panel or any earlier dependent phase.

## Canonical Phase 16 requirement matrix

### Frontend

| Requirement | Automated coverage |
| --- | --- |
| Signup form | `frontend/src/pages/auth/AuthForms.test.tsx` — validation, password match, verification/onboarding routing |
| Login form | `frontend/src/pages/auth/AuthForms.test.tsx` — invalid form, verification route, protected redirect |
| Resume upload UI | Existing `frontend/src/pages/onboarding/ResumeOnboarding.test.tsx` |
| Profile review form | Existing `frontend/src/pages/onboarding/ResumeOnboarding.test.tsx` |
| Dashboard cards | `frontend/src/pages/DashboardPage.test.tsx` — stored metrics, behind-schedule state, next-action routing, empty/error states |
| Skill gap page | `frontend/src/pages/SkillGapPage.test.tsx` — analysis rendering, rerun, basic roadmap, paid RAG error |
| Roadmap task completion | Existing `frontend/src/pages/RoadmapPage.test.tsx` + backend progress tests |
| Resume builder | Existing `frontend/src/pages/resume-builder/ResumeBuilder.test.tsx` |
| Billing flow | `frontend/src/pages/BillingPage.test.tsx` — current plan, usage, pricing cycle, checkout-return state |

### Backend

| Requirement | Automated coverage |
| --- | --- |
| Auth middleware | `backend/src/middleware/auth.middleware.test.ts` |
| Rate limits | `backend/src/services/auth-rate-limit.service.test.ts` |
| Resume upload | Existing `backend/src/services/resume.service.test.ts` |
| Profile update | Resume onboarding frontend tests + backend validation/build gates; live Supabase check remains required |
| Skill gap logic | `backend/src/services/skill-gap.service.test.ts` — aliases, weights, priorities, onboarding gate |
| Roadmap generation | Existing `backend/src/services/roadmap.service.test.ts` |
| Task completion | Existing `backend/src/services/roadmap-progress.service.test.ts` and `RoadmapPage.test.tsx` |
| Reminder scheduler | `backend/src/services/reminder.service.test.ts` — defaults, persistence, empty scan, paid entitlement gate |
| Payment verification | Existing billing tests plus `backend/src/services/billing-payment-verification.service.test.ts` — ownership, captured-state, amount/order/currency checks |
| Payment webhook | `backend/src/services/billing-provider.service.test.ts` — raw-body signature rejection, malformed JSON, captured activation, duplicate-event idempotency |
| Admin APIs/authorization | Existing admin middleware and admin-user service tests |

### AI service

| Requirement | Automated coverage |
| --- | --- |
| Resume text extraction | Existing `ai-service/tests/test_parser.py` |
| Skill extraction | Existing parser tests |
| Roadmap JSON format | Existing `test_rag.py` + `tests/test_api_contracts.py` |
| ATS resume generation | Backend ATS service tests validate generated ATS data contracts |
| RAG retrieval quality | Existing RAG schema/retrieval constraints; live semantic quality remains a release check |
| AI timeout handling | `tests/test_api_contracts.py` validates bounded provider timeout and invalid-config fallback |
| HTTP/provider error mapping | `tests/test_api_contracts.py` validates 422/502/503 behavior |

## Documented integration journeys

The following journeys are covered by multiple deterministic component/service contracts in CI and must also be smoke-tested against a real staging environment before production release:

1. Signup → Verify Email → Upload Resume → Auto-fill → Dashboard
2. Profile → Skill Gap → Roadmap → Complete Tasks
3. Roadmap Pending → Reminder Email
4. Profile → ATS Resume → PDF Download
5. Free Limit → Upgrade → Payment Success

Repository CI intentionally does not fabricate live Supabase, Redis, LLM, Resend, Razorpay, or Stripe success. Provider-facing unit tests mock provider responses and verify our ownership, validation, idempotency, entitlement, error, and state-transition contracts.

## Product CI gate

`Product CI` runs for `feat/phase16-testing` and preserves all prior gates:

- Backend dependency audit
- Backend TypeScript typecheck
- Backend Vitest suite
- Backend production build
- Frontend dependency audit
- Frontend TypeScript typecheck
- Frontend Vitest/React Testing Library suite
- Frontend production build
- AI dependency consistency
- Python compile
- Pytest suite
- Docker Compose model validation
- Backend Docker build
- Frontend Docker build
- AI service Docker build
- Edge Nginx configuration validation

An exact-head green CI is required before this phase is considered repository-validated.

## Staging/live validation checklist

Before Phase 17 Deployment is approved, validate with real configured services:

### Auth / onboarding

- New signup sends/handles a real verification flow.
- Verified login redirects correctly.
- Invalid/expired sessions receive 401.
- Resume PDF and DOCX upload, storage, parsing, and profile auto-fill work against Supabase Storage and AI service.
- Profile edits persist and onboarding completion is reflected on dashboard.

### Skill gap / roadmap / ATS

- Role requirements and aliases produce sensible matched/missing skills for seeded roles.
- Basic roadmap persists and tasks can be completed.
- Paid RAG roadmap retrieves relevant indexed documents and returns grounded weekly JSON.
- Provider timeout/error produces a recoverable failed AI job, not an indefinitely running job.
- ATS resume generation and PDF/DOCX export open correctly.

### Reminder / email

- Paid reminder entitlement is honored.
- Scheduler does not duplicate the same reminder.
- Resend delivery updates `email_logs` and `reminder_logs` correctly.
- Disabled reminder preferences suppress email.

### Billing

- Free limits are enforced atomically.
- Failed generation refunds reserved usage where documented.
- Razorpay test payment activates only after signed/captured confirmation.
- Stripe test checkout activates only after signed webhook confirmation.
- Duplicate webhooks are idempotent.
- Failed/cancelled subscription state is persisted correctly.

### Admin / security

- Normal users receive 403 for `/api/v1/admin/*`.
- Current admins can access the admin console.
- A demoted admin with a stale JWT is immediately rejected by the current profile-role check.
- Admin self-demotion/self-disable protections work.
- Role/skill/knowledge mutations write audit records.
- Service-role/payment/provider secrets are absent from browser bundles.

## Phase completion rule

Phase 16 is complete only when:

1. Required automated tests are committed.
2. Exact PR-head Product CI is green.
3. Known CI regressions are fixed rather than bypassed.
4. Live/provider-dependent checks are documented as staging gates rather than falsely reported as CI proof.

Phase 17 Deployment should branch from the final green Phase 16 head, not from an older phase branch.
