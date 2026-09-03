-- Payment / upgrade hardening for CareerGuid AI.
-- Extends the existing plans/subscriptions/payment_transactions/usage_counters
-- tables with provider idempotency and atomic plan-usage enforcement.

alter table public.subscriptions
  add column if not exists provider_customer_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_subscriptions_provider_subscription
  on public.subscriptions(payment_provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists idx_subscriptions_user_status_period
  on public.subscriptions(user_id, status, ends_at desc);

alter table public.payment_transactions
  add column if not exists plan_id uuid references public.plans(id) on delete set null,
  add column if not exists billing_cycle text check (billing_cycle in ('monthly', 'yearly', 'none')) default 'none',
  add column if not exists provider_event_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_payment_transactions_provider_payment_unique
  on public.payment_transactions(provider, provider_payment_id)
  where provider_payment_id is not null;

create index if not exists idx_payment_transactions_provider_order
  on public.payment_transactions(provider, provider_order_id)
  where provider_order_id is not null;

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('razorpay', 'stripe')),
  provider_event_id text not null,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create index if not exists idx_billing_webhook_events_created_at
  on public.billing_webhook_events(created_at desc);
create index if not exists idx_billing_webhook_events_status
  on public.billing_webhook_events(status);

alter table public.billing_webhook_events enable row level security;

drop policy if exists "Admins can read billing webhook events" on public.billing_webhook_events;
create policy "Admins can read billing webhook events"
on public.billing_webhook_events
for select
to authenticated
using (public.is_admin());

-- Service-role backend calls this RPC immediately before a metered operation.
-- The zero-value row is created first and then locked. That closes the
-- first-request race where two concurrent requests could both observe no row.
create or replace function public.consume_plan_usage(
  p_user_id uuid,
  p_usage_key text,
  p_amount integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
  v_limit integer;
  v_used integer;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;
  if p_amount <= 0 then
    raise exception 'usage amount must be positive';
  end if;
  if p_usage_key not in ('resume_upload', 'roadmap_generation', 'ats_resume_generation', 'ai_chat') then
    raise exception 'unsupported usage key';
  end if;

  select p.* into v_plan
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = p_user_id
    and s.status = 'active'
    and (s.ends_at is null or s.ends_at > now())
    and p.is_active = true
  order by s.starts_at desc
  limit 1;

  if v_plan.id is null then
    select p.* into v_plan
    from public.plans p
    where p.plan_slug = 'free' and p.is_active = true
    limit 1;
  end if;

  if v_plan.id is null then
    raise exception 'no active or free plan is configured';
  end if;

  v_limit := case p_usage_key
    when 'resume_upload' then v_plan.resume_upload_limit
    when 'roadmap_generation' then v_plan.roadmap_generation_limit
    when 'ats_resume_generation' then v_plan.ats_resume_generation_limit
    when 'ai_chat' then v_plan.ai_chat_limit
  end;

  insert into public.usage_counters (
    user_id, usage_key, usage_count, period_start, period_end
  ) values (
    p_user_id, p_usage_key, 0, v_period_start, v_period_end
  )
  on conflict (user_id, usage_key, period_start, period_end) do nothing;

  select usage_count into v_used
  from public.usage_counters
  where user_id = p_user_id
    and usage_key = p_usage_key
    and period_start = v_period_start
    and period_end = v_period_end
  for update;

  if v_limit is not null and v_used + p_amount > v_limit then
    return jsonb_build_object(
      'allowed', false,
      'planSlug', v_plan.plan_slug,
      'limit', v_limit,
      'used', v_used,
      'remaining', greatest(v_limit - v_used, 0),
      'periodStart', v_period_start,
      'periodEnd', v_period_end
    );
  end if;

  update public.usage_counters
  set usage_count = usage_count + p_amount,
      updated_at = now()
  where user_id = p_user_id
    and usage_key = p_usage_key
    and period_start = v_period_start
    and period_end = v_period_end
  returning usage_count into v_used;

  return jsonb_build_object(
    'allowed', true,
    'planSlug', v_plan.plan_slug,
    'limit', v_limit,
    'used', v_used,
    'remaining', case when v_limit is null then null else greatest(v_limit - v_used, 0) end,
    'periodStart', v_period_start,
    'periodEnd', v_period_end
  );
end;
$$;

revoke all on function public.consume_plan_usage(uuid, text, integer) from public;
revoke all on function public.consume_plan_usage(uuid, text, integer) from anon;
revoke all on function public.consume_plan_usage(uuid, text, integer) from authenticated;
grant execute on function public.consume_plan_usage(uuid, text, integer) to service_role;
