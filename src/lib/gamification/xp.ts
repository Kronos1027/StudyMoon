/**
 * XP rules with anti-fraud (doc 7.5).
 *
 * XP is earned ONLY through real practice:
 *  - per question: requires a minimum time on the question (scaled by the
 *    statement size) and scales with difficulty; the DB partial unique index
 *    prevents paying twice for the same question;
 *  - daily caps per activity kind keep grinding pointless;
 *  - lessons, essays, mock exams and reviews pay fixed, one-shot amounts.
 */

/** Minimum time on question before XP counts (scales with statement length). */
export function minimumTimeMs(statementLength: number): number {
  // ~0.35s per character of statement, clamped between 6s and 45s.
  return Math.max(6_000, Math.min(45_000, statementLength * 350));
}

export interface QuestionXpInput {
  difficulty: number;
  correct: boolean;
  timeMs: number;
  statementLength: number;
}

/**
 * XP for one answered question. Returns 0 when the time spent is below the
 * minimum (signals a click-through / brute-force pattern).
 */
export function questionXp(input: QuestionXpInput): number {
  if (input.timeMs < minimumTimeMs(input.statementLength)) return 0;
  if (!input.correct) {
    // Honest wrong answers still teach — small reward, no difficulty bonus.
    return 2;
  }
  // Base 10 + up to +15 by difficulty (1200 default → +5; 2000 → +12).
  const bonus = Math.round(((input.difficulty - 800) / 1200) * 15);
  return 10 + Math.max(0, Math.min(15, bonus));
}

/** Daily XP caps per activity kind. */
export const DAILY_XP_CAPS = {
  question: 300,
  review: 60,
  lesson: 90,
  essay: 50,
  mock_exam: 100,
} as const;

export type XpActivity = keyof typeof DAILY_XP_CAPS;

/** Fixed, one-shot rewards (enforced by xp_events uniqueness where applicable). */
export const FIXED_XP = {
  lessonCompleted: 30,
  essaySubmitted: 50,
  mockExamCompleted: 100,
  reviewCard: 5,
} as const;

/**
 * Applies the daily cap: returns how much XP can actually be granted given
 * what was already earned today for that activity.
 */
export function applyDailyCap(
  activity: XpActivity,
  amount: number,
  alreadyEarnedToday: number,
): number {
  const cap = DAILY_XP_CAPS[activity];
  return Math.max(0, Math.min(amount, cap - alreadyEarnedToday));
}

/** Level thresholds: quadratic curve, 100 XP ≈ level 2, 1 000 XP ≈ level 6. */
export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 25)) + 1);
}

/** Rank titles by level band (lunar theme). */
export function rankTitleFromLevel(level: number): string {
  if (level >= 20) return "Guardião da Lua Cheia";
  if (level >= 15) return "Mestre das Marés";
  if (level >= 10) return "Cartógrafo Estelar";
  if (level >= 6) return "Navegador Lunar";
  if (level >= 3) return "Observador do Céu";
  return "Explorador Lunar";
}

/** League tier for weekly rankings, by level band (doc 7.5). */
export function leagueFromLevel(level: number): "bronze" | "silver" | "gold" | "platinum" | "diamond" {
  if (level >= 16) return "diamond";
  if (level >= 11) return "platinum";
  if (level >= 7) return "gold";
  if (level >= 3) return "silver";
  return "bronze";
}
