-- Disposable PostgreSQL regression: essay correction must be atomic,
-- server-only and idempotent, even if older code left orphaned feedback.
begin;

do $perms$
begin
  if has_function_privilege('anon',
       'public.finalize_essay_correction(uuid,uuid,integer,jsonb,jsonb,jsonb,text,text)',
       'execute')
     or has_function_privilege('authenticated',
       'public.finalize_essay_correction(uuid,uuid,integer,jsonb,jsonb,jsonb,text,text)',
       'execute')
     or not has_function_privilege('service_role',
       'public.finalize_essay_correction(uuid,uuid,integer,jsonb,jsonb,jsonb,text,text)',
       'execute')
  then raise exception 'Essay correction RPC permission isolation broken'; end if;

  if not exists(
    select 1 from pg_indexes
    where schemaname='public' and tablename='essay_feedback'
      and indexname='uq_essay_feedback_essay'
  ) then raise exception 'Missing unique feedback-per-essay index'; end if;
end;
$perms$;

set local role service_role;

do $test$
declare
  v_grade record;
  v_count int;
  v_invalid boolean := false;
begin
  update public.essays set status='correcting'
    where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  select * into v_grade from public.finalize_essay_correction(
    '11111111-1111-4111-8111-111111111111',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    800, '[]'::jsonb,'[]'::jsonb,'["Melhorar argumentos"]'::jsonb,
    null,'test-llm'
  );
  if not found or v_grade.total_score <> 800
    or v_grade.improvements <> '["Melhorar argumentos"]'::jsonb
  then raise exception 'Corrected response did not return committed grade'; end if;

  if not exists (
    select 1 from public.essays
     where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' and status='corrected'
  ) or (
    select count(*) from public.essay_feedback
     where essay_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ) <> 1 then raise exception 'Essay feedback/status were not committed as a pair'; end if;

  -- Replaying exactly the same RPC after success must not create a duplicate.
  select count(*) into v_count from public.finalize_essay_correction(
    '11111111-1111-4111-8111-111111111111',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    1000,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null,'retry'
  );
  if v_count <> 0
    or (select total_score from public.essay_feedback
        where essay_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') <> 800
  then raise exception 'Replay changed an already-corrected grade'; end if;

  -- Reject attempts to submit feedback for another student's essay.
  update public.essays set status='correcting'
    where id='ffffffff-ffff-4fff-8fff-ffffffffffff';
  select count(*) into v_count from public.finalize_essay_correction(
    '11111111-1111-4111-8111-111111111111',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    600,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null,'wrong-user'
  );
  if v_count <> 0
    or exists(select 1 from public.essay_feedback
       where essay_id='ffffffff-ffff-4fff-8fff-ffffffffffff')
  then raise exception 'Cross-user essay finalization was accepted'; end if;

  -- Simulate feedback orphaned by the old two-request implementation.
  insert into public.essay_feedback(
    essay_id,total_score,competencies,highlights,improvements,
    model_used
  ) values(
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    400,'[]'::jsonb,'[]'::jsonb,'["resultado original"]'::jsonb,
    'old-model'
  );
  select * into v_grade from public.finalize_essay_correction(
    '22222222-2222-4222-8222-222222222222',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    800,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null,'new-model'
  );
  if not found or v_grade.total_score <> 400
    or (select count(*) from public.essay_feedback
        where essay_id='ffffffff-ffff-4fff-8fff-ffffffffffff') <> 1
    or not exists (select 1 from public.essays
        where id='ffffffff-ffff-4fff-8fff-ffffffffffff'
          and status='corrected')
  then raise exception 'Orphaned feedback was duplicated or overwritten'; end if;

  -- Invalid payload fails transaction and must not partially mark status.
  update public.essays set status='correcting'
    where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  begin
    perform public.finalize_essay_correction(
      '11111111-1111-4111-8111-111111111111',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      -1,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null,'invalid'
    );
  exception when invalid_parameter_value then v_invalid := true;
  end;
  if not v_invalid
     or (select status from public.essays
         where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') <> 'correcting'
  then raise exception 'Failed finalization changed essay status'; end if;
end;
$test$;

rollback;
select 'Atomic essay correction, legacy repair and permissions passed' as result;
