-- StudyMoon 0016: count qualifying study days atomically with attempts.
--
-- Previous practice action read/stored streaks after recording an attempt,
-- creating lost updates under simultaneous requests. It also attempted to
-- write an ISO week STRING (e.g. 2026-W44) into last_freeze_week DATE.
--
-- UTC rules match the existing study-day counter. "10 minutes or 5 answers"
-- previously approximated minutes as 1.2 minutes per answer; reaching the
-- 10-minute threshold was never possible with fewer than 5 answers.
-- Thus five eligible attempts is the exact effective threshold in that flow.
--
-- The existing streak row is locked BEFORE counting today's attempts, so a
-- concurrent insert cannot observe a stale counter after acquiring the lock.
-- Both the attempt and streak change commit or roll back together.
create or replace function public.track_streak_from_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_day date;
  v_week_monday date;
  v_count integer;
  v_current integer;
  v_longest integer;
  v_last_day date;
  v_freezes integer;
  v_freeze_week date;
  v_gap integer;
  v_next integer;
begin
  if new.mode not in ('practice','review','lesson_test') then
    return new;
  end if;

  v_day := (new.created_at at time zone 'UTC')::date;
  v_week_monday := date_trunc('week', v_day::timestamp)::date;

  -- Auth/profile creation normally creates this row; tolerate missing
  -- historical data without permitting a race to create duplicates.
  insert into public.streaks (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;

  select s.current, s.longest, s.last_study_date,
         s.freezes_available, s.last_freeze_week
    into v_current, v_longest, v_last_day, v_freezes, v_freeze_week
    from public.streaks s
   where s.user_id = new.user_id
   for update;

  -- Statement snapshot is taken after acquiring the lock. Another attempt
  -- for this student that committed while waiting is now visible.
  select count(*)::integer into v_count
    from public.attempts a
   where a.user_id = new.user_id
     and a.created_at >= (v_day::timestamp at time zone 'UTC')
     and a.created_at < ((v_day + 1)::timestamp at time zone 'UTC')
     and a.mode in ('practice','review','lesson_test');

  if v_count < 5 or (v_last_day is not null and v_last_day >= v_day) then
    return new;
  end if;

  -- Compare actual DATE week-Monday values; never save "YYYY-Www" strings.
  if v_freeze_week is distinct from v_week_monday then
    v_freezes := 1;
  end if;

  v_gap := case when v_last_day is null then null
                else v_day - v_last_day end;

  if v_gap is null or v_gap = 1 then
    v_next := v_current + 1;
  elsif v_gap = 2 and v_freezes > 0 then
    v_next := v_current + 1;
    v_freezes := v_freezes - 1;
  else
    v_next := 1;
  end if;

  update public.streaks s
     set current = v_next,
         longest = greatest(v_longest, v_next),
         last_study_date = v_day,
         freezes_available = v_freezes,
         last_freeze_week = v_week_monday,
         updated_at = clock_timestamp()
   where s.user_id = new.user_id;

  return new;
end;
$function$;

revoke all on function public.track_streak_from_attempt()
  from public, anon, authenticated;

create trigger trg_attempt_streak
after insert on public.attempts
for each row execute function public.track_streak_from_attempt();
