import "server-only";
import { createHash } from "node:crypto";
import { create, all } from "mathjs";
import { getSupabaseAdmin } from "@/lib/db/admin";
import { routeLlm } from "@/lib/ai/router";
import {
  generateQuestionsPrompt,
  blindSolvePrompt,
} from "@/lib/ai/prompts";
import { blindSolveSchema } from "@/lib/ai/schemas";
import { extractJson } from "@/lib/ai/providers/types";
import {
  aiQuestionSchema,
  validateQuestionFormat,
  type AiQuestion,
} from "@/lib/content/schemas";

const math = create(all, {});
const evaluate = math.evaluate as (expr: string) => unknown;

export interface GenerationStats {
  topic: string;
  generated: number;
  validated: number;
  rejected: Array<{ reason: string; detail?: string }>;
}

/**
 * Nightly content pipeline (doc section 8):
 *   1. topics with the fewest validated questions (or highest error rates);
 *   2. batch generation in ENEM style;
 *   3. 4-layer validation: (a) format (Zod) (b) BLIND SOLVE by a different
 *      model — publish only if the answer matches (c) numeric check with
 *      mathjs when present (d) quality filters;
 *   4. validated -> status 'validated'; failures -> 'draft' with reason.
 */
export async function generateBatchForTopic(
  topicId: string,
  count: number,
): Promise<GenerationStats> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("admin client unavailable");

  const stats: GenerationStats = {
    topic: topicId,
    generated: 0,
    validated: 0,
    rejected: [],
  };

  const { data: topic } = await admin
    .from("topics")
    .select("id, slug, name, description, level, area_id")
    .eq("id", topicId)
    .single();
  if (!topic) throw new Error("topic not found");

  const { data: area } = await admin
    .from("areas")
    .select("name")
    .eq("id", topic.area_id)
    .single();

  const level =
    topic.level === 1 ? "básico" : topic.level === 2 ? "intermediário" : "avançado";

  // ---- 2. Generate ----------------------------------------------------------
  const messages = generateQuestionsPrompt({
    topicName: topic.name,
    topicDescription: topic.description ?? "",
    areaName: area?.name ?? "",
    level,
    count,
  });

  let questions: AiQuestion[] = [];
  try {
    const response = await routeLlm(
      { messages, json: true, temperature: 0.85, timeoutMs: 55_000, maxTokens: 8192 },
      { retries: 1 },
    );
    const parsed = JSON.parse(extractJsonText(response.text)) as {
      questions?: unknown[];
    };
    questions = (parsed.questions ?? []).map((q) =>
      aiQuestionSchema.parse({ ...(q as object), topic_slug: topic.slug }),
    );
  } catch (err) {
    stats.rejected.push({ reason: "geração falhou", detail: (err as Error).message });
    return stats;
  }
  stats.generated = questions.length;

  // ---- 3. Validate each question --------------------------------------------
  for (const question of questions) {
    const topicSlugFixed = { ...question, topic_slug: topic.slug };

    // (a) Format layer.
    const format = validateQuestionFormat(topicSlugFixed);
    if (!format.ok) {
      stats.rejected.push({ reason: "formato", detail: format.errors.join("; ") });
      await insertDraft(admin, topic.id, topicSlugFixed, `formato: ${format.errors.join("; ")}`);
      continue;
    }

    // (c) Numeric layer (deterministic, mathjs) — before the expensive blind solve.
    if (topicSlugFixed.numeric_check) {
      const { expression, result } = topicSlugFixed.numeric_check;
      try {
        const computed = evaluate(expression);
        const expected = evaluate(result);
        if (!numbersClose(Number(computed), Number(expected))) {
          stats.rejected.push({
            reason: "verificação numérica",
            detail: `${expression} = ${String(computed)} != ${result}`,
          });
          await insertDraft(
            admin,
            topic.id,
            topicSlugFixed,
            `numérico: ${expression} deu ${String(computed)}`,
          );
          continue;
        }
      } catch {
        stats.rejected.push({ reason: "numérico inválido (mathjs)" });
        await insertDraft(admin, topic.id, topicSlugFixed, "mathjs não avaliou");
        continue;
      }
    }

    // (b) Blind solve by a DIFFERENT provider than the generator when possible.
    const solveMessages = blindSolvePrompt({
      context: topicSlugFixed.context_md ?? null,
      statement: topicSlugFixed.statement_md,
      alternatives: topicSlugFixed.alternatives,
    });
    try {
      const solve = await routeLlm(
        { messages: solveMessages, json: true, temperature: 0.1, timeoutMs: 30_000 },
        { retries: 1 },
      );
      const solved = blindSolveSchema.parse(extractJson(solve.text));
      if (solved.answer_key !== topicSlugFixed.answer_key) {
        stats.rejected.push({
          reason: "gabarito divergente no cego",
          detail: `modelo resolveu ${solved.answer_key}, gabarito ${topicSlugFixed.answer_key}`,
        });
        await insertDraft(
          admin,
          topic.id,
          topicSlugFixed,
          `cego: modelo respondeu ${solved.answer_key}`,
        );
        continue;
      }
    } catch (err) {
      stats.rejected.push({ reason: "blind solve falhou", detail: (err as Error).message });
      await insertDraft(admin, topic.id, topicSlugFixed, "blind solve erro");
      continue;
    }

    // (d) Quality filters (deterministic subset; AI quality comes from the
    // generator prompt + report loop).
    const altTexts = topicSlugFixed.alternatives.map((a) => a.text.trim());
    if (new Set(altTexts).size !== 5) {
      stats.rejected.push({ reason: "alternativas duplicadas" });
      continue;
    }
    if (topicSlugFixed.statement_md.length < 30) {
      stats.rejected.push({ reason: "enunciado curto demais" });
      continue;
    }

    // ---- 4. Publish ---------------------------------------------------------
    await admin.from("questions").insert({
      topic_id: topic.id,
      difficulty: topicSlugFixed.difficulty,
      context_md: topicSlugFixed.context_md ?? null,
      statement_md: topicSlugFixed.statement_md,
      alternatives: topicSlugFixed.alternatives,
      answer_key: topicSlugFixed.answer_key,
      explanation_md: topicSlugFixed.explanation_md,
      hints: topicSlugFixed.hints,
      demo_id: topicSlugFixed.demo_id ?? null,
      status: "validated",
      source: topicSlugFixed.source,
      license: "Conteúdo original StudyMoon (CC BY-SA)",
      origin: "ai",
      verified_by_model: "blind-solve-4layers",
      numeric_check: Boolean(topicSlugFixed.numeric_check),
    });
    stats.validated += 1;
  }

  return stats;
}

// ---------------------------------------------------------------------------

/** Picks the topics that most need questions (doc section 8: fila content_jobs). */
export async function selectTopicsForGeneration(
  batchSize: number,
  minPerTopic: number,
): Promise<Array<{ topic_id: string; deficit: number }>> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data: topics } = await admin
    .from("topics")
    .select("id")
    .not("parent_id", "is", null);
  if (!topics) return [];

  const { data: counts } = await admin
    .from("questions")
    .select("topic_id, status")
    .in("topic_id", topics.map((t) => t.id));

  const validatedByTopic = new Map<string, number>();
  for (const row of counts ?? []) {
    if (row.status === "validated") {
      validatedByTopic.set(row.topic_id, (validatedByTopic.get(row.topic_id) ?? 0) + 1);
    }
  }

  return topics
    .map((t) => ({
      topic_id: t.id,
      deficit: Math.max(0, minPerTopic - (validatedByTopic.get(t.id) ?? 0)),
    }))
    .filter((row) => row.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, batchSize);
}

async function insertDraft(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  topicId: string,
  question: AiQuestion,
  reason: string,
) {
  await admin.from("questions").insert({
    topic_id: topicId,
    difficulty: question.difficulty,
    context_md: question.context_md ?? null,
    statement_md: question.statement_md,
    alternatives: question.alternatives,
    answer_key: question.answer_key,
    explanation_md: question.explanation_md,
    hints: question.hints,
    demo_id: question.demo_id ?? null,
    status: "draft",
    source: question.source,
    license: "Conteúdo original StudyMoon (CC BY-SA)",
    origin: "ai",
    review_note: reason,
  });
}

function extractJsonText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return candidate;
}

function numbersClose(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

/** Content cache key (hash) used by ai_cache. */
export function contentCacheKey(...parts: string[]): string {
  return createHash("sha256").update(parts.join("::")).digest("hex");
}
