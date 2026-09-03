# Database Setup

CareerGuid AI uses Supabase PostgreSQL as its relational source of truth. The
same Supabase project provides Auth, Storage, and pgvector. The schema is a
foundation only; product workflows and workers are implemented in later
phases.

## Schema Overview

| Domain | Tables |
| --- | --- |
| Identity and audit | `profiles`, `user_roles`, `audit_logs` |
| Resume | `resumes`, `generated_resumes`, `resume_templates` |
| Skills | `job_roles`, `skills`, `skill_aliases`, `role_skills` |
| Analysis | `skill_analyses`, `skill_analysis_items` |
| AI and RAG | `knowledge_base_documents`, `rag_queries`, `ai_jobs` |
| Roadmap | `roadmaps`, `roadmap_weeks`, `roadmap_tasks` |
| Notifications | `reminder_logs`, `notifications`, `email_logs` |
| Subscription | `plans`, `subscriptions`, `payment_transactions`, `usage_counters` |
| System | `system_settings` |

Every table has a UUID primary key, lifecycle timestamps, and explicit foreign
keys. User-owned rows reference `auth.users(id)`. A profile is created by the
Supabase Auth signup trigger. Roadmap weeks and tasks are owned through their
parent roadmap, and roadmap tasks also enforce that their week belongs to the
same roadmap.

## Extensions And Storage

Migrations enable `uuid-ossp`, `pgcrypto`, and `vector` (pgvector). Knowledge
base documents use `vector(1536)` for future embedding search. Storage buckets
are prepared for `resumes`, `generated-resumes`, `knowledge-base-files`, and
`template-previews`; no files are uploaded by these migrations.

## Migrations And Seed Data

Install the Supabase CLI, authenticate, and link a project:

```powershell
supabase link --project-ref <project-ref>
supabase db push
supabase db seed
```

For local validation:

```powershell
supabase start
supabase db reset
```

`db reset` applies every file under `supabase/migrations/` in timestamp order,
then executes `supabase/seed.sql`. The seed is idempotent and includes the
documented job roles (including Frontend Developer, Backend Developer, Full
Stack Developer, Data Scientist, and AI Engineer), Free/Premium plans, ATS
templates, skills, aliases, and role-skill mappings.

## Row Level Security

RLS is enabled for all public tables. Policies use the authenticated Supabase
subject rather than a client-provided user id:

- Profiles, resumes, roadmaps, notifications, subscriptions, payments, and
  usage rows are readable only by their owner.
- Inserts, updates, and deletes require ownership checks where the domain
  permits client mutation.
- Roadmap weeks and tasks verify ownership through `roadmaps.user_id`.
- Job roles, skills, role skills, plans, and active templates have
  authenticated read policies.
- Admin management policies use `public.is_admin()`, which checks the
  Supabase Auth `app_metadata.role` claim. `user_roles` provides a normalized
  role mapping for future admin workflows.
- Storage policies enforce the same user-folder ownership for resume files and
  admin-only management for knowledge-base and template assets.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to a browser or mobile client. It
bypasses RLS and is reserved for trusted backend and worker processes.

## Scope Boundary

This phase does not implement authentication screens, resume upload/parsing,
AI or RAG execution, roadmap generation, reminders, dashboard APIs, or payment
processing.
