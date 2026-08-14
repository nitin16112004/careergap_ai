# Build Log

## Phase 0 - Product And Engineering Setup

Date: 2026-06-29

### Implementation Plan

1. Inspect repository and documentation files.
2. Mirror source PDFs into `documentation/` if needed and extract PDF text into markdown so requirements are readable.
3. Read all extracted documentation.
4. Create project context and assumptions files.
5. Create Phase 0 build log.
6. Prepare monorepo folder structure without implementing auth or product features.

### What Was Built

- Confirmed the repository root is the nested `careergap_ai/` folder.
- Found all six project PDFs in `document/` and mirrored them into `documentation/` to match the requested folder structure.
- Added a repeatable PDF extraction script.
- Extracted all PDF text into `documentation/extracted/`.
- Created `PROJECT_CONTEXT.md` summarizing product, stack, architecture, schema groups, routes, phase order, constraints, and next phase.
- Created `ASSUMPTIONS.md` for folder mismatch and provider/config gaps.
- Created Phase 0 monorepo directories for frontend, backend, AI service, workers, Supabase, and infrastructure.
- Added `.gitkeep` placeholders so empty phase folders are tracked.
- Updated root `README.md`.
- Added `documentation/README.md`.
- Added `.env.example` placeholders.
- Added root `docker-compose.yml` with a Phase 0 Redis service for local infrastructure.
- Added Python cache patterns to `.gitignore` for the future FastAPI service.

### Files Created Or Modified

- `README.md`
- `.gitignore`
- `PROJECT_CONTEXT.md`
- `ASSUMPTIONS.md`
- `BUILD_LOG.md`
- `.env.example`
- `docker-compose.yml`
- `scripts/extract_pdfs.py`
- `documentation/*.pdf`
- `documentation/README.md`
- `documentation/extracted/*.md`
- `frontend/`
- `backend/`
- `ai-service/`
- `worker/`
- `supabase/`
- `infra/`
- `.gitkeep` placeholders inside empty source directories

Original PDF files in `document/` were not removed or modified.

### How To Run Or Test

Regenerate extracted documentation:

```powershell
python scripts\extract_pdfs.py
```

Verify extracted files exist:

```powershell
Get-ChildItem documentation\extracted
```

Start local Redis:

```powershell
docker compose up redis
```

Verify Compose syntax:

```powershell
docker compose config
```

No app server is expected to run in Phase 0 because no frontend, backend, AI, auth, or feature implementation has been created yet.

### Verification Completed

- PDF extraction reran successfully from `documentation/`.
- Six extracted markdown files exist in `documentation/extracted/`.
- No extracted file contains `[No extractable text]`.
- `docker compose config` completed successfully.

### Pending Tasks

- Phase 1: apply migrations to a real Supabase project once project credentials and Supabase CLI are available.
- Phase 2: scaffold runnable backend base with Express, TypeScript, Supabase client, Redis config, middleware, and health checks.
## Phase 3 - ATS Resume Builder Implementation

Date: 2026-08-14

### Implementation Plan

1. Extend the backend with the ATS resume builder API surface and validation.
2. Reuse the existing resume ownership model and `generated_resumes` table.
3. Generate an ATS-optimized summary from the user's real extracted profile data and role context.
4. Add the frontend resume builder and preview screens.
5. Validate with targeted tests and TypeScript/build checks.

### What Was Built

- Added ATS resume analysis and generation service logic in `backend/src/services/ats-resume.service.ts`.
- Added validation schemas for analyze/generate/update flows in `backend/src/validators/ats-resume.validators.ts`.
- Added the ATS controller and routed it via `/api/v1/resume-builder` in `backend/src/routes/ats-resume.routes.ts` and `backend/src/routes/v1.routes.ts`.
- Added frontend ATS types and resume service calls for analyze/generate/list and preview operations.
- Added the main builder page and preview page under `frontend/src/pages/resume-builder/`.
- Added the ATS page styling and page wiring in `frontend/src/App.tsx` and `frontend/src/styles.css`.
- Added test coverage for ATS scoring and factual resume-grounded generation in `backend/src/services/ats-resume.service.test.ts`.

### Verification Completed

- ATS service tests pass: 2/2 tests passing.
- Backend TypeScript typecheck passes.
- Frontend TypeScript typecheck passes.
- Backend and frontend production builds pass.

### Files Created Or Modified

- `backend/src/controllers/ats-resume.controller.ts`
- `backend/src/routes/ats-resume.routes.ts`
- `backend/src/routes/v1.routes.ts`
- `backend/src/services/ats-resume.service.ts`
- `backend/src/services/ats-resume.service.test.ts`
- `backend/src/types/ats-resume.ts`
- `backend/src/validators/ats-resume.validators.ts`
- `frontend/src/App.tsx`
- `frontend/src/pages/resume-builder/ResumeBuilderPage.tsx`
- `frontend/src/pages/resume-builder/ResumeBuilderPreviewPage.tsx`
- `frontend/src/services/resume.service.ts`
- `frontend/src/styles.css`
- `frontend/src/types/ats-resume.ts`
- `ATS_RESUME_BUILDER_SETUP.md`

## Phase 11 - RAG Roadmap Implementation

Date: 2026-08-14

### Implementation Plan

1. Confirm the existing roadmap schema and ownership constraints in the production database migration files.
2. Add the backend roadmap service, validation, controller, and route layer using the existing authenticated Supabase pattern.
3. Build the retrieval-grounded roadmap generation flow from actual profile, skill analysis, and knowledge-base data only.
4. Validate the generated roadmap before saving it and refuse unsupported or invented personal facts.
5. Verify the backend checks and record the implementation status.

### What Was Built

- Added the roadmap data contract in `backend/src/types/roadmap.ts`.
- Added `backend/src/services/roadmap.service.ts` with profile + skill-gap + knowledge-base retrieval logic and strict validation before persistence.
- Added `backend/src/controllers/roadmap.controller.ts` and `backend/src/routes/roadmap.routes.ts` for protected roadmap generation, retrieval, and authenticated task progress updates.
- Added the generic task-status endpoint used for real roadmap progress tracking and a compatibility completion shortcut.
- Wired the route into `backend/src/routes/v1.routes.ts` at `/api/v1/roadmap`.
- Added the protected roadmap page in `frontend/src/pages/RoadmapPage.tsx` with the real roadmap overview, missing-skill display, task list, progress bar, and task completion controls.
- Connected the frontend roadmap API in `frontend/src/services/roadmap.service.ts` and the matching types in `frontend/src/types/roadmap.ts`.
- Added the roadmap UI and progress regression tests in `frontend/src/pages/RoadmapPage.test.tsx` and completed the backend task progress verification in `backend/src/services/roadmap.service.test.ts`.
- Added roadmap documentation and implementation notes in `RAG_ROADMAP_SETUP.md`.

### Verification Completed

- Roadmap regression tests were created first and the missing module gap was reproduced before the final fix.
- The roadmap backend is now wired into the protected route set and supports authenticated task completion plus status updates with ownership checks and progress recalculation.
- The frontend now loads a user roadmap, renders missing skills, allows task completion updates, and refreshes the progress summary without a full page reload.
- Backend, frontend, and production build checks pass on the current feature branch.
- The final validation was rerun after the task-status and frontend UI fixes, and both the backend and frontend roadmap proof sets pass.

### Files Created Or Modified

- `backend/src/controllers/roadmap.controller.ts`
- `backend/src/routes/roadmap.routes.ts`
- `backend/src/routes/v1.routes.ts`
- `backend/src/services/roadmap.service.ts`
- `backend/src/services/roadmap.service.test.ts`
- `backend/src/types/roadmap.ts`
- `backend/src/validators/roadmap.validators.ts`
- `frontend/src/App.tsx`
- `frontend/src/pages/AuthNextStepPage.tsx`
- `frontend/src/pages/RoadmapPage.tsx`
- `frontend/src/pages/RoadmapPage.test.tsx`
- `frontend/src/services/roadmap.service.ts`
- `frontend/src/styles.css`
- `frontend/src/types/roadmap.ts`
- `RAG_ROADMAP_SETUP.md`
- `BUILD_LOG.md`

## Phase 1 - Supabase Setup And Database Foundation

Date: 2026-06-29

### Implementation Plan

1. Read `PROJECT_CONTEXT.md`, `BUILD_LOG.md`, and the Implementation Plan.
2. Confirm the next pending phase from the documented build order.
3. Implement Supabase database foundation only.
4. Add migrations for extensions, enums, tables, indexes, triggers, RLS, storage buckets, and storage ownership policies.
5. Add seed data for documented job roles, skills, aliases, role-skill mappings, plans, and resume templates.
6. Run checks available locally and record anything blocked by missing Supabase tooling or credentials.

### What Was Built

- Added Supabase schema migration for required extensions:
  - `uuid-ossp`
  - `pgcrypto`
  - `vector`
- Added enum types for users, work preferences, parsing status, roadmap task status, reminders, email status, subscriptions, and AI jobs.
- Added core database tables from the Backend Schema document:
  - `profiles`
  - `profile_field_sources`
  - `resumes`
  - `job_roles`
  - `skills`
  - `skill_aliases`
  - `role_skills`
  - `skill_analyses`
  - `skill_analysis_items`
  - `knowledge_base_documents`
  - `rag_queries`
  - `roadmaps`
  - `roadmap_weeks`
  - `roadmap_tasks`
  - `reminder_logs`
  - `notifications`
  - `email_logs`
  - `generated_resumes`
  - `resume_templates`
  - `ai_jobs`
  - `plans`
  - `subscriptions`
  - `payment_transactions`
  - `usage_counters`
  - `audit_logs`
  - `system_settings`
- Added indexes for ownership, status, lookup, and dashboard query patterns.
- Added `handle_new_user()` trigger to create a profile row after Supabase Auth signup.
- Added `updated_at` trigger coverage for mutable tables.
- Enabled Row Level Security on all Phase 1 tables.
- Added user ownership policies, nested roadmap/task policies, public authenticated read policies for lookup tables, and admin management policies.
- Added Supabase Storage buckets:
  - `resumes`
  - `generated-resumes`
  - `template-previews`
  - `knowledge-base-files`
- Added storage ownership policies for user-owned resume paths and admin-owned knowledge/template assets.
- Added seed data for documented initial job roles, skills, skill aliases, role-skill mappings, plans, and resume templates.
- Updated Supabase README with apply instructions and storage path conventions.
- Added Supabase project placeholders to `.env.example`.
- Updated `ASSUMPTIONS.md` to record missing Supabase CLI/project credentials.
- Updated `PROJECT_CONTEXT.md` so the next phase points to backend base setup.

### Files Created Or Modified

- `PROJECT_CONTEXT.md`
- `ASSUMPTIONS.md`
- `BUILD_LOG.md`
- `.env.example`
- `supabase/README.md`
- `supabase/migrations/202606290001_foundation_schema.sql`
- `supabase/migrations/202606290002_rls_storage_policies.sql`
- `supabase/seed.sql`

### How To Run Or Test

Apply to a linked Supabase project:

```powershell
supabase link --project-ref <project-ref>
supabase db push
supabase db seed
```

Run against local Supabase:

```powershell
supabase start
supabase db reset
```

### Verification Completed

- Confirmed Phase 1 is the next pending phase from `PROJECT_CONTEXT.md`, `BUILD_LOG.md`, and the Implementation Plan.
- Confirmed Supabase SQL does not include MongoDB wording.
- Counted 26 created tables in migration SQL.
- Counted 26 RLS-enabled tables in migration SQL.
- Confirmed seed SQL includes documented initial job roles and skills.
- Ran `docker compose config` successfully.

### Checks Not Run

- Could not run `supabase db push`, `supabase db reset`, or Supabase database linting because the Supabase CLI is not installed locally.
- Could not apply migrations to a live Supabase project because project credentials are not configured in this environment.
- Could not run `psql` syntax validation because `psql` is not installed locally.

### Pending Tasks

- Install and authenticate Supabase CLI.
- Create or link the real Supabase project.
- Apply migrations and seed data to Supabase.
- Add real Supabase URL, anon key, service role key, and database URL to local environment files outside version control.
- Phase 2: build backend base setup with Express, TypeScript, Supabase client, Redis config, middleware, validation, and health checks.

## Phase 2 - Backend Foundation

Date: 2026-08-08

### Implementation Plan

1. Start from the latest `dev` branch after reading all project documentation.
2. Scaffold the documented TypeScript Express modular monolith.
3. Add typed environment validation, Supabase database/auth/storage adapters, and Redis/BullMQ boundaries.
4. Add security middleware, validation/error boundaries, logging, CORS, rate limits, and health probes.
5. Prepare versioned API module routes without implementing product flows.
6. Add Docker support, setup documentation, and build/startup checks.

### What Was Built

- Created `backend/` TypeScript project configuration, package scripts, and Dockerfile.
- Added typed environment validation with server-only Supabase service key handling.
- Added Supabase anon/service/storage client boundaries and a database health probe.
- Added Redis connection, cache service, BullMQ queue factory, and no business workers.
- Added Helmet, allowlisted CORS, Pino HTTP logging with secret redaction, Zod validation middleware, secure errors, and Redis-backed rate-limit boundaries.
- Added Supabase session verification and admin middleware preparation without implementing authentication flows.
- Added `/api/health`, `/api/health/db`, `/api/health/redis`, and `/api/health/ai-service`.
- Added `/api/v1/{auth,users,profile,resume,roadmap,ai,notifications,admin}` module boundaries returning explicit not-implemented responses.
- Added `BACKEND_SETUP.md` with architecture, environment, run, health, and pending-work guidance.
- Added the backend service to Docker Compose while keeping Supabase external and Redis managed by Compose.

### Files Created Or Modified

- `backend/package.json`
- `backend/package-lock.json`
- `backend/tsconfig.json`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/.env.example`
- `backend/src/**`
- `backend/README.md`
- `BACKEND_SETUP.md`
- `docker-compose.yml`
- `BUILD_LOG.md`

### How To Run Or Test

```powershell
cd backend
npm install
npm run typecheck
npm run build
npm start
Invoke-WebRequest http://localhost:5000/api/health
```

### Pending Implementation

- Supabase Auth signup/login, session UX, and complete authorization flows.
- Resume upload/parsing, onboarding, skill-gap, roadmap, ATS, reminders, billing, and admin APIs.
- Business BullMQ workers and scheduler.
- AI service HTTP adapters and RAG orchestration.
- Live Supabase/Redis integration tests and production deployment configuration.

## Phase 3 - Supabase Schema Contract Hardening

Date: 2026-08-08

### Database Implementation Plan

1. Preserve the already-applied foundation migrations and add an additive
   hardening migration for the explicit schema contract.
2. Ensure every public table has UUID identity, lifecycle timestamps, foreign
   keys, ownership indexes, and updated-at trigger coverage.
3. Add the normalized `user_roles` mapping and nested roadmap relationship
   constraint for future authorization and data integrity.
4. Keep RLS based on `auth.uid()` and the Supabase Auth admin metadata claim;
   prepare Storage buckets and policies without uploading files.
5. Keep seed data idempotent and document Supabase CLI/local reset commands.

### What Was Built

- Added `supabase/migrations/202608080001_schema_hardening.sql` with the
  required `user_roles` table, timestamp coverage, lifecycle indexes, complete
  updated-at triggers, and the roadmap week/task composite foreign key.
- Confirmed the required domains are represented: profiles, roles and skills,
  resumes, analyses, RAG records, roadmaps, notifications, subscriptions,
  payments, AI jobs, audit logs, and system settings.
- Added explicit role RLS policies while retaining owner, nested-roadmap,
  authenticated lookup, admin, and Storage policies from the foundation.
- Added the requested `supabase/seed/` and `supabase/functions/` structure.
- Extended idempotent seed data with Data Scientist, AI Engineer, Basic ATS,
  Modern ATS, Developer ATS, Free, and Premium entries, plus role-skill links.
- Added `DATABASE_SETUP.md` and expanded `supabase/README.md` with schema,
  relationship, RLS, Storage, and migration guidance.

### Files Created Or Modified

- `supabase/migrations/202608080001_schema_hardening.sql`
- `supabase/seed/.gitkeep`
- `supabase/functions/.gitkeep`
- `supabase/seed.sql`
- `supabase/README.md`
- `DATABASE_SETUP.md`
- `BUILD_LOG.md`

### How To Run Or Test

```powershell
supabase start
supabase db reset
supabase db lint
```

For a linked project:

```powershell
supabase link --project-ref <project-ref>
supabase db push
supabase db seed
```

### Verification And Limitations

- Static SQL checks cover migration ordering, required table names, UUID
  primary keys, lifecycle timestamps, RLS coverage, Storage buckets, and seed
  entries.
- Supabase CLI and `psql` availability will be checked before commit. If they
  are unavailable, live migration, database lint, and server-side SQL parsing
  cannot be executed in this environment.
- No authentication flow, file upload, AI/RAG execution, roadmap generation,
  reminder worker, dashboard API, or payment workflow was implemented.

## Phase 4 - Supabase Authentication Flow

Date: 2026-08-08

### Implementation Plan

1. Read the project context, build log, assumptions, PRD, TRD, web flow, UI/UX
   brief, backend schema, and implementation plan before coding.
2. Implement Supabase Auth signup, login, verification, refresh, logout,
   forgot-password, reset-password, resend-verification, and `/me` routes.
3. Add Redis-backed failed-login and email-request protection without reducing
   the documented 100 successful logins/minute capacity.
4. Build the React/Vite auth experience with Supabase session persistence,
   protected routes, React Hook Form, Zod, Lucide, Framer Motion, and
   responsive accessible components.
5. Run backend/frontend checks, local HTTP smoke checks, and document setup and
   remaining scope.

### What Was Built

- Added backend auth controllers, service, validators, routes, and Supabase
  session middleware context under `backend/src/`.
- Added Supabase Auth flows for signup, verification OTP, login, refresh,
  logout, password recovery/reset, resend verification, and `/me`.
- Added idempotent profile initialization and `email_verified` synchronization
  against the existing Supabase profile schema.
- Added Redis-backed limits: five failed login attempts/minute per IP and
  email/IP identity, three verification resends/10 minutes, and three reset
  requests/15 minutes. Successful logins clear failure counters.
- Added `email.service.ts` as a provider-neutral abstraction; Supabase Auth
  remains the email provider and no complete templates are introduced.
- Added a Vite React frontend with `/login`, `/signup`, `/verify-email`,
  `/forgot-password`, and `/reset-password` pages.
- Added reusable `AuthCard`, `InputField`, `PasswordInput`, buttons, feedback
  messages, `AnimatedBackground`, `Logo`, `AuthProvider`, `SessionHandler`,
  and `ProtectedRoute` components.
- Added responsive premium visual treatment: dark AI brand panel, restrained
  gradients, glass surface, keyboard-visible focus states, inline errors,
  loading/disabled feedback, reduced-motion handling, and mobile layouts.
- Added `AUTH_SETUP.md`, frontend setup guidance, and aligned root environment
  documentation without exposing the service-role key to frontend config.

### Files Created Or Modified

- `backend/src/controllers/auth.controller.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/services/auth-rate-limit.service.ts`
- `backend/src/services/email.service.ts`
- `backend/src/validators/auth.validators.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/middleware/admin.middleware.ts`
- `backend/src/routes/v1.routes.ts`
- `backend/src/routes/placeholder.routes.ts`
- `backend/src/types/**`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/**`
- `frontend/index.html`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/.env.example`
- `frontend/README.md`
- `AUTH_SETUP.md`
- `README.md`
- `.env.example`
- `BUILD_LOG.md`

### Environment Variables

Frontend requires `VITE_API_URL`, `VITE_SUPABASE_URL`, and
`VITE_SUPABASE_ANON_KEY`. Backend uses the existing Supabase and Redis
variables documented in `backend/.env.example`, including the server-only
`SUPABASE_SERVICE_ROLE_KEY`.

### Verification Completed

- `backend/npm run check` passed.
- `backend/npm run build` passed.
- `frontend/npm run typecheck` passed.
- `frontend/npm run build` passed; Vite emitted only a bundle-size advisory.
- Vite HTTP smoke check returned `200` for `/login` and served the app root.
- Backend startup smoke check returned `401` for unauthenticated `/auth/me` and
  `400` for invalid signup input, confirming route and validation boundaries.

### Testing Limitations And Pending Tasks

- No live Supabase project or Redis credentials are configured, so successful
  signup/login/provider email delivery could not be exercised against a real
  account.
- The in-app browser backend was unavailable in this session, so click,
  screenshot, and viewport-level UI checks could not run; compiler, production
  build, and local HTTP checks passed.
- Pending product work: resume-first onboarding, dashboard, resume upload and
  parsing, AI/RAG, roadmaps, reminders, payments, and admin workflows.

## Phase 5 - Resume Upload And AI Parser Foundation

Date: 2026-08-14

### Implementation Plan

1. Keep the existing authenticated architecture and Supabase schema contract.
2. Add protected PDF/DOCX upload, private Storage metadata, ownership checks,
   signed URLs, and Redis upload limits.
3. Add an explicit BullMQ parsing-job endpoint and retrying worker.
4. Add a FastAPI parser boundary and an editable resume review UI.
5. Add focused local tests, setup documentation, and verification notes.

### What Was Built

- Added protected `/api/v1/resumes` upload, process, get, and review-update
  APIs with a five-megabyte PDF/DOCX limit, binary signature validation, user
  ownership checks, private signed URLs, and a per-user upload limit.
- Reused the existing private `resumes` bucket and `resumes` table. The schema
  uses `pending`, `processing`, `completed`, and `failed` parser states.
- Added `resumeParsingQueue` processing with three retry attempts. The worker
  downloads the private object, calls FastAPI, and persists extracted data.
- Added a FastAPI `POST /parse-resume` endpoint for PDF/DOCX text extraction,
  contact details, skills, section content, and public profile links.
- Added protected resume upload and editable review routes with drag-and-drop,
  validation, progress, processing, success, and error states.
- Added `RESUME_PARSER_SETUP.md`, backend service tests, frontend onboarding
  tests, and AI parser tests.

### Files Created Or Modified

- `backend/src/controllers/resume.controller.ts`
- `backend/src/routes/resume.routes.ts`
- `backend/src/services/resume.service.ts`
- `backend/src/services/resume-rate-limit.service.ts`
- `backend/src/middleware/resume-upload.middleware.ts`
- `backend/src/jobs/resume-processing.worker.ts`
- `backend/src/types/resume.ts`
- `backend/src/validators/resume.validators.ts`
- `backend/src/services/resume.service.test.ts`
- `ai-service/app/main.py`
- `ai-service/app/parser.py`
- `ai-service/tests/test_parser.py`
- `frontend/src/pages/onboarding/ResumeUploadPage.tsx`
- `frontend/src/pages/onboarding/ReviewProfilePage.tsx`
- `frontend/src/components/resume/*`
- `frontend/src/pages/onboarding/ResumeOnboarding.test.tsx`
- `RESUME_PARSER_SETUP.md`

### Testing Results

- Backend and frontend TypeScript checks pass.
- Backend mocked service tests cover invalid file rejection, Storage upload,
  metadata ordering, queue creation, and processing state transition.
- Frontend component tests cover unsupported-file validation, upload loading,
  upload errors, and the populated editable review screen.
- AI tests cover structured text parsing and endpoint-level invalid signature
  and maximum-file-size rejection.
- Live Supabase Storage, Redis, authentication, queue worker, and production
  AI-service integration remain pending environment credentials.

### Pending Tasks

- Run the documented flow against a configured Supabase project and Redis.
- Add final onboarding profile persistence, target role selection, and success
  routing in their dedicated onboarding phase.
- Keep ATS generation, RAG, roadmap, dashboard, reminders, payments, and
  unrelated product modules out of this feature branch.
