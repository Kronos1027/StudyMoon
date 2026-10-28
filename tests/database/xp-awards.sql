-- Ephemeral PostgreSQL-only fixture. This file is run under a disposable
-- service container by tests/database/postgres-integration.sh.
-- Do NOT execute against the StudyMoon production database.

begin;
do $test$
begin
  if has_function_privilege('anon',
       'public.award_study_xp(uuid,public.xp_kind,uuid,integer,integer)','execute')
     or has_function_privilege('authenticated',
       'public.award_study_xp(uuid,public.xp_kind,uuid,integer,integer)','execute')
  then raise exception 'Atomic XP RPC can be called without service role'; end if;
  if not has_function_privilege('service_role',
       'public.award_study_xp(uuid,public.xp_kind,uuid,integer,integer)','execute')
  then raise exception 'Service role cannot access atomic XP RPC'; end if;
end;
$test$;

set local role service_role;

do $test$
declare
  v_awarded int;
  v_total int;
  v_old int;
  v_new int;
  v_profile_xp int;
  v_event_count int;
  v_denied boolean := false;
begin
  -- First award succeeds and updates the profile in the same call.
  select awarded_amount,total_xp,old_level,new_level
    into v_awarded,v_total,v_old,v_new
    from public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','question',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',20,30);
  if v_awarded <> 20 or v_total <> 20 or v_old <> 1 or v_new <> 1
  then raise exception 'First question award mismatch'; end if;

  -- Repeating the same question never gives XP a second time.
  select awarded_amount,total_xp into v_awarded,v_total
    from public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','question',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',20,30);
  if v_awarded <> 0 or v_total <> 20
  then raise exception 'Duplicate question XP not idempotent'; end if;

  -- A new question reaches the remaining daily cap, not the full reward.
  select awarded_amount,total_xp into v_awarded,v_total
    from public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','question',
      '11111111-1111-4111-8111-aaaaaaaaaaaa',20,30);
  if v_awarded <> 10 or v_total <> 30
  then raise exception 'Daily XP cap ignored'; end if;

  select awarded_amount,total_xp into v_awarded,v_total
    from public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','question',
      '11111111-1111-4111-8111-bbbbbbbbbbbb',20,30);
  if v_awarded <> 0 or v_total <> 30
  then raise exception 'Daily cap allowed surplus XP'; end if;

  -- Essay reward is one-shot even without a daily cap.
  select awarded_amount,total_xp,old_level,new_level
    into v_awarded,v_total,v_old,v_new
    from public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','essay',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',50,null);
  if v_awarded <> 50 or v_total <> 80 or v_old <> 2 or v_new <> 2
  then raise exception 'Essay XP/level synchronization mismatch'; end if;
  select awarded_amount,total_xp into v_awarded,v_total
    from public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','essay',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',50,null);
  if v_awarded <> 0 or v_total <> 80
  then raise exception 'Duplicate essay XP not blocked'; end if;

  -- Daily caps are independent per activity kind.
  select awarded_amount,total_xp into v_awarded,v_total
    from public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','review',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',5,5);
  if v_awarded <> 5 or v_total <> 85
  then raise exception 'Review XP/independent cap mismatch'; end if;

  -- A second distinct essay crosses the next level boundary: both the
  -- numeric level and the rank title must update atomically.
  select awarded_amount,total_xp,old_level,new_level
    into v_awarded,v_total,v_old,v_new
    from public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','essay',
      'eeeeeeee-eeee-4eee-8eee-111111111111',50,null);
  if v_awarded <> 50 or v_total <> 135 or v_old <> 2 or v_new <> 3
  then raise exception 'Level boundary not updated by atomic award'; end if;

  select p.xp into v_profile_xp from public.profiles p
   where p.id='11111111-1111-4111-8111-111111111111';
  select count(*) into v_event_count from public.xp_events e
   where e.user_id='11111111-1111-4111-8111-111111111111';
  if v_profile_xp <> 135 or v_event_count <> 5
    or (select p.rank_title from public.profiles p
         where p.id='11111111-1111-4111-8111-111111111111')
       <> 'Observador do Céu'
  then raise exception 'Profile XP, level, rank and event ledger diverged'; end if;

  -- Invalid unbounded question awards fail closed, with no writes.
  begin
    perform public.award_study_xp(
      '11111111-1111-4111-8111-111111111111','question',
      '11111111-1111-4111-8111-cccccccccccc',500,null);
  exception when invalid_parameter_value then
    v_denied := true;
  end;
  if not v_denied then raise exception 'Invalid uncapped award allowed'; end if;

  -- A second profile never receives user A's rewards.
  if (select p.xp from public.profiles p
      where p.id='22222222-2222-4222-8222-222222222222') <> 0
  then raise exception 'XP award affected a different student'; end if;
end;
$test$;
rollback;

select 'Atomic XP integration checks passed' as result;
