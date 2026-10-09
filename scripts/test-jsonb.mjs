// Isola o bug: o mesmo padrao de insert do seed.ts sob bun vs node
import postgres from "postgres";

const alts = [
  { key: "A", text: "primeira" },
  { key: "B", text: "segunda" },
];

const sql = postgres(process.env.DATABASE_URL, { ssl: "prefer", max: 1 });

await sql`create table if not exists _test_jsonb (id int primary key, v jsonb)`;
await sql`truncate _test_jsonb`;

// padrao exato do seed.ts
await sql`
  insert into _test_jsonb (id, v)
  values (1, ${JSON.stringify(alts)}::jsonb)
`;

// variante sem stringify (deixa o driver serializar)
await sql`
  insert into _test_jsonb (id, v)
  values (2, ${alts})
`;

// variante sql.json() (forma canonica tipada)
await sql`
  insert into _test_jsonb (id, v)
  values (3, ${sql.json(alts)})
`;

const rows = await sql`select id, v, jsonb_typeof(v) as tipo from _test_jsonb order by id`;
for (const r of rows) {
  console.log(
    `id=${r.id} jsonb_typeof=${r.tipo} éArray=${Array.isArray(r.v)} valor=${JSON.stringify(r.v).slice(0, 90)}`,
  );
}

await sql`drop table _test_jsonb`;
await sql.end();
console.log("runtime:", typeof Bun !== "undefined" ? "bun" : "node");
