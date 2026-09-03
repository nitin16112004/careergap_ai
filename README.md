# CareerGuid AI

CareerGuid AI, also referenced as SkillSight in the product documentation, is an AI-powered career guidance platform built around a resume-first journey: authenticated profile onboarding, skill-gap analysis, weekly career roadmaps, progress tracking, and ATS-focused resume improvement.

## Current Development Status

The stable repository baseline remains `dev`. Active implementation is intentionally split into dependent review branches so each documented phase stays reviewable:

1. `feat/mvp-backbone` — Version 1.0 MVP backbone, draft PR #1.
2. `feat/ats-v1-1` — ATS resume builder Version 1.1, draft PR #2 targeting the MVP branch.
3. `feat/rag-v1-2` — true RAG roadmap Version 1.2, currently validated in CI and intended to target the ATS branch as a dependent draft PR.

Implemented foundations now include:

- Supabase Auth integration, JWT-protected backend routes, verification flows, and Redis-backed auth rate limiting.
- Private PDF/DOCX resume upload, active resume metadata, BullMQ parsing jobs, and FastAPI MVP resume extraction.
- Final resume-first onboarding with editable extracted data, career preferences, profile persistence, field-source traceability, and `onboarding_completed` enforcement.
- Job-role APIs and weighted skill-gap analysis using canonical skills, aliases, role priorities, and persisted analysis results.
- A real dashboard backed by profile, resume, skill-analysis, roadmap, task-progress, and generated-resume data.
- Deterministic `basic_template` roadmap generation from the user's real skill analysis.
- Roadmap task completion and progress recalculation.
- ATS Version 1.1 factual-content safeguards, generated-resume editing, and private PDF/DOCX export with signed downloads.
- True RAG Version 1.2 implementation: provider-backed query embeddings, Supabase pgvector similarity retrieval, validated LLM roadmap generation, BullMQ background jobs, RAG observability, curated knowledge-base seed content, and admin-controlled embedding indexing.
- Docker Compose wiring for backend, Redis, AI service, resume worker, and roadmap worker.
- GitHub Actions CI for backend, frontend, and AI-service validation.

The product keeps `basic_template` and `rag` as explicit separate roadmap modes. A deterministic template is never labeled as RAG.

### Validation boundary

Automated CI currently validates:

- backend: TypeScript typecheck, tests, production build
- frontend: TypeScript typecheck, tests, production build
- AI service: Python compile check and pytest

A real end-to-end RAG request still requires an actual Supabase project with migrations applied, Redis/runtime services, configured embedding and LLM provider credentials, and an indexed knowledge base. Real credentials are intentionally not committed to the repository, so CI success must not be confused with live-provider integration validation.

## Documentation

The authoritative product and technical documents are under `documentation/` with extracted Markdown copies in `documentation/extracted/`:

- Product Requirements Document (PRD)
- Technical Requirements Document (TRD)
- Backend Schema
- Implementation Plan
- UI/UX Design Brief
- Web Flow Document

When implementation details conflict with stale status notes, follow those authoritative documents and the tested current code.

Phase-specific setup notes include `RAG_ROADMAP_SETUP.md`, which documents the current Version 1.2 provider, vector-indexing, queue, API, and local-runtime contract.

## Monorepo Layout

- `frontend/` — React, TypeScript, Vite client.
- `backend/` — Node.js, Express, TypeScript modular-monolith API plus BullMQ resume/RAG workers.
- `ai-service/` — Python FastAPI resume parsing, embedding, and structured RAG generation service.
- `worker/` — workspace reserved for broader scheduler/worker extraction as the system grows.
- `supabase/` — PostgreSQL migrations, RLS/storage policies, pgvector retrieval contract, and seed data.
- `infra/` — Docker/Nginx/deployment infrastructure work.
- `scripts/` — project utilities.
- `documentation/` — source product/engineering documentation.

## Local Requirements

- Node.js 22 or newer.
- Python 3.12 is used by CI; compatible Python 3.11+ environments may also work with the declared dependencies.
- Docker Desktop or compatible Docker runtime.
- A Supabase project for real database/auth/storage/vector integration.
- Redis for queues and distributed rate limiting.
- Embedding and LLM provider credentials for true RAG mode.

## Environment Setup

Never commit real secrets. Copy the provided example files and configure your own local values.

Frontend requires the public Supabase URL/anon key and backend API URL. Backend requires Supabase server credentials, Redis configuration, frontend origin, and AI-service URL. The AI service requires embedding/LLM provider configuration for RAG. The Supabase service-role key must never be exposed to the frontend.

See `.env.example` and `RAG_ROADMAP_SETUP.md` for the current provider-variable contract.

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

Resume parsing worker:

```powershell
cd backend
npm run worker
```

RAG roadmap worker:

```powershell
cd backend
npm run roadmap-worker
```

Full local service set:

```powershell
docker compose up --build
```

After the RAG migrations and curated knowledge seed are applied, an authenticated admin must index the knowledge base using the protected admin indexing API before AI roadmap retrieval can succeed.

Regenerate extracted documentation:

```powershell
python scripts\extract_pdfs.py
```

## Documentation-Driven Build Order

The repository is currently at the Version 1.2 implementation checkpoint. Continue in this sequence:

1. Apply and live-validate Version 1.0 MVP against a real Supabase/Redis/runtime environment.
2. Live-validate Version 1.1 ATS private storage and PDF/DOCX downloads.
3. Apply the Version 1.2 RAG migrations, configure providers, index the knowledge base, and run real end-to-end RAG validation.
4. Version 1.3 scalability, security, observability, worker, Docker/Nginx, and deployment hardening.
5. Version 1.4 progress/reminder automation.
6. Billing and usage enforcement.
7. Full admin application beyond the current RAG indexing endpoints.
8. Public marketing pages, profile/settings surfaces, integration tests, deployment, monitoring, and final polish.

Do not skip live validation of the earlier product contracts when moving into later phases. Each advanced capability must remain grounded in persisted, authenticated user data and explicit failure states.
