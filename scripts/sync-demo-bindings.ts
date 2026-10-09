/**
 * Synchronizes demo ↔ topic bindings in the database with the curriculum
 * (bugfix: demos bound to the AREA showed wrong simulators — e.g. Punnett
 * square on a eutrophication question).
 *
 * 1. topics.demo_id  ← content/curriculo.json (source of truth, per topic)
 * 2. questions.demo_id ← its topic's demo_id (hygiene mirror; the app
 *    resolves the displayed demo from topics anyway)
 *
 * Idempotent. Run: bash scripts/run-db-cmd.sh scripts/sync-demo-bindings.ts
 */
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import path from "node:path";

interface CurriculoTopic {
  slug: string;
  demo_id: string | null;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = postgres(databaseUrl, { ssl: "prefer", max: 1 });

  const raw = JSON.parse(
    await readFile(path.join(process.cwd(), "content", "curriculo.json"), "utf8"),
  ) as {
    areas: Array<{ disciplines: Array<{ topics: CurriculoTopic[] }> }>;
  };
  const topics = raw.areas.flatMap((a) => a.disciplines.flatMap((d) => d.topics));

  // ---------- 1. topics.demo_id ← curriculo ----------
  let topicsChanged = 0;
  for (const topic of topics) {
    const rows = await sql`
      update topics set demo_id = ${topic.demo_id}
      where slug = ${topic.slug}
        and demo_id is distinct from ${topic.demo_id}
      returning slug, demo_id
    `;
    for (const row of rows) {
      topicsChanged += 1;
      console.log(`topic  ${row.slug}: demo_id → ${row.demo_id ?? "null"}`);
    }
  }
  console.log(`topics: ${topicsChanged} row(s) updated (curriculum has ${topics.length} topics)`);

  // ---------- 2. questions.demo_id ← topic's demo_id ----------
  const synced = await sql`
    update questions q
    set demo_id = t.demo_id, updated_at = now()
    from topics t
    where q.topic_id = t.id
      and q.demo_id is distinct from t.demo_id
    returning q.id
  `;
  console.log(`questions: ${synced.length} row(s) mirrored from their topic's demo_id`);

  // ---------- summary ----------
  const rows = await sql`
    select t.slug, t.demo_id, count(q.id)::int as questions
    from topics t left join questions q on q.topic_id = t.id
    where t.demo_id is not null
    group by t.slug, t.demo_id
    order by t.slug
  `;
  console.log("\nTopics com simulador no banco:");
  for (const row of rows) {
    console.log(`  ${row.slug.padEnd(26)} ${String(row.demo_id).padEnd(18)} ${row.questions} questões`);
  }

  const orphans = await sql`
    select q.id, q.demo_id, t.slug as topic_slug, t.demo_id as topic_demo
    from questions q join topics t on q.topic_id = t.id
    where q.demo_id is distinct from t.demo_id
  `;
  if (orphans.length > 0) {
    console.error(`AVISO: ${orphans.length} questão(ões) ainda divergem do tópico:`);
    for (const o of orphans) {
      console.error(`  ${o.id} (${o.topic_slug}): q=${o.demo_id} t=${o.topic_demo}`);
    }
  } else {
    console.log("\nOK: todas as questões espelham o demo_id do próprio tópico.");
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
