#!/usr/bin/env bash
# Two concurrent answers crossing the five-answer streak threshold.
# Safe only for the disposable local PostgreSQL Actions container.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing streak concurrency test on non-local PostgreSQL" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users (id,email,raw_user_meta_data)
values ('55555555-5555-4555-8555-555555555555',
        'streak-race@studymoon.test','{"apelido":"Streak CI"}');
set role service_role;
insert into public.attempts (user_id,question_id,selected,correct,mode)
select '55555555-5555-4555-8555-555555555555',
       'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'practice'
from generate_series(1,3);
SQL

for letter in a b; do
  psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/$letter.out" 2>"$tmpdir/$letter.err" <<'SQL' &
set role service_role;
insert into public.attempts (user_id,question_id,selected,correct,mode)
values ('55555555-5555-4555-8555-555555555555',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,'practice');
SQL
  if [[ "$letter" == "a" ]]; then pid_a=$!; else pid_b=$!; fi
done

wait "$pid_a" || { cat "$tmpdir/a.err" >&2; exit 1; }
wait "$pid_b" || { cat "$tmpdir/b.err" >&2; exit 1; }

result="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select (
 (select count(*)=5 from public.attempts
  where user_id='55555555-5555-4555-8555-555555555555')
 and current=1 and longest=1 and freezes_available=1
 and last_study_date=(clock_timestamp() at time zone 'UTC')::date
 and last_freeze_week=date_trunc('week',(clock_timestamp() at time zone 'UTC')::timestamp)::date
)::text
from public.streaks
where user_id='55555555-5555-4555-8555-555555555555';
SQL
)"
if [[ "$result" != "true" ]]; then
  echo "Concurrent answers did not yield exactly one streak day: $result" >&2
  exit 1
fi

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
delete from auth.users where id='55555555-5555-4555-8555-555555555555';
SQL
echo "Streak threshold race test passed (5 answers, one study day)."
