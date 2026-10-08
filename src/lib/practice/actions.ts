"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getSupabaseAdmin } from "@/lib/db/admin";
import { updateMastery, updateDifficulty } from "@/lib/elo";
import { gradeFromAttempt, newCard, schedule } from "@/lib/srs";
import type { SrsCard } from "@/lib/db/types";
import {
  applyDailyCap,
  levelFromXp,
  questionXp,
  rankTitleFromLevel,
  FIXED_XP,
} from "@/lib/gamification/xp";
import { countsAsStudyDay, updateStreak, type StreakState } from "@/lib/gamification/streak";
import type { QuestionPublic } from "@/lib/db/types";

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

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
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
  const { data: questions } = await supabase
    .from("questions")
    .select("id, topic_id, difficulty")
    .eq("status", "validated")
    .limit(600);
  if (!questions || questions.length === 0) return { question: null, reason: null };

  const candidates = questions
    .filter((q) => topicIds.has(q.topic_id))
    .map((q) => ({ id: q.id, topicId: q.topic_id, difficulty: q.difficulty }));

  // Mastery + recent attempts for the user.
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

  // Dynamic import keeps the pure selection module out of the action bundle.
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

  if (!selection) return { question: null, reason: null };

  const { data: full } = await supabase
    .from("questions")
    .select(
      "id, topic_id, difficulty, context_md, statement_md, alternatives, hints, demo_id, status, source, license, origin, created_at",
    )
    .eq("id", selection.question.id)
    .single();

  if (!full) return { question: null, reason: null };

  return {
    question: { ...full, alternatives: full.alternatives ?? [] } as QuestionPublic,
    reason: selection.reason,
  };
}

// ---------------------------------------------------------------------------
// Submit attempt (system-of-record funnel)
// ---------------------------------------------------------------------------

const submitSchema = z.object({
  questionId: z.string().uuid(),
  selected: z.enum(["A", "B", "C", "D", "E"]),
  timeMs: z.number().int().min(0).max(3600_000),
  mode: z.enum(["practice", "review", "lesson_test"]).default("practice"),
});

export interface AttemptResult {
  ok: boolean;
  error?: string;
  correct?: boolean;
  answerKey?: "A" | "B" | "C" | "D" | "E";
  explanationMd?: string;
  xpEarned?: number;
  newLevel?: number;
  streakCurrent?: number;
  streakUsedFreeze?: boolean;
  masteryPercent?: number;
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

  const { questionId, selected, timeMs, mode } = parsed.data;

  // 1. Fetch FULL question (server-only columns) with the admin client.
  const { data: question } = await admin
    .from("questions")
    .select("id, topic_id, difficulty, answer_key, explanation_md, statement_md, status")
    .eq("id", questionId)
    .single();
  if (!question || question.status !== "validated") {
    return { ok: false, error: "Questão não encontrada ou indisponível." };
  }

  const correct = selected === question.answer_key;

  // 2. Insert attempt.
  const { error: attemptError } = await admin.from("attempts").insert({
    user_id: user.id,
    question_id: questionId,
    selected,
    correct,
    time_ms: timeMs,
    mode: mode === "review" ? "review" : mode === "lesson_test" ? "lesson_test" : "practice",
  });
  if (attemptError) {
    console.error("[submitAttempt] attempt insert:", attemptError.message);
    return { ok: false, error: "Falha ao registrar. Tente novamente." };
  }

  // 3. Elo mastery update.
  const { data: mastery } = await admin
    .from("topic_mastery")
    .select("elo, attempts_count, confidence")
    .eq("user_id", user.id)
    .eq("topic_id", question.topic_id)
    .single();

  const attemptsCount = mastery?.attempts_count ?? 0;
  const currentElo = mastery?.elo ?? 1200;
  const masteryUpdate = updateMastery(
    currentElo,
    question.difficulty,
    correct,
    attemptsCount,
  );
  const lastAttemptAt = new Date().toISOString();

  await admin.from("topic_mastery").upsert(
    {
      user_id: user.id,
      topic_id: question.topic_id,
      elo: masteryUpdate.elo,
      confidence: masteryUpdate.confidence,
      attempts_count: attemptsCount + 1,
      last_attempt_at: lastAttemptAt,
      updated_at: lastAttemptAt,
    },
    { onConflict: "user_id,topic_id" },
  );

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

  // 4. FSRS card.
  const { data: cardRow } = await admin
    .from("srs_cards")
    .select("*")
    .eq("user_id", user.id)
    .eq("question_id", questionId)
    .maybeSingle();

  const expectedMs = Math.max(15_000, question.statement_md.length * 220);
  const grade = gradeFromAttempt(correct, timeMs, expectedMs);
  const baseCard: SrsCard = cardRow ?? newCard(user.id, questionId);
  const scheduled = schedule(baseCard, grade);

  await admin.from("srs_cards").upsert(
    {
      id: cardRow?.id,
      user_id: user.id,
      question_id: questionId,
      concept_key: null,
      due: scheduled.card.due,
      stability: scheduled.card.stability,
      difficulty_fsrs: scheduled.card.difficulty_fsrs,
      elapsed_days: scheduled.card.elapsed_days,
      scheduled_days: scheduled.card.scheduled_days,
      reps: scheduled.card.reps,
      lapses: scheduled.card.lapses,
      learning_steps: scheduled.card.learning_steps,
      state: scheduled.card.state,
      last_update: scheduled.card.last_update,
    },
    { onConflict: "user_id,question_id" },
  );

  // 5. XP (anti-fraud: min time, no-repeat via unique index, daily cap).
  let xpEarned = 0;
  const { data: profileRow } = await admin
    .from("profiles")
    .select("xp, level, rank_title")
    .eq("id", user.id)
    .single();

  const amount = mode === "review"
    ? FIXED_XP.reviewCard
    : questionXp({
        difficulty: question.difficulty,
        correct,
        timeMs,
        statementLength: question.statement_md.length,
      });

  if (amount > 0) {
    const { count: todayXpCount } = await admin
      .from("xp_events")
      .select("amount", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", mode === "review" ? "review" : "question")
      .gte("created_at", todayKey());
    // Sum today's amounts of this kind (count alone is not enough).
    const { data: todayXpRows } = await admin
      .from("xp_events")
      .select("amount")
      .eq("user_id", user.id)
      .eq("kind", mode === "review" ? "review" : "question")
      .gte("created_at", todayKey());
    const alreadyToday = (todayXpRows ?? []).reduce((s, r) => s + r.amount, 0);
    void todayXpCount;

    const capped = applyDailyCap(
      mode === "review" ? "review" : "question",
      amount,
      alreadyToday,
    );
    if (capped > 0) {
      const { error: xpError } = await admin.from("xp_events").insert({
        user_id: user.id,
        amount: capped,
        kind: mode === "review" ? "review" : "question",
        ref_id: questionId,
      });
      // Unique violation -> no XP for repeating the same question: expected.
      if (!xpError) xpEarned = capped;
    }
  }

  // 6. Level up (admin write on protected columns).
  let newLevel: number | undefined;
  if (xpEarned > 0 && profileRow) {
    const totalXp = profileRow.xp + xpEarned;
    const level = levelFromXp(totalXp);
    await admin
      .from("profiles")
      .update({ xp: totalXp, level, rank_title: rankTitleFromLevel(level) })
      .eq("id", user.id);
    if (level > profileRow.level) newLevel = level;
  }

  // 7. Streak (minimum day: 10 min OR 5 questions — use today's questions).
  const { count: todayQuestionsCount } = await admin
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayKey());
  const todayQuestions = todayQuestionsCount ?? 0;
  const { data: streakRow } = await admin
    .from("streaks")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const streakState: StreakState = streakRow
    ? {
        current: streakRow.current,
        longest: streakRow.longest,
        lastStudyDate: streakRow.last_study_date,
        freezesAvailable: streakRow.freezes_available,
        lastFreezeWeek: streakRow.last_freeze_week,
      }
    : {
        current: 0,
        longest: 0,
        lastStudyDate: null,
        freezesAvailable: 1,
        lastFreezeWeek: null,
      };

  const studiedToday = countsAsStudyDay({
    minutes: Math.round(todayQuestions * 1.2),
    questions: todayQuestions,
  });
  const streakUpdate = updateStreak(streakState, studiedToday, new Date());

  await admin
    .from("streaks")
    .upsert(
      {
        user_id: user.id,
        current: streakUpdate.current,
        longest: streakUpdate.longest,
        freezes_available: streakUpdate.freezesAvailable,
        last_freeze_week:
          streakUpdate.usedFreeze || streakState.lastFreezeWeek
            ? (streakUpdate.usedFreeze
                ? isoWeekKeyNow()
                : streakState.lastFreezeWeek)
            : null,
        last_study_date: studiedToday
          ? todayKey()
          : streakState.lastStudyDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  // 8. Daily goal.
  const { data: goalRow } = await admin
    .from("daily_goals")
    .select("id, target_questions, done_questions")
    .eq("user_id", user.id)
    .eq("date", todayKey())
    .single();

  if (goalRow) {
    const done = goalRow.done_questions + 1;
    await admin
      .from("daily_goals")
      .update({
        done_questions: done,
        status:
          done >= goalRow.target_questions
            ? "done"
            : done > 0
              ? "partial"
              : "pending",
      })
      .eq("id", goalRow.id);
  } else {
    const { data: profileForGoal } = await admin
      .from("profiles")
      .select("daily_hours")
      .eq("id", user.id)
      .single();
    await admin.from("daily_goals").insert({
      user_id: user.id,
      date: todayKey(),
      target_questions: 10,
      target_minutes: Math.round(Number(profileForGoal?.daily_hours ?? 2) * 60),
      done_questions: 1,
      status: "partial",
    });
  }

  revalidatePath("/painel");
  revalidatePath("/estudo");

  return {
    ok: true,
    correct,
    answerKey: question.answer_key,
    explanationMd: question.explanation_md,
    xpEarned,
    newLevel,
    streakCurrent: streakUpdate.current,
    streakUsedFreeze: streakUpdate.usedFreeze,
    masteryPercent: Math.round(((masteryUpdate.elo - 400) / 1400) * 100),
  };
}

function isoWeekKeyNow(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
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
