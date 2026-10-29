#!/usr/bin/env bash
# Race two independent replay workers for ONE pending attempt. Only one may
# commit the card; the other must observe the completed outbox event.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing FSRS outbox race outside disposable local database" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users (id,email,raw_user_meta_data)
values ('77777777-7777-4777-8777-777777777777',
        'outbox-race@studymoon.test','{"apelido":"FSRS Race"}');
set role service_role;
insert into public.attempts
  (id,user_id,question_id,selected,correct,time_ms,mode)
values ('88888888-8888-4888-8888-888888888888',
        '77777777-7777-4777-8777-777777777777',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true,20000,'practice');
SQL

for label in a b; do
  psql -X -qAt -v ON_ERROR_STOP=1 >"$tmpdir/$label.out" 2>"$tmpdir/$label.err" <<'SQL' &
set role service_role;
select public.complete_srs_replay(
  '88888888-8888-4888-8888-888888888888',0,
  (select attempted_at+interval '1 day' from public.srs_replay_queue
   where attempt_id='88888888-8888-4888-8888-888888888888'),
  1.5,5,0,1,1,0,0,'learning',
  (select attempted_at from public.srs_replay_queue
   where attempt_id='88888888-8888-4888-8888-888888888888')
);
SQL
  if [[ "$label" == "a" ]]; then pid_a=$!; else pid_b=$!; fi
done

wait "$pid_a" || { cat "$tmpdir/a.err" >&2; exit 1; }
wait "$pid_b" || { cat "$tmpdir/b.err" >&2; exit 1; }
a="$(tr -d '[:space:]' <"$tmpdir/a.out")"
b="$(tr -d '[:space:]' <"$tmpdir/b.out")"
if [[ "$a$b" != "tf" && "$a$b" != "ft" ]]; then
  echo "Expected one replay win, one no-op; A=$a B=$b" >&2
  exit 1
fi

verified="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select (
  exists (
    select 1 from public.srs_cards c
     where c.user_id='77777777-7777-4777-8777-777777777777'
       and c.question_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
       and c.revision=1 and c.reps=1
  ) and exists (
    select 1 from public.srs_replay_queue q
     where q.attempt_id='88888888-8888-4888-8888-888888888888'
       and q.processed_at is not null
  )
)::text;
SQL
)"
if [[ "$verified" != "true" ]]; then
  echo "Queue/card diverged under concurrent replays: $verified" >&2
  exit 1
fi

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
delete from auth.users where id='77777777-7777-4777-8777-777777777777';
SQL
echo "FSRS outbox concurrency passed (one replay commit, one safe no-op)."
