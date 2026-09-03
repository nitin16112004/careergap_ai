-- CareerGuid AI MVP backbone contract fixes.
-- Apply after the existing 202608080001 schema hardening migration.

alter table public.generated_resumes
  add column if not exists version_name text;

create index if not exists idx_generated_resumes_version_name
  on public.generated_resumes(user_id, version_name);

-- The service already retires older resumes. This makes the invariant explicit.
create unique index if not exists idx_resumes_one_active_per_user
  on public.resumes(user_id)
  where is_active = true;

-- Keep one active roadmap for a specific role per user.
create unique index if not exists idx_roadmaps_one_active_per_role
  on public.roadmaps(user_id, role_id)
  where is_active = true and role_id is not null;
