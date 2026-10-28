#!/usr/bin/env bash
# Exercises StudyMoon migrations on an EPHEMERAL PostgreSQL CI container.
# NEVER point PGHOST/PGDATABASE at an existing/production database.
set -euo pipefail
test -n "$PGHOST" && test -n "$PGDATABASE" && test -n "$PGUSER" && test -n "$PGPASSWORD"
if [[ "$PGHOST" != "localhost" && "$PGHOST" != "127.0.0.1" ]]; then
  echo "Refusing to run integration fixture against non-local PostgreSQL" >&2
  exit 1
fi
psql_test() { psql -X -v ON_ERROR_STOP=1 "$@"; }

echo "==> Mocking Supabase auth roles on disposable database"
psql_test <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key, email text not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
SQL

for file in 0001_schema.sql 0002_functions_triggers.sql 0003_rls.sql; do
  echo "==> $file"
  psql_test -f "supabase/migrations/$file" >/dev/null
done

# Supabase grants table privileges automatically when exposing public schema.
# Mimic that baseline before the app's explicit 0004 column restrictions.
psql_test <<'SQL'
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
SQL
for file in 0004_grants.sql 0005_indexes.sql 0006_question_subtopic.sql \
            0007_security_and_indexes.sql 0008_optimize_rls.sql \
            0009_atomic_xp_awards.sql 0010_tutor_daily_quota.sql \
            0011_practice_ticket_integrity.sql; do
  echo "==> $file"
  psql_test -f "supabase/migrations/$file" >/dev/null
done

echo "==> Testing registration triggers with two isolated students"
psql_test <<'SQL'
insert into auth.users (id,email,raw_user_meta_data) values
('11111111-1111-4111-8111-111111111111','a@studymoon.test','{"apelido":"Aluno A"}'),
('22222222-2222-4222-8222-222222222222','b@studymoon.test','{"apelido":"Aluno B"}');
insert into public.areas (id,slug,name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','matematica','Matemática');
insert into public.topics (id,area_id,slug,name)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','algebra','Álgebra');
insert into public.questions
  (id,topic_id,statement_md,alternatives,answer_key,explanation_md,status,subtopic,demo_params,numeric_expr)
values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Quanto é 2+2?',
 '[{"key":"A","text":"3"},{"key":"B","text":"4"}]','B','2+2=4',
 'validated','algebra','{"variant":"basic"}','{"expression":"2+2","result":"4"}'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Não publicada',
 '[{"key":"A","text":"teste"}]','A','Não divulgar',
 'draft',null,null,null);
insert into public.attempts (user_id,question_id,selected,correct) values
('11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc','B',true),
('22222222-2222-4222-8222-222222222222','cccccccc-cccc-4ccc-8ccc-cccccccccccc','A',false);
insert into public.essays (id,user_id,prompt_title) values
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','Tema A'),
('ffffffff-ffff-4fff-8fff-ffffffffffff','22222222-2222-4222-8222-222222222222','Tema B');
do $$
begin
 if (select count(*) from public.profiles) <> 2 or
    (select count(*) from public.streaks) <> 2
 then raise exception 'Signup triggers did not create profiles and streaks'; end if;
end $$;
SQL

echo "==> Verifying per-user isolation, answer-key protection, demo metadata"
psql_test <<'SQL'
begin;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
do $$
begin
 if (select count(*) from public.profiles) <> 1 or
    not exists(select 1 from public.profiles where apelido='Aluno A')
 then raise exception 'Profile isolation failed for A'; end if;
 if (select count(*) from public.streaks) <> 1
 then raise exception 'Streak isolation failed for A'; end if;
 if (select count(*) from public.attempts) <> 1 or
    not exists(select 1 from public.attempts where correct)
 then raise exception 'Attempt isolation failed for A'; end if;
 if (select count(*) from public.essays) <> 1 or
    not exists(select 1 from public.essays where prompt_title='Tema A')
 then raise exception 'Essay isolation failed for A'; end if;
 if (select count(*) from public.questions) <> 1 or
    not exists(select 1 from public.questions
      where subtopic='algebra' and demo_params->>'variant'='basic')
 then raise exception 'Published questions/demo column grants failed'; end if;
 if has_column_privilege(current_user,'public.questions','answer_key','select') or
    has_column_privilege(current_user,'public.questions','explanation_md','select') or
    has_column_privilege(current_user,'public.questions','numeric_expr','select')
 then raise exception 'Hidden question answer leaked'; end if;
 if has_column_privilege(current_user,'public.profiles','xp','update') or
    has_table_privilege(current_user,'public.attempts','insert') or
    has_table_privilege(current_user,'public.xp_events','insert')
 then raise exception 'Student may tamper with XP or attempts'; end if;
 if has_function_privilege(current_user,'public.handle_new_user()','execute') or
    has_function_privilege(current_user,'public.handle_new_profile()','execute')
 then raise exception 'Students may call privileged trigger functions'; end if;
end $$;
-- RLS is not only read filtering: a user cannot edit or insert using the
-- identifier of a different student even when the column itself is writable.
do $$
declare
  changed integer;
  denied boolean := false;
begin
  update public.profiles set apelido='Conta sequestrada'
    where id='22222222-2222-4222-8222-222222222222';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Cross-account profile UPDATE succeeded'; end if;

  update public.essays set content_md='Texto substituído'
    where id='ffffffff-ffff-4fff-8fff-ffffffffffff';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Cross-account essay UPDATE succeeded'; end if;

  begin
    insert into public.essays (user_id, prompt_title)
    values ('22222222-2222-4222-8222-222222222222', 'Falsificação');
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Cross-account essay INSERT succeeded'; end if;
end $$;
-- Editable profile columns must remain writable by their owner.
update public.profiles set apelido='Aluno A Editado'
where id='11111111-1111-4111-8111-111111111111';
rollback;
SQL

echo "==> Verifying the reverse user direction"
psql_test <<'SQL'
begin;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
set local role authenticated;
do $$
begin
 if (select count(*) from public.profiles) <> 1 or
    not exists(select 1 from public.profiles where apelido='Aluno B')
 then raise exception 'Profile isolation failed for B'; end if;
 if (select count(*) from public.attempts) <> 1 or
    not exists(select 1 from public.attempts where not correct)
 then raise exception 'Attempt isolation failed for B'; end if;
 if (select count(*) from public.essays) <> 1 or
    not exists(select 1 from public.essays where prompt_title='Tema B')
 then raise exception 'Essay isolation failed for B'; end if;
end $$;
rollback;
SQL

echo "==> Verifying anonymous cannot read private data or call privileged triggers"
psql_test <<'SQL'
begin;
set local role anon;
do $$
begin
 if (select count(*) from public.profiles) <> 0 or
    (select count(*) from public.attempts) <> 0 or
    (select count(*) from public.questions) <> 0 or
    (select count(*) from public.essays) <> 0
 then raise exception 'Anonymous role can read protected rows'; end if;
 if has_function_privilege(current_user,'public.handle_new_user()','execute') or
    has_function_privilege(current_user,'public.handle_new_profile()','execute')
 then raise exception 'Anonymous role can call privileged trigger'; end if;
end $$;
rollback;
SQL
echo "==> Verifying atomic, idempotent XP awards on the test database"
psql_test -f "tests/database/xp-awards.sql"
echo "==> Racing two concurrent XP awards on a single student"
bash tests/database/xp-concurrency.sh
echo "==> Checking tutor daily quota, security and retry refunds"
psql_test -f "tests/database/tutor-quota.sql"
echo "==> Racing competing tutor requests"
bash tests/database/tutor-concurrency.sh
echo "==> Verifying server-timed and single-use practice submissions"
psql_test -f "tests/database/practice-ticket.sql"
echo "PostgreSQL migration, RLS, practice, XP and tutor quota tests passed."
