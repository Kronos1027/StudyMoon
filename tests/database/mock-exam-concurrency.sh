#!/usr/bin/env bash
# Competing finalizers must produce one result and one XP event.
# This test must run ONLY against disposable localhost PostgreSQL.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing mock-exam race test outside disposable DB" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users (id,email,raw_user_meta_data)
values ('abababab-abab-4aba-8aba-abababababab',
        'mock-race@studymoon.test','{"apelido":"Mock Race CI"}');
insert into public.questions (
  id,topic_id,statement_md,alternatives,answer_key,explanation_md,status
)
select ('00000000-0000-4000-8000-00000000000'||n)::uuid,
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Extra race question',
       '[]'::jsonb,'A','A','validated'::question_status
from generate_series(4,6) as n;
insert into public.mock_exams (id,user_id,kind,status)
values ('00000000-0000-4000-8000-000000000022',
        'abababab-abab-4aba-8aba-abababababab','partial','in_progress');
insert into public.mock_exam_items(exam_id,question_id,position)
select '00000000-0000-4000-8000-000000000022',q.id,q.n
from (values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,0),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,1),
('00000000-0000-4000-8000-000000000004'::uuid,2),
('00000000-0000-4000-8000-000000000005'::uuid,3),
('00000000-0000-4000-8000-000000000006'::uuid,4)) q(id,n);
SQL

for letter in a b; do
  psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/$letter.out" 2>"$tmpdir/$letter.err" <<'SQL' &
set role service_role;
select count(*) from public.finalize_mock_exam(
  'abababab-abab-4aba-8aba-abababababab',
  '00000000-0000-4000-8000-000000000022',
  '[{"questionId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","selected":"B"}]'::jsonb
);
SQL
  if [[ "$letter" == a ]]; then pid_a=$!; else pid_b=$!; fi
done
wait "$pid_a" || { cat "$tmpdir/a.err" >&2; exit 1; }
wait "$pid_b" || { cat "$tmpdir/b.err" >&2; exit 1; }
a="$(tr -d '[:space:]' <"$tmpdir/a.out")"
b="$(tr -d '[:space:]' <"$tmpdir/b.out")"
if [[ "$a$b" != "10" && "$a$b" != "01" ]]; then
  echo "Expected one mock finish and one no-op, got A=$a B=$b" >&2
  exit 1
fi

result="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select (
  exists(select 1 from public.mock_exams
         where id='00000000-0000-4000-8000-000000000022'
           and status='finished')
  and (select count(*)=1 from public.xp_events
       where user_id='abababab-abab-4aba-8aba-abababababab'
         and kind='mock_exam')
  and (select xp=100 from public.profiles
       where id='abababab-abab-4aba-8aba-abababababab')
)::text;
SQL
)"
if [[ "$result" != "true" ]]; then
  echo "Concurrent mock finalization yielded inconsistent score/XP: $result" >&2
  exit 1
fi

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
delete from auth.users where id='abababab-abab-4aba-8aba-abababababab';
delete from public.questions where id in(
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006'
);
SQL
echo "Mock exam concurrency test passed (single finalization and single award)."
