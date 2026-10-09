/** Mock exam configuration (doc section 6.9) — plain module (no "use server"). */
export const EXAM_CONFIG = {
  partial: {
    areas: ["mt", "lc", "ch", "cn"] as const,
    questionsPerArea: 3,
    label: "Simulado parcial",
    timeLimitMin: 25,
  },
  day1: {
    areas: ["lc", "ch"] as const,
    questionsPerArea: 10,
    label: "Dia 1 — Linguagens + Humanas",
    timeLimitMin: 45,
  },
  day2: {
    areas: ["cn", "mt"] as const,
    questionsPerArea: 10,
    label: "Dia 2 — Natureza + Matemática",
    timeLimitMin: 45,
  },
} as const;

export type ExamKind = keyof typeof EXAM_CONFIG;
