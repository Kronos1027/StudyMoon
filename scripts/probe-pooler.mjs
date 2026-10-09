// Sonda combinacoes de pooler Supabase (aws-0/aws-1 x regioes) para achar o host certo
import postgres from "postgres";

const REF = "bxqliradehlbrmhqqafd";
const PASS = "Dg8:uiF5mri7-wb"; // o driver codifica automaticamente

const PREFIXES = ["aws-0", "aws-1"];
const REGIONS = [
  "us-west-2",
  "us-west-1",
  "us-east-1",
  "us-east-2",
  "sa-east-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
];

for (const prefix of PREFIXES) {
  for (const region of REGIONS) {
    const host = `${prefix}-${region}.pooler.supabase.com`;
    const sql = postgres({
      host,
      port: 5432,
      username: `postgres.${REF}`,
      password: PASS,
      database: "postgres",
      ssl: "prefer",
      max: 1,
      connect_timeout: 10,
      idle_timeout: 2,
    });
    try {
      const [r] = await sql`select current_database() as db, version() as v`;
      console.log(`✅✅✅ ACHOU: ${host} — db=${r.db} | ${r.v.split(",")[0]}`);
      await sql.end({ timeout: 3 });
      process.exit(0);
    } catch (err) {
      const msg = String(err.message).slice(0, 90);
      const interessante = !/not found/i.test(msg); // "tenant not found" = regiao errada (normal)
      console.log(`${interessante ? "‼️ " : "    "}${host}: ${msg}`);
    } finally {
      try { await sql.end({ timeout: 2 }); } catch {}
    }
  }
}
console.log("Nenhum pooler autenticou.");
process.exit(1);
