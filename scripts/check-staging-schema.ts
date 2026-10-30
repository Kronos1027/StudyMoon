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
    console.log(
      `Staging schema ready: ${expected.length} migrations, all public tables have RLS.`,
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
