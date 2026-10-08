/**
 * Adaptive Elo mastery per topic (doc 7.1).
 *
 * Each topic has a mastery rating; each question has a difficulty rating.
 * Expected = 1 / (1 + 10^((difficulty - mastery) / 400)).
 * The K factor shrinks as evidence accumulates (uncertainty drops),
 * and confidence grows with the number of attempts.
 */

export const MIN_RATING = 400;
export const MAX_RATING = 2600;
export const DEFAULT_RATING = 1200;

/** Probability of a correct answer given mastery vs difficulty. */
export function expectedScore(mastery: number, difficulty: number): number {
  return 1 / (1 + Math.pow(10, (difficulty - mastery) / 400));
}

/**
 * K factor: large while we know little about the learner, small later.
 * Attempt bands tuned for quick convergence without oscillation.
 */
export function kFactor(attemptsCount: number): number {
  if (attemptsCount < 5) return 48;
  if (attemptsCount < 15) return 32;
  if (attemptsCount < 30) return 24;
  return 16;
}

/**
 * Confidence in the mastery estimate: grows with attempts, saturates at 0.98.
 * c = n / (n + 8)
 */
export function confidenceFromAttempts(attemptsCount: number): number {
  return Math.min(0.98, attemptsCount / (attemptsCount + 8));
}

export function clampRating(value: number): number {
  return Math.round(Math.max(MIN_RATING, Math.min(MAX_RATING, value)));
}

export interface MasteryUpdate {
  elo: number;
  confidence: number;
  delta: number;
}

/**
 * Applies an Elo update for one attempt on one topic.
 *
 * @param currentElo learner's current mastery rating for the topic
 * @param difficulty question difficulty rating
 * @param correct whether the answer was right
 * @param attemptsCount attempts already recorded for this topic
 */
export function updateMastery(
  currentElo: number,
  difficulty: number,
  correct: boolean,
  attemptsCount: number,
): MasteryUpdate {
  const k = kFactor(attemptsCount);
  const expected = expectedScore(currentElo, difficulty);
  const score = correct ? 1 : 0;
  const delta = Math.round(k * (score - expected));
  return {
    elo: clampRating(currentElo + delta),
    confidence: confidenceFromAttempts(attemptsCount + 1),
    delta,
  };
}

/**
 * Question difficulty gets a gentle nudge toward the empirical difficulty:
 * if almost everyone fails it, it is harder than its rating suggests.
 * Uses the running pass rate with Laplace smoothing.
 */
export function updateDifficulty(
  currentDifficulty: number,
  correct: boolean,
  attemptsOnQuestion: number,
): number {
  // Smoothed empirical rate; weight grows with sample size (max ~0.25).
  const weight = Math.min(0.25, attemptsOnQuestion / 400);
  const empirical = correct ? 1 : 0;
  const target = DEFAULT_RATING + (0.5 - empirical * 0.999) * 2 * 400;
  return clampRating(currentDifficulty + (target - currentDifficulty) * weight);
}
