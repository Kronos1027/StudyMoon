/**
 * Zod schemas for every AI output (doc section 9: "sempre pedindo JSON e
 * validando com Zod"). These sit at the boundary — nothing from a model
 * reaches the product unvalidated.
 */
import { z } from "zod";

export const blindSolveSchema = z.object({
  answer_key: z.enum(["A", "B", "C", "D", "E"]),
  reasoning: z.string().min(5).max(2000),
});
export type BlindSolveOutput = z.infer<typeof blindSolveSchema>;

const competencySchema = z.object({
  key: z.enum(["C1", "C2", "C3", "C4", "C5"]),
  score: z
    .number()
    .int()
    .min(0)
    .max(200)
    .refine((s) => s % 40 === 0, "score deve ser múltiplo de 40"),
  justification: z.string().min(10).max(1500),
});

export const essayCorrectionSchema = z
  .object({
    total_score: z.number().int().min(0).max(1000),
    competencies: z.array(competencySchema).length(5),
    highlights: z
      .array(
        z.object({
          text: z.string().min(2).max(400),
          note: z.string().min(2).max(500),
        }),
      )
      .max(8),
    improvements: z.array(z.string().min(5).max(400)).length(3),
    rewrite_example_md: z.string().min(50).max(3000).nullable(),
    zero_reason: z
      .enum(["em_branco", "fuga_tema", "copia_motivadores"])
      .nullable(),
  })
  .refine(
    (data) =>
      data.total_score ===
      data.competencies.reduce((sum, c) => sum + c.score, 0),
    { message: "total_score deve ser a soma das competências" },
  );
export type EssayCorrectionOutput = z.infer<typeof essayCorrectionSchema>;

export const tutorSchema = z.object({
  reply: z.string().min(2).max(1200),
  gave_answer: z.boolean(),
});
export type TutorOutput = z.infer<typeof tutorSchema>;

export const essayThemesSchema = z.object({
  themes: z
    .array(
      z.object({
        title: z.string().min(5).max(200),
        kind: z.enum([
          "sociedade",
          "meio ambiente",
          "saude",
          "educacao",
          "tecnologia",
          "direitos",
        ]),
        texts_motivadores: z
          .array(
            z.object({
              source: z.string().min(2).max(120),
              text: z.string().min(30).max(1200),
            }),
          )
          .min(1)
          .max(3),
      }),
    )
    .min(1),
});
export type EssayThemesOutput = z.infer<typeof essayThemesSchema>;
