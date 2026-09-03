-- Phase 1: Supabase database foundation for CareerGuid AI.
-- This migration creates extensions, enums, core tables, indexes, and triggers.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('user', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'work_preference') then
    create type public.work_preference as enum ('remote', 'hybrid', 'onsite');
  end if;

  if not exists (select 1 from pg_type where typname = 'parsing_status') then
    create type public.parsing_status as enum ('pending', 'processing', 'completed', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('pending', 'completed', 'skipped', 'overdue');
  end if;

  if not exists (select 1 from pg_type where typname = 'reminder_type') then
    create type public.reminder_type as enum (
      'weekly_pending_task',
      'inactive_user',
      'motivational',
      'roadmap_due'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'email_status') then
    create type public.email_status as enum ('queued', 'sent', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'free',
      'active',
      'cancelled',
      'expired',
      'payment_failed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'ai_job_status') then
    create type public.ai_job_status as enum ('queued', 'processing', 'completed', 'failed');
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

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  phone text,
  current_city text,
  education text,
  work_experience text,
  skills text[] not null default array[]::text[],
  projects jsonb not null default '[]'::jsonb,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  target_job_role text,
  preferred_location text,
  work_preference public.work_preference,
  expected_salary text,
  notice_period text,
  career_goal text,
  role public.user_role not null default 'user',
  onboarding_completed boolean not null default false,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_onboarding on public.profiles(onboarding_completed);

create table if not exists public.profile_field_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field_name text not null,
  field_value text,
  source text not null check (source in ('resume', 'manual', 'ai', 'system')),
  confidence_score numeric(5,2),
  is_review_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, field_name)
);

create index if not exists idx_profile_field_sources_user_id on public.profile_field_sources(user_id);
create index if not exists idx_profile_field_sources_source on public.profile_field_sources(source);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  storage_path text not null,
  file_type text not null,
  file_size integer not null check (file_size > 0),
  extracted_text text,
  extracted_data jsonb not null default '{}'::jsonb,
  extracted_skills text[] not null default array[]::text[],
  parsing_status public.parsing_status not null default 'pending',
  parsing_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_resumes_status on public.resumes(parsing_status);
create index if not exists idx_resumes_active on public.resumes(user_id, is_active);

create table if not exists public.job_roles (
  id uuid primary key default gen_random_uuid(),
  role_name text not null unique,
  role_slug text not null unique,
  role_description text,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_roles_slug on public.job_roles(role_slug);
create index if not exists idx_job_roles_category on public.job_roles(category);
create index if not exists idx_job_roles_active on public.job_roles(is_active);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  skill_name text not null unique,
  normalized_name text not null unique,
  category text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_skills_normalized_name on public.skills(normalized_name);
create index if not exists idx_skills_category on public.skills(category);

create table if not exists public.skill_aliases (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  alias_name text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique(skill_id, normalized_alias)
);

create index if not exists idx_skill_aliases_skill_id on public.skill_aliases(skill_id);
create index if not exists idx_skill_aliases_alias on public.skill_aliases(normalized_alias);

create table if not exists public.role_skills (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.job_roles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  priority text not null check (priority in ('must_have', 'good_to_have', 'optional')),
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  weight integer not null default 1 check (weight > 0),
  created_at timestamptz not null default now(),
  unique(role_id, skill_id)
);

create index if not exists idx_role_skills_role_id on public.role_skills(role_id);
create index if not exists idx_role_skills_skill_id on public.role_skills(skill_id);
create index if not exists idx_role_skills_priority on public.role_skills(priority);

create table if not exists public.skill_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  role_id uuid not null references public.job_roles(id) on delete cascade,
  current_skills text[] not null default array[]::text[],
  missing_skills text[] not null default array[]::text[],
  matched_skills text[] not null default array[]::text[],
  recommended_skills text[] not null default array[]::text[],
  match_score integer check (match_score >= 0 and match_score <= 100),
  analysis_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_skill_analyses_user_id on public.skill_analyses(user_id);
create index if not exists idx_skill_analyses_role_id on public.skill_analyses(role_id);
create index if not exists idx_skill_analyses_created_at on public.skill_analyses(created_at desc);

create table if not exists public.skill_analysis_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.skill_analyses(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  skill_name text not null,
  status text not null check (status in ('matched', 'missing', 'recommended')),
  priority text check (priority in ('high', 'medium', 'low')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_skill_analysis_items_analysis_id on public.skill_analysis_items(analysis_id);
create index if not exists idx_skill_analysis_items_status on public.skill_analysis_items(status);

create table if not exists public.knowledge_base_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  source_url text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_base_category on public.knowledge_base_documents(category);
create index if not exists idx_knowledge_base_active on public.knowledge_base_documents(is_active);
create index if not exists idx_knowledge_base_embedding
  on public.knowledge_base_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create table if not exists public.rag_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  query_text text not null,
  retrieved_document_ids uuid[] not null default array[]::uuid[],
  response_summary text,
  model_used text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rag_queries_user_id on public.rag_queries(user_id);
create index if not exists idx_rag_queries_created_at on public.rag_queries(created_at desc);

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_analysis_id uuid references public.skill_analyses(id) on delete set null,
  role_id uuid references public.job_roles(id) on delete set null,
  title text not null,
  description text,
  duration_weeks integer check (duration_weeks is null or duration_weeks > 0),
  progress_percentage integer not null default 0 check (
    progress_percentage >= 0 and progress_percentage <= 100
  ),
  generated_by text not null default 'basic_template',
  ai_response jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_roadmaps_user_id on public.roadmaps(user_id);
create index if not exists idx_roadmaps_role_id on public.roadmaps(role_id);
create index if not exists idx_roadmaps_active on public.roadmaps(user_id, is_active);

create table if not exists public.roadmap_weeks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  title text not null,
  description text,
  start_date date,
  due_date date,
  status public.task_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(roadmap_id, week_number)
);

create index if not exists idx_roadmap_weeks_roadmap_id on public.roadmap_weeks(roadmap_id);
create index if not exists idx_roadmap_weeks_due_date on public.roadmap_weeks(due_date);

create table if not exists public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  week_id uuid not null references public.roadmap_weeks(id) on delete cascade,
  task_title text not null,
  task_description text,
  resource_links jsonb not null default '[]'::jsonb,
  status public.task_status not null default 'pending',
  due_date date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_roadmap_tasks_roadmap_id on public.roadmap_tasks(roadmap_id);
create index if not exists idx_roadmap_tasks_week_id on public.roadmap_tasks(week_id);
create index if not exists idx_roadmap_tasks_status on public.roadmap_tasks(status);
create index if not exists idx_roadmap_tasks_due_date on public.roadmap_tasks(due_date);

create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid references public.roadmaps(id) on delete cascade,
  week_id uuid references public.roadmap_weeks(id) on delete set null,
  reminder_type public.reminder_type not null,
  pending_task_count integer not null default 0 check (pending_task_count >= 0),
  email_sent boolean not null default false,
  email_status public.email_status not null default 'queued',
  email_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reminder_logs_user_id on public.reminder_logs(user_id);
create index if not exists idx_reminder_logs_roadmap_id on public.reminder_logs(roadmap_id);
create index if not exists idx_reminder_logs_type on public.reminder_logs(reminder_type);
create index if not exists idx_reminder_logs_sent_at on public.reminder_logs(sent_at desc);
create unique index if not exists idx_unique_weekly_reminder
  on public.reminder_logs(user_id, roadmap_id, week_id, reminder_type)
  where reminder_type = 'weekly_pending_task';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(user_id, is_read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email_to text not null,
  email_subject text not null,
  email_type text not null,
  status public.email_status not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_logs_user_id on public.email_logs(user_id);
create index if not exists idx_email_logs_type on public.email_logs(email_type);
create index if not exists idx_email_logs_status on public.email_logs(status);

create table if not exists public.generated_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_resume_id uuid references public.resumes(id) on delete set null,
  target_role text not null,
  resume_content jsonb not null default '{}'::jsonb,
  ats_keywords text[] not null default array[]::text[],
  ats_score integer check (ats_score >= 0 and ats_score <= 100),
  pdf_url text,
  docx_url text,
  pdf_storage_path text,
  docx_storage_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_generated_resumes_user_id on public.generated_resumes(user_id);
create index if not exists idx_generated_resumes_target_role on public.generated_resumes(target_role);
create index if not exists idx_generated_resumes_active on public.generated_resumes(user_id, is_active);

create table if not exists public.resume_templates (
  id uuid primary key default gen_random_uuid(),
  template_name text not null,
  template_slug text not null unique,
  description text,
  preview_image_url text,
  is_premium boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_resume_templates_slug on public.resume_templates(template_slug);
create index if not exists idx_resume_templates_premium on public.resume_templates(is_premium);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_type text not null,
  status public.ai_job_status not null default 'queued',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_message text,
  retry_count integer not null default 0 check (retry_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (job_type in (
    'resume_parsing',
    'skill_gap_analysis',
    'roadmap_generation',
    'ats_resume_generation',
    'embedding_generation'
  ))
);

create index if not exists idx_ai_jobs_user_id on public.ai_jobs(user_id);
create index if not exists idx_ai_jobs_status on public.ai_jobs(status);
create index if not exists idx_ai_jobs_type on public.ai_jobs(job_type);
create index if not exists idx_ai_jobs_created_at on public.ai_jobs(created_at desc);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  plan_name text not null unique,
  plan_slug text not null unique,
  description text,
  price_monthly numeric(10,2) not null default 0,
  price_yearly numeric(10,2) not null default 0,
  currency text not null default 'INR',
  resume_upload_limit integer,
  roadmap_generation_limit integer,
  ats_resume_generation_limit integer,
  ai_chat_limit integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_plans_slug on public.plans(plan_slug);
create index if not exists idx_plans_active on public.plans(is_active);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'free',
  billing_cycle text not null default 'none' check (billing_cycle in ('monthly', 'yearly', 'none')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  payment_provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_plan_id on public.subscriptions(plan_id);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  provider_payment_id text,
  provider_order_id text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status text not null check (status in ('created', 'paid', 'failed', 'refunded')),
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_transactions_user_id on public.payment_transactions(user_id);
create index if not exists idx_payment_transactions_status on public.payment_transactions(status);
create index if not exists idx_payment_transactions_provider_payment_id
  on public.payment_transactions(provider_payment_id);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_key text not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, usage_key, period_start, period_end),
  check (usage_key in (
    'resume_upload',
    'roadmap_generation',
    'ats_resume_generation',
    'ai_chat'
  )),
  check (period_end >= period_start)
);

create index if not exists idx_usage_counters_user_id on public.usage_counters(user_id);
create index if not exists idx_usage_counters_key on public.usage_counters(usage_key);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, email_verified)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_profile_field_sources_updated_at on public.profile_field_sources;
create trigger update_profile_field_sources_updated_at
before update on public.profile_field_sources
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_resumes_updated_at on public.resumes;
create trigger update_resumes_updated_at
before update on public.resumes
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_job_roles_updated_at on public.job_roles;
create trigger update_job_roles_updated_at
before update on public.job_roles
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_knowledge_base_documents_updated_at on public.knowledge_base_documents;
create trigger update_knowledge_base_documents_updated_at
before update on public.knowledge_base_documents
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_roadmaps_updated_at on public.roadmaps;
create trigger update_roadmaps_updated_at
before update on public.roadmaps
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_roadmap_weeks_updated_at on public.roadmap_weeks;
create trigger update_roadmap_weeks_updated_at
before update on public.roadmap_weeks
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_roadmap_tasks_updated_at on public.roadmap_tasks;
create trigger update_roadmap_tasks_updated_at
before update on public.roadmap_tasks
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_generated_resumes_updated_at on public.generated_resumes;
create trigger update_generated_resumes_updated_at
before update on public.generated_resumes
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_ai_jobs_updated_at on public.ai_jobs;
create trigger update_ai_jobs_updated_at
before update on public.ai_jobs
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_subscriptions_updated_at on public.subscriptions;
create trigger update_subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_usage_counters_updated_at on public.usage_counters;
create trigger update_usage_counters_updated_at
before update on public.usage_counters
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_system_settings_updated_at on public.system_settings;
create trigger update_system_settings_updated_at
before update on public.system_settings
for each row execute procedure public.update_updated_at_column();
