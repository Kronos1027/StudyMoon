-- StudyMoon 0020: atomic mock-exam grading with immutable answer keys.
-- Historical duplicate mock-exam XP events block this migration for review.
create unique index if not exists uq_xp_mock_exam_once
  on public.xp_events (user_id, kind, ref_id)
  where kind = 'mock_exam' and ref_id is not null;

-- Extend the existing serialized one-shot XP logic to mock exams.
-- A successful finalization and its award commit or roll back together.
create or replace function public.award_study_xp(
  p_user_id uuid,
  p_kind public.xp_kind,
  p_ref_id uuid,
  p_requested integer,
  p_daily_cap integer default null
)
returns table (
  awarded_amount integer,
  total_xp integer,
  old_level integer,
  new_level integer
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_prior_xp integer;
  v_prior_level integer;
  v_already_today integer := 0;
  v_award integer;
  v_new_total integer;
  v_new_level integer;
  v_rank_title text;
begin
  if p_user_id is null or p_ref_id is null or p_kind is null
     or p_kind not in ('question', 'review', 'essay', 'mock_exam')
     or p_requested is null or p_requested < 0 or p_requested > 500
     or (p_daily_cap is not null and (p_daily_cap < 0 or p_daily_cap > 1000))
     or (p_kind in ('question', 'review', 'mock_exam') and p_daily_cap is null)
  then
    raise exception 'Invalid XP award arguments' using errcode = '22023';
  end if;

  -- Serialize all awards by locking the student's own profile.
  select p.xp, p.level
    into v_prior_xp, v_prior_level
    from public.profiles as p
   where p.id = p_user_id
     for update;
  if not found then
    raise exception 'Student profile not found' using errcode = 'P0002';
  end if;

  -- One-time reward, including essays. This check runs under the same lock.
  if exists (
    select 1 from public.xp_events e
    where e.user_id = p_user_id and e.kind = p_kind
      and e.ref_id = p_ref_id
  ) then
    return query select 0, v_prior_xp, v_prior_level, v_prior_level;
    return;
  end if;

  v_award := p_requested;
  if p_daily_cap is not null then
    select coalesce(sum(e.amount), 0)::integer
      into v_already_today
      from public.xp_events e
     where e.user_id = p_user_id and e.kind = p_kind
       and e.created_at >= (
         ((now() at time zone 'UTC')::date)::timestamp at time zone 'UTC'
       );
    v_award := least(v_award, greatest(0, p_daily_cap - v_already_today));
  end if;

  if v_award <= 0 then
    return query select 0, v_prior_xp, v_prior_level, v_prior_level;
    return;
  end if;

  -- The event + profile update form one transaction. Any error rolls back both.
  insert into public.xp_events (user_id, kind, ref_id, amount)
  values (p_user_id, p_kind, p_ref_id, v_award);

  v_new_total := v_prior_xp + v_award;
  v_new_level := greatest(1, floor(sqrt(v_new_total::numeric / 25))::integer + 1);
  v_rank_title := case
    when v_new_level >= 20 then 'Guardião da Lua Cheia'
    when v_new_level >= 15 then 'Mestre das Marés'
    when v_new_level >= 10 then 'Cartógrafo Estelar'
    when v_new_level >= 6 then 'Navegador Lunar'
    when v_new_level >= 3 then 'Observador do Céu'
    else 'Explorador Lunar'
  end;

  update public.profiles p
     set xp = v_new_total, level = v_new_level,
         rank_title = v_rank_title
   where p.id = p_user_id;

  return query select v_award, v_new_total, v_prior_level, v_new_level;
end;
$function$;


create or replace function public.finalize_mock_exam(
  p_user_id uuid,
  p_exam_id uuid,
  p_answers jsonb
)
returns table (
  total_questions integer,
  correct_count integer,
  estimated_score integer,
  by_area jsonb
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_exam_id uuid;
  v_item record;
  v_selected text;
  v_flagged boolean;
  v_correct integer;
  v_total integer;
  v_estimated integer;
  v_by_area jsonb;
begin
  if p_user_id is null or p_exam_id is null
     or p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) > 200
  then
    raise exception 'Invalid mock exam submission' using errcode='22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_answers) as a(value)
    where jsonb_typeof(a.value) <> 'object'
       or jsonb_typeof(a.value->'questionId') <> 'string'
       or coalesce(a.value->>'questionId', '') !~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or (a.value->>'selected') is not null
          and (a.value->>'selected') not in ('A','B','C','D','E')
       or (a.value->'flagged') is not null
          and jsonb_typeof(a.value->'flagged') <> 'boolean'
  ) then
    raise exception 'Invalid mock exam answer entry' using errcode='22023';
  end if;

  if (select count(*) from jsonb_array_elements(p_answers)) <>
     (select count(distinct a.value->>'questionId')
        from jsonb_array_elements(p_answers) as a(value))
  then
    raise exception 'Duplicate question in mock exam submission' using errcode='22023';
  end if;

  -- The exam row is the per-exam lock: a second finalization will see
  -- finished status and never grade twice or award XP twice.
  select e.id into v_exam_id from public.mock_exams e
   where e.id=p_exam_id and e.user_id=p_user_id and e.status='in_progress'
   for update;
  if not found then return; end if;

  if exists (
    select 1 from jsonb_array_elements(p_answers) as a(value)
    where not exists (
      select 1 from public.mock_exam_items i
       where i.exam_id=v_exam_id
         and i.question_id=(a.value->>'questionId')::uuid
    )
  ) then
    raise exception 'Answer does not belong to the mock exam' using errcode='22023';
  end if;

  select count(*)::integer into v_total
    from public.mock_exam_items i
   where i.exam_id=v_exam_id;
  if v_total < 5 then
    raise exception 'Mock exam has insufficient questions' using errcode='22023';
  end if;

  for v_item in
    select i.id, i.question_id, q.answer_key
      from public.mock_exam_items i
      join public.questions q on q.id=i.question_id
     where i.exam_id=v_exam_id
  loop
    v_selected := null;
    v_flagged := false;
    select a.value->>'selected', coalesce((a.value->>'flagged')::boolean,false)
      into v_selected, v_flagged
      from jsonb_array_elements(p_answers) as a(value)
     where (a.value->>'questionId')::uuid=v_item.question_id;

    update public.mock_exam_items
       set selected=v_selected,
           correct=(v_selected is not null and v_selected=v_item.answer_key),
           flagged=coalesce(v_flagged,false)
     where id=v_item.id;
  end loop;

  select count(*) filter (where i.correct)::integer into v_correct
    from public.mock_exam_items i
   where i.exam_id=v_exam_id;
  v_estimated := round(1000::numeric*v_correct/v_total)::integer;

  select coalesce(jsonb_agg(
      jsonb_build_object(
        'area', agg.area, 'correct', agg.correct_count,
        'total', agg.total, 'percent',
        round(100::numeric*agg.correct_count/agg.total)::integer
      )
      order by agg.area
    ), '[]'::jsonb)
    into v_by_area
    from (
      select a.name as area,
             count(*)::integer as total,
             count(*) filter (where i.correct)::integer as correct_count
        from public.mock_exam_items i
        join public.questions q on q.id=i.question_id
        join public.topics t on t.id=q.topic_id
        join public.areas a on a.id=t.area_id
       where i.exam_id=v_exam_id
       group by a.id, a.name
    ) agg;

  update public.mock_exams e
     set status='finished',
         finished_at=clock_timestamp(),
         score_estimate=jsonb_build_object(
           'correct',v_correct,'total',v_total,'estimated',v_estimated,
           'note','estimativa simples (percentual de acertos × 1000), não TRI',
           'byArea',v_by_area
         )
   where e.id=v_exam_id and e.status='in_progress';

  if not found then raise exception 'Lost mock exam finalization lock'; end if;

  -- This function locks the profile and updates xp_events, level and title
  -- together. Any exception rolls back the entire exam finalization.
  perform public.award_study_xp(
    p_user_id,'mock_exam'::public.xp_kind,p_exam_id,100,100
  );

  return query select v_total,v_correct,v_estimated,v_by_area;
end;
$function$;

revoke all on function public.finalize_mock_exam(uuid,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.finalize_mock_exam(uuid,uuid,jsonb)
  to service_role;
