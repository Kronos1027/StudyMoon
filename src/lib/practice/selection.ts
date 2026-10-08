/**
 * Adaptive selection of the next question (doc 7.2).
 *
 * Mix per practice session:
 *   70% challenge  — P(correct) between 60% and 80% (zone of proximal
 *                    development; computed with Elo expected score)
 *   20% weak topic — questions from the user's weakest topics
 *   10% interleave — mixed review from random topics (spacing/interleaving)
 *
 * Never repeats the same question within 7 days.
 */
import { expectedScore } from "@/lib/elo";

export interface CandidateQuestion {
  id: string;
  topicId: string;
  difficulty: number;
}

export interface TopicMasteryLike {
  topicId: string;
  elo: number;
  confidence: number;
}

export interface RecentAttempt {
  questionId: string;
  attemptedAt: string; // ISO date
}

export interface SelectionInput {
  candidates: CandidateQuestion[];
  mastery: TopicMasteryLike[];
  recentAttempts: RecentAttempt[];
  lastTopicId?: string | null;
  now?: Date;
  /** Seeded RNG for deterministic tests. */
  rng?: () => number;
}

export type SelectionReason = "challenge" | "weak_topic" | "interleave";

export interface Selection {
  question: CandidateQuestion;
  reason: SelectionReason;
  probabilityCorrect: number;
}

const CHALLENGE_MIN = 0.6;
const CHALLENGE_MAX = 0.8;
const REPEAT_WINDOW_DAYS = 7;

export const DEFAULT_MASTERY = { elo: 1200, confidence: 0 };

function defaultRng(): () => number {
  return Math.random;
}

/** Removes questions attempted within the 7-day repeat window. */
export function filterRecentlyAttempted(
  candidates: CandidateQuestion[],
  recentAttempts: RecentAttempt[],
  now: Date,
): CandidateQuestion[] {
  const cutoff = now.getTime() - REPEAT_WINDOW_DAYS * 86400000;
  const blocked = new Set(
    recentAttempts
      .filter((a) => new Date(a.attemptedAt).getTime() >= cutoff)
      .map((a) => a.questionId),
  );
  return candidates.filter((c) => !blocked.has(c.id));
}

function masteryFor(mastery: TopicMasteryLike[], topicId: string) {
  return mastery.find((m) => m.topicId === topicId) ?? DEFAULT_MASTERY;
}

/** Picks the best question within the challenge zone (closest to 70%). */
function pickChallenge(
  pool: CandidateQuestion[],
  mastery: TopicMasteryLike[],
): { question: CandidateQuestion; probabilityCorrect: number } | null {
  const TARGET = 0.7;
  let best: CandidateQuestion | null = null;
  let bestP = 0;
  let bestDistance = Infinity;
  for (const q of pool) {
    const p = expectedScore(masteryFor(mastery, q.topicId).elo, q.difficulty);
    if (p >= CHALLENGE_MIN && p <= CHALLENGE_MAX) {
      const distance = Math.abs(p - TARGET);
      if (distance < bestDistance) {
        best = q;
        bestP = p;
        bestDistance = distance;
      }
    }
  }
  return best ? { question: best, probabilityCorrect: bestP } : null;
}

/** Weakest topic = lowest elo weighted by confidence, with questions available. */
function pickWeakTopicQuestion(
  pool: CandidateQuestion[],
  mastery: TopicMasteryLike[],
  rng: () => number = Math.random,
): CandidateQuestion | null {
  const byTopic = new Map<string, CandidateQuestion[]>();
  for (const q of pool) {
    const list = byTopic.get(q.topicId) ?? [];
    list.push(q);
    byTopic.set(q.topicId, list);
  }
  let weakestTopic: string | null = null;
  let weakestScore = Infinity;
  for (const [topicId, questions] of byTopic) {
    if (questions.length === 0) continue;
    const m = masteryFor(mastery, topicId);
    const score =
      m.elo *
      (0.5 + 0.5 * m.confidence) *
      (0.7 + 0.3 * Math.min(1, questions.length / 5));
    if (score < weakestScore) {
      weakestScore = score;
      weakestTopic = topicId;
    }
  }
  if (!weakestTopic) return null;
  const questions = byTopic.get(weakestTopic)!;
  return questions[Math.floor(rng() * questions.length)] ?? null;
}

/** Interleave: prefer a topic different from the last one studied. */
function pickInterleaved(
  pool: CandidateQuestion[],
  lastTopicId?: string | null,
  rng: () => number = Math.random,
): CandidateQuestion | null {
  const differentTopic = lastTopicId
    ? pool.filter((q) => q.topicId !== lastTopicId)
    : pool;
  const source = differentTopic.length > 0 ? differentTopic : pool;
  if (source.length === 0) return null;
  return source[Math.floor(rng() * source.length)];
}

/**
 * Selects the next question following the 70/20/10 mix.
 * Returns null when no question is available.
 */
export function selectNextQuestion(input: SelectionInput): Selection | null {
  const rng = input.rng ?? defaultRng();
  const now = input.now ?? new Date();
  const pool = filterRecentlyAttempted(
    input.candidates,
    input.recentAttempts,
    now,
  );
  if (pool.length === 0) return null;

  const roll = rng();

  if (roll < 0.7) {
    const challenge = pickChallenge(pool, input.mastery);
    if (challenge) {
      return {
        question: challenge.question,
        reason: "challenge",
        probabilityCorrect: challenge.probabilityCorrect,
      };
    }
  }

  if (roll < 0.9) {
    const weak = pickWeakTopicQuestion(pool, input.mastery, rng);
    if (weak) {
      const m = masteryFor(input.mastery, weak.topicId);
      return {
        question: weak,
        reason: "weak_topic",
        probabilityCorrect: expectedScore(m.elo, weak.difficulty),
      };
    }
  }

  const interleave = pickInterleaved(pool, input.lastTopicId, rng);
  if (interleave) {
    const m = masteryFor(input.mastery, interleave.topicId);
    return {
      question: interleave,
      reason: "interleave",
      probabilityCorrect: expectedScore(m.elo, interleave.difficulty),
    };
  }

  // Fallback: any question from the filtered pool.
  const fallback = pool[Math.floor(rng() * pool.length)];
  const m = masteryFor(input.mastery, fallback.topicId);
  return {
    question: fallback,
    reason: "challenge",
    probabilityCorrect: expectedScore(m.elo, fallback.difficulty),
  };
}
