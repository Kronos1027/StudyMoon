/**
 * Sincroniza o banco com a nova vinculação de demos por SUBTÓPICO
 * (PASSO 2 da auditoria; antes: topics.demo_id espelhado nas questões).
 *
 * 1. topics.demo_id ← content/curriculo.json (demo da LIÇÃO do tópico)
 * 2. questions.subtopic / demo_params / numeric_expr ← seeds (match pelo
 *    enunciado exato — idempotente)
 * 3. questions.demo_id ← resolvido do SUBTÓPICO pelo catálogo em código
 *    (src/lib/demos/subtopics.ts). Questão sem subtópico ⇒ demo_id null
 *    (regra: nada é melhor que demo errada).
 *
 * Idempotente. Rodar: bash scripts/run-db-cmd.sh scripts/sync-demo-bindings.ts
 * (no GitHub Actions, via .github/workflows/sync-demo-bindings.yml)
 */
import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { resolveDemoForQuestion } from "@/lib/demos/subtopics";

interface CurriculoTopic {
  slug: string;
  demo_id: string | null;
}
interface SeedQuestion {
  topic_slug: string;
  statement_md: string;
  subtopic?: string | null;
  demo_params?: Record<string, string | number | boolean> | null;
  demo_id?: string | null;
  numeric_check?: { expression: string; result: string } | null;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = postgres(databaseUrl, { ssl: "prefer", max: 1 });

  const contentDir = path.join(process.cwd(), "content");

  // ---------- curriculum ----------
  const raw = JSON.parse(
    await readFile(path.join(contentDir, "curriculo.json"), "utf8"),
  ) as {
    areas: Array<{ disciplines: Array<{ topics: CurriculoTopic[] }> }>;
  };
  const topics = raw.areas.flatMap((a) => a.disciplines.flatMap((d) => d.topics));

  // ---------- seeds ----------
  const seeds: SeedQuestion[] = [];
  const seedsDir = path.join(contentDir, "seeds");
  for (const file of await readdir(seedsDir)) {
    if (file.startsWith("questions-") && file.endsWith(".json")) {
      const parsed = JSON.parse(
        await readFile(path.join(seedsDir, file), "utf8"),
      ) as { questions: SeedQuestion[] };
      seeds.push(...parsed.questions);
    }
  }

  // ---------- 1. topics.demo_id ← curriculo (demo da lição) ----------
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
  console.log(`topics: ${topicsChanged} linha(s) atualizada(s) (curriculo tem ${topics.length} tópicos)`);

  // ---------- 2. questions.subtopic/demo_params/numeric_expr ← seeds ----------
  let subtopicBackfilled = 0;
  for (const seed of seeds) {
    const rows = await sql`
      update questions set
        subtopic = ${seed.subtopic ?? null},
        demo_params = ${seed.demo_params ? sql.json(seed.demo_params) : null},
        numeric_expr = ${seed.numeric_check ? sql.json(seed.numeric_check) : null},
        updated_at = now()
      where statement_md = ${seed.statement_md}
        and (
          subtopic is distinct from ${seed.subtopic ?? null}
          or demo_params is distinct from ${seed.demo_params ? sql.json(seed.demo_params) : null}
          or numeric_expr is distinct from ${seed.numeric_check ? sql.json(seed.numeric_check) : null}
        )
      returning id
    `;
    if (rows.length > 0) {
      subtopicBackfilled += rows.length;
    }
  }
  console.log(`questions: ${subtopicBackfilled} linha(s) com subtópico/params/expr atualizados (match por enunciado das seeds)`);

  // ---------- 3. questions.demo_id ← resolvido do subtópico ----------
  const dbQuestions = await sql`
    select q.id, q.subtopic, t.slug as topic_slug
    from questions q join topics t on q.topic_id = t.id
  `;
  let demoMirrored = 0;
  for (const q of dbQuestions) {
    const resolution = resolveDemoForQuestion(q.topic_slug, q.subtopic);
    const demoId = resolution?.demoId ?? null;
    const rows = await sql`
      update questions set demo_id = ${demoId}, updated_at = now()
      where id = ${q.id} and demo_id is distinct from ${demoId}
      returning id
    `;
    demoMirrored += rows.length;
  }
  console.log(`questions: ${demoMirrored} espelho(s) de demo_id re-resolvido(s) pelo subtópico`);

  // ---------- resumo ----------
  const rows = await sql`
    select t.slug, t.demo_id, count(q.id)::int as questions
    from topics t left join questions q on q.topic_id = t.id
    where t.demo_id is not null
    group by t.slug, t.demo_id
    order by t.slug
  `;
  console.log("\nTópicos com demo de lição no banco:");
  for (const row of rows) {
    console.log(`  ${row.slug.padEnd(26)} ${String(row.demo_id).padEnd(18)} ${row.questions} questões`);
  }

  const bySubtopic = await sql`
    select q.subtopic, t.slug as topic_slug, q.demo_id, count(*)::int as questions
    from questions q join topics t on q.topic_id = t.id
    group by q.subtopic, t.slug, q.demo_id
    order by t.slug, q.subtopic
  `;
  console.log("\nQuestões por subtópico (demo exibida):");
  for (const row of bySubtopic) {
    const label = row.subtopic ? `${row.topic_slug}.${row.subtopic}` : `${row.topic_slug} (sem subtópico)`;
    console.log(`  ${label.padEnd(46)} demo=${String(row.demo_id).padEnd(16)} ${row.questions} questão(ões)`);
  }

  // Conferência final: nenhuma questão pode ter demo_id diferente do que o
  // catálogo resolve para o subtópico dela.
  const mismatches = await sql`
    select q.id, q.subtopic, q.demo_id, t.slug as topic_slug
    from questions q join topics t on q.topic_id = t.id
  `;
  const broken = mismatches.filter((q) => {
    const resolution = resolveDemoForQuestion(q.topic_slug, q.subtopic);
    return (resolution?.demoId ?? null) !== q.demo_id;
  });
  if (broken.length > 0) {
    console.error(`AVISO: ${broken.length} questão(ões) divergem do catálogo:`);
    for (const b of broken) {
      console.error(`  ${b.id} (${b.topic_slug}.${b.subtopic}): demo_id=${b.demo_id}`);
    }
    process.exitCode = 1;
  } else {
    console.log("\nOK: demo_id de cada questão agora vem do seu subtópico (catálogo em código).");
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
