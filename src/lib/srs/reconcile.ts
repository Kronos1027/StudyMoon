import "server-only";

import { getSupabaseAdmin } from "@/lib/db/admin";
import { gradeFromAttempt, newCard, schedule } from "@/lib/srs";
import type { SrsCard } from "@/lib/db/types";

interface ReconcileOptions {
  userId?: string;
  questionId?: string;
  limit?: number;
}

export interface ReconcileSummary {
  processed: number;
  remaining: number;
  failed: number;
}

/**
 * Drains the durable FSRS outbox. A single SQL RPC atomically updates the card
 * and marks the event complete. Crashes/retries cannot apply an attempt twice.
 *
 * Bounded for serverless timeouts. Cron re-runs for eventual recovery.
 * The scheduler always uses the original attempt timestamp, preserving the
 * ordering and intervals for earlier attempts being replayed after an outage.
 */
export async function reconcilePendingSrs({
  userId,
  questionId,
  limit = 20,
}: ReconcileOptions = {}): Promise<ReconcileSummary> {
  const admin = getSupabaseAdmin();
  if (!admin) return { processed: 0, remaining: 0, failed: 1 };

  const batchSize = Math.min(100, Math.max(1, Math.floor(limit)));
  let query = admin
    .from("srs_replay_queue")
    .select("id, attempt_id, user_id, question_id, correct, time_ms, expected_ms, attempted_at")
    .is("processed_at", null)
    .order("attempted_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(batchSize);
  if (userId) query = query.eq("user_id", userId);
  if (questionId) query = query.eq("question_id", questionId);

  const { data: events, error: queueError } = await query;
  if (queueError) {
    console.error("[srs-reconcile] cannot load queue:", queueError.message);
    return { processed: 0, remaining: 0, failed: 1 };
  }

  let processed = 0;
  let failed = 0;

  for (const event of events ?? []) {
    let completed = false;

    for (let retry = 0; retry < 4 && !completed; retry++) {
      const { data: card, error: cardError } = await admin
        .from("srs_cards")
        .select("*")
        .eq("user_id", event.user_id)
        .eq("question_id", event.question_id)
        .maybeSingle();

      if (cardError) {
        console.error("[srs-reconcile] card read failed:", cardError.message);
        break;
      }

      const timestamp = new Date(event.attempted_at);
      const base: SrsCard = card ?? newCard(event.user_id, event.question_id, timestamp);
      const grade = gradeFromAttempt(event.correct, event.time_ms, event.expected_ms);

      try {
        const next = schedule(base, grade, timestamp).card;
        const { data: committed, error: commitError } = await admin.rpc(
          "complete_srs_replay",
          {
            p_attempt_id: event.attempt_id,
            p_expected_revision: Number(card?.revision ?? 0),
            p_due: next.due,
            p_stability: next.stability,
            p_difficulty: next.difficulty_fsrs,
            p_elapsed_days: next.elapsed_days,
            p_scheduled_days: next.scheduled_days,
            p_reps: next.reps,
            p_lapses: next.lapses,
            p_learning_steps: next.learning_steps,
            p_state: next.state,
            p_last_update: next.last_update,
          },
        );
        if (commitError) {
          console.error("[srs-reconcile] commit failed:", commitError.message);
          break;
        }
        completed = committed === true;
      } catch (error) {
        console.error("[srs-reconcile] scheduling failed:", error);
        break;
      }
    }

    if (completed) processed++;
    else failed++;
  }

  let remainingQuery = admin
    .from("srs_replay_queue")
    .select("id", { count: "exact", head: true })
    .is("processed_at", null);
  if (userId) remainingQuery = remainingQuery.eq("user_id", userId);
  if (questionId) remainingQuery = remainingQuery.eq("question_id", questionId);
  const { count, error: countError } = await remainingQuery;
  if (countError) {
    console.error("[srs-reconcile] remaining count failed:", countError.message);
    failed++;
  }

  return { processed, remaining: count ?? 0, failed };
}
