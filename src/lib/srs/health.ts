/** Pure, privacy-preserving monitoring of the FSRS recovery backlog. */
export interface SrsBacklogSnapshot {
  pending: number;
  retried: number;
  oldestAttemptedAt: string | null;
}

export interface SrsBacklogAssessment {
  pending: number;
  retried: number;
  oldestAgeMinutes: number | null;
  status: "clear" | "normal" | "delayed" | "stale";
}

/**
 * Alarm levels are deliberately conservative: backlog size alone does not
 * indicate failure, because the cron processes a bounded number of events.
 * A retry or >60-minute-old answer warrants investigation; a >6-hour-old
 * answer is stale and must be surfaced in operations.
 */
export function assessSrsBacklog(
  snapshot: SrsBacklogSnapshot,
  now: Date = new Date(),
): SrsBacklogAssessment {
  const pending = Math.max(0, Math.floor(snapshot.pending));
  const retried = Math.max(0, Math.min(pending, Math.floor(snapshot.retried)));
  if (!pending) return { pending: 0, retried: 0, oldestAgeMinutes: null, status: "clear" };

  const timestamp = snapshot.oldestAttemptedAt
    ? Date.parse(snapshot.oldestAttemptedAt)
    : NaN;
  // Missing/invalid oldest timestamp is an operational fault, not a clean bill.
  if (!Number.isFinite(timestamp)) {
    return { pending, retried, oldestAgeMinutes: null, status: "stale" };
  }

  const age = Math.max(0, Math.floor((now.getTime() - timestamp) / 60_000));
  const status = age >= 360 ? "stale" : age >= 60 || retried > 0 ? "delayed" : "normal";
  return { pending, retried, oldestAgeMinutes: age, status };
}
