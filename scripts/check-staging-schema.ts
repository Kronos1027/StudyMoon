/**
 * Staging-only, read-only schema inspection. Uses the database URI after
 * validating that it is NOT the StudyMoon production project.
 *
 * The test user creator (test-rls.ts) calls this FIRST; a missing or
 * inconsistent schema aborts before any temporary Auth identities exist.
 */
import postgres from "postgres";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  assertSafeStagingDatabaseTarget,
  getStagingGuardInput,
} from "./staging-guard";
import { requireReadyMigrationHistory } from "./staging-schema-check";

export async function assertStagingSchemaReady(): Promise<void> {
  const input = getStagingGuardInput();
  assertSafeStagingDatabaseTarget(input);
  const db = postgres(input.databaseUrl!, {
    ssl: "prefer",
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
  });
  try {
    const expected = (await readdir(join(process.cwd(), "supabase/migrations")))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    const history = await db<{ name: string }[]>`
      select name from _studymoon.migrations order by name
    `;
    requireReadyMigrationHistory(expected, history.map(({ name }) => name));

    const unprotected = await db<{ tablename: string }[]>`
      select tablename
      from pg_tables
      where schemaname='public' and rowsecurity=false
      order by tablename
    `;
    if (unprotected.length) {
      throw new Error(
        "Staging schema has public tables with RLS disabled: " +
        unprotected.map(({ tablename }) => tablename).join(", "),
      );
    }
    // Verify ACTUAL role permissions rather than relying on a REST request
    // with a deliberately invalid body. Such a request could fail on a FK
    // or constraint while the client still has unsafe INSERT privileges.
    const [permissions] = await db<{
      attempts_insert: boolean;
      xp_insert: boolean;
      replay_read: boolean;
      tickets_read: boolean;
      review_rpc: boolean;
      xp_rpc: boolean;
      anon_attempts_insert: boolean;
      anon_xp_insert: boolean;
      anon_replay_read: boolean;
      anon_tickets_read: boolean;
      anon_review_rpc: boolean;
      anon_xp_rpc: boolean;
      profile_xp_update: boolean;
      profile_level_update: boolean;
      profile_rank_update: boolean;
    }[]>`
      select
        has_any_column_privilege('authenticated', 'public.attempts', 'INSERT')
          as attempts_insert,
        has_any_column_privilege('authenticated', 'public.xp_events', 'INSERT')
          as xp_insert,
        has_any_column_privilege('authenticated', 'public.srs_replay_queue', 'SELECT')
          as replay_read,
        has_any_column_privilege('authenticated', 'public.practice_question_serves', 'SELECT')
          as tickets_read,
        has_function_privilege(
          'authenticated',
          'public.get_ready_srs_replay(uuid,uuid,integer)',
          'EXECUTE'
        ) as review_rpc,
        has_function_privilege(
          'authenticated',
          'public.award_study_xp(uuid,public.xp_kind,uuid,integer,integer)',
          'EXECUTE'
        ) as xp_rpc,
        has_any_column_privilege('anon', 'public.attempts', 'INSERT')
          as anon_attempts_insert,
        has_any_column_privilege('anon', 'public.xp_events', 'INSERT')
          as anon_xp_insert,
        has_any_column_privilege('anon', 'public.srs_replay_queue', 'SELECT')
          as anon_replay_read,
        has_any_column_privilege('anon', 'public.practice_question_serves', 'SELECT')
          as anon_tickets_read,
        has_function_privilege(
          'anon',
          'public.get_ready_srs_replay(uuid,uuid,integer)',
          'EXECUTE'
        ) as anon_review_rpc,
        has_function_privilege(
          'anon',
          'public.award_study_xp(uuid,public.xp_kind,uuid,integer,integer)',
          'EXECUTE'
        ) as anon_xp_rpc,
        has_column_privilege('authenticated', 'public.profiles', 'xp', 'UPDATE')
          as profile_xp_update,
        has_column_privilege('authenticated', 'public.profiles', 'level', 'UPDATE')
          as profile_level_update,
        has_column_privilege('authenticated', 'public.profiles', 'rank_title', 'UPDATE')
          as profile_rank_update
    `;
    if (!permissions) {
      throw new Error("Staging schema permission audit returned no data.");
    }
    const unwantedGrants = Object.entries(permissions)
      .filter(([, granted]) => granted === true)
      .map(([name]) => name);
    if (unwantedGrants.length > 0) {
      throw new Error(
        "Staging schema grants unsafe privileges: " + unwantedGrants.join(", "),
      );
    }

    console.log(
      `Staging schema ready: ${expected.length} migrations, all public tables have RLS and internal roles are restricted.`,
    );
  } finally {
    await db.end();
  }
}

if (process.argv[1] && /check-staging-schema\.[cm]?ts$/.test(process.argv[1])) {
  assertStagingSchemaReady().catch((err) => {
    console.error(err instanceof Error ? err.message : "Staging schema unreadable");
    process.exitCode = 1;
  });
}
