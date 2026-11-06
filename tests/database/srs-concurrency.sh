#!/usr/bin/env bash
# Two simultaneous FSRS schedules with the same expected revision:
# PostgreSQL must let precisely one win. Disposable localhost database ONLY.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing to race FSRS schedules on a non-local database" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

for letter in a b; do
  psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/$letter.out" 2>"$tmpdir/$letter.err" <<'SQL' &
set role service_role;
select public.commit_srs_schedule(
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  0, clock_timestamp() + interval '1 day',
  1.5, 5, 0, 1, 1, 0, 0, 'learning', clock_timestamp()
);
SQL
  if [[ "$letter" == "a" ]]; then pid_a=$!; else pid_b=$!; fi
done
wait "$pid_a" || { cat "$tmpdir/a.err"; exit 1; }
wait "$pid_b" || { cat "$tmpdir/b.err"; exit 1; }

a="$(tr -d '[:space:]' <"$tmpdir/a.out")"
b="$(tr -d '[:space:]' <"$tmpdir/b.out")"
if [[ "$a$b" != "tf" && "$a$b" != "ft" ]]; then
  echo "Expected one FSRS commit and one revision conflict; A=$a B=$b" >&2
  exit 1
fi

verified="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select (
  revision = 1 and reps = 1
  and due > clock_timestamp()
)::text
from public.srs_cards
where user_id='11111111-1111-4111-8111-111111111111'
  and question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
SQL
)"
if [[ "$verified" != "true" ]]; then
  echo "Concurrent FSRS writes left inconsistent card: $verified" >&2
  exit 1
fi
echo "Concurrent FSRS test passed (one revision committed, one rejected)."
