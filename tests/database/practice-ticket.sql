-- Disposable PostgreSQL fixture only. Never execute in production.
begin;
do $tests$
begin
  if has_table_privilege('anon','public.practice_question_serves','select')
     or has_table_privilege('authenticated','public.practice_question_serves','insert')
     or has_function_privilege('anon','public.issue_practice_question(uuid,uuid)','execute')
     or has_function_privilege('authenticated','public.issue_practice_question(uuid,uuid)','execute')
     or has_function_privilege('anon',
          'public.record_practice_attempt(uuid,uuid,text,public.attempt_mode)','execute')
     or has_function_privilege('authenticated',
          'public.record_practice_attempt(uuid,uuid,text,public.attempt_mode)','execute')
  then raise exception 'Practice ticket functions or table exposed'; end if;
  if not (select c.relrowsecurity from pg_class c
      where c.oid='public.practice_question_serves'::regclass)
  then raise exception 'Practice ticket RLS not enabled'; end if;
end;
$tests$;

set local role service_role;

do $tests$
declare
  v_issued boolean;
  v_elapsed integer;
  v_correct boolean;
  v_denied boolean;
  v_attempts integer;
begin
  -- Unissued questions cannot be submitted, regardless of caller-provided
  -- timing. The result is an error, never an inserted attempt.
  v_denied := false;
  begin
    perform public.record_practice_attempt(
      '11111111-1111-4111-8111-111111111111',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc','A','practice');
  exception when no_data_found then v_denied := true;
  end;
  if not v_denied then raise exception 'Unissued question was accepted'; end if;

  select public.issue_practice_question(
    '11111111-1111-4111-8111-111111111111',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd') into v_issued;
  if v_issued is distinct from false
  then raise exception 'Draft question was served'; end if;

  select public.issue_practice_question(
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc') into v_issued;
  if v_issued is distinct from true
  then raise exception 'Validated question could not be served'; end if;

  perform pg_sleep(0.07);

  select recorded_time_ms, recorded_correct
    into v_elapsed, v_correct
    from public.record_practice_attempt(
      '11111111-1111-4111-8111-111111111111',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B','practice');
  if v_correct is distinct from true or v_elapsed < 30 or v_elapsed > 3000
  then raise exception 'Server time or answer check incorrect: % ms', v_elapsed; end if;

  select count(*) into v_attempts from public.attempts
    where user_id='11111111-1111-4111-8111-111111111111'
    and question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  if v_attempts <> 2 then
    raise exception 'Expected one seeded and one recorded attempt'; end if;

  v_denied := false;
  begin
    perform public.record_practice_attempt(
      '11111111-1111-4111-8111-111111111111',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc','A','practice');
  exception when no_data_found then v_denied := true;
  end;
  if not v_denied then raise exception 'Duplicate submission was accepted'; end if;

  -- A ticket cannot be reused by another student, even if that student
  -- knows the public question UUID and the real answer.
  v_denied := false;
  begin
    perform public.record_practice_attempt(
      '22222222-2222-4222-8222-222222222222',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B','practice');
  exception when no_data_found then v_denied := true;
  end;
  if not v_denied then raise exception 'Cross-user ticket forged'; end if;

  -- Reissuing creates a fresh ticket, but stale tickets older than four
  -- hours must never allow a delayed or replayed answer.
  perform public.issue_practice_question(
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  update public.practice_question_serves
     set served_at = clock_timestamp() - interval '5 hours'
   where user_id = '11111111-1111-4111-8111-111111111111'
     and question_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_denied := false;
  begin
    perform public.record_practice_attempt(
      '11111111-1111-4111-8111-111111111111',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B','practice');
  exception when no_data_found then v_denied := true;
  end;
  if not v_denied then raise exception 'Expired question ticket accepted'; end if;

  -- The review flag is never sufficient: a future card is ineligible,
  -- even if the request possesses a valid server-issued ticket.
  insert into public.srs_cards
    (user_id,question_id,due)
  values ('22222222-2222-4222-8222-222222222222',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          clock_timestamp() + interval '1 day');

  perform public.issue_practice_question(
    '22222222-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  v_denied := false;
  begin
    perform public.record_practice_attempt(
      '22222222-2222-4222-8222-222222222222',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B','review');
  exception when no_data_found then v_denied := true;
  end;
  if not v_denied then raise exception 'Future review card was accepted'; end if;

  update public.srs_cards set due=clock_timestamp() - interval '1 second'
   where user_id='22222222-2222-4222-8222-222222222222';
  select recorded_correct into v_correct
    from public.record_practice_attempt(
      '22222222-2222-4222-8222-222222222222',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc','A','review');
  if v_correct is distinct from false then
    raise exception 'Due review answer was not recorded correctly'; end if;

  if (select count(*) from public.attempts
      where user_id='22222222-2222-4222-8222-222222222222'
      and mode='review') <> 1
  then raise exception 'Unexpected review attempt count'; end if;
end;
$tests$;
rollback;
select 'Practice ticket integrity and review eligibility checks passed' as result;
