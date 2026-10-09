/**
 * Inspects AI-generated questions (status/source) in the real DB.
 * Run: bash scripts/run-db-cmd.sh scripts/inspect-ai-questions.ts
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

const rows = await sql`
  select q.id, t.slug as topic, q.difficulty, q.status,
         left(q.statement_md, 110) as statement,
         (select count(*) from questions q2 where q2.topic_id = q.topic_id) as topic_total
  from questions q
  join topics t on t.id = q.topic_id
  where q.created_at > now() - interval '1 hour'
  order by q.created_at desc
`;

console.log(`Questões criadas na última hora: ${rows.length}`);
for (const r of rows) {
  console.log(`\n[${r.status}] ${r.topic} (dif ${r.difficulty}) — total no tópico: ${r.topic_total}`);
  console.log(`  ${r.statement}...`);
}

// full body of the first one for a quality eyeball
if (rows.length > 0) {
  const full = await sql`
    select statement_md, context_md, alternatives, explanation_md, answer_key
    from questions where id = ${rows[0].id}
  `;
  const q = full[0];
  console.log("\n=== Amostra completa (primeira) ===");
  console.log("CONTEXTO:", (q.context_md ?? "—").slice(0, 180));
  console.log("ENUNCIADO:", q.statement_md.slice(0, 220));
  console.log("ALTERNATIVAS:", JSON.stringify(q.alternatives).slice(0, 400));
  console.log("GABARITO:", q.answer_key);
  console.log("EXPLICAÇÃO:", (q.explanation_md ?? "—").slice(0, 260));
}

await sql.end();
