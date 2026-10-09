// Inventario do banco: tabelas public + contagens + politicas RLS
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "prefer", max: 1 });

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name
`;

let totalRows = 0;
for (const { table_name } of tables) {
  const [{ n }] = await sql.unsafe(`select count(*)::int as n from "${table_name}"`);
  totalRows += n;
  if (n > 0) console.log(`${table_name.padEnd(28)} ${n}`);
}
console.log("-".repeat(36));
console.log(`tabelas: ${tables.length} | tabelas com dados: ${tables.filter(t => t).length} | total de linhas: ${totalRows}`);

const [{ n: policies }] = await sql`
  select count(*)::int as n from pg_policies where schemaname = 'public'
`;
const [{ n: rlsOn }] = await sql`
  select count(*)::int as n from pg_tables
  where schemaname = 'public' and rowsecurity = true
`;
console.log(`politicas RLS: ${policies} | tabelas com RLS ativo: ${rlsOn}/${tables.length}`);

// amostra de questao (sem answer_key — validar grants)
const q = await sql`
  select id, topic_id, difficulty, substr(statement_md, 1, 60) as stmt
  from questions order by id limit 2
`;
for (const r of q) console.log(`questao ${r.id} (topic ${r.topic_id}, dif ${r.difficulty}): ${r.stmt}...`);

await sql.end();
