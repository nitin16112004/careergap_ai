# CareerGuid AI

CareerGuid AI, also referenced as SkillSight in the documentation, is an AI-powered career guidance platform for resume-first onboarding, skill gap analysis, personalized learning roadmaps, progress reminders, and ATS-friendly resume generation.

Phase 0 is documentation and project setup only. No authentication flow or product features have been implemented yet.

## Documentation

- Source PDFs are in `documentation/`.
- Extracted markdown copies are in `documentation/extracted/`.
- Project summary is in `PROJECT_CONTEXT.md`.
- Setup notes and assumptions are in `ASSUMPTIONS.md`.
- Phase progress is tracked in `BUILD_LOG.md`.

## Monorepo Layout

- `frontend/` - React.js, TypeScript, Vite application.
- `backend/` - Node.js, Express.js, TypeScript API.
- `ai-service/` - Python FastAPI AI service.
- `worker/` - Redis and BullMQ background workers.
- `supabase/` - Supabase migrations and seed data, starting in Phase 1.
- `infra/` - Docker, Nginx, and deployment infrastructure.
- `scripts/` - Local project utilities.
- `docker-compose.yml` - Phase 0 local infrastructure skeleton.

## Setup

Requirements for Phase 0:

- Python 3.11 or newer.
- Docker Desktop, optional, for local Redis.

Regenerate extracted documentation:

```powershell
python scripts\extract_pdfs.py
```

Start the Phase 0 Redis dependency:

```powershell
docker compose up redis
```

No frontend, backend, AI service, or worker app is runnable yet. Those are intentionally deferred to later phases.

## Phase Order

Follow `PROJECT_CONTEXT.md` and the Implementation Plan document. The next phase is Supabase setup and database foundation.
