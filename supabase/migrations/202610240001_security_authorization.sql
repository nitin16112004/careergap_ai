-- Server-owned authorization and billing state. Apply after all prior migrations.
-- Frontend profile/billing mutations already go through the authenticated API.
begin;

-- Consult live, server-managed Auth state, not a potentially stale JWT role.
-- SECURITY DEFINER avoids recursive profiles RLS; qualified names and a fixed
-- search_path prevent caller-controlled object resolution. Keep this function
-- owned by the trusted migration role (postgres), never an application role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = auth.uid()
      and u.raw_app_meta_data ->> 'role' = 'admin'
      and p.role = 'admin'
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Remove every write-capable policy, including permissive FOR ALL policies.
-- Also remove table AND column grants: revoking a table grant alone does not
-- remove an independently granted UPDATE(column) privilege.
do $$
declare
  target_table text;
  policy_row record;
  column_row record;
begin
  foreach target_table in array array[
    'profiles', 'user_roles', 'subscriptions', 'payment_transactions',
    'usage_counters', 'billing_webhook_events'
  ] loop
    for policy_row in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = target_table
        and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    loop
      execute format('drop policy %I on public.%I', policy_row.policyname, target_table);
    end loop;
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', target_table);
    for column_row in
      select column_name from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = target_table
    loop
      execute format('revoke all privileges (%I) on public.%I from public, anon, authenticated', column_row.column_name, target_table);
    end loop;
    execute format('grant select on public.%I to authenticated', target_table);
    execute format('grant all privileges on public.%I to service_role', target_table);
    execute format('alter table public.%I enable row level security', target_table);
  end loop;
end;
$$;

-- The old FOR ALL admin policies also provided read access; restore SELECT only.
drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles" on public.profiles
for select to authenticated using (public.is_admin());

-- Existing owner SELECT policies and admin-only webhook SELECT policy remain.
-- Privileged billing RPCs retain their service_role-only execution grants.
commit;
