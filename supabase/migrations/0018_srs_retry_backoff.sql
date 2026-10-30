-- StudyMoon 0018: fair, bounded, resumable FSRS outbox retries.
-- A permanently failing oldest event must not consume every cron batch
-- or starve independent students. Keep failed events durable (no deletion)
-- and retry with capped exponential backoff.
alter table public.srs_replay_queue
  add column if not exists retry_count integer not null default 0
    check (retry_count >= 0),
  add column if not exists next_retry_at timestamptz not null default now(),
  add column if not exists last_error text;

create index if not exists idx_srs_replay_due_retry
  on public.srs_replay_queue (next_retry_at, attempted_at, id)
  where processed_at is null;

-- Select only the oldest unprocessed event per student/question. Filter
-- backoff AFTER checking chronological predecessors: a later event must not
-- skip over an older event simply because it is temporarily deferred.
create or replace function public.get_ready_srs_replay(
  p_user_id uuid default null,
  p_question_id uuid default null,
  p_limit integer default 20
)
returns setof public.srs_replay_queue
language sql
stable
security invoker
set search_path = ''
as $function$
  select q.*
  from public.srs_replay_queue q
  where q.processed_at is null
    and q.next_retry_at <= now()
    and (p_user_id is null or q.user_id = p_user_id)
    and (p_question_id is null or q.question_id = p_question_id)
    and not exists (
      select 1 from public.srs_replay_queue preceding
      where preceding.user_id = q.user_id
        and preceding.question_id = q.question_id
        and preceding.processed_at is null
        and (preceding.attempted_at, preceding.id)
            < (q.attempted_at, q.id)
    )
  order by q.attempted_at, q.id
  limit greatest(1, least(100, coalesce(p_limit, 20)));
$function$;

-- On transient errors, schedule a bounded retry. Concurrent workers cannot
-- reschedule a completed event, and the previous retry_count is read while
-- UPDATE holds its row lock. 15s, 30s, 60s, ... capped at one hour.
create or replace function public.defer_srs_replay(
  p_attempt_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if p_attempt_id is null then
    return false;
  end if;

  update public.srs_replay_queue q
     set retry_count = q.retry_count + 1,
         next_retry_at = clock_timestamp()
           + least(3600,
               (15 * power(2::numeric, least(q.retry_count, 8)))::integer
             ) * interval '1 second',
         last_error = left(
           coalesce(nullif(btrim(p_reason), ''), 'processing_failed'), 240
         )
   where q.attempt_id = p_attempt_id
     and q.processed_at is null;

  return found;
end;
$function$;

revoke all on function public.get_ready_srs_replay(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.defer_srs_replay(uuid, text)
  from public, anon, authenticated;
grant execute on function public.get_ready_srs_replay(uuid, uuid, integer)
  to service_role;
grant execute on function public.defer_srs_replay(uuid, text)
  to service_role;
