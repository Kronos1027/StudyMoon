"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getSupabaseAdmin } from "@/lib/db/admin";
import { updateDifficulty } from "@/lib/elo";
import { gradeFromAttempt, newCard, schedule } from "@/lib/srs";
import type { SrsCard } from "@/lib/db/types";
import {
  questionXp,
  FIXED_XP,
  DAILY_XP_CAPS,
} from "@/lib/gamification/xp";
import { demoForQuestionRow } from "@/lib/demos/topic-binding";
import type { QuestionPublic } from "@/lib/db/types";
import { firstAvailableDueQuestion, isReviewDue } from "@/lib/practice/review";

// ---------------------------------------------------------------------------
// Next question (adaptive selection)
// ---------------------------------------------------------------------------

const nextQuestionSchema = z.object({
  areaSlug: z.string().min(1).max(40).nullable().optional(),
  topicSlug: z.string().min(1).max(80).nullable().optional(),
  mode: z.enum(["practice", "review"]).default("practice"),
});

export interface NextQuestionResult {
  question: QuestionPublic | null;
  reason: string | null;
}

function isoWeekAgo(): string {
  return new Date(Date.now() - 7 * 86400000).toISOString();
}

/** Picks the next question with the 70/20/10 adaptive mix. */
export async function getNextQuestion(
  input: z.infer<typeof nextQuestionSchema>,
): Promise<NextQuestionResult> {
  const parsed = nextQuestionSchema.safeParse(input);
  if (!parsed.success) return { question: null, reason: null };

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { question: null, reason: null };

  // Candidates: validated questions (public columns), optional area filter.
  let topicsQuery = supabase
    .from("topics")
    .select("id, slug, area_id, parent_id")
    .not("parent_id", "is", null);

  if (parsed.data.areaSlug) {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("slug", parsed.data.areaSlug)
      .single();
    if (area) topicsQuery = topicsQuery.eq("area_id", area.id);
  }
  if (parsed.data.topicSlug) {
    topicsQuery = topicsQuery.eq("slug", parsed.data.topicSlug);
  }
  const { data: topics } = await topicsQuery;
  if (!topics || topics.length === 0) return { question: null, reason: null };

  const topicIds = new Set(topics.map((t) => t.id));

  // Review sessions MUST use the student's due FSRS cards, ordered by due
  // date. Adaptive practice deliberately uses a different selection policy.
  let dueQuestionIds: string[] | null = null;
  if (parsed.data.mode === "review") {
    const { data: dueCards, error: dueError } = await supabase
      .from("srs_cards")
      .select("question_id")
      .eq("user_id", user.id)
      .not("question_id", "is", null)
      .lte("due", new Date().toISOString())
      .order("due", { ascending: true })
      .limit(100);
    if (dueError) throw new Error("Não foi possível consultar suas revisões.");
    dueQuestionIds = [...new Set((dueCards ?? [])
      .map((card) => card.question_id)
      .filter((id): id is string => typeof id === "string"))];
    if (!dueQuestionIds.length) {
      return { question: null, reason: "no_due_reviews" };
    }
  }

  let questionsQuery = supabase
    .from("questions")
    .select("id, topic_id, difficulty")
    .eq("status", "validated");

  if (dueQuestionIds) {
    questionsQuery = questionsQuery.in("id", dueQuestionIds);
  }
  const { data: questions, error: questionsError } = await questionsQuery.limit(600);
  if (questionsError) throw new Error("Não foi possível carregar as questões.");

  const candidates = (questions ?? [])
    .filter((q) => topicIds.has(q.topic_id))
    .map((q) => ({ id: q.id, topicId: q.topic_id, difficulty: q.difficulty }));

  let selectedId: string | null = null;
  let selectedReason: string | null = null;

  if (dueQuestionIds) {
    selectedId = firstAvailableDueQuestion(
      dueQuestionIds,
      candidates.map((candidate) => candidate.id),
    );
    selectedReason = selectedId ? "review_due" : "no_due_reviews";
  } else {
    // Normal practice: use the existing adaptive 70/20/10 selector.
    const [{ data: mastery }, { data: recent }] = await Promise.all([
      supabase
        .from("topic_mastery")
        .select("topic_id, elo, confidence, attempts_count")
        .eq("user_id", user.id),
      supabase
        .from("attempts")
        .select("question_id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", isoWeekAgo()),
    ]);

    const { selectNextQuestion } = await import("@/lib/practice/selection");
    const selection = selectNextQuestion({
      candidates,
      mastery: (mastery ?? []).map((m) => ({
        topicId: m.topic_id,
        elo: m.elo,
        confidence: m.confidence,
      })),
      recentAttempts: (recent ?? []).map((a) => ({
        questionId: a.question_id,
        attemptedAt: a.created_at,
      })),
      now: new Date(),
    });
    selectedId = selection?.question.id ?? null;
    selectedReason = selection?.reason ?? null;
  }

  if (!selectedId) return { question: null, reason: selectedReason };

  const { data: full } = await supabase
    .from("questions")
    .select(
      "id, topic_id, subtopic, demo_params, difficulty, context_md, statement_md, alternatives, hints, status, source, license, origin, created_at, topics(slug)",
    )
    .eq("id", selectedId)
    .single();

  if (!full) return { question: null, reason: null };

  // Register when the server actually serves a question. This ticket is
  // consumed only once by record_practice_attempt with DB-measured timing.
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Serviço de questões indisponível.");
  const { data: issued, error: issueError } = await admin.rpc(
    "issue_practice_question",
    { p_user_id: user.id, p_question_id: full.id },
  );
  if (issueError || issued !== true) {
    throw new Error("Não foi possível preparar sua questão. Tente novamente.");
  }

  // Demo comes from the question's OWN SUBTOPIC (catalog in code), never
  // from the topic/area: question without a demo-bound subtopic → no demo.
  const { topics: topicEmbed, ...questionFields } = full;
  const resolution = demoForQuestionRow({
    topicEmbed,
    subtopic: full.subtopic,
    demoParams: full.demo_params,
  });
  return {
    question: {
      ...questionFields,
      subtopic: full.subtopic ?? null,
      demo_id: resolution?.demoId ?? null,
      demo_params: resolution?.params ?? null,
      alternatives: full.alternatives ?? [],
    } as QuestionPublic,
    reason: selectedReason,
  };
}

// ---------------------------------------------------------------------------
// Submit attempt (system-of-record funnel)
// ---------------------------------------------------------------------------

const submitSchema = z.object({
  questionId: z.string().uuid(),
  selected: z.enum(["A", "B", "C", "D", "E"]),
  // Legacy client value retained for compatibility; never trusted for XP,
  // FSRS grading or persisted attempt time after migration 0011.
  timeMs: z.number().int().min(0).max(3600_000),
  mode: z.enum(["practice", "review", "lesson_test"]).default("practice"),
});

export interface AttemptResult {
  ok: boolean;
  error?: string;
  errorCode?: "ticket_unavailable";
  correct?: boolean;
  answerKey?: "A" | "B" | "C" | "D" | "E";
  explanationMd?: string;
  xpEarned?: number;
  newLevel?: number;
  streakCurrent?: number;
  streakUsedFreeze?: boolean;
  masteryPercent?: number;
  reviewSaveWarning?: boolean;
}

/**
 * Records an attempt and updates every system-of-record table in one place:
 * attempt, Elo mastery, question difficulty drift, FSRS card, XP (with caps
 * and no-repeat), level, streak (with freeze), and the daily goal.
 */
export async function submitAttempt(input: z.infer<typeof submitSchema>): Promise<AttemptResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "Serviço indisponível." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { questionId, selected, mode } = parsed.data;

  // 1. Fetch FULL question (server-only columns) with the admin client.
  const { data: question } = await admin
    .from("questions")
    .select("id, topic_id, difficulty, answer_key, explanation_md, statement_md, status")
    .eq("id", questionId)
    .single();
  if (!question || question.status !== "validated") {
    return { ok: false, error: "Questão não encontrada ou indisponível." };
  }

  // Do not trust the client-provided "review" mode. A crafted server-action
  // call must not grant review XP for an unlearned/already-rescheduled card.
  if (mode === "review") {
    const { data: card, error: cardError } = await admin
      .from("srs_cards")
      .select("due")
      .eq("user_id", user.id)
      .eq("question_id", questionId)
      .maybeSingle();
    if (cardError || !isReviewDue(card?.due, new Date())) {
      return { ok: false, error: "Esta revisão não está disponível agora. Atualize sua lista." };
    }
  }

  // 2. The database validates the server-issued ticket, review eligibility
  // and the answer, then inserts the attempt atomically. A duplicate submit
  // cannot create a second attempt or alter the original answer.
  const { data: attemptRows, error: attemptError } = await admin.rpc(
    "record_practice_attempt",
    {
      p_user_id: user.id,
      p_question_id: questionId,
      p_selected: selected,
      p_mode: mode,
    },
  );
  const recorded = Array.isArray(attemptRows) ? attemptRows[0] : null;
  const timeMs = Number(recorded?.recorded_time_ms);
  const correct = recorded?.recorded_correct === true;
  if (attemptError || !recorded || !Number.isFinite(timeMs)) {
    console.error("[submitAttempt] secure attempt rejected:", attemptError?.message);
    return {
      ok: false,
      error: "Esta questão já foi respondida ou expirou. Carregue uma nova questão.",
      errorCode: "ticket_unavailable",
    };
  }

  // 3. Elo, confidence and attempts_count are updated by the PostgreSQL
  // AFTER INSERT trigger (migration 0014) in the same transaction as
  // record_practice_attempt. Reading the committed row is for display only.
  // Do not write a stale Elo value back from the application process.
  const { data: mastery, error: masteryError } = await admin
    .from("topic_mastery")
    .select("elo")
    .eq("user_id", user.id)
    .eq("topic_id", question.topic_id)
    .maybeSingle();
  if (masteryError) {
    console.error("[submitAttempt] read mastery:", masteryError.message);
  }
  const lastAttemptAt = new Date().toISOString();

  // 3b. Question difficulty drift (empirical, gentle).
  const { count: questionAttempts } = await admin
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);
  const newDifficulty = updateDifficulty(
    question.difficulty,
    correct,
    questionAttempts ?? 1,
  );
  if (newDifficulty !== question.difficulty) {
    await admin
      .from("questions")
      .update({ difficulty: newDifficulty, updated_at: lastAttemptAt })
      .eq("id", questionId);
  }

  // 4. Recalculate from the latest FSRS card with optimistic concurrency.
  // The SQL RPC increments revision only if the stored revision still matches.
  // If another request saved a newer revision, reload and reschedule instead
  // of overwriting that student's progress with a stale SRS card.
  const expectedMs = Math.max(15_000, question.statement_md.length * 220);
  const grade = gradeFromAttempt(correct, timeMs, expectedMs);
  let srsSaved = false;

  for (let tryNumber = 0; tryNumber < 4 && !srsSaved; tryNumber++) {
    const { data: cardRow, error: cardError } = await admin
      .from("srs_cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("question_id", questionId)
      .maybeSingle();

    if (cardError) {
      console.error("[submitAttempt] read FSRS card:", cardError.message);
      break;
    }

    const baseCard: SrsCard = cardRow ?? newCard(user.id, questionId);
    const scheduled = schedule(baseCard, grade);
    const { data: committed, error: scheduleError } = await admin.rpc(
      "commit_srs_schedule",
      {
        p_user_id: user.id,
        p_question_id: questionId,
        p_expected_revision: Number(cardRow?.revision ?? 0),
        p_due: scheduled.card.due,
        p_stability: scheduled.card.stability,
        p_difficulty: scheduled.card.difficulty_fsrs,
        p_elapsed_days: scheduled.card.elapsed_days,
        p_scheduled_days: scheduled.card.scheduled_days,
        p_reps: scheduled.card.reps,
        p_lapses: scheduled.card.lapses,
        p_learning_steps: scheduled.card.learning_steps,
        p_state: scheduled.card.state,
        p_last_update: scheduled.card.last_update,
      },
    );

    if (scheduleError) {
      console.error("[submitAttempt] commit FSRS card:", scheduleError.message);
      break;
    }
    srsSaved = committed === true;
  }
  if (!srsSaved) {
    // The answer already committed; keep the user's correct/XP result and
    // explicitly surface that a review card may need a retry/reconciliation.
    console.error("[submitAttempt] FSRS card not persisted after retries");
  }

  // 5–6. Atomically award XP and update level/title in PostgreSQL.
  // The server-only RPC locks the student's profile, checks one-shot
  // deduplication, applies the daily cap and commits both tables together.
  // Never silently rewrite profile XP with a stale value from another request.
  let xpEarned = 0;
  let newLevel: number | undefined;
  const amount = mode === "review"
    ? FIXED_XP.reviewCard
    : questionXp({
        difficulty: question.difficulty,
        correct,
        timeMs,
        statementLength: question.statement_md.length,
      });

  if (amount > 0) {
    const { data: awarded, error: awardError } = await admin.rpc(
      "award_study_xp",
      {
        p_user_id: user.id,
        p_kind: mode === "review" ? "review" : "question",
        p_ref_id: questionId,
        p_requested: amount,
        p_daily_cap: mode === "review" ? DAILY_XP_CAPS.review : DAILY_XP_CAPS.question,
      },
    );
    if (awardError) {
      console.error("[submitAttempt] atomic XP award failed:", awardError.message);
    } else {
      const result = Array.isArray(awarded) ? awarded[0] : null;
      xpEarned = Number(result?.awarded_amount ?? 0);
      if (xpEarned > 0 && result && result.new_level > result.old_level) {
        newLevel = result.new_level;
      }
    }
  }

  // 7. Streaks now update under the same PostgreSQL transaction as the
  // attempt (migration 0016). Read ONLY for student feedback: no stale
  // read-modify-write can overwrite the progress of simultaneous attempts.
  const { data: streak, error: streakError } = await admin
    .from("streaks")
    .select("current, last_study_date, last_freeze_used_on")
    .eq("user_id", user.id)
    .maybeSingle();
  if (streakError) {
    console.error("[submitAttempt] streak read:", streakError.message);
  }

  // 8. Daily goal progress is counted by the PostgreSQL AFTER INSERT
  // trigger on attempts (migration 0013). It runs in the same transaction
  // as record_practice_attempt and cannot lose concurrent increments.

  revalidatePath("/painel");
  revalidatePath("/estudo");

  return {
    ok: true,
    correct,
    answerKey: question.answer_key,
    explanationMd: question.explanation_md,
    xpEarned,
    newLevel,
    streakCurrent: streak?.current ?? undefined,
    streakUsedFreeze: Boolean(
      streak?.last_study_date === new Date().toISOString().slice(0, 10)
      && streak?.last_freeze_used_on === streak?.last_study_date,
    ),
    reviewSaveWarning: !srsSaved,
    masteryPercent: mastery
      ? Math.round(((mastery.elo - 400) / 1400) * 100)
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Question report
// ---------------------------------------------------------------------------

const reportSchema = z.object({
  questionId: z.string().uuid(),
  reason: z.enum(["wrong_answer", "ambiguous", "offensive", "broken", "other"]),
  details: z.string().max(1000).optional(),
});

export async function reportQuestion(input: z.infer<typeof reportSchema>) {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase.from("question_reports").insert({
    question_id: parsed.data.questionId,
    user_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });
  if (error) return { ok: false, error: "Não foi possível enviar. Tente de novo." };
  return { ok: true };
}
