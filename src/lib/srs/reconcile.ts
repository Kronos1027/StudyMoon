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
 * Bounded for serverless timeouts; selects the oldest pending event per card
 * and defers failed events using capped exponential backoff. Other students
 * are not blocked by a single broken review. The scheduler uses the original
 * attempt timestamp to maintain chronological FSRS updates.
 */
export async function reconcilePendingSrs({
  userId,
  questionId,
  limit = 20,
}: ReconcileOptions = {}): Promise<ReconcileSummary> {
  const admin = getSupabaseAdmin();
  if (!admin) return { processed: 0, remaining: 0, failed: 1 };

  const batchSize = Math.min(100, Math.max(1, Math.floor(limit)));
  let processed = 0;
  let failed = 0;

  // Select one oldest event per student/question at a time, while allowing
  // other students' events to proceed if a card is in backoff. A subsequent
  // round can process the next event for a card after the first is committed.
  for (let round = 0; round < batchSize && processed + failed < batchSize; round++) {
    const { data: events, error: queueError } = await admin.rpc(
      "get_ready_srs_replay",
      {
        p_user_id: userId ?? null,
        p_question_id: questionId ?? null,
        p_limit: batchSize - processed - failed,
      },
    );
    if (queueError) {
      console.error("[srs-reconcile] cannot load ready queue:", queueError.message);
      failed++;
      break;
    }
    if (!events?.length) break;

    for (const event of events) {
      let completed = false;
      let failureReason = "revision_conflict";

      for (let retry = 0; retry < 4 && !completed; retry++) {
        const { data: card, error: cardError } = await admin
          .from("srs_cards")
          .select("*")
          .eq("user_id", event.user_id)
          .eq("question_id", event.question_id)
          .maybeSingle();

        if (cardError) {
          failureReason = "card_read_failed";
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
            failureReason = "schedule_commit_failed";
            console.error("[srs-reconcile] commit failed:", commitError.message);
            break;
          }
          completed = committed === true;
        } catch (error) {
          failureReason = "schedule_calculation_failed";
          console.error("[srs-reconcile] scheduling failed:", error);
          break;
        }
      }

      if (completed) {
        processed++;
      } else {
        // A competing worker may have completed this event in the meantime.
        // In that case it is not a failure and must never be deferred.
        const { data: current, error: statusError } = await admin
          .from("srs_replay_queue")
          .select("processed_at")
          .eq("attempt_id", event.attempt_id)
          .maybeSingle();

        if (!statusError && current?.processed_at) {
          processed++;
        } else {
          const { error: deferError } = await admin.rpc("defer_srs_replay", {
            p_attempt_id: event.attempt_id,
            p_reason: failureReason,
          });
          if (deferError) {
            console.error("[srs-reconcile] cannot defer failed event:", deferError.message);
          }
          failed++;
        }
      }
    }
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
