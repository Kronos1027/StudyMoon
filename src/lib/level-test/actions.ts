"use server";

import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getSupabaseAdmin } from "@/lib/db/admin";
import { updateMastery, expectedScore } from "@/lib/elo";
import { demoForQuestionRow } from "@/lib/demos/topic-binding";
import type { Area, QuestionPublic } from "@/lib/db/types";

const ROUNDS = 4; // 4 questions per area

export interface LevelTestQuestion extends QuestionPublic {
  areaName: string;
  round: number;
  totalRounds: number;
}

export interface LevelTestState {
  question: LevelTestQuestion | null;
  finished: boolean;
  answered: number;
  total: number;
}


/** Starts (or returns) the adaptive level test: 4 rounds × 4 areas. */
export async function getLevelTestState(): Promise<
  { ok: true; state: LevelTestState } | { ok: false; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Count level-test attempts today/session.
  const { data: attempts } = await supabase
    .from("attempts")
    .select("question_id, created_at")
    .eq("user_id", user.id)
    .eq("mode", "level_test")
    .order("created_at", { ascending: false })
    .limit(64);

  const answered = attempts?.length ?? 0;
  const total = ROUNDS * 4;

  if (answered >= total) {
    return {
      ok: true,
      state: { question: null, finished: true, answered, total },
    };
  }

  const question = await pickNextQuestion(supabase, user.id, attempts ?? []);
  if (!question) {
    return { ok: true, state: { question: null, finished: true, answered, total } };
  }
  return {
    ok: true,
    state: { question, finished: false, answered, total },
  };
}

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selected: z.enum(["A", "B", "C", "D", "E"]),
  timeMs: z.number().int().min(0).max(3600_000),
});

/** Records a level-test attempt (no XP) and returns the next question. */
export async function answerLevelTestQuestion(
  input: z.infer<typeof answerSchema>,
): Promise<{ ok: true; state: LevelTestState } | { ok: false; error: string }> {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "Serviço indisponível." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { questionId, selected, timeMs } = parsed.data;

  const { data: question } = await admin
    .from("questions")
    .select("id, topic_id, difficulty, answer_key")
    .eq("id", questionId)
    .eq("status", "validated")
    .single();
  if (!question) return { ok: false, error: "Questão indisponível." };

  const correct = selected === question.answer_key;

  // Record attempt (mode: level_test — no XP by design).
  await admin.from("attempts").insert({
    user_id: user.id,
    question_id: questionId,
    selected,
    correct,
    time_ms: timeMs,
    mode: "level_test",
  });

  // Update mastery for this topic with a fast, high-K calibration update.
  const { data: mastery } = await admin
    .from("topic_mastery")
    .select("elo, attempts_count, confidence")
    .eq("user_id", user.id)
    .eq("topic_id", question.topic_id)
    .single();
  const update = updateMastery(
    mastery?.elo ?? 1200,
    question.difficulty,
    correct,
    mastery?.attempts_count ?? 0,
  );
  await admin.from("topic_mastery").upsert(
    {
      user_id: user.id,
      topic_id: question.topic_id,
      elo: update.elo,
      confidence: update.confidence,
      attempts_count: (mastery?.attempts_count ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic_id" },
  );

  // Next state.
  const total = ROUNDS * 4;
  const { data: attempts } = await supabase
    .from("attempts")
    .select("question_id, created_at")
    .eq("user_id", user.id)
    .eq("mode", "level_test")
    .order("created_at", { ascending: false })
    .limit(64);
  const answered = attempts?.length ?? 0;

  if (answered >= total) {
    await finishLevelTest(user.id);
    return { ok: true, state: { question: null, finished: true, answered, total } };
  }

  const next = await pickNextQuestion(supabase, user.id, attempts ?? []);
  return { ok: true, state: { question: next, finished: false, answered, total } };
}

// ---------------------------------------------------------------------------

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

async function pickNextQuestion(
  supabase: SupabaseClient,
  userId: string,
  previous: Array<{ question_id: string }>,
): Promise<LevelTestQuestion | null> {
  const usedIds = new Set(previous.map((a) => a.question_id));

  const [{ data: areas }, { data: mastery }] = await Promise.all([
    supabase.from("areas").select("id, name, slug").in("slug", ["mt", "lc", "ch", "cn"]),
    supabase
      .from("topic_mastery")
      .select("topic_id, elo")
      .eq("user_id", userId),
  ]);
  if (!areas || areas.length === 0) return null;

  const masteryByTopic = new Map((mastery ?? []).map((m) => [m.topic_id, m]));
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  // Round-robin by answered count (area order = area list order).
  const areaIndex = previous.length % areas.length;
  const area = areas[areaIndex] as Area;

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, area_id")
    .eq("area_id", area.id)
    .not("parent_id", "is", null);
  if (!topics || topics.length === 0) return null;
  const topicIds = new Set(topics.map((t) => t.id));

  const { data: questions } = await admin
    .from("questions")
    .select("id, topic_id, difficulty")
    .eq("status", "validated")
    .in("topic_id", [...topicIds])
    .limit(300);
  if (!questions || questions.length === 0) return null;

  // Estimate the user's rating in this area (mean of sampled topics, 1200 default).
  const sampled = topics
    .map((t) => masteryByTopic.get(t.id)?.elo)
    .filter((v): v is number => typeof v === "number");
  const areaRating = sampled.length > 0
    ? sampled.reduce((s, v) => s + v, 0) / sampled.length
    : 1200;

  // Choose the unseen question closest to P(correct) ≈ 0.6 (slightly challenging).
  let best: { id: string; p: number } | null = null;
  for (const q of questions) {
    if (usedIds.has(q.id)) continue;
    const p = expectedScore(areaRating, q.difficulty);
    const distance = Math.abs(p - 0.6);
    if (!best || distance < best.p) best = { id: q.id, p: distance };
  }
  if (!best) return null;

  const { data: full } = await admin
    .from("questions")
    .select(
      "id, topic_id, subtopic, demo_params, difficulty, context_md, statement_md, alternatives, hints, status, source, license, origin, created_at, topics(slug)",
    )
    .eq("id", best.id)
    .single();
  if (!full) return null;

  // Demo comes from the question's OWN SUBTOPIC (catalog in code),
  // never from the topic/area: no demo-bound subtopic → no demo.
  const { topics: topicEmbed, ...questionFields } = full;
  const resolution = demoForQuestionRow({
    topicEmbed,
    subtopic: full.subtopic,
    demoParams: full.demo_params,
  });
  return {
    ...questionFields,
    subtopic: full.subtopic ?? null,
    demo_id: resolution?.demoId ?? null,
    demo_params: resolution?.params ?? null,
    alternatives: full.alternatives ?? [],
    areaName: area.name,
    round: Math.floor(previous.length / areas.length) + 1,
    totalRounds: ROUNDS,
  };
}

async function finishLevelTest(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from("profiles")
    .update({ level_test_completed: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
}
