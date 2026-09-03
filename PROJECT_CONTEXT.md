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
9. Generate a deterministic or RAG-backed week-wise roadmap.
10. Complete roadmap tasks and track progress.
11. Improve an ATS-oriented resume without fabricating user facts.
12. Continue into reminders, billing, admin, public pages, and production hardening.

Every product screen should answer: **what should the user do next?**

## Required Stack

- Frontend: React + TypeScript + Vite.
- Backend: Node.js + Express + TypeScript modular monolith for MVP.
- AI service: Python FastAPI.
- Database/Auth/Storage: Supabase.
- Vector retrieval: Supabase pgvector.
- Queue/cache/rate limiting: Redis + BullMQ.
- Deployment: Docker, Docker Compose, Nginx.

MongoDB is not part of the documented architecture.

## Branch / Review Structure

The stable development baseline remains `dev`.

Current implementation is split into dependent branches so review scope matches documented product phases:

- `feat/mvp-backbone` — Version 1.0 MVP backbone, draft PR #1.
- `feat/ats-v1-1` — Version 1.1 ATS resume builder, draft PR #2 targeting `feat/mvp-backbone`.
- `feat/rag-v1-2` — Version 1.2 true RAG roadmap implementation, built on the ATS branch and intended to remain a dependent draft until earlier phases are merged.

Do not merge or flatten these phase boundaries merely to make branch history simpler; keep product contracts reviewable.

## Current Implementation Status

### Version 1.0 MVP backbone — implemented on feature branch

- Supabase schema foundation, RLS/storage policies, seeds, and schema hardening.
- Supabase Auth flows and JWT-protected backend middleware.
- Email verification, forgot/reset password, session refresh, logout, and `/me`.
- Redis-backed authentication rate limiting.
- Private resume upload with PDF/DOCX validation and ownership checks.
- BullMQ resume parsing job flow.
- FastAPI deterministic MVP resume parser.
- Resume review/edit flow.
- Final resume-first onboarding and profile persistence.
- `profile_field_sources` traceability.
- `onboarding_completed` route enforcement.
- Job-role and role-skill APIs.
- Weighted skill-gap analysis using canonical skills, aliases, priorities, and role weights.
- Persisted `skill_analyses` and `skill_analysis_items`.
- Real dashboard summary API and live dashboard UI.
- Deterministic week-wise roadmap generation from real skill gaps.
- Roadmap task completion and progress recalculation.

### Version 1.1 ATS — implemented on dependent feature branch

- ATS analysis without artificial minimum-score floors or demo score fallbacks.
- Generated content grounded in the user's actual reviewed resume/profile data.
- No invented employers, experience, projects, education, certifications, or achievements.
- Editable generated resume versions with persistence.
- Private server-generated PDF and DOCX exports.
- Signed short-lived download URLs from Supabase Storage.
- Regression coverage for factual grounding and export file signatures.

### Version 1.2 true RAG — implemented on dependent feature branch

The RAG contract is now real rather than keyword retrieval mislabeled as AI.

Pipeline:

`profile + skill analysis + target role -> query embedding -> pgvector similarity RPC -> retrieved knowledge documents -> validated LLM roadmap -> BullMQ worker -> Supabase persistence`

Implemented details:

- `knowledge_base_documents.embedding vector(1536)` uses the existing pgvector foundation.
- `match_knowledge_base_documents(...)` performs cosine similarity retrieval and is executable only by `service_role`.
- RAG requests create `ai_jobs` rows and run through `roadmapGenerationQueue` rather than blocking the HTTP request.
- AI roadmap generation is limited to 20 requests/day/user through Redis.
- FastAPI exposes provider-backed `/embeddings` and `/generate-roadmap` endpoints using OpenAI-compatible HTTP contracts.
- Provider configuration is explicit through environment variables; missing configuration fails closed.
- The embedding result must contain exactly 1536 finite values to match the current database column.
- Retrieved knowledge context is passed to the LLM; the model may reference only retrieved document ids.
- Pydantic validates roadmap JSON, week sequencing, duration consistency, task presence, and retrieved-document references.
- Backend validation repeats critical structural/context checks before persistence.
- Empty vector retrieval fails explicitly with `RAG_KNOWLEDGE_BASE_NOT_READY`; it never silently becomes a fake RAG/template result.
- Successful AI roadmaps persist with `generated_by = 'rag'`.
- Deterministic fallback roadmaps remain explicitly `generated_by = 'basic_template'`.
- `rag_queries` records query embedding, retrieved ids/similarity scores, provider/model metadata, latency, summary, and failure code.
- Curated knowledge-base seed content is provided without hard-coded embeddings.
- Admin-only knowledge-base indexing endpoints generate embeddings using the configured provider while preserving document metadata.
- BullMQ retry state/retry count is synchronized with `ai_jobs`; intermediate retry attempts are not treated as final user-facing failures.
- Frontend skill-gap UX offers separate **Generate AI roadmap** and **Use basic plan** actions.
- RAG frontend polling uses `GET /roadmap/jobs/:jobId` and opens the specific completed roadmap route.
- Roadmap UI labels the saved generation mode truthfully.

## Validation Boundary

Automated GitHub Actions CI validates all three active codebases:

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

- Python dependency install
- `compileall`
- pytest

Recent Version 1.2 checkpoints have passed all three jobs.

This does **not** prove live external integration. A real end-to-end RAG run still requires:

- an actual Supabase project with migrations applied
- real Redis/runtime services
- embedding provider credentials/model
- LLM provider credentials/model
- knowledge-base indexing completed against that provider

Secrets are intentionally not committed, so repository CI cannot substitute for that live integration checkpoint.

## Current API Surface

Protected APIs use `/api/v1`.

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

- Resume upload/process/get/update under `/resumes`.
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
  - `generationMode: "basic_template"` -> synchronous deterministic roadmap
  - `generationMode: "rag"` -> queued AI job
- `GET /roadmap/jobs/:jobId`
- list/get/update/task progress endpoints under `/roadmap`.

### ATS

- analysis/generation/list/get/update/delete endpoints under `/resume-builder`.
- private PDF/DOCX export/download flow.

### RAG knowledge administration

Admin-only:

- `GET /admin/knowledge-base/index-status`
- `POST /admin/knowledge-base/reindex`

These are infrastructure/admin APIs for RAG readiness; they are not the complete product admin application.

## Current Web Flow Contract

Protected routing must enforce:

- Guest accessing a protected route -> `/login`.
- Authenticated but unverified -> `/verify-email`.
- Verified but onboarding incomplete -> `/onboarding/upload-resume`.
- Onboarding complete -> normal protected workspace access.
- Non-admin attempting `/admin` -> `/dashboard`.

Current primary user routes include:

- `/onboarding/upload-resume`
- `/onboarding/review-profile`
- `/onboarding/success`
- `/dashboard`
- `/skill-gap`
- `/roadmap`
- `/roadmap/:roadmapId`
- `/resume-builder`
- `/resume-builder/:id`
- `/resume-builder/:id/preview`

Public marketing routes from the Web Flow are still pending.

## Database Ownership Rules

Every user-owned record must be tied to `auth.users` either directly through `user_id` or through a nested ownership relationship. Backend services must never trust a user ID supplied by the client for ownership.

Core groups:

- Profile: `profiles`, `profile_field_sources`
- Resume: `resumes`
- Role/skills: `job_roles`, `skills`, `skill_aliases`, `role_skills`
- Skill gap: `skill_analyses`, `skill_analysis_items`
- Knowledge/RAG: `knowledge_base_documents`, `rag_queries`
- Roadmap: `roadmaps`, `roadmap_weeks`, `roadmap_tasks`
- ATS: `generated_resumes`, `resume_templates`
- Reminders: `reminder_logs`, `notifications`, `email_logs`
- Jobs: `ai_jobs`
- Billing: `plans`, `subscriptions`, `payment_transactions`, `usage_counters`
- Admin/system: `audit_logs`, `system_settings`

Private storage buckets include uploaded resumes and generated resumes. Signed URLs should be used for private file access.

## Security and AI Integrity Rules

- Verify Supabase JWTs on protected backend routes.
- Keep service-role credentials server-only.
- Keep RLS enabled for defense in depth and direct Supabase access.
- Check resource ownership before service-role writes/reads.
- Validate PDF/DOCX type, signature, and 5 MB resume limit.
- Use Redis-backed distributed rate limiting.
- Do not put provider secrets into committed files.
- Never fabricate user resume facts in ATS/AI generation.
- Treat model output as untrusted external input and validate it before persistence.
- Do not label keyword/template generation as RAG.
- Do not silently downgrade a failed RAG request into a template while claiming AI generation succeeded.
- Restrict model resource references to retrieved knowledge-base context.

## Seed / Knowledge Data Status

`supabase/seed.sql` provides initial job roles, canonical skills, aliases, weighted role-skill mappings, subscription plans, and resume templates.

Version 1.2 additionally provides curated knowledge-base rows through `202609040002_rag_knowledge_seed.sql`. Embeddings are intentionally null in the migration because embedding vectors must be generated with the configured runtime provider.

After migrations are applied, an authenticated admin must run the knowledge-base reindex endpoint in batches until `pending = 0` before RAG retrieval is considered ready.

Some secondary role matrices such as Java, Cloud, and DevOps remain sparse and should be enriched as a data-quality follow-up.

## Docker / Worker Status

The root Docker Compose stack now wires:

- backend
- Redis
- AI service
- resume worker
- roadmap/RAG worker

Backend runtime is aligned with Node.js 22, matching current CI/dependency expectations.

Still pending for the documented production architecture:

- frontend container/reverse-proxy integration
- Nginx production configuration
- reminder/email schedulers and workers
- production secrets/config management
- monitoring/metrics/tracing
- deployment pipeline and rollback strategy

## Verification Standard

Before merging a feature batch:

- Backend TypeScript typecheck passes.
- Backend tests pass.
- Backend production build passes.
- Frontend TypeScript typecheck passes.
- Frontend tests pass.
- Frontend production build passes.
- AI service compile/tests pass when the phase touches Python AI code.
- Relevant route/ownership/empty/error/success behavior is tested.
- Live integration dependencies are explicitly called out when unavailable in CI.
- Advanced AI claims match the actual implementation mode.

GitHub Actions workflow `.github/workflows/mvp-ci.yml` currently performs tri-service automated verification using Node.js 22 and Python 3.12.

## Next Documented Build Order

1. Live-validate Version 1.0 against a real Supabase/Redis/runtime environment.
2. Live-validate Version 1.1 ATS storage and PDF/DOCX download paths.
3. Apply Version 1.2 RAG migrations, configure providers, index the knowledge base, and run a real end-to-end RAG request.
4. Version 1.3 scalability/security/observability/deployment hardening.
5. Version 1.4 progress/reminder automation.
6. Billing and usage enforcement.
7. Complete admin application beyond the current RAG indexing endpoints.
8. Public pages, settings/profile UX, integration tests, deployment, monitoring, and final polish.

Do not treat repository-level CI as proof of external-service integration, and do not skip earlier live validation simply because later feature code is present.
