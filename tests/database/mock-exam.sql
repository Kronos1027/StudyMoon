-- Transactional mock-exam grading, scoring and XP (disposable DB).
begin;

do $perms$
begin
  if has_function_privilege('anon','public.finalize_mock_exam(uuid,uuid,jsonb)','execute')
    or has_function_privilege('authenticated','public.finalize_mock_exam(uuid,uuid,jsonb)','execute')
    or not has_function_privilege('service_role','public.finalize_mock_exam(uuid,uuid,jsonb)','execute')
  then raise exception 'Mock finalization RPC incorrectly exposed'; end if;
end;
$perms$;

insert into public.questions (
  id,topic_id,statement_md,alternatives,answer_key,explanation_md,status
)
select
  ('00000000-0000-4000-8000-00000000000' || n)::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Questão adicional ' || n, '[]'::jsonb,
  'A','A é correta','validated'::question_status
from generate_series(1,3) as n;

insert into public.mock_exams (id,user_id,kind,status) values
('00000000-0000-4000-8000-000000000011',
 '11111111-1111-4111-8111-111111111111','partial','in_progress'),
('00000000-0000-4000-8000-000000000012',
 '22222222-2222-4222-8222-222222222222','partial','in_progress');

insert into public.mock_exam_items (exam_id,question_id,position)
select e.id,q.question_id,q.position
from (values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,0),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,1),
  ('00000000-0000-4000-8000-000000000001'::uuid,2),
  ('00000000-0000-4000-8000-000000000002'::uuid,3),
  ('00000000-0000-4000-8000-000000000003'::uuid,4)
) as q(question_id,position)
cross join (select id from public.mock_exams
            where id in('00000000-0000-4000-8000-000000000011',
                        '00000000-0000-4000-8000-000000000012')) e;

set local role service_role;
do $test$
declare
  v_report record;
  v_count integer;
  v_denied boolean := false;
  v_before integer;
  v_after integer;
begin
  select p.xp into v_before from public.profiles p
   where p.id='11111111-1111-4111-8111-111111111111';

  select * into v_report from public.finalize_mock_exam(
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000011',
    '[{"questionId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","selected":"B","flagged":true},
      {"questionId":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","selected":"B","flagged":false},
      {"questionId":"00000000-0000-4000-8000-000000000001","selected":"A","flagged":false},
      {"questionId":"00000000-0000-4000-8000-000000000002","selected":null,"flagged":false}]'::jsonb
  );
  if not found or v_report.total_questions <> 5
    or v_report.correct_count <> 2
    or v_report.estimated_score <> 400
    or jsonb_array_length(v_report.by_area) <> 1
    or v_report.by_area->0->>'area' <> 'Matemática'
    or (v_report.by_area->0->>'correct')::int <> 2
    or (v_report.by_area->0->>'percent')::int <> 40
  then raise exception 'Mock exam grades or area summary incorrect'; end if;

  if (select status from public.mock_exams
       where id='00000000-0000-4000-8000-000000000011') <> 'finished'
     or (select count(*) from public.mock_exam_items
         where exam_id='00000000-0000-4000-8000-000000000011' and correct) <> 2
     or not exists(
       select 1 from public.mock_exam_items
        where exam_id='00000000-0000-4000-8000-000000000011'
          and question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
          and selected='B' and flagged
     )
  then raise exception 'Graded rows and exam status diverged'; end if;

  select p.xp into v_after from public.profiles p
   where p.id='11111111-1111-4111-8111-111111111111';
  if v_after <> v_before + 100
    or (select count(*) from public.xp_events
       where user_id='11111111-1111-4111-8111-111111111111'
         and kind='mock_exam'
         and ref_id='00000000-0000-4000-8000-000000000011') <> 1
  then raise exception 'Mock grading did not atomically award one-shot XP'; end if;

  -- A replay does nothing, including to XP and prior answers.
  select count(*) into v_count from public.finalize_mock_exam(
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000011','[]'::jsonb
  );
  if v_count <> 0
    or (select xp from public.profiles
        where id='11111111-1111-4111-8111-111111111111') <> v_after
  then raise exception 'Repeated mock exam submission altered XP'; end if;

  -- Another student cannot grade someone else's in-progress exam.
  select count(*) into v_count from public.finalize_mock_exam(
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000012','[]'::jsonb
  );
  if v_count<>0 then raise exception 'Cross-user mock exam finalization allowed'; end if;

  begin
    perform public.finalize_mock_exam(
      '22222222-2222-4222-8222-222222222222',
      '00000000-0000-4000-8000-000000000012',
      '[{"questionId":"00000000-0000-4000-8000-000000000099","selected":"A"}]'::jsonb
    );
  exception when invalid_parameter_value then v_denied := true;
  end;
  if not v_denied
    or (select status from public.mock_exams
        where id='00000000-0000-4000-8000-000000000012') <> 'in_progress'
    or exists(select 1 from public.xp_events
       where ref_id='00000000-0000-4000-8000-000000000012')
  then raise exception 'Invalid mock answer partially committed'; end if;

  v_denied := false;
  begin
    perform public.finalize_mock_exam(
      '22222222-2222-4222-8222-222222222222',
      '00000000-0000-4000-8000-000000000012',
      '[{"questionId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","selected":"B"},
        {"questionId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","selected":"B"}]'::jsonb
    );
  exception when invalid_parameter_value then v_denied := true;
  end;
  if not v_denied then raise exception 'Duplicate question accepted'; end if;
end;
$test$;

rollback;
select 'Atomic mock exam grading and idempotent XP regression passed' as result;
