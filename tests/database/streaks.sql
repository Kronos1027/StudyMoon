-- Transactional streak regression; runs on disposable PostgreSQL only.
begin;
do $assert$
declare
  v_day date := (clock_timestamp() at time zone 'UTC')::date;
  v_week date := date_trunc('week', v_day::timestamp)::date;
  v_current int;
  v_longest int;
  v_freezes int;
  v_week_written date;
  v_last date;
  v_freeze_used date;
begin
  if has_function_privilege('anon','public.track_streak_from_attempt()','execute')
     or has_function_privilege('authenticated','public.track_streak_from_attempt()','execute')
  then raise exception 'Streak function exposed to untrusted roles'; end if;

  -- The fixture has one attempt. The first four extra attempts hit the
  -- five-answer threshold exactly.
  insert into public.attempts (user_id,question_id,selected,correct,mode)
  select '11111111-1111-4111-8111-111111111111',
         'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'practice'
  from generate_series(1,4);

  select current, longest, freezes_available, last_study_date,
         last_freeze_week, last_freeze_used_on
    into v_current,v_longest,v_freezes,v_last,v_week_written,v_freeze_used
    from public.streaks
   where user_id='11111111-1111-4111-8111-111111111111';
  if v_current<>1 or v_longest<>1 or v_freezes<>1
    or v_last<>v_day or v_week_written<>v_week or v_freeze_used is not null
  then raise exception 'Five attempts did not count exactly one study day'; end if;

  insert into public.attempts (user_id,question_id,selected,correct,mode)
  values ('11111111-1111-4111-8111-111111111111',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'practice');
  if (select current from public.streaks
      where user_id='11111111-1111-4111-8111-111111111111') <> 1
  then raise exception 'Extra attempt duplicated same-day streak'; end if;

  -- Simulate an already qualified previous study day, then answer today.
  update public.streaks
     set current=7,longest=7,last_study_date=v_day-1,
         freezes_available=1,last_freeze_week=v_week,
         last_freeze_used_on=null
   where user_id='11111111-1111-4111-8111-111111111111';
  insert into public.attempts (user_id,question_id,selected,correct,mode)
  values ('11111111-1111-4111-8111-111111111111',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc','A',false,'practice');
  if not exists (
    select 1 from public.streaks
    where user_id='11111111-1111-4111-8111-111111111111'
      and current=8 and longest=8 and freezes_available=1
      and last_study_date=v_day and last_freeze_week=v_week
      and last_freeze_used_on is null
  ) then raise exception 'Consecutive-day streak increment failed'; end if;

  -- One missed day, with one weekly freeze available.
  update public.streaks
     set current=4,last_study_date=v_day-2,freezes_available=1,
         last_freeze_week=v_week,last_freeze_used_on=null
   where user_id='11111111-1111-4111-8111-111111111111';
  insert into public.attempts (user_id,question_id,selected,correct,mode)
  values ('11111111-1111-4111-8111-111111111111',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc','A',false,'review');
  if not exists (
    select 1 from public.streaks
    where user_id='11111111-1111-4111-8111-111111111111'
      and current=5 and longest=8 and freezes_available=0
      and last_freeze_used_on=v_day and last_freeze_week=v_week
  ) then raise exception 'Freeze did not bridge exactly one missed day'; end if;

  -- A freeze cannot be used again in its own ISO week.
  update public.streaks
     set current=5,last_study_date=v_day-2,freezes_available=0,
         last_freeze_week=v_week,last_freeze_used_on=v_day-1
   where user_id='11111111-1111-4111-8111-111111111111';
  insert into public.attempts (user_id,question_id,selected,correct,mode)
  values ('11111111-1111-4111-8111-111111111111',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'lesson_test');
  if not exists (
    select 1 from public.streaks
    where user_id='11111111-1111-4111-8111-111111111111'
      and current=1 and longest=8 and freezes_available=0
      and last_freeze_used_on=v_day-1
  ) then raise exception 'Consumed weekly freeze was reused'; end if;

  -- On a new ISO week, the previous week's freeze becomes available.
  update public.streaks
     set current=5,last_study_date=v_day-2,freezes_available=0,
         last_freeze_week=v_week-7,last_freeze_used_on=v_day-3
   where user_id='11111111-1111-4111-8111-111111111111';
  insert into public.attempts (user_id,question_id,selected,correct,mode)
  values ('11111111-1111-4111-8111-111111111111',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'practice');
  if not exists (
    select 1 from public.streaks
    where user_id='11111111-1111-4111-8111-111111111111'
      and current=6 and longest=8 and freezes_available=0
      and last_freeze_week=v_week and last_freeze_used_on=v_day
  ) then raise exception 'ISO-week freeze refill or consumption failed'; end if;

  -- Another student's row must remain untouched.
  if (select current from public.streaks
      where user_id='22222222-2222-4222-8222-222222222222')<>0
  then raise exception 'Student streak leaked to another student'; end if;
end;
$assert$;
rollback;
select 'Transactional streak and freeze regression passed' as result;
