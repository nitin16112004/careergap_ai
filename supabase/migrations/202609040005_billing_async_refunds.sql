-- Async AI work may fail after the HTTP request has already returned.
-- Refund the reserved roadmap-generation unit exactly once, using the AI job's
-- creation month rather than the worker's current month.

create or replace function public.refund_rag_usage_once(p_ai_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.ai_jobs%rowtype;
  v_period_start date;
  v_period_end date;
begin
  select j.* into v_job
  from public.ai_jobs j
  where j.id = p_ai_job_id
    and j.job_type = 'roadmap_rag'
  for update;

  if v_job.id is null then
    return false;
  end if;

  if coalesce((v_job.output_payload ->> 'billingUsageRefunded')::boolean, false) then
    return false;
  end if;

  v_period_start := date_trunc('month', v_job.created_at)::date;
  v_period_end := (date_trunc('month', v_job.created_at) + interval '1 month' - interval '1 day')::date;

  update public.usage_counters
  set usage_count = greatest(usage_count - 1, 0),
      updated_at = now()
  where user_id = v_job.user_id
    and usage_key = 'roadmap_generation'
    and period_start = v_period_start
    and period_end = v_period_end;

  update public.ai_jobs
  set output_payload = coalesce(output_payload, '{}'::jsonb) || jsonb_build_object(
        'billingUsageRefunded', true,
        'billingUsageRefundedAt', now()
      ),
      updated_at = now()
  where id = v_job.id;

  return true;
end;
$$;

revoke all on function public.refund_rag_usage_once(uuid) from public;
revoke all on function public.refund_rag_usage_once(uuid) from anon;
revoke all on function public.refund_rag_usage_once(uuid) from authenticated;
grant execute on function public.refund_rag_usage_once(uuid) to service_role;
