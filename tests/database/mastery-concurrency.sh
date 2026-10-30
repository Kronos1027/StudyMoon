#!/usr/bin/env bash
# Race two independent correct answers on the same user's topic.
# This script must ONLY run against a disposable local PostgreSQL.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing to run mastery race test on a non-local DB" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# The test database already has both questions in one topic, but its second
# question is a draft; publish that synthetic test fixture.
psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL' > /dev/null
update public.questions set status='validated'
where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
set role service_role;
select public.issue_practice_question(
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select public.issue_practice_question(
  '11111111-1111-4111-8111-111111111111',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
SQL

before="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select elo || ',' || attempts_count
from public.topic_mastery
where user_id='11111111-1111-4111-8111-111111111111'
and topic_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SQL
)"
old_elo="${before%%,*}"
old_count="${before##*,}"
if [[ -z "$old_elo" || -z "$old_count" ]]; then
  echo "Cannot establish baseline mastery" >&2
  exit 1
fi

# Both calls run in distinct Postgres sessions. The trigger must serialize
# the updates on the same (user_id,topic_id) row.
psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/a.out" 2>"$tmpdir/a.err" <<'SQL' &
set role service_role;
select recorded_correct from public.record_practice_attempt(
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'B', 'practice');
SQL
pid_a=$!
psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/b.out" 2>"$tmpdir/b.err" <<'SQL' &
set role service_role;
select recorded_correct from public.record_practice_attempt(
  '11111111-1111-4111-8111-111111111111',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'A', 'practice');
SQL
pid_b=$!
wait "$pid_a" || { cat "$tmpdir/a.err"; exit 1; }
wait "$pid_b" || { cat "$tmpdir/b.err"; exit 1; }
if [[ "$(tr -d '[:space:]' < "$tmpdir/a.out")" != "t" ||
      "$(tr -d '[:space:]' < "$tmpdir/b.out")" != "t" ]]; then
  echo "Expected two correct committed attempts" >&2
  exit 1
fi

result="$(psql -X -qAt -v ON_ERROR_STOP=1 -v elo="$old_elo" -v count="$old_count" <<'SQL'
select (
  m.attempts_count = (:count)::int + 2
  and m.elo = public.next_study_elo(
    public.next_study_elo((:elo)::int, 1200, true, (:count)::int),
    1200, true, (:count)::int + 1
  )
  and m.confidence = least(
    0.98::numeric,
    (m.attempts_count::numeric)/(m.attempts_count+8)
  )::numeric(4,3)
  and (select count(*) from public.attempts a
       where a.user_id=m.user_id
         and a.question_id in (
           'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
           'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
         )) >= 2
)::text
from public.topic_mastery m
where m.user_id='11111111-1111-4111-8111-111111111111'
  and m.topic_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SQL
)"
if [[ "$result" != "true" ]]; then
  echo "Concurrent mastery lost a result: $result (baseline $before)" >&2
  exit 1
fi
echo "Concurrent Elo mastery test passed (both answers counted exactly)."
