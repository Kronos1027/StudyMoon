#!/usr/bin/env bash
# Race two independent service workers finalizing ONE essay; precisely one
# must commit feedback and status. Safe only for disposable local PostgreSQL.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing essay race test outside ephemeral local PostgreSQL" >&2
  exit 1
fi
: "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
update public.essays set status='correcting'
where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
SQL

for letter in a b; do
  psql -X -qAt -v ON_ERROR_STOP=1 >"$temp_dir/$letter.out" 2>"$temp_dir/$letter.err" <<'SQL' &
set role service_role;
select count(*) from public.finalize_essay_correction(
  '11111111-1111-4111-8111-111111111111',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  800,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null,'ci-model'
);
SQL
  if [[ "$letter" == "a" ]]; then pid_a=$!; else pid_b=$!; fi
done
wait "$pid_a" || { cat "$temp_dir/a.err" >&2; exit 1; }
wait "$pid_b" || { cat "$temp_dir/b.err" >&2; exit 1; }

a="$(tr -d '[:space:]' < "$temp_dir/a.out")"
b="$(tr -d '[:space:]' < "$temp_dir/b.out")"
if [[ "$a$b" != "10" && "$a$b" != "01" ]]; then
  echo "Expected exactly one successful essay finalization; A=$a B=$b" >&2
  exit 1
fi

result="$(psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
select (
 (select status='corrected' from public.essays
  where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
 and (select count(*)=1 from public.essay_feedback
      where essay_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
)::text;
SQL
)"
if [[ "$result" != "true" ]]; then
  echo "Concurrent essay finalization left an inconsistent grade: $result" >&2
  exit 1
fi

psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
delete from public.essay_feedback
where essay_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
update public.essays set status='draft'
where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
SQL
echo "Concurrent essay correction passed (one commit, one safe no-op)."
