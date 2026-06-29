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
