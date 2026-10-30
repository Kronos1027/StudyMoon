-- Regression test for the invalid srs_cards UPDATED_AT trigger.
-- Runs only on ephemeral PostgreSQL fixture. No production writes.
begin;

insert into public.srs_cards
  (user_id, question_id, due, last_update, reps)
values (
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  clock_timestamp() - interval '1 day',
  clock_timestamp() - interval '1 day', 0
);

-- Previously crashed: "record new has no field updated_at".
update public.srs_cards
   set due = clock_timestamp() + interval '2 days',
       last_update = clock_timestamp(),
       reps = reps + 1
 where user_id = '11111111-1111-4111-8111-111111111111'
   and question_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

do $check$
begin
  if not exists (
    select 1 from public.srs_cards
     where user_id = '11111111-1111-4111-8111-111111111111'
       and question_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
       and reps = 1
       and due > now() + interval '1 day'
       and last_update > now() - interval '1 minute'
  ) then
    raise exception 'FSRS rescheduling did not persist';
  end if;

  if exists (
    select 1 from pg_trigger t
     where t.tgrelid = 'public.srs_cards'::regclass
       and t.tgname = 'trg_srs_cards_updated_at' and not t.tgisinternal
  ) then
    raise exception 'Broken FSRS updated_at trigger still installed';
  end if;
end;
$check$;
rollback;
select 'FSRS card rescheduling regression passed' as result;
