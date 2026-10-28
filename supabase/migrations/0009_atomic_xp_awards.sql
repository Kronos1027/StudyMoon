-- StudyMoon 0009: atomic, idempotent XP awards, server-only execution.
-- Invoked exclusively through the service-role client in server actions.
-- A per-user profile row lock serializes awards, eliminating lost updates
-- and concurrent daily-cap bypasses across question/review/essay flows.

-- Historical essay awards were not unique. Fail safely if duplicates exist;
-- review/repair those records explicitly rather than dropping real events.
create unique index if not exists uq_xp_essay_once
  on public.xp_events (user_id, kind, ref_id)
  where kind = 'essay' and ref_id is not null;

create or replace function public.award_study_xp(
  p_user_id uuid,
  p_kind public.xp_kind,
  p_ref_id uuid,
  p_requested integer,
  p_daily_cap integer default null
)
returns table (
  awarded_amount integer,
  total_xp integer,
  old_level integer,
  new_level integer
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_prior_xp integer;
  v_prior_level integer;
  v_already_today integer := 0;
  v_award integer;
  v_new_total integer;
  v_new_level integer;
  v_rank_title text;
begin
  if p_user_id is null or p_ref_id is null or p_kind is null
     or p_kind not in ('question', 'review', 'essay')
     or p_requested is null or p_requested < 0 or p_requested > 500
     or (p_daily_cap is not null and (p_daily_cap < 0 or p_daily_cap > 1000))
     or (p_kind in ('question', 'review') and p_daily_cap is null)
  then
    raise exception 'Invalid XP award arguments' using errcode = '22023';
  end if;

  -- Serialize all awards by locking the student's own profile.
  select p.xp, p.level
    into v_prior_xp, v_prior_level
    from public.profiles as p
   where p.id = p_user_id
     for update;
  if not found then
    raise exception 'Student profile not found' using errcode = 'P0002';
  end if;

  -- One-time reward, including essays. This check runs under the same lock.
  if exists (
    select 1 from public.xp_events e
    where e.user_id = p_user_id and e.kind = p_kind
      and e.ref_id = p_ref_id
  ) then
    return query select 0, v_prior_xp, v_prior_level, v_prior_level;
    return;
  end if;

  v_award := p_requested;
  if p_daily_cap is not null then
    select coalesce(sum(e.amount), 0)::integer
      into v_already_today
      from public.xp_events e
     where e.user_id = p_user_id and e.kind = p_kind
       and e.created_at >= (
         ((now() at time zone 'UTC')::date)::timestamp at time zone 'UTC'
       );
    v_award := least(v_award, greatest(0, p_daily_cap - v_already_today));
  end if;

  if v_award <= 0 then
    return query select 0, v_prior_xp, v_prior_level, v_prior_level;
    return;
  end if;

  -- The event + profile update form one transaction. Any error rolls back both.
  insert into public.xp_events (user_id, kind, ref_id, amount)
  values (p_user_id, p_kind, p_ref_id, v_award);

  v_new_total := v_prior_xp + v_award;
  v_new_level := greatest(1, floor(sqrt(v_new_total::numeric / 25))::integer + 1);
  v_rank_title := case
    when v_new_level >= 20 then 'Guardião da Lua Cheia'
    when v_new_level >= 15 then 'Mestre das Marés'
    when v_new_level >= 10 then 'Cartógrafo Estelar'
    when v_new_level >= 6 then 'Navegador Lunar'
    when v_new_level >= 3 then 'Observador do Céu'
    else 'Explorador Lunar'
  end;

  update public.profiles p
     set xp = v_new_total, level = v_new_level,
         rank_title = v_rank_title
   where p.id = p_user_id;

  return query select v_award, v_new_total, v_prior_level, v_new_level;
end;
$function$;

-- Explicit least privilege: SECURITY INVOKER and no exposed user execution.
revoke all on function public.award_study_xp(
  uuid, public.xp_kind, uuid, integer, integer
) from public, anon, authenticated;
grant execute on function public.award_study_xp(
  uuid, public.xp_kind, uuid, integer, integer
) to service_role;
