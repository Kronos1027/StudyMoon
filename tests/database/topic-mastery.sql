-- PostgreSQL 17 disposable fixture: regression for atomic topic mastery.
-- Rolls back all test-only attempts before other fixtures are run.
begin;

do $test$
declare
  v_elo integer;
  v_count integer;
  v_conf numeric;
begin
  if has_function_privilege('authenticated',
       'public.next_study_elo(integer,integer,boolean,integer)','execute')
     or has_function_privilege('anon',
       'public.update_mastery_from_attempt()','execute')
  then raise exception 'Mastery helper/trigger functions are publicly callable'; end if;

  if public.next_study_elo(1200,1200,true,0) <> 1224
    or public.next_study_elo(1200,1200,false,0) <> 1176
    or public.next_study_elo(1200,1200,true,5) <> 1216
    or public.next_study_elo(1200,1200,true,15) <> 1212
    or public.next_study_elo(1200,1200,true,30) <> 1208
  then raise exception 'Elo scoring or K-factor bands drifted'; end if;

  select elo, attempts_count, confidence
    into v_elo, v_count, v_conf
    from public.topic_mastery
   where user_id='11111111-1111-4111-8111-111111111111'
     and topic_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if v_elo <> 1224 or v_count <> 1 or v_conf <> 0.111
  then raise exception 'First seeded correct attempt not tracked atomically'; end if;

  select elo, attempts_count into v_elo, v_count
    from public.topic_mastery
   where user_id='22222222-2222-4222-8222-222222222222'
     and topic_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if v_elo <> 1176 or v_count <> 1
  then raise exception 'First seeded incorrect attempt not tracked'; end if;
end;
$test$;

set local role service_role;

-- A second real attempt must increment from the first Elo, not replace it.
insert into public.attempts (user_id,question_id,selected,correct,time_ms,mode)
values ('11111111-1111-4111-8111-111111111111',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,1000,'practice');

do $test$
declare
  v_elo integer;
  v_count integer;
  v_conf numeric;
begin
  select elo, attempts_count, confidence
    into v_elo, v_count, v_conf
    from public.topic_mastery
   where user_id='11111111-1111-4111-8111-111111111111'
     and topic_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if v_elo <> public.next_study_elo(1224,1200,true,1)
     or v_count <> 2 or v_conf <> 0.200
  then raise exception 'Second practice Elo/count/confidence update failed'; end if;

  if (select attempts_count from public.topic_mastery
      where user_id='22222222-2222-4222-8222-222222222222'
        and topic_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 1
  then raise exception 'Mastery of another student was changed'; end if;
end;
$test$;

rollback;
select 'Atomic topic mastery regression passed' as result;
