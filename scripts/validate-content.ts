/**
 * Deterministic content validation (layers a and c of the 4-layer process,
 * doc section 8): format (Zod) + numeric verification (mathjs).
 * Works locally against content/seeds/*.json — no database needed.
 * AI layers (b: blind solve; d: quality) run in the nightly pipeline.
 * Run: pnpm content:validate
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { create, all } from "mathjs";
import {
  questionBatchSchema,
  validateQuestionFormat,
} from "@/lib/content/schemas";
import { resolveDemoForQuestion, getSubtopic } from "@/lib/demos/subtopics";

const math = create(all, {});
const evaluate = math.evaluate as (expr: string) => unknown;

function mathResult(expr: string): number | null {
  try {
    const value = evaluate(expr);
    if (typeof value === "number") return value;
    if (value && typeof value === "object" && "value" in (value as object)) {
      const inner = (value as { value: unknown }).value;
      if (typeof inner === "number") return inner;
    }
  } catch {
    return null;
  }
  return null;
}

function numbersClose(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

async function main() {
  const seedsDir = path.join(process.cwd(), "content", "seeds");
  const files = (await readdir(seedsDir)).filter(
    (f) => f.startsWith("questions-") && f.endsWith(".json"),
  );

  let total = 0;
  let valid = 0;
  const problems: string[] = [];

  for (const file of files) {
    const parsed = questionBatchSchema.safeParse(
      JSON.parse(await readFile(path.join(seedsDir, file), "utf8")),
    );
    if (!parsed.success) {
      problems.push(
        ...parsed.error.issues.map(
          (i) => `${file} ${i.path.join(".")}: ${i.message}`,
        ),
      );
      continue;
    }

    for (const [index, q] of parsed.data.questions.entries()) {
      total += 1;
      const label = `${file}[${index}] ${q.topic_slug}`;

      // Layer a — format
      const format = validateQuestionFormat(q);
      if (!format.ok) {
        problems.push(`${label} FORMATO: ${format.errors.join("; ")}`);
        continue;
      }

      // Layer c — deterministic numeric check (when present)
      if (q.numeric_check) {
        const { expression, result } = q.numeric_check;
        const computed = mathResult(expression);
        const expected = mathResult(result);
        if (computed === null || expected === null) {
          problems.push(`${label} MATHJS: falha ao avaliar '${expression}' ou '${result}'`);
        } else if (!numbersClose(computed, expected)) {
          problems.push(
            `${label} NUMÉRICO: '${expression}' = ${computed}, esperado ${expected}`,
          );
          continue;
        }
      }

      // Layer c2 — subtopic binding (demo só pode vir do subtópico da questão)
      if (q.subtopic) {
        if (!getSubtopic(q.topic_slug, q.subtopic)) {
          problems.push(
            `${label} SUBTÓPICO: "${q.subtopic}" não existe no tópico ${q.topic_slug} (catálogo src/lib/demos/subtopics.ts)`,
          );
          continue;
        }
        const resolution = resolveDemoForQuestion(q.topic_slug, q.subtopic, q.demo_params ?? null);
        if ((q.demo_id ?? null) !== (resolution?.demoId ?? null)) {
          problems.push(
            `${label} DEMO: demo_id "${q.demo_id}" != resolvido do subtópico "${resolution?.demoId ?? null}"`,
          );
          continue;
        }
      } else if (q.demo_id) {
        problems.push(`${label} DEMO: questão sem subtópico não pode ter demo`);
        continue;
      }

      // Layer d (deterministic subset) — quality guards
      const altLens = q.alternatives.map((a) => a.text.length);
      if (Math.max(...altLens) / Math.min(...altLens) > 6) {
        problems.push(`${label} QUALIDADE: alternativa com tamanho muito desproporcional`);
        continue;
      }
      const stem = q.statement_md.toLowerCase();
      if (stem.includes("resposta correta é") || stem.includes("gabarito:")) {
        problems.push(`${label} QUALIDADE: enunciado vazando a resposta`);
        continue;
      }

      valid += 1;
    }
  }

  console.log(`Questões: ${valid}/${total} passaram na validação determinística.`);
  if (problems.length) {
    console.error("\nProblemas encontrados:");
    for (const p of problems) console.error(` - ${p}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
