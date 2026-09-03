-- Phase 1: Row Level Security and Supabase Storage foundation.

alter table public.profiles enable row level security;
alter table public.profile_field_sources enable row level security;
alter table public.resumes enable row level security;
alter table public.job_roles enable row level security;
alter table public.skills enable row level security;
alter table public.skill_aliases enable row level security;
alter table public.role_skills enable row level security;
alter table public.skill_analyses enable row level security;
alter table public.skill_analysis_items enable row level security;
alter table public.knowledge_base_documents enable row level security;
alter table public.rag_queries enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_weeks enable row level security;
alter table public.roadmap_tasks enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.email_logs enable row level security;
alter table public.generated_resumes enable row level security;
alter table public.resume_templates enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can view own profile field sources" on public.profile_field_sources;
create policy "Users can view own profile field sources"
on public.profile_field_sources
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile field sources" on public.profile_field_sources;
create policy "Users can insert own profile field sources"
on public.profile_field_sources
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile field sources" on public.profile_field_sources;
create policy "Users can update own profile field sources"
on public.profile_field_sources
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own profile field sources" on public.profile_field_sources;
create policy "Users can delete own profile field sources"
on public.profile_field_sources
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own resumes" on public.resumes;
create policy "Users can view own resumes"
on public.resumes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own resumes" on public.resumes;
create policy "Users can insert own resumes"
on public.resumes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own resumes" on public.resumes;
create policy "Users can update own resumes"
on public.resumes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resumes" on public.resumes;
create policy "Users can delete own resumes"
on public.resumes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read active job roles" on public.job_roles;
create policy "Authenticated users can read active job roles"
on public.job_roles
for select
to authenticated
using (is_active = true);

drop policy if exists "Admins can manage job roles" on public.job_roles;
create policy "Admins can manage job roles"
on public.job_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read skills" on public.skills;
create policy "Authenticated users can read skills"
on public.skills
for select
to authenticated
using (true);

drop policy if exists "Admins can manage skills" on public.skills;
create policy "Admins can manage skills"
on public.skills
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read skill aliases" on public.skill_aliases;
create policy "Authenticated users can read skill aliases"
on public.skill_aliases
for select
to authenticated
using (true);

drop policy if exists "Admins can manage skill aliases" on public.skill_aliases;
create policy "Admins can manage skill aliases"
on public.skill_aliases
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read role skills" on public.role_skills;
create policy "Authenticated users can read role skills"
on public.role_skills
for select
to authenticated
using (true);

drop policy if exists "Admins can manage role skills" on public.role_skills;
create policy "Admins can manage role skills"
on public.role_skills
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can view own skill analyses" on public.skill_analyses;
create policy "Users can view own skill analyses"
on public.skill_analyses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own skill analyses" on public.skill_analyses;
create policy "Users can insert own skill analyses"
on public.skill_analyses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own skill analyses" on public.skill_analyses;
create policy "Users can update own skill analyses"
on public.skill_analyses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own skill analyses" on public.skill_analyses;
create policy "Users can delete own skill analyses"
on public.skill_analyses
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own skill analysis items" on public.skill_analysis_items;
create policy "Users can view own skill analysis items"
on public.skill_analysis_items
for select
to authenticated
using (
  exists (
    select 1
    from public.skill_analyses
    where skill_analyses.id = skill_analysis_items.analysis_id
      and skill_analyses.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own skill analysis items" on public.skill_analysis_items;
create policy "Users can insert own skill analysis items"
on public.skill_analysis_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.skill_analyses
    where skill_analyses.id = skill_analysis_items.analysis_id
      and skill_analyses.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own skill analysis items" on public.skill_analysis_items;
create policy "Users can update own skill analysis items"
on public.skill_analysis_items
for update
to authenticated
using (
  exists (
    select 1
    from public.skill_analyses
    where skill_analyses.id = skill_analysis_items.analysis_id
      and skill_analyses.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.skill_analyses
    where skill_analyses.id = skill_analysis_items.analysis_id
      and skill_analyses.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage knowledge base documents" on public.knowledge_base_documents;
create policy "Admins can manage knowledge base documents"
on public.knowledge_base_documents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read active knowledge base documents" on public.knowledge_base_documents;
create policy "Authenticated users can read active knowledge base documents"
on public.knowledge_base_documents
for select
to authenticated
using (is_active = true);

drop policy if exists "Users can view own rag queries" on public.rag_queries;
create policy "Users can view own rag queries"
on public.rag_queries
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own rag queries" on public.rag_queries;
create policy "Users can insert own rag queries"
on public.rag_queries
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can view own roadmaps" on public.roadmaps;
create policy "Users can view own roadmaps"
on public.roadmaps
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own roadmaps" on public.roadmaps;
create policy "Users can insert own roadmaps"
on public.roadmaps
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own roadmaps" on public.roadmaps;
create policy "Users can update own roadmaps"
on public.roadmaps
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own roadmaps" on public.roadmaps;
create policy "Users can delete own roadmaps"
on public.roadmaps
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own roadmap weeks" on public.roadmap_weeks;
create policy "Users can view own roadmap weeks"
on public.roadmap_weeks
for select
to authenticated
using (
  exists (
    select 1
    from public.roadmaps
    where roadmaps.id = roadmap_weeks.roadmap_id
      and roadmaps.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own roadmap weeks" on public.roadmap_weeks;
create policy "Users can insert own roadmap weeks"
on public.roadmap_weeks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.roadmaps
    where roadmaps.id = roadmap_weeks.roadmap_id
      and roadmaps.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own roadmap weeks" on public.roadmap_weeks;
create policy "Users can update own roadmap weeks"
on public.roadmap_weeks
for update
to authenticated
using (
  exists (
    select 1
    from public.roadmaps
    where roadmaps.id = roadmap_weeks.roadmap_id
      and roadmaps.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.roadmaps
    where roadmaps.id = roadmap_weeks.roadmap_id
      and roadmaps.user_id = auth.uid()
  )
);

drop policy if exists "Users can view own roadmap tasks" on public.roadmap_tasks;
create policy "Users can view own roadmap tasks"
on public.roadmap_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.roadmaps
    where roadmaps.id = roadmap_tasks.roadmap_id
      and roadmaps.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own roadmap tasks" on public.roadmap_tasks;
create policy "Users can insert own roadmap tasks"
on public.roadmap_tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.roadmaps
    where roadmaps.id = roadmap_tasks.roadmap_id
      and roadmaps.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own roadmap tasks" on public.roadmap_tasks;
create policy "Users can update own roadmap tasks"
on public.roadmap_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.roadmaps
    where roadmaps.id = roadmap_tasks.roadmap_id
      and roadmaps.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.roadmaps
    where roadmaps.id = roadmap_tasks.roadmap_id
      and roadmaps.user_id = auth.uid()
  )
);

drop policy if exists "Users can view own reminder logs" on public.reminder_logs;
create policy "Users can view own reminder logs"
on public.reminder_logs
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own reminder logs" on public.reminder_logs;
create policy "Users can insert own reminder logs"
on public.reminder_logs
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view own email logs" on public.email_logs;
create policy "Users can view own email logs"
on public.email_logs
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can view own generated resumes" on public.generated_resumes;
create policy "Users can view own generated resumes"
on public.generated_resumes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own generated resumes" on public.generated_resumes;
create policy "Users can insert own generated resumes"
on public.generated_resumes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own generated resumes" on public.generated_resumes;
create policy "Users can update own generated resumes"
on public.generated_resumes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own generated resumes" on public.generated_resumes;
create policy "Users can delete own generated resumes"
on public.generated_resumes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read active resume templates" on public.resume_templates;
create policy "Authenticated users can read active resume templates"
on public.resume_templates
for select
to authenticated
using (is_active = true);

drop policy if exists "Admins can manage resume templates" on public.resume_templates;
create policy "Admins can manage resume templates"
on public.resume_templates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can view own ai jobs" on public.ai_jobs;
create policy "Users can view own ai jobs"
on public.ai_jobs
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own ai jobs" on public.ai_jobs;
create policy "Users can insert own ai jobs"
on public.ai_jobs
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can update own ai jobs" on public.ai_jobs;
create policy "Users can update own ai jobs"
on public.ai_jobs
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Authenticated users can read active plans" on public.plans;
create policy "Authenticated users can read active plans"
on public.plans
for select
to authenticated
using (is_active = true);

drop policy if exists "Admins can manage plans" on public.plans;
create policy "Admins can manage plans"
on public.plans
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own subscriptions" on public.subscriptions;
create policy "Users can insert own subscriptions"
on public.subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own subscriptions" on public.subscriptions;
create policy "Users can update own subscriptions"
on public.subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view own payment transactions" on public.payment_transactions;
create policy "Users can view own payment transactions"
on public.payment_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own payment transactions" on public.payment_transactions;
create policy "Users can insert own payment transactions"
on public.payment_transactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can view own usage counters" on public.usage_counters;
create policy "Users can view own usage counters"
on public.usage_counters
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own usage counters" on public.usage_counters;
create policy "Users can insert own usage counters"
on public.usage_counters
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own usage counters" on public.usage_counters;
create policy "Users can update own usage counters"
on public.usage_counters
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert audit logs" on public.audit_logs;
create policy "Admins can insert audit logs"
on public.audit_logs
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can manage system settings" on public.system_settings;
create policy "Admins can manage system settings"
on public.system_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'resumes',
    'resumes',
    false,
    5242880,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'generated-resumes',
    'generated-resumes',
    false,
    10485760,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'template-previews',
    'template-previews',
    true,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'knowledge-base-files',
    'knowledge-base-files',
    false,
    10485760,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own resumes" on storage.objects;
create policy "Users can upload own resumes"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own resumes" on storage.objects;
create policy "Users can read own resumes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own resumes" on storage.objects;
create policy "Users can update own resumes"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own resumes" on storage.objects;
create policy "Users can delete own resumes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own generated resumes" on storage.objects;
create policy "Users can upload own generated resumes"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own generated resumes" on storage.objects;
create policy "Users can read own generated resumes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own generated resumes" on storage.objects;
create policy "Users can delete own generated resumes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generated-resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Authenticated users can read template previews" on storage.objects;
create policy "Authenticated users can read template previews"
on storage.objects
for select
to authenticated
using (bucket_id = 'template-previews');

drop policy if exists "Admins can manage template previews" on storage.objects;
create policy "Admins can manage template previews"
on storage.objects
for all
to authenticated
using (bucket_id = 'template-previews' and public.is_admin())
with check (bucket_id = 'template-previews' and public.is_admin());

drop policy if exists "Admins can manage knowledge base files" on storage.objects;
create policy "Admins can manage knowledge base files"
on storage.objects
for all
to authenticated
using (bucket_id = 'knowledge-base-files' and public.is_admin())
with check (bucket_id = 'knowledge-base-files' and public.is_admin());
