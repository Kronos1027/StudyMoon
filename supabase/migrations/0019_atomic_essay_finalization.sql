-- StudyMoon 0019: Finalize an AI essay correction atomically.
-- Prior flow inserted essay_feedback and updated essays.status in separate
-- HTTP requests. A failure between them orphaned feedback and allowed
-- duplicate corrections on retry. Historical duplicates MUST be inspected,
-- not silently discarded: the unique index will fail if they exist.
create unique index if not exists uq_essay_feedback_essay
  on public.essay_feedback (essay_id);

create or replace function public.finalize_essay_correction(
  p_user_id uuid,
  p_essay_id uuid,
  p_total_score integer,
  p_competencies jsonb,
  p_highlights jsonb,
  p_improvements jsonb,
  p_rewrite_example_md text,
  p_model_used text
)
returns table (
  total_score integer,
  competencies jsonb,
  highlights jsonb,
  improvements jsonb,
  rewrite_example_md text
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_essay_id uuid;
begin
  if p_user_id is null or p_essay_id is null
     or p_total_score is null or p_total_score < 0 or p_total_score > 1000
     or p_competencies is null or jsonb_typeof(p_competencies) <> 'array'
     or p_highlights is null or jsonb_typeof(p_highlights) <> 'array'
     or p_improvements is null or jsonb_typeof(p_improvements) <> 'array'
     or p_model_used is null or length(p_model_used) > 160
  then
    raise exception 'Invalid essay feedback payload' using errcode='22023';
  end if;

  -- Only a claimed essay owned by the authenticated student may finalize.
  -- FOR UPDATE serializes competing workers and status changes.
  select e.id into v_essay_id
    from public.essays e
   where e.id = p_essay_id and e.user_id = p_user_id
     and e.status = 'correcting'
   for update;
  if not found then return; end if;

  -- A feedback saved by an older version of the application may already
  -- exist. Keep the original correction instead of creating a duplicate
  -- or replacing it with a different model result on retry.
  insert into public.essay_feedback (
    essay_id, total_score, competencies, highlights, improvements,
    rewrite_example_md, is_ai_estimate, model_used
  ) values (
    v_essay_id, p_total_score, p_competencies, p_highlights, p_improvements,
    p_rewrite_example_md, true, p_model_used
  )
  on conflict (essay_id) do nothing;

  update public.essays e
     set status = 'corrected'
   where e.id = v_essay_id and e.status = 'correcting';

  if not found then
    raise exception 'Essay finalization lost its status claim';
  end if;

  return query
    select f.total_score, f.competencies, f.highlights,
           f.improvements, f.rewrite_example_md
      from public.essay_feedback f
     where f.essay_id = v_essay_id;
end;
$function$;

revoke all on function public.finalize_essay_correction(
  uuid, uuid, integer, jsonb, jsonb, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.finalize_essay_correction(
  uuid, uuid, integer, jsonb, jsonb, jsonb, text, text
) to service_role;
