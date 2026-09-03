# CareerGuid AI — Project Context

## Authoritative Documentation

Product and implementation decisions must follow the six documents under `documentation/` and their Markdown copies under `documentation/extracted/`:

1. Product Requirements Document (PRD)
2. Technical Requirements Document (TRD)
3. Backend Schema
4. Implementation Plan
5. UI/UX Design Brief
6. Web Flow Document

Use the PRD for product behavior and MVP scope, Web Flow for journeys and redirects, UI/UX brief for presentation/accessibility, TRD for architecture/security/performance, Backend Schema for database ownership/RLS/storage, and Implementation Plan for build order.

## Product Definition

CareerGuid AI (also referenced as SkillSight in the documentation) is a resume-first career guidance platform for students, freshers, bootcamp learners, and job seekers.

The primary journey is:

1. Sign up and verify email.
2. Upload a PDF/DOCX resume.
3. Parse profile details.
4. Review and correct extracted data.
5. Add target role and career preferences.
6. Persist the final profile with source traceability.
7. Compare current skills with role requirements.
8. Prioritize missing skills.
9. Generate a deterministic or true-RAG week-wise roadmap.
10. Complete roadmap tasks and track progress.
11. Improve an ATS-oriented resume without fabricating user facts.
12. Continue into production hardening, reminders, billing, admin, public pages, and deployment.

Every product screen should answer: **what should the user do next?**

## Required Stack

- Frontend: React + TypeScript + Vite.
- Backend: Node.js + Express + TypeScript modular monolith.
- AI service: Python FastAPI.
- Database/Auth/Storage: Supabase.
- Vector retrieval: Supabase pgvector.
- Queue/cache/rate limiting: Redis + BullMQ.
- Deployment: Docker, Docker Compose, Nginx.

MongoDB is not part of the documented architecture.

## Branch / Review Structure

The stable development baseline remains `dev`.

Current implementation is deliberately split into dependent branches:

- `feat/mvp-backbone` — Version 1.0 MVP backbone, draft PR #1.
- `feat/ats-v1-1` — Version 1.1 ATS, draft PR #2 targeting the MVP branch.
- `feat/rag-v1-2` — Version 1.2 true RAG, draft PR #3 targeting the ATS branch.
- `feat/v1-3-hardening` — Version 1.3 production hardening built on the RAG branch.

Do not flatten these phase boundaries just to simplify history. Keep feature contracts independently reviewable until the dependency chain is ready to merge.

## Implemented Product Phases

### Version 1.0 MVP backbone

- Supabase Auth + JWT-protected backend routes.
- Verification, forgot/reset password, refresh, logout, `/me`.
- Redis-backed auth rate limiting.
- Private PDF/DOCX resume upload and validation.
- BullMQ resume parsing flow.
- FastAPI deterministic resume extraction.
- Resume review/edit and final onboarding.
- `profile_field_sources` traceability.
- `onboarding_completed` route enforcement.
- Job-role + weighted skill-gap analysis.
- Persisted skill analyses/items.
- Live dashboard summary/UI.
- Honest `basic_template` weekly roadmap.
- Roadmap task progress.

### Version 1.1 ATS

- No fake minimum scoring or demo-score fallback.
- Resume content grounded in reviewed user facts.
- No invented employers, projects, education, certifications, or achievements.
- Editable generated resume versions.
- Private PDF/DOCX export.
- Short-lived signed download URLs.
- Regression tests for factual safety and export signatures.

### Version 1.2 true RAG

Pipeline:

`profile + skill analysis + target role -> embedding -> pgvector similarity retrieval -> retrieved documents -> validated LLM roadmap -> BullMQ worker -> Supabase persistence`

Key guarantees:

- `basic_template` and `rag` are separate truthful generation modes.
- Provider configuration is explicit; missing provider credentials fail closed.
- Embeddings must be 1536 finite values for the current schema.
- Retrieved knowledge is constrained by a service-role-only vector RPC.
- LLM output is validated by Pydantic and again by the backend before persistence.
- Resource document IDs must come from retrieved context.
- Empty retrieval fails with a real error rather than fake RAG fallback.
- RAG runs asynchronously through `ai_jobs` + `roadmapGenerationQueue`.
- Retry state/count is synchronized with `ai_jobs`.
- `rag_queries` records retrieval/model/latency/error metadata.
- Curated KB content is seeded without hard-coded embeddings.
- Admin-only KB indexing endpoints generate embeddings using the configured provider.
- Frontend exposes separate **Generate AI roadmap** and **Use basic plan** actions.

### Version 1.3 production hardening

Implemented on `feat/v1-3-hardening`:

#### Observability

- Shared structured Pino logger.
- Sensitive fields redacted: auth headers, cookies, passwords, OTPs, tokens, API-key/secret-like values, `Set-Cookie`.
- Request correlation using validated incoming `X-Request-Id` or generated UUID.
- Request ID returned in response headers and API error payloads.
- Severity-aware HTTP logs: success `info`, 4xx `warn`, 5xx/errors `error`.
- Admin runtime metrics endpoint for uptime, Node version, PID, and memory.
- Admin queue metrics endpoint for waiting/active/completed/failed/delayed/paused jobs, including dead letters.

#### Health/readiness

- `/api/health` and `/api/health/live` for liveness.
- `/api/health/ready` for aggregated DB + Redis + AI readiness.
- Individual DB/Redis/AI health endpoints retained.
- Dependency latency included without exposing internal provider errors/secrets.
- Configurable health-check timeout.

#### Security

- Production-oriented Helmet policy, CSP, HSTS, referrer/opener/resource protections.
- Env-driven CORS allowlist using `FRONTEND_URL` + `ALLOWED_ORIGINS`.
- Localhost auto-allow only outside production.
- Explicit `403 / CORS_ORIGIN_DENIED` for blocked origins.
- Configurable trusted-proxy hops.
- Redis supports `rediss://` TLS connections.
- Default Compose Redis is authenticated and not host-published.

#### Runtime resilience

- Redis bounded reconnect/backoff and connect timeout.
- Backend bounded graceful shutdown and process-level fatal logging.
- Resume and RAG workers use structured logs and bounded graceful shutdown.
- Resume AI parsing call has a bounded request timeout.
- Exhausted resume/RAG jobs create a `deadLetterQueue` record with operational metadata.
- Intermediate RAG retries remain retryable rather than appearing as terminal failure.

#### Containers / edge

Default production-like Compose services:

- `edge` — public Nginx entrypoint
- `frontend` — production Vite build served by internal Nginx
- `backend` — internal Express API
- `ai-service` — internal FastAPI service
- `resume-worker`
- `roadmap-worker`
- `redis` — internal authenticated Redis

Only `edge` publishes a host port. Fixed `container_name` values were removed because they block normal service scaling.

The real reminder scheduler is intentionally **not** faked in Version 1.3; it belongs to Version 1.4 with reminder/email logic.

#### CI / dependency hygiene

Product CI now includes:

- backend npm high-severity audit, typecheck, tests, build
- frontend npm high-severity audit, typecheck, tests, build
- AI-service `pip check`, compile, pytest
- Docker Compose model validation
- backend Docker build
- frontend Docker build
- AI-service Docker build
- edge Nginx syntax validation

Dependabot covers backend/frontend npm, AI-service pip, GitHub Actions, and the three Dockerfiles.

## Current Protected API Additions

### Health

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/health/db`
- `GET /api/health/redis`
- `GET /api/health/ai-service`

### Admin RAG readiness

- `GET /api/v1/admin/knowledge-base/index-status`
- `POST /api/v1/admin/knowledge-base/reindex`

### Admin operations

- `GET /api/v1/admin/ops/queues`
- `GET /api/v1/admin/ops/runtime`

Admin operations endpoints use the existing Supabase session + admin-role middleware and are not public metrics endpoints.

## Security and AI Integrity Rules

- Verify Supabase JWTs on protected backend routes.
- Keep service-role credentials server-only.
- Keep RLS enabled for defense in depth.
- Check ownership before service-role reads/writes.
- Validate PDF/DOCX MIME, signature, and 5 MB product limit.
- Use Redis-backed distributed limits for cost/security-sensitive APIs.
- Never commit provider/Supabase/Redis/email secrets.
- Never fabricate user resume facts.
- Treat all AI output as untrusted until structurally validated.
- Do not label deterministic/keyword generation as RAG.
- Do not silently convert failed RAG into a successful fake AI result.
- Restrict generated resource references to retrieved knowledge context.
- Do not log full JWTs, passwords, OTPs, secrets, or unnecessary sensitive profile data.

## Validation Boundary

Repository CI can prove code-level and image-level integrity; it cannot prove live external integration without credentials.

Before a real production release, explicitly live-validate:

- Supabase migrations and RLS/storage policies
- auth/onboarding/skill-gap/dashboard flows
- ATS private storage + PDF/DOCX downloads
- provider-backed RAG + KB indexing
- Redis auth/TLS/private networking
- edge HTTPS/domain configuration
- `/api/health/ready` behind the deployed topology
- worker processing and dead-letter monitoring
- centralized log/error shipping
- uptime and queue-backlog alerts
- provider-specific backup/recovery procedures

See `V1_3_PRODUCTION_HARDENING.md` for the deployment checklist.

## Remaining Documented Build Order

1. Live-validate Versions 1.0–1.3 in a real environment.
2. Version 1.4 progress/reminder automation: scheduler, weekly reminder queue, email worker, logs, notification UX.
3. Billing/payment and usage enforcement.
4. Full admin application beyond current indexing/ops APIs.
5. Public landing/features/pricing pages.
6. Profile/settings/billing UX.
7. Broader end-to-end/integration testing, release automation, centralized monitoring, and final polish.

Do not treat a green repository CI run as proof that Supabase, provider, email, DNS/TLS, or production monitoring is configured correctly.
