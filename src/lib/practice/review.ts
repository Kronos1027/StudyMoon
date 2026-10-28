/** Small, deterministic study-mode helpers shared by routes and server actions. */
export type StudyPracticeMode = "practice" | "review" | "lesson_test";

/** Unknown or tampered query params safely fall back to ordinary practice. */
export function resolvePracticeMode(mode?: string): StudyPracticeMode {
  if (mode === "teste") return "lesson_test";
  if (mode === "revisao") return "review";
  return "practice";
}

/**
 * Return the first due question that is still validated and available
 * in the requested topic. The input IDs are ordered oldest-due first.
 * Never fall back to a non-due question during a review session.
 */
export function firstAvailableDueQuestion(
  orderedDueIds: readonly string[],
  candidateIds: Iterable<string>,
): string | null {
  const available = new Set(candidateIds);
  return orderedDueIds.find((id) => available.has(id)) ?? null;
}

/** A review reward is valid only for an existing, currently due FSRS card. */
export function isReviewDue(due: string | null | undefined, now: Date): boolean {
  if (!due) return false;
  const dueTime = Date.parse(due);
  return Number.isFinite(dueTime) && dueTime <= now.getTime();
}
