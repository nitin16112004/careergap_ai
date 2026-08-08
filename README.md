# CareerGuid AI

CareerGuid AI, also referenced as SkillSight in the documentation, is an AI-powered career guidance platform for resume-first onboarding, skill gap analysis, personalized learning roadmaps, progress reminders, and ATS-friendly resume generation.

The authentication phase is implemented on `feature/auth-flow`; product
features beyond authentication remain intentionally deferred.

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

Requirements for local development:

- Python 3.11 or newer.
- Node.js 20 or newer.
- Docker Desktop, optional, for local Redis.

Regenerate extracted documentation:

```powershell
python scripts\extract_pdfs.py
```

Start the Redis dependency:

```powershell
docker compose up redis
```

Run the authentication frontend and backend independently:

```powershell
cd frontend
npm install
npm run dev

cd ..\backend
npm install
npm run dev
```

Copy `frontend/.env.example` to `.env.local` and configure the public
Supabase URL/anon key plus `VITE_API_URL`. Configure backend Supabase and
Redis variables using `backend/.env.example`. Never expose the backend service
role key to the frontend.

## Phase Order

Follow `PROJECT_CONTEXT.md` and the Implementation Plan document. Authentication
is complete in this phase; resume onboarding, dashboard, AI, roadmap, reminder,
and payment phases remain next.
