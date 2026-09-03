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
9. Generate a week-wise roadmap.
10. Complete roadmap tasks and track progress.
11. Improve an ATS-oriented resume.
12. Later add true RAG, reminders, billing, admin, and advanced platform features.

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

## Current Implementation Status

The stable development baseline is `dev`. The current MVP-backbone work is on `feat/mvp-backbone` and draft PR #1.

### Implemented and currently validated

- Supabase schema foundation, RLS/storage policies, seeds, schema hardening.
- Supabase Auth flows and JWT-protected backend middleware.
- Email verification, forgot/reset password, session refresh, logout, `/me`.
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
- Week-wise MVP roadmap generation based on real skill gaps and curated knowledge-base context.
- Roadmap task completion and progress recalculation.
- Partial ATS resume builder and preview foundations.
- CI for backend/frontend typecheck, tests, and production builds.

### Important roadmap classification

The current roadmap generator is **MVP `basic_template`**, not full RAG. It may use curated knowledge-base documents as context, but it does not yet perform embedding generation, pgvector similarity retrieval, or LLM generation.

Do not call it RAG until the Version 1.2 pipeline exists:

`profile + skill gap -> embedding -> pgvector retrieval -> relevant documents -> LLM -> structured validation -> persistence`

### Partial or pending

- Full ATS factual-safety cleanup and role-tailored generation quality.
- ATS PDF and DOCX export/storage/download endpoints.
- True embeddings + pgvector + LLM RAG pipeline.
- Broader AI-service generation endpoints.
- Productionized background workers/schedulers beyond current resume parsing worker.
- Complete Docker Compose stack including frontend, AI service, worker, scheduler, Nginx.
- Automated reminder/email retention flows.
- Billing and usage enforcement.
- Real admin application.
- Public landing/features/pricing pages.
- User profile/settings/billing surfaces.
- Full live Supabase/Redis/AI end-to-end environment validation.
- Production observability/deployment hardening.

## Current MVP API Surface

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

- generation/list/get/update/task progress endpoints under `/roadmap`.

### ATS

- partial analyze/generate/list/get/update/delete endpoints under `/resume-builder`.

## Current Web Flow Contract

Protected routing must enforce:

- Guest accessing a protected route -> `/login`.
- Authenticated but unverified -> `/verify-email`.
- Verified but onboarding incomplete -> `/onboarding/upload-resume`.
- Onboarding complete -> normal protected workspace access.
- Non-admin attempting `/admin` -> `/dashboard`.

Current primary user routes:

- `/onboarding/upload-resume`
- `/onboarding/review-profile`
- `/onboarding/success`
- `/dashboard`
- `/skill-gap`
- `/roadmap`
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

## Security Rules

- Verify Supabase JWTs on protected backend routes.
- Keep service-role credentials server-only.
- Keep RLS enabled for defense in depth and direct Supabase access.
- Check resource ownership before service-role writes/reads.
- Validate PDF/DOCX type, signature, and 5 MB resume limit.
- Use Redis-backed distributed rate limiting.
- Do not put provider secrets into committed files.
- Never fabricate user resume facts in ATS/AI generation.
- Validate structured AI output before persistence.

## Seed Data Status

`supabase/seed.sql` currently provides initial job roles, canonical skills, skill aliases, weighted role-skill mappings, subscription plans, and resume templates.

Core engineering/AI roles are usable for the MVP skill-gap flow. Some secondary role matrices such as Java, Cloud, and DevOps are still sparse and should be enriched as a data-quality follow-up.

## Verification Standard

Before merging a feature batch:

- Backend TypeScript typecheck passes.
- Backend tests pass.
- Backend production build passes.
- Frontend TypeScript typecheck passes.
- Frontend tests pass.
- Frontend production build passes.
- Relevant route/ownership/empty/error/success behavior is tested.
- Live integration dependencies are explicitly called out when not available in CI.

GitHub Actions workflow `.github/workflows/mvp-ci.yml` performs the current backend/frontend static and automated verification on Node.js 22.

## Next Documented Build Order

1. Finish Version 1.0 live end-to-end MVP validation.
2. Complete Version 1.1 ATS resume builder with factual grounding and PDF/DOCX export.
3. Implement Version 1.2 real RAG: embeddings, pgvector similarity search, LLM roadmap generation, validation, persistence.
4. Version 1.3 scalability/security/worker/deployment hardening.
5. Version 1.4 progress/reminder automation.
6. Billing and usage enforcement.
7. Admin application.
8. Public pages, settings/profile UX, integration tests, deployment, monitoring, and polish.

Do not skip directly to advanced AI features while an earlier documented product contract is incomplete.
