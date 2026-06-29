# Project Context

## Documentation Read

Source PDFs in `documentation/`:

- `CareerGuid_AI_PRD.pdf`
- `CareerGuid_AI_TRD (1).pdf`
- `CareerGuid_AI_Web_Flow_Document.pdf`
- `CareerGuid_AI_UI_UX_Design_Brief.pdf`
- `CareerGuid_AI_Backend_Schema.pdf`
- `CareerGuid_AI_Implementation_Plan.pdf`

The PDFs were originally found in `document/` and mirrored into `documentation/` to match the requested project layout. Original files were not removed.

Extracted markdown copies were generated in `documentation/extracted/` using `scripts/extract_pdfs.py`.

## Product Summary

CareerGuid AI, also called SkillSight, is an AI-powered career guidance platform for students, freshers, bootcamp learners, and job seekers. The core journey is resume-first:

1. User signs up and verifies email.
2. User uploads a resume before filling a manual profile.
3. AI or parsing logic extracts profile details.
4. User reviews and edits auto-filled data.
5. System compares current skills with a target role.
6. System generates a week-wise roadmap.
7. User tracks tasks, receives reminders, and builds an ATS-friendly resume.

The product should feel like a guided career assistant, not a complex dashboard. Every screen should make the next action clear.

## Main Modules

- Authentication and authorization with Supabase Auth, JWT verification, email verification, forgot password, role checks, and admin access.
- Resume-first onboarding with upload, parsing, auto-fill, field source tracking, manual review, and final profile save.
- Resume management with Supabase Storage metadata, active resume tracking, parsing retries, and extracted skills.
- Skill gap analysis comparing user skills with target role requirements, aliases, match scores, missing skills, and recommended learning order.
- Roadmap generation with basic template roadmap in MVP and RAG-based generation in later phases.
- Progress tracking with week-wise roadmap tasks, completion status, and progress percentage.
- Reminder and notification system using scheduler, queues, email worker, reminder logs, and duplicate reminder protection.
- ATS resume builder with generated content, editor, preview, PDF/DOCX download, and Supabase Storage output.
- Billing and usage limits with plans, subscriptions, payment transactions, and monthly counters.
- Admin panel for users, job roles, skills, knowledge base, reminders, failed jobs, logs, and analytics.

## Authoritative Stack

- Frontend: React.js, TypeScript, Vite.
- Backend: Node.js, Express.js, TypeScript.
- AI service: Python FastAPI.
- Database: Supabase PostgreSQL.
- Auth: Supabase Auth.
- Storage: Supabase Storage.
- Vector database: Supabase pgvector.
- Queue, cache, OTP, and rate limiting: Redis plus BullMQ.
- Deployment: Docker, Docker Compose, and Nginx.

MongoDB must not be used. Supabase is the documented database, auth, storage, and vector foundation.

## Architecture

The MVP architecture is a modular monolith backend with separate frontend, AI service, and worker processes:

- React frontend calls the backend API and uses Supabase Auth client session handling.
- Express backend verifies Supabase JWTs and owns protected API behavior.
- FastAPI AI service handles resume extraction, skill extraction, embeddings, RAG, roadmap generation, and resume content generation in later phases.
- BullMQ workers process emails, resume parsing, roadmap generation, resume generation, and weekly reminders.
- Supabase PostgreSQL stores structured data with Row Level Security.
- Supabase Storage stores uploaded resumes and generated PDF/DOCX resumes.
- Supabase pgvector stores embeddings for RAG knowledge base retrieval.
- Redis supports rate limits, temporary values, caching, and queues.
- Nginx is the reverse proxy for deployed backend and AI service routes.

## Important System Design Decisions

- Use a modular monolith backend for MVP to keep development fast while preserving module boundaries.
- Keep the AI service separate in Python FastAPI because resume parsing, embeddings, RAG, and AI generation benefit from the Python ecosystem.
- Use queues for slow or failure-prone work such as email, resume parsing, roadmap generation, ATS generation, and reminders.
- Use Supabase RLS for user-owned data access instead of trusting frontend-supplied user IDs.
- Store files in Supabase Storage rather than PostgreSQL.
- Use Supabase pgvector first instead of introducing a separate vector database.
- Use Redis for distributed rate limiting, cache, temporary OTP/token storage, and BullMQ.
- Make resume parsing and AI generation asynchronous so normal API responses stay fast.
- Keep provider choices for email, LLM, embeddings, and payments replaceable behind service abstractions.

## Implementation Phase Order

From the Implementation Plan:

0. Product and engineering setup.
1. Supabase setup and database foundation.
2. Backend base setup.
3. Frontend base setup.
4. Authentication flow.
5. Version 0.1 clickable prototype.
6. Version 1.0 resume-first smart onboarding.
7. Version 1.0 dashboard.
8. Version 1.0 skill gap analysis.
9. Version 1.0 basic roadmap.
10. Version 1.1 ATS resume builder.
11. Version 1.2 AI service and RAG roadmap.
12. Version 1.3 scalability and security.
13. Version 1.4 progress tracking and weekly reminders.
14. Payment and upgrade flow.
15. Admin panel.
16. Testing.
17. Deployment.
18. Final polish.

Phase 0 is complete. Phase 1 database foundation artifacts are now prepared as Supabase migrations and seed SQL. No product feature code has been implemented yet.

## Version-Wise Plan

- Version 0.1 Prototype: landing page, auth UI, onboarding UI, dummy dashboard, dummy skill gap, dummy roadmap, and dummy resume builder.
- Version 1.0 MVP: Supabase Auth, resume-first onboarding, resume upload, profile auto-fill, profile editing, skill gap analysis, basic roadmap, dashboard, and Docker local setup.
- Version 1.1 ATS Resume Builder: generated resume content, editor, preview, PDF/DOCX downloads, ATS keywords, and role-based optimization.
- Version 1.2 RAG and GenAI Roadmap: FastAPI AI service, knowledge base, embeddings, Supabase pgvector retrieval, RAG roadmap, and career assistant basics.
- Version 1.3 Scalability and Security: Redis rate limits, queues, workers, private storage, audit logs, Nginx, and production security.
- Version 1.4 Progress Tracking and Reminder System: task progress, weekly reminders, inactive user reminders, email worker, reminder logs, and dashboard reminder status.
- Version 2.0 Advanced Platform: recruiter portal, college dashboard, AI mock interview, job matching, mobile app, payment plan expansion, and multi-resume support.

## MVP Scope

MVP includes:

- Supabase Auth.
- Resume-first onboarding.
- Resume upload with PDF/DOCX validation and 5 MB max file size.
- Resume parsing and profile auto-fill.
- Manual profile review and completion.
- Target role selection.
- Skill gap analysis.
- Basic roadmap generation.
- Dashboard with real user data.
- Docker local setup.
- Redis-backed rate limiting.
- Supabase PostgreSQL schema.

MVP excludes:

- Recruiter portal.
- Payment system.
- Mobile app.
- AI mock interview.
- College dashboard.
- Advanced analytics.
- Full reminder automation.
- Multi-tenant enterprise setup.

## Core Roles

- Guest: public pages, login, signup, pricing, features.
- Registered user: onboarding, dashboard, profile, skill gap, roadmap, resume builder, settings, billing.
- Admin: users, job roles, skills, knowledge base, reminders, logs, analytics.
- Worker or AI system: background processing and AI tasks without public user-facing routes.

## Key User Routes

Public:

- `/`
- `/features`
- `/pricing`
- `/login`
- `/signup`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

User:

- `/onboarding/upload-resume`
- `/onboarding/review-profile`
- `/onboarding/success`
- `/dashboard`
- `/skill-gap`
- `/roadmap`
- `/roadmap/:roadmapId`
- `/resume-builder`
- `/resume-builder/:id/preview`
- `/profile`
- `/billing`
- `/settings`

Admin:

- `/admin`
- `/admin/users`
- `/admin/job-roles`
- `/admin/knowledge-base`
- `/admin/reminders`
- `/admin/logs`

## Primary Database Groups

Supabase schema groups from the Backend Schema document:

- Auth and profile: `profiles`, `profile_field_sources`.
- Resume: `resumes`.
- Skills: `job_roles`, `skills`, `skill_aliases`, `role_skills`.
- Skill gap: `skill_analyses`, `skill_analysis_items`.
- RAG: `knowledge_base_documents`, `rag_queries`.
- Roadmap: `roadmaps`, `roadmap_weeks`, `roadmap_tasks`.
- Reminders and notifications: `reminder_logs`, `notifications`, `email_logs`.
- ATS resume: `generated_resumes`, `resume_templates`.
- AI jobs: `ai_jobs`.
- Payments: `plans`, `subscriptions`, `payment_transactions`, `usage_counters`.
- Admin and system: `audit_logs`, `system_settings`.

Every user-owned table should use `user_id uuid references auth.users(id)` or an ownership path that can be enforced through RLS.

## Supabase Database Choice

Supabase PostgreSQL is the required primary database. It replaces MongoDB because the product relies on relational ownership, auth integration, RLS, storage metadata, roadmap/task relationships, billing records, and pgvector-based RAG. Supabase also provides Auth, Storage, managed PostgreSQL, and vector search in one platform, reducing infrastructure complexity for MVP.

## Storage Buckets

Required Supabase Storage buckets:

- `resumes`
- `generated-resumes`
- `template-previews`
- `knowledge-base-files`

Resume and generated resume buckets should be private. User files should be stored under user-owned paths.

## Queues

Required BullMQ queues:

- `emailQueue`
- `resumeParsingQueue`
- `roadmapGenerationQueue`
- `resumeBuilderQueue`
- `weeklyReminderQueue`

## Resume-First Onboarding Flow

1. New user signs up and verifies email through Supabase Auth.
2. First-time user is routed to `/onboarding/upload-resume`.
3. User uploads PDF or DOCX resume, max 5 MB.
4. File is stored in private Supabase Storage under the user-owned path.
5. Resume metadata is saved in `resumes`.
6. Resume parsing job is created for extraction.
7. System extracts name, email, phone, city, education, work experience, skills, projects, and profile links.
8. User reviews an editable auto-filled profile form with source badges.
9. User completes missing required fields such as target role, preferred location, and work preference.
10. Final profile is saved to `profiles` and `profile_field_sources`.
11. `onboarding_completed` becomes true only after final profile submission.

## RAG Roadmap Flow

1. User completes profile and skill gap analysis.
2. Backend combines user profile, target role, and missing skills.
3. AI service creates an embedding query.
4. Supabase pgvector searches `knowledge_base_documents`.
5. Relevant role requirements, skills, resources, interview topics, and roadmap content are retrieved.
6. LLM generates a structured week-wise roadmap.
7. AI output is validated before saving.
8. Roadmap is saved to `roadmaps`, `roadmap_weeks`, and `roadmap_tasks`.
9. RAG query metadata is saved in `rag_queries` and long-running status in `ai_jobs`.

## Reminder System

The reminder system runs outside the main request path:

1. Scheduler checks active roadmaps weekly.
2. Progress tracking identifies pending current-week tasks, inactive users, or users behind expected progress.
3. Scheduler creates jobs in `weeklyReminderQueue` or `emailQueue`.
4. Worker sends reminder, inactive, or motivational emails.
5. Results are recorded in `reminder_logs` and `email_logs`.
6. Duplicate weekly reminders are prevented with a unique rule per user, roadmap, week, and reminder type.

## API Groups

Backend API groups documented:

- Auth: `/api/auth/*`
- Onboarding: `/api/onboarding/*`
- Resumes: `/api/resumes/*`
- Job roles: `/api/job-roles/*`
- Skill gap: `/api/skill-gap/*`
- Roadmap: `/api/roadmap/*`
- Reminders: `/api/reminders/*`
- Resume builder: `/api/resume-builder/*`
- Billing: `/api/billing/*`
- Admin: `/api/admin/*`
- Health: `/api/health`, `/api/health/db`, `/api/health/redis`, `/api/health/ai-service`

AI service routes documented for later phases:

- `POST /ai/parse-resume`
- `POST /ai/extract-skills`
- `POST /ai/generate-roadmap`
- `POST /ai/generate-resume`
- `POST /ai/embed-document`

## UX And Design Direction

The UI should be modern AI SaaS plus career dashboard:

- Clean, trustworthy, professional, soft, motivating, and minimal.
- Use Inter or a system fallback stack.
- Primary emerald `#10B981`, secondary indigo `#4F46E5`, accent sky `#0EA5E9`.
- Off-white page background `#F8FAFC`, white surfaces, slate text.
- Use Lucide icons.
- Use clear loading, empty, error, and success states.
- Resume upload, review profile, skill gap, roadmap, and resume builder must always show a clear next action.
- Accessibility should target WCAG 2.2, visible focus states, labels, keyboard-accessible buttons, and readable contrast.

## Security And Performance Constraints

- Use Supabase Auth and verify JWTs on the backend.
- Enable Supabase RLS on all user-owned tables.
- Do not expose service role keys to the frontend.
- Use Redis-backed rate limits.
- Failed login: 5 attempts/minute per IP plus email.
- Successful login capacity: at least 100 users/minute system-wide.
- OTP requests: 3 requests/10 minutes per email and IP.
- Resume upload: 10 uploads/hour/user.
- AI roadmap generation: 20/day/user.
- ATS resume generation: 10/day/user.
- Allow only PDF and DOCX resume uploads, max 5 MB.
- Store files in private buckets and use signed URLs.
- Normal APIs target under 500 ms.
- Dashboard target load time is under 2 seconds.
- AI and parsing tasks should be asynchronous.

## Phase 0 Boundary

Phase 0 should not implement auth, onboarding, skill gap, roadmaps, ATS resume builder, payments, or admin features. It should establish documentation understanding, extracted document text, context files, assumptions, build logging, and the monorepo folder structure.

## Phase 1 Artifacts

Supabase foundation files live in `supabase/`:

- `migrations/202606290001_foundation_schema.sql`
- `migrations/202606290002_rls_storage_policies.sql`
- `seed.sql`

These files prepare extensions, enums, tables, indexes, triggers, RLS policies, storage buckets, storage policies, and seed data for roles, skills, aliases, role-skill mappings, plans, and resume templates.

## Next Phase

Phase 2 is backend base setup:

- Setup Express server.
- Add typed environment loading.
- Add Supabase client configuration.
- Add Redis connection configuration.
- Add global error handling.
- Add validation middleware.
- Add auth and admin middleware foundations.
- Add basic rate limiting middleware.
- Add health check APIs for backend, database, Redis, and AI service.
