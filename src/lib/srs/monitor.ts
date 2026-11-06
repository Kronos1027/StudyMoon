import "server-only";

import { getSupabaseAdmin } from "@/lib/db/admin";
import { assessSrsBacklog, type SrsBacklogAssessment } from "@/lib/srs/health";

/**
 * Aggregate-only queue diagnostics. Never return raw attempts, user IDs or
 * question IDs to the cron caller/logging system.
 */
export async function getSrsBacklogHealth(): Promise<SrsBacklogAssessment> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin client unavailable");

  const { data: oldest, count: pending, error: oldestError } = await admin
    .from("srs_replay_queue")
    .select("attempted_at", { count: "exact" })
    .is("processed_at", null)
    .order("attempted_at", { ascending: true })
    .limit(1);

  if (oldestError || pending == null) {
    console.error("[srs-monitor] pending count failed:", oldestError?.message);
    throw new Error("FSRS queue monitoring unavailable");
  }

  if (pending === 0) {
    return assessSrsBacklog({ pending: 0, retried: 0, oldestAttemptedAt: null });
  }

  const { count: retried, error: retryError } = await admin
    .from("srs_replay_queue")
    .select("id", { count: "exact", head: true })
    .is("processed_at", null)
    .gt("retry_count", 0);

  if (retryError || retried == null) {
    console.error("[srs-monitor] retry count failed:", retryError?.message);
    throw new Error("FSRS queue retry monitoring unavailable");
  }

  return assessSrsBacklog({
    pending,
    retried,
    oldestAttemptedAt: oldest?.[0]?.attempted_at ?? null,
  });
}
