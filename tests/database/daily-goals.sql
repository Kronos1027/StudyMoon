-- Disposable PostgreSQL regression: each persisted practice attempt must
-- increment the daily goal exactly once while retaining custom targets.
begin;
do $test$
begin
  if (select count(*) from public.daily_goals
       where user_id='11111111-1111-4111-8111-111111111111') <> 1
     or (select done_questions from public.daily_goals
       where user_id='11111111-1111-4111-8111-111111111111') <> 1
     or (select done_questions from public.daily_goals
       where user_id='22222222-2222-4222-8222-222222222222') <> 1
  then
    raise exception 'Goal trigger did not count the seeded attempts';
  end if;
end;
$test$;

-- Preserve personalized goals: target_minutes and target_questions must not
-- reset merely because another practice answer was recorded.
update public.daily_goals
   set target_questions=2, target_minutes=45
 where user_id='11111111-1111-4111-8111-111111111111';

insert into public.attempts (user_id,question_id,selected,correct,mode)
values ('11111111-1111-4111-8111-111111111111',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'review');

do $test$
begin
  if not exists (
    select 1 from public.daily_goals
    where user_id='11111111-1111-4111-8111-111111111111'
      and target_questions=2 and target_minutes=45
      and done_questions=2 and status='done'
  ) then raise exception 'Daily goal did not increment or custom target changed'; end if;
  if not exists (
    select 1 from public.daily_goals
    where user_id='22222222-2222-4222-8222-222222222222'
      and done_questions=1 and status='partial'
  ) then raise exception 'Student B goal modified by student A'; end if;
end;
$test$;

-- Mock exam attempts must not accidentally advance the separate practice goal.
insert into public.attempts (user_id,question_id,selected,correct,mode)
values ('11111111-1111-4111-8111-111111111111',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'mock_exam');

do $test$
begin
  if (select done_questions from public.daily_goals
     where user_id='11111111-1111-4111-8111-111111111111') <> 2
  then raise exception 'Mock exam attempt incorrectly counted as practice'; end if;
end;
$test$;
rollback;
select 'Daily goal progress regression passed' as result;
