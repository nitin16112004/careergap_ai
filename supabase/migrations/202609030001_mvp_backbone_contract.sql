-- CareerGuid AI MVP backbone contract fixes.
-- Apply after the existing 202608080001 schema hardening migration.

-- The ATS service persists a human-readable version label. The original schema
-- did not contain this column, which caused a service/schema contract mismatch.
alter table public.generated_resumes
  add column if not exists version_name text;

create index if not exists idx_generated_resumes_version_name
  on public.generated_resumes(user_id, version_name);
