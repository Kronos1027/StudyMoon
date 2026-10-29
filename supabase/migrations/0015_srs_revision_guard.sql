-- StudyMoon 0015: optimistic FSRS revisioning with compare-and-swap.
-- ts-fsrs remains the single source of the scheduling mathematics. The DB
-- only prevents a stale web request from overwriting a newer card.
-- Apply ONLY together with the server-action change on a tested deployment.

alter table public.srs_cards
  add column if not exists revision bigint not null default 0
  check (revision >= 0);

create or replace function public.commit_srs_schedule(
  p_user_id uuid,
  p_question_id uuid,
  p_expected_revision bigint,
  p_due timestamptz,
  p_stability numeric,
  p_difficulty numeric,
  p_elapsed_days integer,
  p_scheduled_days integer,
  p_reps integer,
  p_lapses integer,
  p_learning_steps integer,
  p_state text,
  p_last_update timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_revision bigint;
begin
  if p_user_id is null or p_question_id is null
    or p_expected_revision is null or p_expected_revision < 0
    or p_due is null or p_last_update is null
    or p_stability is null or p_stability < 0 or p_stability >= 10000
    or p_difficulty is null or p_difficulty < 0 or p_difficulty > 10
    or p_elapsed_days is null or p_elapsed_days < 0
    or p_scheduled_days is null or p_scheduled_days < 0
    or p_reps is null or p_reps < 1
    or p_lapses is null or p_lapses < 0
    or p_learning_steps is null or p_learning_steps < 0
    or p_state is null or p_state not in ('new','learning','review','relearning')
  then
    raise exception 'Invalid FSRS scheduling request' using errcode='22023';
  end if;

  -- For an existing card, revision and reps must BOTH match its current
  -- state. On a newly inserted card, reps must start at one.
  if p_expected_revision = 0 and p_reps = 1 then
    insert into public.srs_cards as c (
      user_id, question_id, due, stability, difficulty_fsrs,
      elapsed_days, scheduled_days, reps, lapses, learning_steps,
      state, last_update, revision
    ) values (
      p_user_id, p_question_id, p_due, p_stability, p_difficulty,
      p_elapsed_days, p_scheduled_days, p_reps, p_lapses,
      p_learning_steps, p_state, p_last_update, 1
    )
    on conflict (user_id, question_id) do update
      set due = excluded.due,
          stability = excluded.stability,
          difficulty_fsrs = excluded.difficulty_fsrs,
          elapsed_days = excluded.elapsed_days,
          scheduled_days = excluded.scheduled_days,
          reps = excluded.reps,
          lapses = excluded.lapses,
          learning_steps = excluded.learning_steps,
          state = excluded.state,
          last_update = excluded.last_update,
          revision = c.revision + 1
      where c.revision = p_expected_revision
        and p_reps = c.reps + 1
        and p_last_update >= c.last_update
    returning revision into v_revision;
  else
    update public.srs_cards as c
      set due = p_due,
          stability = p_stability,
          difficulty_fsrs = p_difficulty,
          elapsed_days = p_elapsed_days,
          scheduled_days = p_scheduled_days,
          reps = p_reps,
          lapses = p_lapses,
          learning_steps = p_learning_steps,
          state = p_state,
          last_update = p_last_update,
          revision = c.revision + 1
    where c.user_id = p_user_id
      and c.question_id = p_question_id
      and c.revision = p_expected_revision
      and p_reps = c.reps + 1
      and p_last_update >= c.last_update
    returning revision into v_revision;
  end if;

  return v_revision is not null;
end;
$function$;

-- Only the server's service role may write scheduling decisions.
revoke all on function public.commit_srs_schedule(
  uuid, uuid, bigint, timestamptz, numeric, numeric,
  integer, integer, integer, integer, integer, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.commit_srs_schedule(
  uuid, uuid, bigint, timestamptz, numeric, numeric,
  integer, integer, integer, integer, integer, text, timestamptz
) to service_role;
