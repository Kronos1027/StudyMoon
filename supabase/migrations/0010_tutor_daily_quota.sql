-- StudyMoon 0010: atomic tutor daily quota.
-- The old "count ai_cache then call LLM" check allowed simultaneous requests
-- to exceed the limit. This dedicated counter is reserved BEFORE the LLM.
-- RLS + grants restrict writes and RPCs to the server-side service role.

create table if not exists public.tutor_daily_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  used integer not null default 0 check (used >= 0 and used <= 100),
  primary key (user_id, usage_date)
);

alter table public.tutor_daily_usage enable row level security;
revoke all on public.tutor_daily_usage from public, anon, authenticated;
grant select, insert, update, delete on public.tutor_daily_usage to service_role;

create or replace function public.claim_tutor_daily_turn(
  p_user_id uuid,
  p_usage_date date,
  p_daily_limit integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_used integer;
begin
  if p_user_id is null or p_usage_date is null
     or p_daily_limit is null or p_daily_limit < 1 or p_daily_limit > 100
  then
    raise exception 'Invalid tutor quota arguments' using errcode = '22023';
  end if;

  -- The conflict UPDATE takes a PostgreSQL row lock. With two concurrent
  -- callers and one slot left, exactly one gets a row back.
  insert into public.tutor_daily_usage as usage
    (user_id, usage_date, used)
  values (p_user_id, p_usage_date, 1)
  on conflict (user_id, usage_date) do update
    set used = usage.used + 1
    where usage.used < p_daily_limit
  returning used into v_used;

  return v_used is not null;
end;
$function$;

-- Return quota when the AI provider fails or produces an invalid response.
-- A crash may leave one reservation counted; quota always fails closed.
create or replace function public.release_tutor_daily_turn(
  p_user_id uuid,
  p_usage_date date
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_used integer;
begin
  if p_user_id is null or p_usage_date is null
  then
    raise exception 'Invalid tutor quota arguments' using errcode = '22023';
  end if;

  update public.tutor_daily_usage as usage
     set used = usage.used - 1
   where usage.user_id = p_user_id
     and usage.usage_date = p_usage_date
     and usage.used > 0
  returning used into v_used;

  return v_used is not null;
end;
$function$;

revoke all on function public.claim_tutor_daily_turn(uuid, date, integer)
  from public, anon, authenticated;
revoke all on function public.release_tutor_daily_turn(uuid, date)
  from public, anon, authenticated;
grant execute on function public.claim_tutor_daily_turn(uuid, date, integer)
  to service_role;
grant execute on function public.release_tutor_daily_turn(uuid, date)
  to service_role;
