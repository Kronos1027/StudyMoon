-- StudyMoon 0018: fair replay selection and exponential retry backoff.
-- The whole fixture rolls back; no production data is ever involved.
begin;

do $permissions$
begin
  if has_function_privilege('anon',
      'public.get_ready_srs_replay(uuid,uuid,integer)','execute')
     or has_function_privilege('authenticated',
      'public.get_ready_srs_replay(uuid,uuid,integer)','execute')
     or has_function_privilege('anon',
      'public.defer_srs_replay(uuid,text)','execute')
     or has_function_privilege('authenticated',
      'public.defer_srs_replay(uuid,text)','execute')
  then raise exception 'SRS retry RPC exposed to public clients'; end if;

  if not has_function_privilege('service_role',
      'public.get_ready_srs_replay(uuid,uuid,integer)','execute')
     or not has_function_privilege('service_role',
      'public.defer_srs_replay(uuid,text)','execute')
  then raise exception 'Server lacks SRS retry RPC permission'; end if;
end;
$permissions$;

insert into auth.users (id,email,raw_user_meta_data) values
('88888888-8888-4888-8888-888888888888',
 'retry-a@studymoon.test','{"apelido":"Replay A"}'),
('99999999-9999-4999-8999-999999999999',
 'retry-b@studymoon.test','{"apelido":"Replay B"}');

set local role service_role;

do $test$
declare
  v_first uuid;
  v_second uuid;
  v_other uuid;
  v_base timestamptz := clock_timestamp() - interval '10 minutes';
  v_earlier timestamptz;
  v_later timestamptz;
  v_ok boolean;
begin
  insert into public.attempts
    (user_id, question_id, selected, correct, time_ms, mode, created_at)
  values
    ('88888888-8888-4888-8888-888888888888',
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
     'B',true,20000,'practice', v_base)
  returning id into v_first;

  insert into public.attempts
    (user_id, question_id, selected, correct, time_ms, mode, created_at)
  values
    ('88888888-8888-4888-8888-888888888888',
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
     'A',false,30000,'practice',v_base + interval '1 minute')
  returning id into v_second;

  insert into public.attempts
    (user_id, question_id, selected, correct, time_ms, mode, created_at)
  values
    ('99999999-9999-4999-8999-999999999999',
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
     'B',true,22000,'practice',v_base + interval '2 minutes')
  returning id into v_other;

  if (select count(*) from (
         select * from public.get_ready_srs_replay(null,null,20)
         where user_id in (
           '88888888-8888-4888-8888-888888888888',
           '99999999-9999-4999-8999-999999999999'
         )
       ) as ready) <> 2
     or not exists (
       select 1 from (
         select * from public.get_ready_srs_replay(null,null,20)
         where user_id in (
           '88888888-8888-4888-8888-888888888888',
           '99999999-9999-4999-8999-999999999999'
         )
       ) as ready
        where attempt_id=v_first
     ) or not exists (
       select 1 from (
         select * from public.get_ready_srs_replay(null,null,20)
         where user_id in (
           '88888888-8888-4888-8888-888888888888',
           '99999999-9999-4999-8999-999999999999'
         )
       ) as ready
        where attempt_id=v_other
     ) or exists (
       select 1 from (
         select * from public.get_ready_srs_replay(null,null,20)
         where user_id in (
           '88888888-8888-4888-8888-888888888888',
           '99999999-9999-4999-8999-999999999999'
         )
       ) as ready
        where attempt_id=v_second
     )
  then raise exception 'Ready selection not fair or not chronological'; end if;

  select public.defer_srs_replay(v_first,'simulated_network_failure')
    into v_ok;
  if v_ok is distinct from true then
    raise exception 'First failed replay could not be deferred'; end if;
  select next_retry_at into v_earlier from public.srs_replay_queue
   where attempt_id=v_first;
  if (select retry_count from public.srs_replay_queue
      where attempt_id=v_first)<>1 or v_earlier < now()
  then raise exception 'Retry counter/backoff not persisted'; end if;

  -- The newer event for student A must remain blocked, but student B can
  -- progress during A's backoff, even if A's event is oldest globally.
  if (select count(*) from (
         select * from public.get_ready_srs_replay(null,null,20)
         where user_id in (
           '88888888-8888-4888-8888-888888888888',
           '99999999-9999-4999-8999-999999999999'
         )
       ) as ready) <> 1
     or not exists (
       select 1 from (
         select * from public.get_ready_srs_replay(null,null,20)
         where user_id in (
           '88888888-8888-4888-8888-888888888888',
           '99999999-9999-4999-8999-999999999999'
         )
       ) as ready
        where attempt_id=v_other
     ) or
     (select count(*) from public.get_ready_srs_replay(
       '88888888-8888-4888-8888-888888888888',null,20
     )) <> 0
  then raise exception 'Deferred event starved an independent student'; end if;

  perform public.defer_srs_replay(v_first,repeat('x',500));
  select next_retry_at into v_later from public.srs_replay_queue
   where attempt_id=v_first;
  if v_later <= v_earlier or (
    select length(last_error) from public.srs_replay_queue
    where attempt_id=v_first
  )<>240 then
    raise exception 'Exponential delay/diagnostic truncation not applied'; end if;

  update public.srs_replay_queue
     set retry_count=10, next_retry_at=now() - interval '1 second'
   where attempt_id=v_first;
  perform public.defer_srs_replay(v_first,'test_cap');
  if not exists (
    select 1 from public.srs_replay_queue
     where attempt_id=v_first
       and next_retry_at >= now() + interval '59 minutes'
       and next_retry_at <= now() + interval '61 minutes'
  ) then raise exception 'Retry did not cap at one hour'; end if;

  select public.complete_srs_replay(
    v_other,0,v_base + interval '1 day',
    1.5,5,0,1,1,0,0,'learning',v_base + interval '2 minutes'
  ) into v_ok;
  if v_ok is distinct from true then
    raise exception 'Unblocked student could not complete FSRS replay'; end if;

  -- Simulate passage of the retry window. The oldest event becomes
  -- available; the second must still wait for it.
  update public.srs_replay_queue
     set next_retry_at = now() - interval '1 second'
   where attempt_id=v_first;
  if not exists (
    select 1 from public.get_ready_srs_replay(
      '88888888-8888-4888-8888-888888888888',null,1
    ) where attempt_id=v_first
  ) then raise exception 'Retry-due event was never picked again'; end if;

  select public.complete_srs_replay(
    v_first,0,v_base + interval '1 day',
    1.5,5,0,1,1,0,0,'learning',v_base
  ) into v_ok;
  if v_ok is distinct from true then
    raise exception 'Recovered first event did not commit'; end if;

  if not exists (
    select 1 from public.get_ready_srs_replay(
      '88888888-8888-4888-8888-888888888888',null,1
    ) where attempt_id=v_second
  ) then raise exception 'Second event stayed blocked after first completed'; end if;

  select public.complete_srs_replay(
    v_second,1,v_base + interval '3 days',
    2.2,5,1,3,2,0,0,'review',v_base + interval '1 minute'
  ) into v_ok;
  if v_ok is distinct from true
    or (select count(*) from public.srs_replay_queue
        where attempt_id in (v_first,v_second,v_other)
          and processed_at is not null)<>3
  then raise exception 'Replay backlog not recovered exactly once'; end if;

  if (select public.defer_srs_replay(v_first,'after_success'))
      is distinct from false
  then raise exception 'Completed replay was requeued by error handler'; end if;
end;
$test$;

rollback;
select 'FSRS retry fairness, backoff and recovery passed' as result;
