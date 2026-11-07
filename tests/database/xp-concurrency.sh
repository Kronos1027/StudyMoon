#!/usr/bin/env bash
# Deliberately overlapping awards against an EPHEMERAL local PostgreSQL.
# Must not be run against production databases.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing to run XP race test against a non-local database" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# Transaction A takes a row lock first and holds it for one second.
# Transaction B attempts an award while A owns the lock.
# Each RPC must use the post-lock event total, not a stale initial balance.
psql -X -v ON_ERROR_STOP=1 -At >"$tmpdir/a.log" 2>"$tmpdir/a.err" <<'SQL' &
begin;
set local role service_role;
select xp from public.profiles
 where id='11111111-1111-4111-8111-111111111111' for update;
select pg_sleep(1);
select awarded_amount from public.award_study_xp(
 '11111111-1111-4111-8111-111111111111','question',
 '11111111-1111-4111-8111-111111111111',50,75
);
commit;
SQL
pid_a=$!
sleep 0.2
psql -X -v ON_ERROR_STOP=1 -At >"$tmpdir/b.log" 2>"$tmpdir/b.err" <<'SQL' &
begin;
set local role service_role;
select awarded_amount from public.award_study_xp(
 '11111111-1111-4111-8111-111111111111','question',
 '22222222-2222-4222-8222-222222222222',50,75
);
commit;
SQL
pid_b=$!
wait "$pid_a" || { cat "$tmpdir/a.err"; exit 1; }
wait "$pid_b" || { cat "$tmpdir/b.err"; exit 1; }

# Both events must exist, their sum must respect the 75 XP cap,
# and the profile must reflect exactly the ledger total.
check="$(psql -X -v ON_ERROR_STOP=1 -At <<'SQL'
select
  (p.xp=75
    and p.level=2
    and p.rank_title='Explorador Lunar'
    and (select count(*) from public.xp_events e
         where e.user_id=p.id and e.kind='question')=2
    and (select coalesce(sum(e.amount),0) from public.xp_events e
         where e.user_id=p.id and e.kind='question')=75
  )::text
from public.profiles p
where p.id='11111111-1111-4111-8111-111111111111';
SQL
)"
if [[ "$check" != "true" ]]; then
  echo "Concurrent XP awards diverged: $check" >&2
  cat "$tmpdir/a.log" "$tmpdir/b.log"
  exit 1
fi
echo "Concurrent XP race test passed (exactly 75 XP across both awards)."
