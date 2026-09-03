-- CareerGuid AI schema hardening and explicit database contract.
-- This migration is additive so it can follow the foundation migrations that
-- are already present on dev without rewriting an applied migration.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- A separate role mapping keeps future authorization extensible while
-- Supabase Auth remains the identity source of truth.
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);
create index if not exists idx_user_roles_created_at on public.user_roles(created_at desc);

-- Every table in the public schema has both lifecycle timestamps. Existing
-- foundation tables that predate this contract are upgraded in place.
alter table public.skills
  add column if not exists updated_at timestamptz not null default now();
alter table public.skill_aliases
  add column if not exists updated_at timestamptz not null default now();
alter table public.role_skills
  add column if not exists updated_at timestamptz not null default now();
alter table public.skill_analyses
  add column if not exists updated_at timestamptz not null default now();
alter table public.skill_analysis_items
  add column if not exists updated_at timestamptz not null default now();
alter table public.rag_queries
  add column if not exists updated_at timestamptz not null default now();
alter table public.reminder_logs
  add column if not exists updated_at timestamptz not null default now();
alter table public.notifications
  add column if not exists updated_at timestamptz not null default now();
alter table public.email_logs
  add column if not exists updated_at timestamptz not null default now();
alter table public.resume_templates
  add column if not exists updated_at timestamptz not null default now();
alter table public.ai_jobs
  add column if not exists updated_at timestamptz not null default now();
alter table public.plans
  add column if not exists updated_at timestamptz not null default now();
alter table public.payment_transactions
  add column if not exists updated_at timestamptz not null default now();
alter table public.audit_logs
  add column if not exists updated_at timestamptz not null default now();
alter table public.system_settings
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_profiles_created_at on public.profiles(created_at desc);
create index if not exists idx_profiles_user_id on public.profiles(id);
create index if not exists idx_profile_field_sources_created_at on public.profile_field_sources(created_at desc);
create index if not exists idx_resumes_created_at on public.resumes(created_at desc);
create index if not exists idx_job_roles_created_at on public.job_roles(created_at desc);
create index if not exists idx_skills_created_at on public.skills(created_at desc);
create index if not exists idx_skill_aliases_created_at on public.skill_aliases(created_at desc);
create index if not exists idx_role_skills_created_at on public.role_skills(created_at desc);
create index if not exists idx_skill_analyses_created_at on public.skill_analyses(created_at desc);
create index if not exists idx_skill_analysis_items_created_at on public.skill_analysis_items(created_at desc);
create index if not exists idx_knowledge_base_documents_created_at on public.knowledge_base_documents(created_at desc);
create index if not exists idx_rag_queries_created_at on public.rag_queries(created_at desc);
create index if not exists idx_roadmaps_created_at on public.roadmaps(created_at desc);
create index if not exists idx_roadmap_weeks_created_at on public.roadmap_weeks(created_at desc);
create index if not exists idx_roadmap_tasks_created_at on public.roadmap_tasks(created_at desc);
create index if not exists idx_reminder_logs_created_at on public.reminder_logs(created_at desc);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_email_logs_created_at on public.email_logs(created_at desc);
create index if not exists idx_generated_resumes_created_at on public.generated_resumes(created_at desc);
create index if not exists idx_resume_templates_created_at on public.resume_templates(created_at desc);
create index if not exists idx_ai_jobs_created_at on public.ai_jobs(created_at desc);
create index if not exists idx_plans_created_at on public.plans(created_at desc);
create index if not exists idx_subscriptions_created_at on public.subscriptions(created_at desc);
create index if not exists idx_payment_transactions_created_at on public.payment_transactions(created_at desc);
create index if not exists idx_usage_counters_created_at on public.usage_counters(created_at desc);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_system_settings_created_at on public.system_settings(created_at desc);

-- Keep roadmap tasks attached to a week belonging to the same roadmap.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.roadmap_weeks'::regclass
      and conname = 'roadmap_weeks_id_roadmap_id_key'
  ) then
    alter table public.roadmap_weeks
      add constraint roadmap_weeks_id_roadmap_id_key unique (id, roadmap_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.roadmap_tasks'::regclass
      and conname = 'roadmap_tasks_week_roadmap_id_fkey'
  ) then
    alter table public.roadmap_tasks
      add constraint roadmap_tasks_week_roadmap_id_fkey
      foreign key (week_id, roadmap_id)
      references public.roadmap_weeks (id, roadmap_id)
      on delete cascade;
  end if;
end
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Recreate the trigger set so every mutable table gets identical timestamp
-- semantics, including the tables that were added in this hardening pass.
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at before update on public.profiles
for each row execute function public.update_updated_at_column();
drop trigger if exists update_profile_field_sources_updated_at on public.profile_field_sources;
create trigger update_profile_field_sources_updated_at before update on public.profile_field_sources
for each row execute function public.update_updated_at_column();
drop trigger if exists update_resumes_updated_at on public.resumes;
create trigger update_resumes_updated_at before update on public.resumes
for each row execute function public.update_updated_at_column();
drop trigger if exists update_job_roles_updated_at on public.job_roles;
create trigger update_job_roles_updated_at before update on public.job_roles
for each row execute function public.update_updated_at_column();
drop trigger if exists update_skills_updated_at on public.skills;
create trigger update_skills_updated_at before update on public.skills
for each row execute function public.update_updated_at_column();
drop trigger if exists update_skill_aliases_updated_at on public.skill_aliases;
create trigger update_skill_aliases_updated_at before update on public.skill_aliases
for each row execute function public.update_updated_at_column();
drop trigger if exists update_role_skills_updated_at on public.role_skills;
create trigger update_role_skills_updated_at before update on public.role_skills
for each row execute function public.update_updated_at_column();
drop trigger if exists update_skill_analyses_updated_at on public.skill_analyses;
create trigger update_skill_analyses_updated_at before update on public.skill_analyses
for each row execute function public.update_updated_at_column();
drop trigger if exists update_skill_analysis_items_updated_at on public.skill_analysis_items;
create trigger update_skill_analysis_items_updated_at before update on public.skill_analysis_items
for each row execute function public.update_updated_at_column();
drop trigger if exists update_knowledge_base_documents_updated_at on public.knowledge_base_documents;
create trigger update_knowledge_base_documents_updated_at before update on public.knowledge_base_documents
for each row execute function public.update_updated_at_column();
drop trigger if exists update_rag_queries_updated_at on public.rag_queries;
create trigger update_rag_queries_updated_at before update on public.rag_queries
for each row execute function public.update_updated_at_column();
drop trigger if exists update_roadmaps_updated_at on public.roadmaps;
create trigger update_roadmaps_updated_at before update on public.roadmaps
for each row execute function public.update_updated_at_column();
drop trigger if exists update_roadmap_weeks_updated_at on public.roadmap_weeks;
create trigger update_roadmap_weeks_updated_at before update on public.roadmap_weeks
for each row execute function public.update_updated_at_column();
drop trigger if exists update_roadmap_tasks_updated_at on public.roadmap_tasks;
create trigger update_roadmap_tasks_updated_at before update on public.roadmap_tasks
for each row execute function public.update_updated_at_column();
drop trigger if exists update_reminder_logs_updated_at on public.reminder_logs;
create trigger update_reminder_logs_updated_at before update on public.reminder_logs
for each row execute function public.update_updated_at_column();
drop trigger if exists update_notifications_updated_at on public.notifications;
create trigger update_notifications_updated_at before update on public.notifications
for each row execute function public.update_updated_at_column();
drop trigger if exists update_email_logs_updated_at on public.email_logs;
create trigger update_email_logs_updated_at before update on public.email_logs
for each row execute function public.update_updated_at_column();
drop trigger if exists update_generated_resumes_updated_at on public.generated_resumes;
create trigger update_generated_resumes_updated_at before update on public.generated_resumes
for each row execute function public.update_updated_at_column();
drop trigger if exists update_resume_templates_updated_at on public.resume_templates;
create trigger update_resume_templates_updated_at before update on public.resume_templates
for each row execute function public.update_updated_at_column();
drop trigger if exists update_ai_jobs_updated_at on public.ai_jobs;
create trigger update_ai_jobs_updated_at before update on public.ai_jobs
for each row execute function public.update_updated_at_column();
drop trigger if exists update_plans_updated_at on public.plans;
create trigger update_plans_updated_at before update on public.plans
for each row execute function public.update_updated_at_column();
drop trigger if exists update_subscriptions_updated_at on public.subscriptions;
create trigger update_subscriptions_updated_at before update on public.subscriptions
for each row execute function public.update_updated_at_column();
drop trigger if exists update_payment_transactions_updated_at on public.payment_transactions;
create trigger update_payment_transactions_updated_at before update on public.payment_transactions
for each row execute function public.update_updated_at_column();
drop trigger if exists update_usage_counters_updated_at on public.usage_counters;
create trigger update_usage_counters_updated_at before update on public.usage_counters
for each row execute function public.update_updated_at_column();
drop trigger if exists update_audit_logs_updated_at on public.audit_logs;
create trigger update_audit_logs_updated_at before update on public.audit_logs
for each row execute function public.update_updated_at_column();
drop trigger if exists update_system_settings_updated_at on public.system_settings;
create trigger update_system_settings_updated_at before update on public.system_settings
for each row execute function public.update_updated_at_column();
drop trigger if exists update_user_roles_updated_at on public.user_roles;
create trigger update_user_roles_updated_at before update on public.user_roles
for each row execute function public.update_updated_at_column();

alter table public.user_roles enable row level security;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can manage user roles" on public.user_roles;
create policy "Admins can manage user roles"
on public.user_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
