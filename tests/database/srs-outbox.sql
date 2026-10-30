-- Durable FSRS queue integration: runs only in ephemeral CI PostgreSQL.
-- Every operation is rolled back after assertion, including temporary users.
begin;
do $rights$
begin
  if has_table_privilege('anon','public.srs_replay_queue','select')
     or has_table_privilege('authenticated','public.srs_replay_queue','select')
     or has_table_privilege('authenticated','public.srs_replay_queue','update')
     or has_function_privilege('anon',
       'public.complete_srs_replay(uuid,bigint,timestamptz,numeric,numeric,integer,integer,integer,integer,integer,text,timestamptz)',
       'execute')
     or has_function_privilege('authenticated',
       'public.complete_srs_replay(uuid,bigint,timestamptz,numeric,numeric,integer,integer,integer,integer,integer,text,timestamptz)',
       'execute')
  then raise exception 'SRS queue exposed to client roles'; end if;
  if not has_function_privilege('service_role',
       'public.complete_srs_replay(uuid,bigint,timestamptz,numeric,numeric,integer,integer,integer,integer,integer,text,timestamptz)',
       'execute')
  then raise exception 'Server cannot complete FSRS queue events'; end if;
end;
$rights$;

insert into auth.users (id,email,raw_user_meta_data)
values ('66666666-6666-4666-8666-666666666666','fsrs-ci@studymoon.test','{"apelido":"FSRS CI"}');

do $test$
declare
  v_first uuid;
  v_second uuid;
  v_third uuid;
  v_result boolean;
  v_first_at timestamptz := clock_timestamp() - interval '3 minutes';
  v_second_at timestamptz := clock_timestamp() - interval '2 minutes';
  v_third_at timestamptz := clock_timestamp() - interval '1 minute';
begin
  -- Two accepted attempts create two replay events without an HTTP call.
  insert into public.attempts (user_id,question_id,selected,correct,time_ms,mode,created_at)
  values ('66666666-6666-4666-8666-666666666666',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,20000,
          'practice',v_first_at)
  returning id into v_first;
  insert into public.attempts (user_id,question_id,selected,correct,time_ms,mode,created_at)
  values ('66666666-6666-4666-8666-666666666666',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc','A',false,25000,
          'practice',v_second_at)
  returning id into v_second;

  if (select count(*) from public.srs_replay_queue
      where user_id='66666666-6666-4666-8666-666666666666'
        and processed_at is null) <> 2
  then raise exception 'Attempt and queue not transactionally coupled'; end if;

  -- Newer attempt is forbidden while an earlier one is pending.
  select public.complete_srs_replay(
    v_second,0,v_second_at+interval '2 days',
    1.6,5,0,2,1,0,0,'learning',v_second_at
  ) into v_result;
  if v_result is distinct from false
  then raise exception 'Out-of-order replay accepted'; end if;

  select public.complete_srs_replay(
    v_first,0,v_first_at+interval '1 day',
    1.5,5,0,1,1,0,0,'learning',v_first_at
  ) into v_result;
  if v_result is distinct from true
  then raise exception 'First replay failed'; end if;

  select public.complete_srs_replay(
    v_first,1,v_first_at+interval '1 day',
    1.5,5,0,1,1,0,0,'learning',v_first_at
  ) into v_result;
  if v_result is distinct from false
  then raise exception 'Already completed event was replayed'; end if;

  select public.complete_srs_replay(
    v_second,1,v_second_at+interval '3 days',
    2.1,5,1,3,2,0,0,'review',v_second_at
  ) into v_result;
  if v_result is distinct from true
  then raise exception 'Second queued replay failed'; end if;

  if not exists (
     select 1 from public.srs_cards
     where user_id='66666666-6666-4666-8666-666666666666'
       and question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
       and revision=2 and reps=2
  ) or (select count(*) from public.srs_replay_queue
        where user_id='66666666-6666-4666-8666-666666666666'
          and processed_at is not null)<>2
  then raise exception 'Card and queue marker not consistent'; end if;

  -- An invalid scheduling transaction must keep BOTH sides unchanged.
  insert into public.attempts (user_id,question_id,selected,correct,time_ms,mode,created_at)
  values ('66666666-6666-4666-8666-666666666666',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,30000,
          'practice',v_third_at)
  returning id into v_third;

  begin
    perform public.complete_srs_replay(
      v_third,2,null,2.5,5,1,4,3,0,0,'review',v_third_at
    );
    raise exception 'Bad scheduling argument unexpectedly succeeded';
  exception when invalid_parameter_value then
    null;
  end;

  if (select revision from public.srs_cards
      where user_id='66666666-6666-4666-8666-666666666666'
        and question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>2
     or (select processed_at from public.srs_replay_queue
         where attempt_id=v_third) is not null
  then raise exception 'Failed update partially committed'; end if;

  select public.complete_srs_replay(
    v_third,2,v_third_at+interval '5 days',
    2.5,5,1,5,3,0,0,'review',v_third_at
  ) into v_result;
  if v_result is distinct from true
  then raise exception 'Queued event was not recoverable after failure'; end if;

  if (select revision from public.srs_cards
      where user_id='66666666-6666-4666-8666-666666666666'
        and question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>3
     or (select count(*) from public.srs_replay_queue
        where user_id='66666666-6666-4666-8666-666666666666'
          and processed_at is null)<>0
  then raise exception 'Recovery did not drain pending event exactly once'; end if;
end;
$test$;
rollback;
select 'Durable FSRS queue and atomic recovery passed' as result;
