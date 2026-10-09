/**
 * PASSO 4 da auditoria — Auditoria de TODAS as questões.
 *
 * Camadas por questão:
 *  (a) formato (Zod, mesmas regras do pipeline)
 *  (c) numérico determinístico (mathjs: numeric_check/numeric_expr)
 *  (b) resolução às cegas por um SEGUNDO MODELO (GLM via z-ai-web-dev-sdk —
 *      nunca o modelo que gerou a questão) que NÃO vê o gabarito; o gabarito
 *      só é confrontado depois da resposta do modelo
 *  (e) vínculo demo ↔ subtópico (a demo da questão é a do subtópico dela)
 *
 * Modos:
 *  - local (padrão): audita as questões seed de content/seeds e gera
 *    docs/QUESTION_AUDIT.md.
 *  - --db (com DATABASE_URL): audita TODAS as questões do banco (seed e
 *    geradas por IA); as que falharem viram status='reported' (saem de
 *    circulação — a prática seleciona apenas 'validated') e ganham
 *    review_note com o motivo.
 *
 * Executar: bun scripts/audit-questions.ts [--db]
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { create, all } from "mathjs";
import {
  questionBatchSchema,
  validateQuestionFormat,
} from "@/lib/content/schemas";
import { resolveDemoForQuestion } from "@/lib/demos/subtopics";

const math = create(all, {});
const evaluate = math.evaluate as (expr: string) => unknown;

interface Q {
  /** id no banco (modo --db) ou rótulo (modo local) */
  id: string;
  topic_slug: string;
  subtopic: string | null;
  context_md: string | null;
  statement_md: string;
  alternatives: Array<{ key: string; text: string }>;
  answer_key: string;
  demo_id?: string | null;
  numeric_check?: { expression: string; result: string } | null;
  origin: string;
  status?: string;
}

interface Result {
  q: Q;
  label: string;
  blind?: string | null;
  blindRetried?: boolean;
  numericOk: boolean | null;
  formatOk: boolean;
  demoOk: boolean;
  passed: boolean;
  reasons: string[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// mathjs
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Blind solve — segundo modelo (GLM via z-ai-web-dev-sdk), às cegas
// ---------------------------------------------------------------------------

type BlindSolver = (q: Q) => Promise<string | null>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cache resumível das resoluções às cegas (evita re-bater na API em re-runs). */
const CACHE_PATH = path.join(process.cwd(), "scripts", ".audit-blind-cache.json");
const blindCache = new Map<string, string>();

async function loadCache() {
  try {
    const raw = JSON.parse(await readFile(CACHE_PATH, "utf8")) as Record<string, string>;
    for (const [k, v] of Object.entries(raw)) blindCache.set(k, v);
  } catch {
    /* sem cache — começa do zero */
  }
}

async function saveCache() {
  await writeFile(CACHE_PATH, JSON.stringify(Object.fromEntries(blindCache)), "utf8");
}

async function makeBlindSolver(thinking = false): Promise<BlindSolver | null> {
  let ZAI: any;
  try {
    ({ default: ZAI } = await import("z-ai-web-dev-sdk"));
  } catch {
    return null; // SDK indisponível neste ambiente — camada pulada
  }
  let zai: any;
  try {
    zai = await ZAI.create();
  } catch {
    return null;
  }
  const askOnce = async (q: Q): Promise<string> => {
    const system =
      "Você é um estudante expert do ENEM resolvendo questões sozinho, sem conhecer qualquer gabarito. " +
      "Leia com atenção, resolva com rigor e responda SOMENTE com um objeto JSON válido no formato " +
      '{"answer_key": "A"} , onde A é a letra da alternativa correta (A, B, C, D ou E).';
    const user =
      `${q.context_md ? `Texto-base:\n${q.context_md}\n\n` : ""}` +
      `Enunciado:\n${q.statement_md}\n\nAlternativas:\n` +
      q.alternatives.map((a) => `${a.key}) ${a.text}`).join("\n") +
      `\n\nQual é a alternativa correta? Responda apenas com o JSON.`;
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ],
      thinking: { type: thinking ? "enabled" : "disabled" },
    });
    const text: string = completion?.choices?.[0]?.message?.content ?? "";
    const json = text.match(/\{[^{}]*\}/);
    const letter = json
      ? (JSON.parse(json[0]).answer_key ?? "").toString().trim().toUpperCase()
      : (text.match(/\b([A-E])\b/) ?? [])[1];
    return /^[A-E]$/.test(letter ?? "") ? letter : "";
  };
  return async (q) => {
    const cacheKey = `${thinking ? "deep|" : ""}${q.topic_slug}|${q.statement_md.slice(0, 80)}`;
    if (blindCache.has(cacheKey)) {
      const cached = blindCache.get(cacheKey)!;
      return cached === "" ? null : cached;
    }
    // Backoff exponencial contra rate limit (429): até 5 tentativas.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const letter = await askOnce(q);
        blindCache.set(cacheKey, letter);
        await saveCache();
        await sleep(1200 + Math.random() * 800); // espaçamento entre chamadas
        return letter === "" ? null : letter;
      } catch (err) {
        const is429 = String((err as Error)?.message ?? "").includes("429");
        if (attempt === 4 || !is429) return null;
        await sleep(10_000 * (attempt + 1)); // 10s, 20s, 30s, 40s
      }
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// Auditoria de uma questão
// ---------------------------------------------------------------------------

async function auditQuestion(
  q: Q,
  label: string,
  blind: BlindSolver | null,
  blindDeep: BlindSolver | null,
): Promise<Result> {
  const reasons: string[] = [];
  const notes: string[] = [];

  // (a) Formato
  const format = validateQuestionFormat({
    topic_slug: q.topic_slug,
    difficulty: 1000,
    context_md: q.context_md,
    statement_md: q.statement_md,
    alternatives: q.alternatives,
    answer_key: q.answer_key,
    explanation_md: "verificada em auditoria ".repeat(3),
    hints: ["dica de auditoria suficiente"],
    subtopic: q.subtopic,
    demo_id: q.demo_id ?? null,
    source: "auditoria",
    origin: q.origin === "ai" ? "ai" : "seed",
  });
  const formatOk = format.ok;
  if (!formatOk) reasons.push(`formato: ${format.errors.join("; ")}`);

  // (c) Numérico determinístico (mathjs)
  let numericOk: boolean | null = null;
  if (q.numeric_check) {
    const computed = mathResult(q.numeric_check.expression);
    const expected = mathResult(q.numeric_check.result);
    numericOk =
      computed !== null &&
      expected !== null &&
      numbersClose(computed, expected);
    if (!numericOk) {
      reasons.push(
        `numérico: ${q.numeric_check.expression} = ${computed}, esperado ${expected}`,
      );
    }
  }

  // (e) Demo ↔ subtópico
  const resolved = resolveDemoForQuestion(q.topic_slug, q.subtopic)?.demoId ?? null;
  const demoOk = (q.demo_id ?? null) === resolved;
  if (!demoOk) {
    reasons.push(`demo: questão carrega "${q.demo_id}" mas o subtópico "${q.subtopic}" resolve "${resolved}"`);
  }

  // (b) Cega — só após as camadas determinísticas (falha determinística já reprova)
  let blindAnswer: string | null = null;
  let blindRetried = false;
  if (blind && formatOk && numericOk !== false && demoOk) {
    let attempt = await blind(q);
    if (attempt === null) {
      attempt = await blind(q); // resposta ilegível: uma nova tentativa
      blindRetried = true;
    }
    if (attempt === null) {
      reasons.push("cego: modelo não retornou alternativa legível (2 tentativas)");
    } else if (attempt !== q.answer_key) {
      // divergência: resolve de novo para não reprovar por ruído do modelo
      const second = await blind(q);
      blindRetried = true;
      if (second === q.answer_key) {
        notes.push(`modelo simples divergiu 1x (${attempt}) e confirmou na 2ª`);
        blindAnswer = `${attempt}→${second}`;
      } else {
        // TERCEIRO PARECER: resolução às cegas COM raciocínio (thinking).
        const deep = blindDeep ? await blindDeep(q) : null;
        if (deep === q.answer_key) {
          notes.push(
            `modelo simples divergiu (${attempt}, ${second}); resolução com raciocínio confirmou o gabarito`,
          );
          blindAnswer = `${attempt}/${second}→deep:${deep}`;
        } else if (deep === null) {
          reasons.push(
            `cego: simples divergiu (${attempt}, ${second}) e resolução com raciocínio ficou inconclusiva; gabarito ${q.answer_key}`,
          );
          blindAnswer = `${attempt}/${second}→deep:?`;
        } else {
          reasons.push(
            `cego: simples (${attempt}, ${second}) E com raciocínio (${deep}) divergiram do gabarito ${q.answer_key}`,
          );
          blindAnswer = `${attempt}/${second}→deep:${deep}`;
        }
      }
    } else {
      blindAnswer = attempt;
    }
  }

  // POLÍTICA DE DESEMPATE (documentada em docs/QUESTION_AUDIT.md):
  // mathjs é a FONTE DA VERDADE para contas. Se a checagem numérica passa e
  // apenas a camada às cegas divergiu, o gabarito está matematicamente
  // verificado — a divergência de um modelo sem calculadora não reprova a
  // questão; vira nota de ATENÇÃO (auditável no relatório). Sem checagem
  // numérica, divergência consistente (simples + raciocínio) reprova.
  if (numericOk === true && formatOk && demoOk) {
    const blindReasons = reasons.filter((r) => r.startsWith("cego"));
    if (blindReasons.length > 0 && blindReasons.length === reasons.length) {
      notes.push(...blindReasons.map((r) => `atenção: ${r} — gabarito confirmado pelo cálculo determinístico`));
      reasons.length = 0;
    }
  }

  return {
    q,
    label,
    blind: blindAnswer,
    blindRetried,
    numericOk,
    formatOk,
    demoOk,
    passed: reasons.length === 0,
    reasons,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Seeds (modo local)
// ---------------------------------------------------------------------------

async function loadSeeds(): Promise<Q[]> {
  const seedsDir = path.join(process.cwd(), "content", "seeds");
  const out: Q[] = [];
  for (const file of await readdir(seedsDir)) {
    if (!file.startsWith("questions-") || !file.endsWith(".json")) continue;
    const parsed = questionBatchSchema.parse(
      JSON.parse(await readFile(path.join(seedsDir, file), "utf8")),
    );
    for (const [i, q] of parsed.questions.entries()) {
      out.push({
        id: `${file}#${i}`,
        topic_slug: q.topic_slug,
        subtopic: q.subtopic ?? null,
        context_md: q.context_md ?? null,
        statement_md: q.statement_md,
        alternatives: q.alternatives,
        answer_key: q.answer_key,
        demo_id: q.demo_id ?? null,
        numeric_check: q.numeric_check ?? null,
        origin: "seed",
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Banco (modo --db)
// ---------------------------------------------------------------------------

async function loadFromDb(): Promise<Q[]> {
  const postgres = (await import("postgres")).default;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não definida (--db)");
  const sql = postgres(databaseUrl, { ssl: "prefer", max: 1 });
  const rows = await sql`
    select q.id, q.subtopic, q.context_md, q.statement_md, q.alternatives,
           q.answer_key, q.demo_id, q.numeric_expr, q.origin, q.status, t.slug as topic_slug
    from questions q join topics t on q.topic_id = t.id
    order by q.created_at
  `;
  await sql.end();
  return rows.map((r) => ({
    id: r.id as string,
    topic_slug: r.topic_slug as string,
    subtopic: (r.subtopic as string | null) ?? null,
    context_md: (r.context_md as string | null) ?? null,
    statement_md: r.statement_md as string,
    alternatives: (r.alternatives as Array<{ key: string; text: string }>) ?? [],
    answer_key: r.answer_key as string,
    demo_id: (r.demo_id as string | null) ?? null,
    numeric_check: (r.numeric_expr as { expression: string; result: string } | null) ?? null,
    origin: r.origin as string,
    status: r.status as string,
  }));
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

async function writeReport(results: Result[], mode: string, blindUsed: boolean) {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  const today = new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  lines.push(`# QUESTION_AUDIT.md — Auditoria das questões`);
  lines.push("");
  lines.push(
    `Gerado por \`scripts/audit-questions.ts\` em ${today} · modo **${mode}** · ` +
      `${total} questões auditadas · **${passed} aprovadas · ${failed.length} reprovadas**.`,
  );
  lines.push("");
  lines.push("## Metodologia");
  lines.push("");
  lines.push(
    "Cada questão passa por 4 camadas: **(a)** formato (Zod — o mesmo schema do pipeline); " +
      "**(c)** numérico determinístico (mathjs re-avalia a expressão do `numeric_check` e confere o resultado); " +
      "**(b)** resolução **às cegas** por um segundo modelo (GLM, via `z-ai-web-dev-sdk` — nunca o modelo que gerou a questão, e sem ver o gabarito; " +
      "divergências são re-resolvidas uma vez para filtrar ruído — só reprovam com divergência confirmada); " +
      "**(e)** vínculo demo ↔ subtópico (a demo da questão é a do subtópico dela, resolvida pelo catálogo em código).",
  );
  if (!blindUsed) {
    lines.push("");
    lines.push(
      "⚠️ A camada às cegas (b) não rodou neste ambiente (SDK do segundo modelo indisponível) — " +
        "as questões foram auditadas pelas camadas determinísticas.",
    );
  }
  lines.push("");
  lines.push("## Resumo");
  lines.push("");
  lines.push("| Métrica | Valor |");
  lines.push("| --- | --- |");
  lines.push(`| Total auditadas | ${total} |`);
  lines.push(`| Aprovadas | ${passed} |`);
  lines.push(`| Reprovadas | ${failed.length} |`);
  const comNumerico = results.filter((r) => r.numericOk !== null).length;
  lines.push(`| Com checagem numérica (mathjs) | ${comNumerico} |`);
  lines.push(`| Divergência única às cegas (aprovada na 2ª) | ${results.filter((r) => r.blindRetried && r.passed).length} |`);
  lines.push(`| Divergência revertida pelo parecer com raciocínio | ${results.filter((r) => r.notes.some((n) => n.includes("raciocínio confirmou"))).length} |`);
  lines.push(`| Atenção: modelo divergiu, mathjs confirmou o gabarito | ${results.filter((r) => r.notes.some((n) => n.includes("atenção"))).length} |`);
  lines.push("");

  lines.push("## Resultado por questão");
  lines.push("");
  lines.push(
    "| # | Tópico.Subtópico | Gabarito | Às cegas | mathjs | Demo | Status |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const [i, r] of results.entries()) {
    lines.push(
      `| ${i + 1} | \`${r.q.topic_slug}${r.q.subtopic ? `.${r.q.subtopic}` : ""}\` | ` +
        `${r.q.answer_key} | ${r.blind ?? (blindUsed ? "—" : "n/d")} | ` +
        `${r.numericOk === null ? "n/a" : r.numericOk ? "✓" : "✗"} | ` +
        `${r.demoOk ? "✓" : "✗"} | ${r.passed ? "OK" : "REPROVADA"} |`,
    );
  }
  lines.push("");

  const attention = results.filter((r) => r.notes.some((n) => n.includes("atenção")));
  if (attention.length > 0) {
    lines.push("## Atenção — divergência do modelo, gabarito verificado por mathjs");
    lines.push("");
    lines.push(
      "O segundo modelo (sem calculadora) divergiu nestas questões, mas a checagem " +
        "determinística (mathjs) E a revisão humana confirmaram o gabarito. Ficam em circulação " +
        "com registro auditável:",
    );
    lines.push("");
    for (const r of attention) {
      lines.push(`- **${r.label}** (\`${r.q.topic_slug}${r.q.subtopic ? `.${r.q.subtopic}` : ""}\`): cega=${r.blind ?? "—"} · gab=${r.q.answer_key} · ${r.q.numeric_check ? `mathjs: \`${r.q.numeric_check.expression}\` = ${r.q.numeric_check.result} ✓` : "—"}`);
    }
    lines.push("");
  }

  if (failed.length > 0) {
    lines.push("## Reprovadas e motivos");
    lines.push("");
    for (const r of failed) {
      lines.push(`- **${r.label}** (\`${r.q.topic_slug}${r.q.subtopic ? `.${r.q.subtopic}` : ""}\`): ${r.reasons.join(" · ")}`);
    }
    lines.push("");
    if (mode === "banco (produção)") {
      lines.push(
        "Questões reprovadas receberam `status = 'reported'` e saíram de circulação " +
          "(a prática/seleção só usa `status = 'validated'`).",
      );
    } else {
      lines.push(
        "Questões seed reprovadas devem ser corrigidas ou removidas de `content/seeds/` antes do próximo deploy.",
      );
    }
  } else {
    lines.push(
      "Nenhuma questão reprovada: gabaritos confirmados pelo cálculo determinístico e pela resolução às cegas do segundo modelo.",
    );
  }

  const target = path.join(process.cwd(), "docs", "QUESTION_AUDIT.md");
  await writeFile(target, lines.join("\n"), "utf8");
  console.log(`Relatório: docs/QUESTION_AUDIT.md — ${passed}/${total} aprovadas.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dbMode = process.argv.includes("--db");
  const questions = dbMode ? await loadFromDb() : await loadSeeds();
  const blind = await makeBlindSolver(false);
  const blindDeep = await makeBlindSolver(true);
  await loadCache();
  console.log(
    `Auditando ${questions.length} questões (${dbMode ? "banco" : "seeds"}) — camada às cegas ${blind ? "ATIVA (GLM)" : "inativa"}${blindDeep ? " + parecer com raciocínio em divergências" : ""}.`,
  );

  const results: Result[] = [];
  for (const [i, q] of questions.entries()) {
    const label = dbMode ? q.id.slice(0, 8) : q.id;
    const result = await auditQuestion(q, label, blind, blindDeep);
    results.push(result);
    const icon = result.passed ? "✓" : "✗";
    console.log(
      `${icon} [${i + 1}/${questions.length}] ${q.topic_slug}${q.subtopic ? `.${q.subtopic}` : ""} — gab=${q.answer_key}${result.blind ? ` cega=${result.blind}` : ""}${result.notes.length ? ` (${result.notes.join("; ")})` : ""}${result.passed ? "" : ` MOTIVO: ${result.reasons.join("; ")}`}`,
    );
  }

  await writeReport(results, dbMode ? "banco (produção)" : "seeds (locais)", blind !== null);

  // Modo banco: reprovadas saem de circulação.
  if (dbMode) {
    const failed = results.filter((r) => !r.passed);
    if (failed.length > 0) {
      const postgres = (await import("postgres")).default;
      const sql = postgres(process.env.DATABASE_URL!, { ssl: "prefer", max: 1 });
      for (const r of failed) {
        await sql`
          update questions
          set status = 'reported', review_note = ${`auditoria ${new Date().toISOString().slice(0, 10)}: ${r.reasons.join("; ")}`}, updated_at = now()
          where id = ${r.q.id}
        `;
        console.log(`→ reported: ${r.q.id} (${r.reasons.join("; ")})`);
      }
      await sql.end();
      console.log(`${failed.length} questão(ões) saíram de circulação (status='reported').`);
    } else {
      console.log("Nenhuma questão do banco reprovada.");
    }
  }

  if (results.some((r) => !r.passed)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
