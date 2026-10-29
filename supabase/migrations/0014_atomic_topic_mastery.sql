-- StudyMoon 0014: atomic Elo updates from validated practice attempts.
-- The application previously SELECTed topic_mastery, computed Elo in JS,
-- then UPSERTed the whole row. Concurrent answers could overwrite an
-- earlier attempt, lose attempts_count, and corrupt confidence.
--
-- This AFTER INSERT trigger runs INSIDE the same transaction that records
-- the attempt. Its ON CONFLICT UPDATE locks the per-student/topic row and
-- computes from the current committed Elo and attempts_count. No browser
-- or separately authenticated client receives permission to invoke it.

create or replace function public.next_study_elo(
  p_current integer,
  p_difficulty integer,
  p_correct boolean,
  p_prior_attempts integer
)
returns integer
language sql
immutable
set search_path = ''
as $function$
  select greatest(
    400,
    least(
      2600,
      p_current + floor(
        (case
          when p_prior_attempts < 5 then 48
          when p_prior_attempts < 15 then 32
          when p_prior_attempts < 30 then 24
          else 16
        end) * (
          (case when p_correct then 1 else 0 end) -
          (1::numeric / (1 + power(
            10::numeric,
            (p_difficulty::numeric - p_current::numeric) / 400
          )))
        ) + 0.5
      )::integer
    )
  )
$function$;

create or replace function public.update_mastery_from_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_topic uuid;
  v_difficulty integer;
begin
  if new.mode not in ('practice', 'review', 'lesson_test') then
    return new;
  end if;

  select q.topic_id, q.difficulty
    into v_topic, v_difficulty
    from public.questions q
   where q.id = new.question_id;
  if not found then
    raise exception 'Question missing for mastery update'
      using errcode = 'P0002';
  end if;

  insert into public.topic_mastery as m (
    user_id, topic_id, elo, confidence,
    attempts_count, last_attempt_at, updated_at
  )
  values (
    new.user_id, v_topic,
    public.next_study_elo(1200, v_difficulty, new.correct, 0),
    round((1::numeric / 9), 3),
    1, new.created_at, clock_timestamp()
  )
  on conflict (user_id, topic_id) do update
    set elo = public.next_study_elo(
      m.elo, v_difficulty, new.correct, m.attempts_count
    ),
        confidence = least(
          0.98::numeric,
          (m.attempts_count + 1)::numeric / (m.attempts_count + 9)
        ),
        attempts_count = m.attempts_count + 1,
        last_attempt_at = greatest(
          coalesce(m.last_attempt_at, new.created_at), new.created_at
        ),
        updated_at = clock_timestamp();

  return new;
end;
$function$;

revoke all on function public.next_study_elo(integer, integer, boolean, integer)
  from public, anon, authenticated;
revoke all on function public.update_mastery_from_attempt()
  from public, anon, authenticated;

create trigger trg_attempt_mastery
after insert on public.attempts
for each row execute function public.update_mastery_from_attempt();
