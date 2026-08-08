# Supabase

Phase 1 database foundation for CareerGuid AI.

## What Is Included

- Extensions: `uuid-ossp`, `pgcrypto`, `vector`.
- Enum types for roles, work preference, parsing status, tasks, reminders, email status, subscriptions, and AI jobs.
- Core tables for profiles, resumes, skills, skill gap analysis, RAG, roadmaps, reminders, generated resumes, plans, subscriptions, usage counters, audit logs, and system settings.
- Indexes and `updated_at` triggers.
- Signup trigger to create `profiles` rows from `auth.users`.
- Row Level Security policies.
- Supabase Storage buckets and ownership policies.
- Seed data for job roles, skills, aliases, role-skill mappings, plans, and resume templates.

## Files

- `migrations/202606290001_foundation_schema.sql`
- `migrations/202606290002_rls_storage_policies.sql`
- `seed.sql`

## Apply With Supabase CLI

Install and authenticate the Supabase CLI, then link this repo to a Supabase project:

```powershell
supabase link --project-ref <project-ref>
supabase db push
supabase db seed
```

For local Supabase development:

```powershell
supabase start
supabase db reset
```

## Storage Path Convention

Storage policies expect user-owned objects to start with the auth user id:

- `resumes/{user_id}/{resume_id}.pdf` maps to object name `{user_id}/{resume_id}.pdf` inside the `resumes` bucket.
- `generated-resumes/{user_id}/{generated_resume_id}.pdf` maps to object name `{user_id}/{generated_resume_id}.pdf` inside the `generated-resumes` bucket.

Supabase stores the bucket separately from the object name, so upload paths inside each bucket should start with `{user_id}/`.

## Notes

- This phase does not implement frontend, backend, AI service, workers, or product features.
- MongoDB is intentionally not used.
- RAG tables and pgvector are included as database foundation only; RAG generation belongs to a later phase.
