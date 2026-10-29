-- StudyMoon 0013: count daily goal progress atomically with attempt inserts.
-- Previous Next.js action used SELECT done_questions + UPDATE/INSERT, losing
-- increments when two questions completed concurrently.
-- AFTER INSERT runs within the *same transaction* as the attempt: a failed
-- goal write rolls back the attempt, and an attempt cannot be counted twice.
-- Timezone UTC matches the existing todayKey() application behavior.
create or replace function public.track_daily_goal_from_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_default_minutes integer;
begin
  -- These are the modes previously counted by submitAttempt().
  -- Mock exams and other future attempt types have separate completion rules.
  if new.mode not in ('practice','review','lesson_test') then
    return new;
  end if;

  select round(p.daily_hours * 60)::integer
    into v_default_minutes
    from public.profiles p
   where p.id = new.user_id;

  insert into public.daily_goals as g (
    user_id, date, target_minutes, target_questions, done_questions, status
  ) values (
    new.user_id,
    (new.created_at at time zone 'UTC')::date,
    coalesce(v_default_minutes, 120),
    10,
    1,
    'partial'
  )
  on conflict (user_id, date) do update
    set done_questions = g.done_questions + 1,
        status = case
          when g.done_questions + 1 >= g.target_questions
            then 'done'::public.daily_goal_status
          else 'partial'::public.daily_goal_status
        end;

  return new;
end;
$function$;

revoke all on function public.track_daily_goal_from_attempt()
  from public, anon, authenticated;

create trigger trg_attempt_daily_goal
after insert on public.attempts
for each row execute function public.track_daily_goal_from_attempt();
