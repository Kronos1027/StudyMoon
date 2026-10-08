/**
 * One-command setup (doc section 18): migrates the database, imports the
 * curriculum, validates content and videos, and seeds everything.
 * Run: pnpm setup
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

function run(label: string, script: string) {
  console.log(`\n=== ${label} ===`);
  try {
    execFileSync("npx", ["tsx", path.join("scripts", script)], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch {
    console.error(`\nFalha em: ${label}. Corrija o problema acima e rode pnpm setup de novo.`);
    process.exit(1);
  }
}

async function main() {
  console.log("StudyMoon — setup do banco de dados e conteúdo\n");

  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL não configurada. Copie a Connection string (URI) em\n" +
        "Supabase -> Project Settings -> Database e cole no .env.local (docs/SETUP.md).",
    );
    process.exit(1);
  }

  run("Migrações (tabelas + RLS)", "migrate.ts");
  run("Validação determinística do conteúdo", "validate-content.ts");
  run("Importação do currículo, lições, medalhas e questões", "seed.ts");
  run("Validação de vídeos (oEmbed)", "check-videos.ts");

  console.log(
    "\nSetup concluído. Rode `pnpm db:test-rls` para verificar as políticas de segurança.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
