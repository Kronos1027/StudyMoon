/**
 * Zod schemas for all content boundaries (doc sections 8 and 9):
 * seed questions, AI-generated questions, curriculum and lessons.
 * The SAME schema validates curated seeds and AI output.
 */
import { z } from "zod";

export const ALTERNATIVE_KEYS = ["A", "B", "C", "D", "E"] as const;

export const alternativeSchema = z.object({
  key: z.enum(ALTERNATIVE_KEYS),
  text: z.string().min(1).max(1200),
});

export const questionSeedSchema = z.object({
  topic_slug: z.string().min(2),
  difficulty: z.number().int().min(400).max(2600),
  context_md: z.string().max(4000).nullable().optional(),
  statement_md: z.string().min(20).max(2000),
  alternatives: z.array(alternativeSchema).length(5),
  answer_key: z.enum(ALTERNATIVE_KEYS),
  explanation_md: z.string().min(40),
  hints: z.array(z.string().min(5)).min(1).max(3),
  demo_id: z.string().nullable().optional(),
  source: z.string().min(3).max(300),
  license: z.string().max(300).optional(),
  origin: z.enum(["seed", "ai", "inep"]),
  /** Deterministic check (mathjs): expression must evaluate to result. */
  numeric_check: z
    .object({
      expression: z.string().min(1).max(600),
      result: z.string().min(1).max(200),
    })
    .nullable()
    .optional(),
});

export type QuestionSeed = z.infer<typeof questionSeedSchema>;

export const questionBatchSchema = z.object({
  version: z.number().int().positive(),
  questions: z.array(questionSeedSchema),
});

/** AI output schema: same shape, stricter on lengths (doc section 8). */
export const aiQuestionSchema = questionSeedSchema.extend({
  origin: z.literal("ai"),
  context_md: z.string().max(4000),
  verified_by_model: z.string().optional(),
});

export type AiQuestion = z.infer<typeof aiQuestionSchema>;

export const topicSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(140),
  level: z.number().int().min(1).max(3),
  enem_weight: z.number().min(0).max(10),
  matrix_codes: z.array(z.string().max(8)).default([]),
  demo_id: z.string().nullable(),
  description: z.string().min(10).max(600),
});

export const disciplineSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(140),
  topics: z.array(topicSchema).min(1),
});

export const areaSchema = z.object({
  slug: z.string().min(2).max(40),
  name: z.string().min(2).max(140),
  icon: z.string().max(40).nullable(),
  sort_order: z.number().int(),
  disciplines: z.array(disciplineSchema).min(1),
});

export const curriculumSchema = z.object({
  version: z.number().int().positive(),
  updated: z.string(),
  source: z.string(),
  areas: z.array(areaSchema).min(1),
});

export const lessonSchema = z.object({
  estimated_minutes: z.number().int().min(4).max(60),
  explanation_md: z.string().min(200),
});

export const lessonsFileSchema = z.record(z.string(), lessonSchema);

/** Format layer of the 4-layer validation (doc section 8). */
export function validateQuestionFormat(q: unknown): {
  ok: boolean;
  errors: string[];
} {
  const parsed = questionSeedSchema.safeParse(q);
  if (parsed.success) {
    const errors: string[] = [];
    const keys = parsed.data.alternatives.map((a) => a.key);
    const unique = new Set(keys);
    if (unique.size !== 5) errors.push("alternativas com chave repetida");
    const texts = parsed.data.alternatives.map((a) => a.text.trim());
    if (new Set(texts).size !== 5) errors.push("alternativas com texto repetido");
    if (parsed.data.hints.length < 1) errors.push("sem dicas em camadas");
    return { ok: errors.length === 0, errors };
  }
  return {
    ok: false,
    errors: parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`,
    ),
  };
}
