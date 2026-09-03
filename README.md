# CareerGuid AI

CareerGuid AI, also referenced as SkillSight in the product documentation, is an AI-powered career guidance platform built around a resume-first journey: authenticated profile onboarding, skill-gap analysis, weekly career roadmaps, progress tracking, ATS-focused resume improvement, and automated roadmap reminders.

## Current Development Status

The stable repository baseline remains `dev`. Active implementation is intentionally split into dependent review branches so each documented phase stays reviewable:

1. `feat/mvp-backbone` — Version 1.0 MVP backbone, draft PR #1.
2. `feat/ats-v1-1` — ATS resume builder Version 1.1, draft PR #2 targeting the MVP branch.
3. `feat/rag-v1-2` — true RAG roadmap Version 1.2, draft PR #3 targeting the ATS branch.
4. `feat/v1-3-hardening` — Version 1.3 scalability, security, observability, worker, Docker/Nginx, and CI hardening, draft PR #5 targeting the RAG branch.
5. `feat/v1-4-reminders` — Version 1.4 progress tracking, weekly reminder scheduling, transactional email delivery, notification history, and reminder preferences built on Version 1.3.

Implemented foundations now include:

- Supabase Auth integration, JWT-protected backend routes, verification flows, and Redis-backed auth rate limiting.
- Private PDF/DOCX resume upload, active resume metadata, BullMQ parsing jobs, and FastAPI MVP resume extraction.
- Final resume-first onboarding with editable extracted data, career preferences, profile persistence, field-source traceability, and `onboarding_completed` enforcement.
- Job-role APIs and weighted skill-gap analysis using canonical skills, aliases, role priorities, and persisted analysis results.
- A real dashboard backed by profile, resume, skill-analysis, roadmap, task-progress, generated-resume, reminder, overdue-task, and notification data.
- Deterministic `basic_template` roadmap generation from the user's real skill analysis.
- Canonical roadmap progress calculation with current-week, completed, pending, skipped, overdue, expected-progress, and behind-schedule state.
- Roadmap task completion and progress recalculation.
- ATS Version 1.1 factual-content safeguards, generated-resume editing, and private PDF/DOCX export with signed downloads.
- True RAG Version 1.2 implementation: provider-backed query embeddings, Supabase pgvector similarity retrieval, validated LLM roadmap generation, BullMQ background jobs, RAG observability, curated knowledge-base seed content, and admin-controlled embedding indexing.
- Version 1.3 request correlation, stricter security headers/CORS, dependency-aware readiness checks, resilient Redis connectivity, graceful process/worker shutdown, dead-letter tracking, admin operations APIs, and production-like edge networking.
- Version 1.4 durable BullMQ weekly reminder scheduling, throttled activity tracking, deterministic reminder dedupe, user reminder preferences, in-app notifications, reminder/email logs, transactional email worker retries, and delivery-recovery protection against duplicate sends after provider success.
- Docker Compose wiring for edge Nginx, frontend, backend, Redis, AI service, resume worker, roadmap worker, reminder scheduler, and email worker.
- GitHub Actions validation for backend, frontend, AI service, security audit thresholds, Docker image builds, Compose syntax, and Nginx syntax.
- Dependabot coverage for npm, pip, GitHub Actions, and Docker dependencies.

The product keeps `basic_template` and `rag` as explicit separate roadmap modes. A deterministic template is never labeled as RAG.

### Validation boundary

Automated CI validates:

- backend: high-severity npm dependency audit, TypeScript typecheck, tests, production build
- frontend: high-severity npm dependency audit, TypeScript typecheck, tests, production build
- AI service: dependency consistency, Python compile check, pytest
- infrastructure: Compose model, backend/frontend/AI Docker builds, and edge Nginx syntax

A real end-to-end environment still requires an actual Supabase project with migrations applied, Redis/runtime services, configured provider credentials, an indexed RAG knowledge base, a verified transactional-email sender, production domains, HTTPS, and external monitoring/log shipping. Real credentials are intentionally not committed to the repository, so CI success must not be confused with live-provider or production-environment validation.

## Documentation

The authoritative product and technical documents are under `documentation/` with extracted Markdown copies in `documentation/extracted/`:

- Product Requirements Document (PRD)
- Technical Requirements Document (TRD)
- Backend Schema
- Implementation Plan
- UI/UX Design Brief
- Web Flow Document

When implementation details conflict with stale status notes, follow those authoritative documents and the tested current code.

Phase-specific setup notes:

- `RAG_ROADMAP_SETUP.md` — Version 1.2 provider, vector-indexing, queue, API, and local-runtime contract.
- `V1_3_PRODUCTION_HARDENING.md` — Version 1.3 security, observability, worker reliability, Docker/Nginx topology, CI gates, and production checklist.
- `V1_4_REMINDERS_SETUP.md` — Version 1.4 progress, reminder rules, scheduler, transactional email, dedupe, APIs, worker commands, and live-delivery checklist.

## Monorepo Layout

- `frontend/` — React, TypeScript, Vite client plus production frontend container.
- `backend/` — Node.js, Express, TypeScript modular-monolith API plus BullMQ resume, RAG, reminder, and email workers.
- `ai-service/` — Python FastAPI resume parsing, embedding, and structured RAG generation service.
- `worker/` — workspace reserved for broader worker extraction if the system grows beyond the current modular deployment.
- `supabase/` — PostgreSQL migrations, RLS/storage policies, pgvector retrieval contract, reminder persistence, and seed data.
- `infra/` — Nginx/deployment infrastructure.
- `scripts/` — project utilities.
- `documentation/` — source product/engineering documentation.

## Local Requirements

- Node.js 22 or newer.
- Python 3.12 is used by CI; compatible Python 3.11+ environments may also work with the declared dependencies.
- Docker Desktop or compatible Docker runtime.
- A Supabase project for real database/auth/storage/vector/reminder integration.
- Redis for queues, Job Scheduler state, activity throttling, and distributed rate limiting.
- Embedding and LLM provider credentials for true RAG mode.
- A verified Resend sender/API key for real Version 1.4 email delivery.

## Environment Setup

Never commit real secrets. Copy the provided example files and configure your own local values.

Frontend requires the public Supabase URL/anon key and backend API URL. Backend requires Supabase server credentials, Redis configuration, frontend origin/CORS allowlist, AI-service URL, and transactional-email settings. The AI service requires embedding/LLM provider configuration for RAG. The Supabase service-role key and email/provider secrets must never be exposed to the frontend.

See `.env.example`, `RAG_ROADMAP_SETUP.md`, `V1_3_PRODUCTION_HARDENING.md`, and `V1_4_REMINDERS_SETUP.md`.

## Common Development Commands

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

FastAPI service:

```powershell
cd ai-service
python -m pip install -r requirements.txt
pytest -q
uvicorn app.main:app --reload --port 8000
```

BullMQ workers/scheduler:

```powershell
cd backend
npm run worker
npm run roadmap-worker
npm run email-worker
npm run reminder-scheduler
```

Production-like local stack:

```powershell
docker compose config
docker compose up --build
```

The edge entrypoint defaults to `http://localhost:8080`. Redis, backend, AI service, and workers are internal-only in the default Compose topology.

After the RAG migrations and curated knowledge seed are applied, an authenticated admin must index the knowledge base using the protected admin indexing API before AI roadmap retrieval can succeed. After the Version 1.4 migration is applied, the reminder scheduler and email worker can use persisted activity, preferences, reminder logs, notifications, and email logs.

Operational health endpoints include `/api/health/live` and `/api/health/ready`. Admin-only runtime/queue summaries are available under `/api/v1/admin/ops`. Admin-only reminder scanning is available at `/api/v1/reminders/check-weekly` for controlled validation; normal user reminder delivery remains scheduler-driven.

## Documentation-Driven Build Order

The repository is now at the Version 1.4 implementation checkpoint. Continue in this sequence:

1. Apply and live-validate Version 1.0 MVP against a real Supabase/Redis/runtime environment.
2. Live-validate Version 1.1 ATS private storage and PDF/DOCX downloads.
3. Apply Version 1.2 RAG migrations, configure providers, index the knowledge base, and run real end-to-end RAG validation.
4. Deploy and live-validate Version 1.3 hardening: HTTPS/domains, private Redis, readiness checks, workers, queue monitoring, centralized logs, and alerts.
5. Apply the Version 1.4 migration, configure the scheduler/email provider, and validate reminders, preferences, notification history, dedupe, retries, and dead-letter behavior with a real runtime.
6. Billing and usage enforcement.
7. Full admin application beyond the current indexing/operations/reminder endpoints.
8. Public marketing pages, remaining profile/settings surfaces, integration tests, deployment automation, monitoring, and final polish.

Do not skip live validation of earlier product contracts when moving into later phases. Each advanced capability must remain grounded in persisted, authenticated user data and explicit failure states.
