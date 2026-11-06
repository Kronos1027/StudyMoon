-- StudyMoon 0011: server-issued practice tickets + atomic attempt recording.
-- Never trust browser-supplied time_ms or arbitrary question submissions.
-- This migration and the matching server actions MUST deploy together.
--
-- Tokens are unnecessary: only the authenticated server can issue a ticket,
-- and the authenticated server can consume it once on behalf of that user.
-- A new displayed question issues a fresh ticket and resets its timer.
create table public.practice_question_serves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  served_at timestamptz not null default clock_timestamp(),
  consumed_at timestamptz,
  primary key (user_id, question_id)
);

alter table public.practice_question_serves enable row level security;
revoke all on public.practice_question_serves from public, anon, authenticated;
grant select, insert, update, delete on public.practice_question_serves to service_role;

create or replace function public.issue_practice_question(
  p_user_id uuid,
  p_question_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if p_user_id is null or p_question_id is null
     or not exists (
       select 1 from public.questions q
       where q.id = p_question_id and q.status = 'validated'
     )
  then return false; end if;

  insert into public.practice_question_serves as s
    (user_id, question_id, served_at, consumed_at)
  values (p_user_id, p_question_id, clock_timestamp(), null)
  on conflict (user_id, question_id) do update
    set served_at = clock_timestamp(),
        consumed_at = null;
  return true;
end;
$function$;

create or replace function public.record_practice_attempt(
  p_user_id uuid,
  p_question_id uuid,
  p_selected text,
  p_mode public.attempt_mode
)
returns table (recorded_time_ms integer, recorded_correct boolean)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_answer text;
  v_elapsed_ms integer;
  v_due timestamptz;
  v_correct boolean;
begin
  if p_user_id is null or p_question_id is null
     or p_selected not in ('A','B','C','D','E')
     or p_selected is null
     or p_mode not in ('practice','review','lesson_test')
     or p_mode is null
  then
    raise exception 'Invalid practice attempt' using errcode = '22023';
  end if;

  select q.answer_key into v_answer
    from public.questions q
    where q.id = p_question_id and q.status = 'validated';
  if not found then
    raise exception 'Question unavailable' using errcode = 'P0002';
  end if;

  -- Serialized with the user's review card update. Other review attempts
  -- cannot slip between eligibility verification and ticket consumption.
  if p_mode = 'review' then
    select c.due into v_due
      from public.srs_cards c
     where c.user_id = p_user_id and c.question_id = p_question_id
     for update;
    if not found or v_due > clock_timestamp() then
      raise exception 'Review not due' using errcode = 'P0002';
    end if;
  end if;

  -- Consume the server-issued ticket exactly once, with PostgreSQL clock
  -- time; no browser-provided elapsed time influences learning or XP.
  update public.practice_question_serves s
     set consumed_at = clock_timestamp()
   where s.user_id = p_user_id
     and s.question_id = p_question_id
     and s.consumed_at is null
     and s.served_at <= clock_timestamp()
     and s.served_at >= clock_timestamp() - interval '4 hours'
  returning greatest(0, least(3600000,
    floor(extract(epoch from (s.consumed_at - s.served_at)) * 1000)::integer))
  into v_elapsed_ms;
  if not found then
    raise exception 'Practice ticket missing, expired or used'
      using errcode = 'P0002';
  end if;

  v_correct := (p_selected = v_answer);
  insert into public.attempts
    (user_id, question_id, selected, correct, time_ms, mode)
  values (p_user_id, p_question_id, p_selected, v_correct, v_elapsed_ms, p_mode);

  return query select v_elapsed_ms, v_correct;
end;
$function$;

revoke all on function public.issue_practice_question(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.record_practice_attempt(uuid, uuid, text, public.attempt_mode)
  from public, anon, authenticated;
grant execute on function public.issue_practice_question(uuid, uuid) to service_role;
grant execute on function public.record_practice_attempt(uuid, uuid, text, public.attempt_mode)
  to service_role;
