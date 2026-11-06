-- Disposable PostgreSQL regression: optimistic FSRS revision guard.
begin;

do $permissions$
begin
  if has_function_privilege(
    'anon',
    'public.commit_srs_schedule(uuid,uuid,bigint,timestamptz,numeric,numeric,integer,integer,integer,integer,integer,text,timestamptz)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.commit_srs_schedule(uuid,uuid,bigint,timestamptz,numeric,numeric,integer,integer,integer,integer,integer,text,timestamptz)',
    'execute'
  ) then
    raise exception 'Authenticated clients can commit private FSRS schedules';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.commit_srs_schedule(uuid,uuid,bigint,timestamptz,numeric,numeric,integer,integer,integer,integer,integer,text,timestamptz)',
    'execute'
  ) then
    raise exception 'Server cannot commit FSRS schedules';
  end if;
end;
$permissions$;

set local role service_role;

do $test$
declare
  v_success boolean;
  v_revision bigint;
  v_reps integer;
  v_due timestamptz;
  v_denied boolean := false;
begin
  -- Insert a brand-new question card with revision 1.
  select public.commit_srs_schedule(
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    0, clock_timestamp() + interval '1 day',
    1.5, 5, 0, 1, 1, 0, 0, 'learning', clock_timestamp()
  ) into v_success;
  if v_success is distinct from true
  then raise exception 'New FSRS card was not saved'; end if;

  -- The identical stale request must not double-count a revision.
  select public.commit_srs_schedule(
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    0, clock_timestamp() + interval '1 day',
    1.5, 5, 0, 1, 1, 0, 0, 'learning', clock_timestamp()
  ) into v_success;
  if v_success is distinct from false
  then raise exception 'Stale initial revision overwrote FSRS card'; end if;

  select public.commit_srs_schedule(
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    1, clock_timestamp() + interval '3 days',
    2.1, 5.2, 1, 3, 2, 0, 0, 'review', clock_timestamp()
  ) into v_success;
  if v_success is distinct from true
  then raise exception 'Second FSRS revision not saved'; end if;

  -- A stale second writer cannot erase the newest interval.
  select public.commit_srs_schedule(
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    1, clock_timestamp() + interval '4 days',
    3, 5.4, 2, 4, 3, 0, 0, 'review', clock_timestamp()
  ) into v_success;
  if v_success is distinct from false
  then raise exception 'Stale FSRS update was accepted'; end if;

  select revision, reps, due
  into v_revision, v_reps, v_due
  from public.srs_cards
  where user_id = '11111111-1111-4111-8111-111111111111'
    and question_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  if v_revision <> 2 or v_reps <> 2
     or v_due < clock_timestamp() + interval '2 days'
  then raise exception 'Stored FSRS revision or interval was corrupted'; end if;

  -- A claimed revision cannot skip or repeat the FSRS repetition count.
  select public.commit_srs_schedule(
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    2, clock_timestamp() + interval '5 days',
    3, 5.4, 2, 5, 2, 0, 0, 'review', clock_timestamp()
  ) into v_success;
  if v_success is distinct from false
  then raise exception 'FSRS repetitions may be overwritten or replayed'; end if;

  begin
    perform public.commit_srs_schedule(
      '11111111-1111-4111-8111-111111111111',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      2, null,
      1, 5, 2, 5, 3, 0, 0, 'review', clock_timestamp()
    );
  exception when invalid_parameter_value then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'Null due date was accepted by private FSRS RPC';
  end if;
end;
$test$;

rollback;
select 'FSRS versioned scheduling regression passed' as result;
