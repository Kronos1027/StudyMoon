#!/usr/bin/env bash
# Simulate competing tutor requests; safe only for local disposable PostgreSQL.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing quota race test on a non-local database" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# Separate sessions must compete for the SAME one-slot student/day quota.
for idx in a b; do
  psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/$idx.out" 2>"$tmpdir/$idx.err" <<'SQL' &
set role service_role;
select public.claim_tutor_daily_turn(
  '11111111-1111-4111-8111-111111111111',current_date,1);
SQL
  if [[ "$idx" == "a" ]]; then pid_a=$!; else pid_b=$!; fi
done
wait "$pid_a" || { cat "$tmpdir/a.err"; exit 1; }
wait "$pid_b" || { cat "$tmpdir/b.err"; exit 1; }

out_a="$(tr -d '[:space:]' <"$tmpdir/a.out")"
out_b="$(tr -d '[:space:]' <"$tmpdir/b.out")"
if [[ "$out_a$out_b" != "tf" && "$out_a$out_b" != "ft" ]]; then
  echo "Expected exactly one tutor reservation, got A=$out_a B=$out_b" >&2
  exit 1
fi

count="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select used from public.tutor_daily_usage
where user_id='11111111-1111-4111-8111-111111111111'
  and usage_date=current_date;
SQL
)"
if [[ "$count" != "1" ]]; then
  echo "Tutor reservation counter inconsistent ($count)" >&2
  exit 1
fi
echo "Tutor quota race test passed (one request accepted, one rejected)."
