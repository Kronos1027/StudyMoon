-- StudyMoon 0017: durable, exactly-once FSRS scheduling outbox.
-- Any accepted attempt queues an immutable scheduling event INSIDE the same
-- transaction as the attempt, Elo, goal and streak. Later processing performs
-- both FSRS CAS and queue completion in ONE PostgreSQL transaction.
-- The UI, retry worker and cron use this queue instead of ephemeral memory.

create table public.srs_replay_queue (
  id bigint generated always as identity primary key,
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  correct boolean not null,
  time_ms integer not null check (time_ms >= 0),
  expected_ms integer not null check (expected_ms >= 15000),
  attempted_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index idx_srs_replay_pending
  on public.srs_replay_queue (user_id, question_id, attempted_at, id)
  where processed_at is null;
create index idx_srs_replay_retry
  on public.srs_replay_queue (attempted_at, id)
  where processed_at is null;

alter table public.srs_replay_queue enable row level security;
revoke all on public.srs_replay_queue from public, anon, authenticated;
grant select, insert, update, delete on public.srs_replay_queue to service_role;
grant usage, select on sequence public.srs_replay_queue_id_seq to service_role;

create or replace function public.enqueue_srs_replay()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_length integer;
begin
  if new.mode not in ('practice','review','lesson_test') then
    return new;
  end if;
  select length(q.statement_md) into v_length
    from public.questions q where q.id = new.question_id;
  if not found then
    raise exception 'Cannot enqueue SRS for missing question' using errcode='P0002';
  end if;

  insert into public.srs_replay_queue (
    attempt_id, user_id, question_id,
    correct, time_ms, expected_ms, attempted_at
  ) values (
    new.id, new.user_id, new.question_id, new.correct,
    new.time_ms, greatest(15000, v_length * 220), new.created_at
  );
  return new;
end;
$function$;

revoke all on function public.enqueue_srs_replay()
  from public, anon, authenticated;

create trigger trg_attempt_srs_replay
after insert on public.attempts
for each row execute function public.enqueue_srs_replay();

create or replace function public.complete_srs_replay(
  p_attempt_id uuid,
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
  v_event public.srs_replay_queue%rowtype;
  v_saved boolean;
begin
  -- Locks one event until the new FSRS card AND its processing marker commit.
  -- A second worker waiting for the lock sees the completed event and stops.
  select * into v_event from public.srs_replay_queue e
   where e.attempt_id = p_attempt_id and e.processed_at is null
   for update;
  if not found then return false; end if;

  -- Do not apply newer attempts before older pending events for a card.
  if exists (
    select 1 from public.srs_replay_queue e
     where e.user_id=v_event.user_id and e.question_id=v_event.question_id
       and e.processed_at is null
       and (e.attempted_at, e.id) < (v_event.attempted_at, v_event.id)
  ) then return false; end if;

  select public.commit_srs_schedule(
    v_event.user_id, v_event.question_id, p_expected_revision,
    p_due, p_stability, p_difficulty, p_elapsed_days,
    p_scheduled_days, p_reps, p_lapses, p_learning_steps,
    p_state, p_last_update
  ) into v_saved;
  if v_saved is distinct from true then
    return false;
  end if;

  update public.srs_replay_queue
     set processed_at = clock_timestamp()
   where id = v_event.id and processed_at is null;
  if not found then
    raise exception 'FSRS queue processing marker unexpectedly missing';
  end if;

  return true;
end;
$function$;

revoke all on function public.complete_srs_replay(
  uuid, bigint, timestamptz, numeric, numeric,
  integer, integer, integer, integer, integer, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.complete_srs_replay(
  uuid, bigint, timestamptz, numeric, numeric,
  integer, integer, integer, integer, integer, text, timestamptz
) to service_role;
