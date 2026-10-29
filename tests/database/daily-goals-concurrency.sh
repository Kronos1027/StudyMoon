#!/usr/bin/env bash
# Concurrent goal progress in disposable PostgreSQL only.
set -euo pipefail
if [[ "\${PGHOST:-}" != "localhost" && "\${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing daily-goal race on non-local PostgreSQL" >&2
  exit 1
fi
: "\${PGDATABASE:?}" "\${PGUSER:?}" "\${PGPASSWORD:?}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users (id,email,raw_user_meta_data)
values ('33333333-3333-4333-8333-333333333333',
        'goals@studymoon.test','{"apelido":"Aluno C"}');
SQL
for label in a b; do
  psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/$label.out" 2>"$tmpdir/$label.err" <<'SQL' &
set role service_role;
insert into public.attempts (user_id,question_id,selected,correct,mode)
values ('33333333-3333-4333-8333-333333333333',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'practice');
SQL
  if [[ "$label" == "a" ]]; then pid_a=$!; else pid_b=$!; fi
done
wait "$pid_a" || { cat "$tmpdir/a.err" >&2; exit 1; }
wait "$pid_b" || { cat "$tmpdir/b.err" >&2; exit 1; }

result="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select
  ((select done_questions=2 and status='partial'
    from public.daily_goals
    where user_id='33333333-3333-4333-8333-333333333333'
      and date=(now() at time zone 'UTC')::date)
   and
   (select count(*)=2 from public.attempts
    where user_id='33333333-3333-4333-8333-333333333333'))::text;
SQL
)"
if [[ "$result" != "true" ]]; then
  echo "Concurrent daily goal count differs from attempts ($result)" >&2
  exit 1
fi

# Goal reaches done exactly at customized target.
psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
update public.daily_goals set target_questions=3
where user_id='33333333-3333-4333-8333-333333333333';
set role service_role;
insert into public.attempts (user_id,question_id,selected,correct,mode)
values ('33333333-3333-4333-8333-333333333333',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc','A',false,'lesson_test');
SQL
result="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select (done_questions=3 and target_questions=3 and status='done')::text
from public.daily_goals
where user_id='33333333-3333-4333-8333-333333333333';
SQL
)"
if [[ "$result" != "true" ]]; then
  echo "Goal was not completed at target ($result)" >&2
  exit 1
fi

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
delete from auth.users
where id='33333333-3333-4333-8333-333333333333';
SQL
echo "Concurrent daily-goal updates passed (2 writes, completion at 3)."
