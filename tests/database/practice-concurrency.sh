#!/usr/bin/env bash
# Competing submissions of the same served question; disposable PostgreSQL only.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing to race attempts against non-local PostgreSQL" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
set role service_role;
select public.issue_practice_question(
 '11111111-1111-4111-8111-111111111111',
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
SQL

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
for label in a b; do
  psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/$label.out" 2>"$tmpdir/$label.err" <<'SQL' &
set role service_role;
select recorded_correct from public.record_practice_attempt(
 '11111111-1111-4111-8111-111111111111',
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 'B','practice');
SQL
  if [[ "$label" == "a" ]]; then pid_a=$!; else pid_b=$!; fi
done

if wait "$pid_a"; then status_a=0; else status_a=1; fi
if wait "$pid_b"; then status_b=0; else status_b=1; fi
if [[ $((status_a + status_b)) -ne 1 ]]; then
  echo "Expected one accepted and one rejected attempt; results: A=$status_a B=$status_b" >&2
  cat "$tmpdir/a.err" "$tmpdir/b.err" >&2
  exit 1
fi

verified="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select (
 (select count(*) from public.attempts
   where user_id='11111111-1111-4111-8111-111111111111'
     and question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') = 2
 and (select consumed_at is not null
      from public.practice_question_serves
      where user_id='11111111-1111-4111-8111-111111111111'
        and question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')
)::text;
SQL
)"
if [[ "$verified" != "true" ]]; then
  echo "Concurrent attempt state is inconsistent: $verified" >&2
  exit 1
fi
echo "Concurrent attempt test passed (one write, duplicate rejected)."
