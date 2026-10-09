// Teste rapido de conexao com o Postgres do Supabase (via session pooler)
import postgres from "postgres";

// env carregado via: node --env-file=.env scripts/test-db-connection.mjs
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}
console.log(
  "Host:",
  new URL(url.replace("postgresql://", "https://")).host,
  "| user:",
  decodeURIComponent(new URL(url.replace("postgresql://", "https://")).username),
);

const sql = postgres(url, {
  ssl: "prefer",
  max: 1,
  idle_timeout: 5,
  connect_timeout: 20,
});

try {
  const [v] = await sql`select version() as v`;
  console.log("✅ Conectado:", v.v.split(",")[0]);

  const [{ now }] = await sql`select now() as now`;
  console.log("   Horario do banco:", now);

  const exts = await sql`select extname from pg_extension order by 1`;
  console.log("   Extensoes:", exts.map((e) => e.extname).join(", "));

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by 1
  `;
  console.log(
    "   Tabelas em public:",
    tables.length ? tables.map((t) => t.table_name).join(", ") : "(vazio — esperado antes das migracoes)",
  );
  process.exit(0);
} catch (err) {
  console.error("❌ Falha na conexao:", err.message);
  process.exit(1);
}
