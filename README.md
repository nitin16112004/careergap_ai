# CareerGuid AI

CareerGuid AI, also referenced as SkillSight in the product documentation, is an AI-powered career guidance platform built around a resume-first journey: authenticated profile onboarding, skill-gap analysis, weekly career roadmaps, progress tracking, and ATS-focused resume improvement.

## Current Development Status

The active development baseline is `dev`. The current MVP backbone is being completed in `feat/mvp-backbone` and tracked in draft PR #1.

Implemented foundations now include:

- Supabase Auth integration, JWT-protected backend routes, verification flows, and Redis-backed auth rate limiting.
- Private PDF/DOCX resume upload, active resume metadata, BullMQ parsing jobs, and FastAPI MVP resume extraction.
- Final resume-first onboarding with editable extracted data, career preferences, profile persistence, field-source traceability, and `onboarding_completed` enforcement.
- Job-role APIs and weighted skill-gap analysis using canonical skills, aliases, role priorities, and persisted analysis results.
- A real dashboard backed by profile, resume, skill-analysis, roadmap, task-progress, and generated-resume data.
- MVP week-wise roadmap generation based on the user's real skill analysis plus curated knowledge-base context.
- Roadmap task completion and progress recalculation.
- Partial ATS resume builder foundations.
- GitHub Actions CI for backend/frontend typecheck, tests, and production builds.

The current MVP roadmap is intentionally classified as `basic_template`. It is **not** full RAG. The documented RAG phase still requires embeddings, pgvector similarity retrieval, LLM generation, structured output validation, and persistence.

## Documentation

The authoritative product and technical documents are under `documentation/` with extracted Markdown copies in `documentation/extracted/`:

- Product Requirements Document (PRD)
- Technical Requirements Document (TRD)
- Backend Schema
- Implementation Plan
- UI/UX Design Brief
- Web Flow Document

When implementation details conflict with stale status notes, follow those authoritative documents and the tested current code.

## Monorepo Layout

- `frontend/` — React, TypeScript, Vite client.
- `backend/` — Node.js, Express, TypeScript modular-monolith API and current BullMQ resume worker.
- `ai-service/` — Python FastAPI AI/parsing service.
- `worker/` — workspace reserved for broader background worker/scheduler extraction.
- `supabase/` — PostgreSQL migrations, RLS/storage policies, and seed data.
- `infra/` — Docker/Nginx/deployment infrastructure work.
- `scripts/` — project utilities.
- `documentation/` — source product/engineering documentation.

## Local Requirements

- Node.js 22 or newer is recommended for the current Supabase dependency set.
- Python 3.11 or newer.
- Docker Desktop or compatible Docker runtime for local Redis/container workflows.

## Environment Setup

Never commit real secrets. Copy the provided example files and configure your own local values.

Frontend requires the public Supabase URL/anon key and backend API URL. Backend requires Supabase server credentials, Redis configuration, frontend origin, and later provider credentials as those phases are enabled. The Supabase service-role key must never be exposed to the frontend.

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

FastAPI parser:

```powershell
cd ai-service
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Resume parsing worker:

```powershell
cd backend
npm run worker
```

Redis:

```powershell
docker compose up redis
```

Regenerate extracted documentation:

```powershell
python scripts\extract_pdfs.py
```

## Documentation-Driven Build Order

Continue in this sequence:

1. Finish and validate the Version 1.0 MVP backbone end to end.
2. Complete ATS resume builder Version 1.1, including factual-content safeguards and PDF/DOCX export.
3. Implement real embeddings + Supabase pgvector + LLM-backed RAG roadmap generation for Version 1.2.
4. Expand queues, workers, Docker/Nginx, security, observability, and production hardening.
5. Add progress/reminder automation.
6. Add billing and usage enforcement.
7. Add the admin application.
8. Finish public marketing pages, settings/profile surfaces, integration tests, deployment, monitoring, and final polish.

Do not skip the earlier product contracts to add advanced AI features. Each later phase should build on persisted, tested user data from the completed MVP flow.
