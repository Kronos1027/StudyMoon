/**
 * Applies pending SQL migrations from supabase/migrations to the project
 * database (DATABASE_URL). Tracks applied files in the _migrations table.
 * Run: pnpm db:migrate
 */
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Copy it from Supabase → Project Settings → Database → Connection string (URI).",
  );
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = postgres(databaseUrl, {
    ssl: "prefer",
    max: 1,
    idle_timeout: 5,
    connect_timeout: 30,
  });

  await sql`create schema if not exists _studymoon`;
  await sql`create table if not exists _studymoon.migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    (
      await sql<{ name: string }[]>`select name from _studymoon.migrations`
    ).map((r) => r.name),
  );

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("No pending migrations. Database is up to date.");
  }

  for (const file of pending) {
    const content = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    process.stdout.write(`applying ${file} ... `);
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`insert into _studymoon.migrations (name) values (${file})`;
      });
      console.log("ok");
    } catch (err) {
      console.error("\nFAILED:", file);
      console.error(err);
      process.exit(1);
    }
  }

  await sql.end();
  console.log(`Done. ${pending.length} migration(s) applied.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
