import { describe, expect, it } from "vitest";
import { essayCorrectionSchema } from "@/lib/ai/schemas";

function validCorrection() {
  return {
    total_score: 800,
    competencies: (["C1", "C2", "C3", "C4", "C5"] as const).map((key) => ({
      key,
      score: 160,
      justification: "Argumentação coerente, mas ainda pode melhorar.",
    })),
    highlights: [],
    improvements: [
      "Ampliar a fundamentação dos argumentos.",
      "Melhorar a ligação entre os parágrafos.",
      "Detalhar melhor a proposta de intervenção.",
    ],
    rewrite_example_md: null,
    zero_reason: null,
  };
}

describe("AI essay correction contract", () => {
  it("accepts a valid five-competency ENEM rubric", () => {
    const parsed = essayCorrectionSchema.parse(validCorrection());
    expect(parsed.competencies.map((c) => c.key)).toEqual([
      "C1", "C2", "C3", "C4", "C5",
    ]);
    expect(parsed.total_score).toBe(800);
  });

  it("rejects repeated competencies even when the total adds up", () => {
    const value = validCorrection();
    value.competencies[4].key = "C1";
    expect(essayCorrectionSchema.safeParse(value).success).toBe(false);
  });

  it("rejects a forged or hallucinated total", () => {
    const value = validCorrection();
    value.total_score = 1000;
    expect(essayCorrectionSchema.safeParse(value).success).toBe(false);
  });

  it("rejects competency scores outside official 40-point steps", () => {
    const value = validCorrection();
    value.competencies[0].score = 159;
    value.total_score = 799;
    expect(essayCorrectionSchema.safeParse(value).success).toBe(false);
  });

  it("accepts a zero score without division-by-zero assumptions", () => {
    const value = validCorrection();
    for (const competency of value.competencies) competency.score = 0;
    value.total_score = 0;
    value.zero_reason = "em_branco";
    expect(essayCorrectionSchema.safeParse(value).success).toBe(true);
  });
});
