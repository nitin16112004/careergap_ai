# CareerGuid AI

CareerGuid AI, also referenced as SkillSight in the product documentation, is a resume-first AI career-guidance platform for authenticated onboarding, skill-gap analysis, week-wise learning roadmaps, progress tracking, and ATS-oriented resume improvement.

## Development status

The stable repository baseline remains `dev`. Implementation is intentionally split into dependent review branches so each documented product phase stays independently reviewable:

1. `feat/mvp-backbone` — Version 1.0 MVP backbone, draft PR #1.
2. `feat/ats-v1-1` — Version 1.1 ATS resume builder, draft PR #2 targeting the MVP branch.
3. `feat/rag-v1-2` — Version 1.2 true RAG roadmap, draft PR #3 targeting the ATS branch.
4. `feat/hardening-v1-3` — Version 1.3 security/scalability/deployment hardening, draft PR #4 targeting the RAG branch.

No later phase should be described as merged into `dev` until its dependent PR chain is actually reviewed and merged.

## Implemented feature foundations

### Version 1.0 — MVP backbone

- Supabase Auth, email verification, password reset, refresh/logout, and JWT-protected backend routes.
- Redis-backed authentication rate limiting.
- Private PDF/DOCX resume upload with type/signature/size validation and ownership checks.
- BullMQ resume-parsing jobs and FastAPI resume extraction.
- Resume review, editable onboarding data, career preferences, source traceability, and `onboarding_completed` enforcement.
- Job-role APIs and persisted weighted skill-gap analysis using canonical skills, aliases, priorities, and role weights.
- Real dashboard data from profile, resume, skill analysis, roadmap, progress, and generated-resume records.
- Deterministic `basic_template` week-wise roadmap generation and task progress updates.

### Version 1.1 — ATS resume builder

- ATS analysis without demo-score floors.
- Generated content grounded in reviewed user data; no invented employers, experience, education, projects, certifications, or achievements.
- Editable generated resume versions.
- Private PDF and DOCX generation/storage with short-lived signed downloads.

### Version 1.2 — true RAG roadmap

Pipeline:

`profile + skill gap + target role -> embedding -> Supabase pgvector retrieval -> trusted context -> validated LLM roadmap -> BullMQ worker -> persistence`

- Provider-backed embedding and structured roadmap endpoints in FastAPI.
- Service-role-only cosine-similarity pgvector retrieval.
- 1536-dimensional embedding validation matching the database schema.
- Pydantic and backend validation of roadmap structure and retrieved-document references.
- Async `ai_jobs` + `roadmapGenerationQueue` processing with retry/backoff handling.
- Redis daily AI-roadmap limiting.
- Curated knowledge-base seed plus admin-controlled embedding indexing.
- RAG query/model/similarity/latency/error metadata.
- Separate truthful `rag` and `basic_template` modes; failed RAG is never mislabeled as successful AI generation.

See `RAG_ROADMAP_SETUP.md`.

### Version 1.3 — production-hardening foundation

- Correlated `X-Request-Id` handling and privacy-safe structured logging.
- Expanded secret/token/PII log redaction.
- Hardened Helmet/CSP/frame/referrer/HSTS behavior.
- Finite HTTP server timeouts and graceful connection draining on shutdown.
- Liveness, aggregate readiness, dependency-latency, and scheduler-heartbeat health endpoints.
- Resilient namespaced Redis read-through cache for job-role and role-skill catalogs.
- Scheduler runtime heartbeat foundation for the later reminder phase.
- Full Docker Compose topology with edge Nginx, frontend, backend, AI service, resume worker, roadmap worker, scheduler, and Redis.
- Only edge Nginx is host-published by default; Redis/backend/AI/workers remain internal to the Docker network.
- Production frontend container with SPA fallback and asset caching.
- Four-job CI covering backend, frontend, AI service, and infrastructure/container validation.

See `HARDENING_V1_3.md`.

## Validation boundary

Repository CI validates source/configuration/image-build correctness:

- **Backend:** install, TypeScript typecheck, tests, production build.
- **Frontend:** install, TypeScript typecheck, tests, production build.
- **AI service:** dependency install, Python compile, pytest.
- **Infrastructure:** Docker Compose validation, Nginx syntax validation, production container builds.

This is not proof of a live production environment. Real integration still requires external runtime configuration such as a real Supabase project and applied migrations, authenticated/TLS Redis configuration, provider credentials, indexed knowledge-base data, DNS/TLS termination, email-provider configuration, and production monitoring infrastructure. Real secrets are intentionally not committed.

## Documentation

Authoritative product/technical documents are under `documentation/` with extracted Markdown copies in `documentation/extracted/`:

- Product Requirements Document (PRD)
- Technical Requirements Document (TRD)
- Backend Schema
- Implementation Plan
- UI/UX Design Brief
- Web Flow Document

When stale status notes conflict with these documents and tested current code, use the authoritative documents plus the latest validated implementation.

## Monorepo layout

- `frontend/` — React + TypeScript + Vite client and production frontend image.
- `backend/` — Node.js + Express + TypeScript API, BullMQ workers, and scheduler host.
- `ai-service/` — FastAPI resume parsing, embeddings, and structured RAG generation.
- `supabase/` — PostgreSQL migrations, RLS/storage policies, pgvector retrieval contract, and seeds.
- `infra/` — Nginx and deployment infrastructure.
- `documentation/` — product and engineering source documents.

## Local requirements

- Node.js 22+
- Python 3.12 recommended (CI runtime)
- Docker Desktop or compatible Docker runtime
- Supabase for live auth/database/storage/vector integration
- Redis for queues, cache, and distributed rate limits
- Embedding/LLM credentials for true RAG mode

## Common commands

Frontend:

```powershell
cd frontend
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Backend:

```powershell
cd backend
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

AI service:

```powershell
cd ai-service
python -m pip install -r requirements.txt
pytest -q
uvicorn app.main:app --reload --port 8000
```

Workers/scheduler:

```powershell
cd backend
npm run worker
npm run roadmap-worker
npm run scheduler
```

Full container topology:

```powershell
docker compose up --build
```

Default edge URL is `http://localhost:8080`. Internal backend, AI service, Redis, workers, and scheduler are not host-published by the default Compose configuration.

## Documentation-driven next order

Repository-level implementation has now reached the Version 1.3 hardening checkpoint. Continue in this order:

1. Live-validate the existing MVP/ATS/RAG/hardening chain against a real Supabase/Redis/provider environment.
2. Version 1.4 progress/reminder automation: recurring scheduler jobs, pending-task detection, notification/email queues, idempotent reminder logs, retries, and user-facing reminder state.
3. Billing and usage enforcement.
4. Complete the admin application beyond current RAG indexing endpoints.
5. Public marketing pages plus profile/settings/billing surfaces.
6. Full integration/E2E testing, production deployment, external monitoring, rollback/runbooks, and final polish.

Do not claim external-service integration or production deployment merely because repository CI is green.
