# CareerGuid AI — Project Context

## Authoritative documentation

Product and implementation decisions must follow the six documents under `documentation/` and their Markdown copies under `documentation/extracted/`:

1. Product Requirements Document (PRD)
2. Technical Requirements Document (TRD)
3. Backend Schema
4. Implementation Plan
5. UI/UX Design Brief
6. Web Flow Document

Use the PRD for product behavior and scope, Web Flow for journeys and redirects, UI/UX brief for presentation/accessibility, TRD for architecture/security/performance, Backend Schema for database ownership/RLS/storage, and Implementation Plan for build order.

## Product definition

CareerGuid AI (also referenced as SkillSight in the documentation) is a resume-first career guidance platform for students, freshers, bootcamp learners, and job seekers.

Primary journey:

1. Sign up and verify email.
2. Upload a PDF/DOCX resume.
3. Parse profile details asynchronously.
4. Review and correct extracted data.
5. Add target role and career preferences.
6. Persist the final profile with source traceability.
7. Compare current skills with role requirements.
8. Prioritize missing skills.
9. Generate either a deterministic or true RAG week-wise roadmap.
10. Complete roadmap tasks and track progress.
11. Build an ATS-oriented resume without fabricating personal facts.
12. Continue into reminders, billing, admin, public pages, and final production operations.

Every product screen should answer: **what should the user do next?**

## Required stack

- Frontend: React + TypeScript + Vite.
- Backend: Node.js + Express + TypeScript modular monolith.
- AI service: Python FastAPI.
- Database/Auth/Storage: Supabase.
- Vector retrieval: Supabase pgvector.
- Queue/cache/rate limiting: Redis + BullMQ.
- Deployment: Docker, Docker Compose, Nginx.

MongoDB is not part of the documented architecture.

## Branch / review structure

The stable development baseline remains `dev`. Current implementation is split into dependent draft PRs so each documented phase stays reviewable:

- `feat/mvp-backbone` — Version 1.0 MVP backbone, draft PR #1.
- `feat/ats-v1-1` — Version 1.1 ATS resume builder, draft PR #2 targeting `feat/mvp-backbone`.
- `feat/rag-v1-2` — Version 1.2 true RAG roadmap, draft PR #3 targeting `feat/ats-v1-1`.
- `feat/hardening-v1-3` — Version 1.3 scalability/security/deployment hardening, draft PR #4 targeting `feat/rag-v1-2`.

Do not merge or flatten these phase boundaries merely to simplify branch history. Do not describe a feature as merged into `dev` until its dependency chain is actually merged.

## Current implementation status

### Version 1.0 — MVP backbone

Implemented on the MVP feature branch:

- Supabase schema foundation, RLS/storage policies, seeds, and schema hardening.
- Supabase Auth flows and JWT-protected backend middleware.
- Email verification, forgot/reset password, refresh/logout, and `/me`.
- Redis-backed auth rate limiting.
- Private PDF/DOCX resume upload with MIME/signature/size and ownership checks.
- BullMQ resume parsing and FastAPI deterministic MVP parser.
- Resume review/edit and final resume-first onboarding.
- `profile_field_sources` traceability and `onboarding_completed` route enforcement.
- Job-role/role-skill APIs and weighted persisted skill-gap analysis.
- Real dashboard API/UI.
- Honest deterministic `basic_template` roadmaps.
- Roadmap task completion and progress recalculation.

### Version 1.1 — ATS resume builder

Implemented on the dependent ATS branch:

- ATS analysis without fake/demo score floors.
- Generation grounded in reviewed user resume/profile facts.
- No invented employer, experience, education, project, certification, or achievement data.
- Editable generated resume versions.
- Private server-generated PDF/DOCX exports and short-lived signed downloads.
- Export encoding safely escapes PDF control characters and DOCX XML special characters.

### Version 1.2 — true RAG roadmap

Implemented on the dependent RAG branch.

Pipeline:

`profile + skill analysis + target role -> query embedding -> pgvector similarity retrieval -> trusted knowledge context -> validated LLM roadmap -> BullMQ worker -> Supabase persistence`

Key rules and implementation:

- `knowledge_base_documents.embedding` uses the existing `vector(1536)` schema.
- `match_knowledge_base_documents(...)` performs cosine retrieval through a service-role-only RPC.
- RAG requests create `ai_jobs` and run asynchronously through `roadmapGenerationQueue`.
- AI roadmap generation is rate limited through Redis.
- FastAPI exposes provider-backed `/embeddings` and `/generate-roadmap` endpoints.
- Missing provider configuration fails explicitly rather than silently returning a template.
- Embedding vectors must contain exactly 1536 finite values.
- Retrieved knowledge context is passed to the LLM; generated resource references may name only retrieved document ids.
- Pydantic validates roadmap JSON, week sequencing, duration, tasks, and retrieved-document references.
- Backend repeats critical structural/context validation before persistence.
- Empty vector retrieval fails with `RAG_KNOWLEDGE_BASE_NOT_READY`.
- Successful AI roadmaps are stored with `generated_by = 'rag'`; deterministic plans remain `basic_template`.
- `rag_queries` records retrieval/model/latency/error metadata.
- Curated knowledge rows are seeded without hard-coded embeddings.
- Admin-only indexing endpoints populate embeddings using the configured provider.
- BullMQ retry state is synchronized with `ai_jobs`; intermediate failures remain retryable.
- Frontend provides separate **Generate AI roadmap** and **Use basic plan** actions and opens the exact completed roadmap.

See `RAG_ROADMAP_SETUP.md`.

### Version 1.3 — hardening foundation

Implemented on `feat/hardening-v1-3` / draft PR #4.

#### Security / HTTP runtime

- Validated or generated `X-Request-Id` correlation ids are propagated through responses and edge proxying.
- Pino logging redacts authorization/cookie/API-key headers, password/OTP/token fields, email/phone request fields, and set-cookie headers.
- Helmet uses restrictive API-safe CSP/frame/referrer settings and production-only HSTS.
- Existing configured-origin CORS and body/upload limits remain enforced.
- Node HTTP request/header/keep-alive limits are finite.
- SIGTERM/SIGINT performs graceful connection draining with a hard deadline before force-closing remaining connections.

#### Health / readiness

- `GET /api/health` and `/api/health/live` provide liveness.
- `GET /api/health/ready` checks database + Redis + AI service concurrently with bounded timeouts and safe latency/status output.
- Existing `/api/health/db`, `/redis`, `/ai-service` remain available.
- `GET /api/health/scheduler` validates a short-lived scheduler heartbeat rather than claiming reminder jobs already run.

#### Cache / performance foundation

- Redis cache keys are namespaced under the product namespace.
- JSON read-through caching handles malformed values safely.
- Job-role and role-skill catalog reads use a five-minute cache.
- Catalog caching fails open to the database when Redis is unavailable; Supabase remains the source of truth.
- Cache hit/outage/TTL/malformed-value behavior has regression coverage.

#### Scheduler foundation

- A dedicated scheduler process exists and writes a Redis heartbeat every 30 seconds with a 90-second TTL.
- It intentionally does **not** send reminder emails yet. Version 1.4 will attach recurring reminder logic and queue jobs to this process.

#### Docker / edge topology

The root Compose topology now includes:

- `nginx` — only default host-published edge service
- `frontend` — production Vite build served by Nginx
- `backend` — Express API
- `ai-service` — FastAPI parser/RAG service
- `resume-worker`
- `roadmap-worker`
- `scheduler`
- `redis`

Default security/operations properties:

- Backend, frontend, AI service, workers, scheduler, and Redis remain internal to the Docker network.
- Redis is not host-published by default and supports an optional local password; managed production Redis can be supplied through an authenticated/TLS `REDIS_URL`.
- Services use restart policies, healthchecks, and `no-new-privileges` where applicable.
- Edge Nginx forwards `/api/*` to the backend and all other paths to the frontend.
- Proxy/request ids and forwarding headers are propagated.
- Edge body size/upstream timeout contracts are finite.
- Production frontend supports SPA fallback and static-asset caching.

See `HARDENING_V1_3.md`.

## Automated validation

GitHub Actions Product CI currently contains four gates:

### Backend
- `npm ci`
- TypeScript typecheck
- tests
- production build

### Frontend
- `npm ci`
- TypeScript typecheck
- tests
- production build

### AI service
- dependency install
- Python `compileall`
- pytest

### Infrastructure
- Docker Compose configuration validation
- edge Nginx syntax validation
- production frontend/backend/AI container builds

The current v1.3 branch has passed all four jobs. Repository CI proves source/configuration/image-build correctness; it is not proof of a live external environment.

## Live integration / deployment boundary

The following remain external runtime requirements and must never be faked by repository status:

- real Supabase project with migrations applied
- real Supabase public/service credentials
- production Redis auth/TLS configuration
- embedding and LLM credentials/models
- completed knowledge-base indexing
- DNS and TLS termination
- email provider credentials
- external production monitoring/error tracking such as Sentry/Grafana/Logtail/UptimeRobot
- production deployment/rollback infrastructure

No real secret belongs in source control.

## Current API surface

Protected product APIs use `/api/v1`.

### Auth
- `/auth/signup`
- `/auth/login`
- `/auth/verify-email`
- `/auth/resend-verification`
- `/auth/forgot-password`
- `/auth/refresh`
- `/auth/reset-password`
- `/auth/logout`
- `/auth/me`

### Resume onboarding
- resume upload/process/get/update under `/resumes`
- `GET /onboarding/profile`
- `PUT /onboarding/profile`
- `POST /onboarding/complete`

### Career analysis
- `GET /job-roles`
- `GET /job-roles/:roleId/skills`
- `POST /skill-gap/analyze`
- `GET /skill-gap/latest`
- `GET /skill-gap/:analysisId`

### Dashboard
- `GET /dashboard/summary`

### Roadmap
- `POST /roadmap/generate`
  - `generationMode: "basic_template"` -> synchronous deterministic plan
  - `generationMode: "rag"` -> queued AI job
- `GET /roadmap/jobs/:jobId`
- list/get/update/task progress endpoints under `/roadmap`

### ATS
- analysis/generation/list/get/update/delete under `/resume-builder`
- private PDF/DOCX export/download flow

### RAG knowledge administration
Admin-only:
- `GET /admin/knowledge-base/index-status`
- `POST /admin/knowledge-base/reindex`

These indexing endpoints are not the complete product admin application.

### Operational health
Public operational endpoints under `/api`:
- `/health`
- `/health/live`
- `/health/ready`
- `/health/db`
- `/health/redis`
- `/health/ai-service`
- `/health/scheduler`

## Web-flow contract

Protected routing must enforce:

- Guest on protected route -> `/login`.
- Authenticated but unverified -> `/verify-email`.
- Verified but onboarding incomplete -> `/onboarding/upload-resume`.
- Onboarding complete -> protected workspace access.
- Non-admin attempting `/admin` -> `/dashboard`.

Current primary routes include onboarding, dashboard, skill gap, roadmap, and resume-builder surfaces. Public marketing routes and fuller settings/billing/admin surfaces remain later work.

## Database ownership / security rules

- User-owned records must resolve to `auth.users`; never trust a client-supplied ownership id.
- Keep Supabase service-role credentials server-only.
- Keep RLS enabled for defense in depth.
- Verify ownership before service-role reads/writes.
- Validate uploaded file type, signature, and limits.
- Use Redis-backed distributed rate limiting for cost/security-sensitive operations.
- Treat model output as untrusted and validate before persistence.
- Never fabricate ATS personal facts.
- Never label template/keyword generation as RAG.
- Never silently downgrade a failed RAG request while reporting AI success.
- Do not log JWTs, OTPs, passwords, provider secrets, or unnecessary personal data.
- Redis must not be publicly exposed in production.

## Next documented build order

Repository-level implementation has reached the v1.3 hardening checkpoint. Continue in this order:

1. Live-validate the full MVP/ATS/RAG/hardening chain against real external services.
2. Version 1.4 progress/reminder automation: scheduler recurrence, pending-task selection, notification/email queues, idempotent reminder logs, retries, and user-facing reminder state.
3. Billing and usage enforcement.
4. Complete admin application.
5. Public marketing pages plus profile/settings/billing UX.
6. Full integration/E2E suites, real deployment, external monitoring, rollback/runbooks, and final polish.

Do not treat green repository CI as proof of live-provider integration or production deployment.
