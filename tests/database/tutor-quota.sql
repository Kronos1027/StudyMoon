-- Run ONLY on the ephemeral PostgreSQL service in GitHub Actions.
begin;
do $test$
begin
  if has_table_privilege('anon','public.tutor_daily_usage','select')
     or has_table_privilege('authenticated','public.tutor_daily_usage','select')
     or has_table_privilege('authenticated','public.tutor_daily_usage','insert')
  then raise exception 'Tutor quota counter exposed to clients'; end if;

  if has_function_privilege('anon','public.claim_tutor_daily_turn(uuid,date,integer)','execute')
     or has_function_privilege('authenticated','public.claim_tutor_daily_turn(uuid,date,integer)','execute')
     or has_function_privilege('anon','public.release_tutor_daily_turn(uuid,date)','execute')
     or has_function_privilege('authenticated','public.release_tutor_daily_turn(uuid,date)','execute')
  then raise exception 'Tutor quota functions exposed to clients'; end if;

  if not (select c.relrowsecurity from pg_class c
          where c.oid='public.tutor_daily_usage'::regclass)
  then raise exception 'Tutor quota RLS disabled'; end if;
end;
$test$;

set local role service_role;

do $test$
declare
  v_claim boolean;
  v_count integer;
  v_denied boolean := false;
begin
  select public.claim_tutor_daily_turn(
    '11111111-1111-4111-8111-111111111111', current_date, 2) into v_claim;
  if v_claim is distinct from true then raise exception 'First tutor slot denied'; end if;

  select public.claim_tutor_daily_turn(
    '11111111-1111-4111-8111-111111111111', current_date, 2) into v_claim;
  if v_claim is distinct from true then raise exception 'Second tutor slot denied'; end if;

  select public.claim_tutor_daily_turn(
    '11111111-1111-4111-8111-111111111111', current_date, 2) into v_claim;
  if v_claim is distinct from false then raise exception 'Tutor cap exceeded'; end if;

  select public.claim_tutor_daily_turn(
    '22222222-2222-4222-8222-222222222222', current_date, 2) into v_claim;
  if v_claim is distinct from true then raise exception 'User B quota shared with A'; end if;

  select public.release_tutor_daily_turn(
    '11111111-1111-4111-8111-111111111111', current_date) into v_claim;
  if v_claim is distinct from true then raise exception 'Quota release failed'; end if;

  select public.claim_tutor_daily_turn(
    '11111111-1111-4111-8111-111111111111', current_date, 2) into v_claim;
  if v_claim is distinct from true then raise exception 'Quota not restored'; end if;

  select used into v_count from public.tutor_daily_usage
   where user_id='11111111-1111-4111-8111-111111111111'
     and usage_date=current_date;
  if v_count <> 2 then raise exception 'Tutor quota not persisted'; end if;

  begin
    perform public.claim_tutor_daily_turn(
      '11111111-1111-4111-8111-111111111111', current_date, 0);
  exception when invalid_parameter_value then
    v_denied := true;
  end;
  if not v_denied then raise exception 'Invalid daily tutor limit accepted'; end if;

  -- Releasing a nonexistent day never creates or decrements below zero.
  select public.release_tutor_daily_turn(
    '11111111-1111-4111-8111-111111111111', current_date - 100) into v_claim;
  if v_claim is distinct from false then raise exception 'Nonexistent quota released'; end if;
end;
$test$;
rollback;
select 'Tutor quota integration checks passed' as result;
