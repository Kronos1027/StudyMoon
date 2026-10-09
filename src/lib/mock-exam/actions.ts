"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getSupabaseAdmin } from "@/lib/db/admin";
import type { QuestionPublic } from "@/lib/db/types";

import { EXAM_CONFIG } from "./config";

const startSchema = z.object({
  kind: z.enum(["partial", "day1", "day2"]),
});

export interface ExamQuestion extends QuestionPublic {
  areaName: string;
  position: number;
}

export interface StartExamResult {
  ok: boolean;
  error?: string;
  examId?: string;
  questions?: ExamQuestion[];
  timeLimitMin?: number;
  label?: string;
}

/** Assembles the exam: questions per area (mixed difficulty), stores rows. */
export async function startMockExam(
  input: z.infer<typeof startSchema>,
): Promise<StartExamResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "Serviço indisponível." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const config = EXAM_CONFIG[parsed.data.kind];

  const { data: areas } = await supabase
    .from("areas")
    .select("id, name, slug")
    .in("slug", [...config.areas]);
  if (!areas || areas.length === 0) {
    return { ok: false, error: "Sem conteúdo disponível ainda." };
  }

  // Gather candidate questions per area (public columns are enough).
  const questionsByArea = new Map<string, Array<{ id: string; difficulty: number; topic_id: string }>>();
  for (const area of areas) {
    const { data: topics } = await supabase
      .from("topics")
      .select("id")
      .eq("area_id", area.id)
      .not("parent_id", "is", null);
    if (!topics || topics.length === 0) continue;
    const { data: questions } = await admin
      .from("questions")
      .select("id, difficulty, topic_id")
      .eq("status", "validated")
      .in("topic_id", topics.map((t) => t.id))
      .limit(300);
    if (questions && questions.length > 0) {
      questionsByArea.set(area.id, questions);
    }
  }
  if (questionsByArea.size === 0) {
    return { ok: false, error: "Banco de questões ainda insuficiente para este simulado." };
  }

  // Pick spread-difficulty questions per area (easy→hard ordering mix).
  const selected: Array<{ areaId: string; questionId: string }> = [];
  for (const [areaId, questions] of questionsByArea) {
    const sorted = [...questions].sort((a, b) => a.difficulty - b.difficulty);
    const take = Math.min(config.questionsPerArea, sorted.length);
    // Evenly spaced picks across the difficulty range.
    for (let i = 0; i < take; i++) {
      const index = Math.floor(((i + 0.5) / take) * sorted.length);
      selected.push({ areaId, questionId: sorted[index].id });
    }
  }
  if (selected.length < 5) {
    return { ok: false, error: "Banco de questões ainda insuficiente para este simulado." };
  }

  // Shuffle positions.
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  // Create exam + items.
  const { data: exam, error: examError } = await admin
    .from("mock_exams")
    .insert({
      user_id: user.id,
      kind: parsed.data.kind,
      status: "in_progress",
      time_limit_min: config.timeLimitMin,
    })
    .select("id")
    .single();
  if (examError || !exam) {
    return { ok: false, error: "Não foi possível iniciar o simulado." };
  }

  const items = selected.map((item, position) => ({
    exam_id: exam.id,
    question_id: item.questionId,
    position,
  }));
  const { error: itemsError } = await admin.from("mock_exam_items").insert(items);
  if (itemsError) {
    return { ok: false, error: "Não foi possível montar o simulado." };
  }

  // Load full public questions with area names.
  const examQuestions: ExamQuestion[] = [];
  const areaNames = new Map(areas.map((a) => [a.id, a.name]));
  for (let i = 0; i < selected.length; i++) {
    const { data: q } = await admin
      .from("questions")
      .select(
        "id, topic_id, difficulty, context_md, statement_md, alternatives, hints, demo_id, status, source, license, origin, created_at",
      )
      .eq("id", selected[i].questionId)
      .single();
    if (!q) continue;
    examQuestions.push({
      ...q,
      alternatives: q.alternatives ?? [],
      areaName: areaNames.get(selected[i].areaId) ?? "",
      position: i,
    });
  }

  return {
    ok: true,
    examId: exam.id,
    questions: examQuestions,
    timeLimitMin: config.timeLimitMin,
    label: config.label,
  };
}

// ---------------------------------------------------------------------------

const finishSchema = z.object({
  examId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selected: z.enum(["A", "B", "C", "D", "E"]).nullable(),
      flagged: z.boolean(),
    }),
  ),
  timeSpentMin: z.number().int().min(0).max(600),
});

export interface ExamReport {
  ok: boolean;
  error?: string;
  totalQuestions?: number;
  correct?: number;
  byArea?: Array<{ area: string; correct: number; total: number; percent: number }>;
  estimatedScore?: number;
}

/** Grades the exam, stores results, awards one-time XP (doc 6.9). */
export async function finishMockExam(
  input: z.infer<typeof finishSchema>,
): Promise<ExamReport> {
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "Serviço indisponível." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: exam } = await admin
    .from("mock_exams")
    .select("id, user_id, status, kind")
    .eq("id", parsed.data.examId)
    .single();
  if (!exam || exam.user_id !== user.id) {
    return { ok: false, error: "Simulado não encontrado." };
  }
  if (exam.status !== "in_progress") {
    return { ok: false, error: "Este simulado já foi finalizado." };
  }

  // Load items + full questions (with answer keys) + topics/areas.
  const { data: items } = await admin
    .from("mock_exam_items")
    .select("id, question_id, position")
    .eq("exam_id", exam.id)
    .order("position");
  if (!items || items.length === 0) {
    return { ok: false, error: "Simulado vazio." };
  }

  const questionIds = items.map((i) => i.question_id);
  const { data: questions } = await admin
    .from("questions")
    .select("id, answer_key, topic_id, difficulty")
    .in("id", questionIds);
  const questionMap = new Map((questions ?? []).map((q) => [q.id, q]));

  const topicIds = [...new Set((questions ?? []).map((q) => q.topic_id))];
  const { data: topics } = await admin
    .from("topics")
    .select("id, area_id")
    .in("id", topicIds);
  const { data: areas } = await admin.from("areas").select("id, name");
  const topicToArea = new Map((topics ?? []).map((t) => [t.id, t.area_id]));
  const areaNames = new Map((areas ?? []).map((a) => [a.id, a.name]));

  const answersMap = new Map(
    parsed.data.answers.map((a) => [a.questionId, a]),
  );

  // Grade + update rows.
  const byAreaAgg = new Map<string, { correct: number; total: number }>();
  let correctCount = 0;

  for (const item of items) {
    const question = questionMap.get(item.question_id);
    const answer = answersMap.get(item.question_id);
    const selected = answer?.selected ?? null;
    const correct = selected !== null && question ? selected === question.answer_key : false;
    if (correct) correctCount += 1;

    await admin
      .from("mock_exam_items")
      .update({
        selected,
        correct,
        flagged: answer?.flagged ?? false,
      })
      .eq("id", item.id);

    const areaId = question ? topicToArea.get(question.topic_id) : undefined;
    const areaName = areaId ? (areaNames.get(areaId) ?? "—") : "—";
    const agg = byAreaAgg.get(areaName) ?? { correct: 0, total: 0 };
    agg.total += 1;
    if (correct) agg.correct += 1;
    byAreaAgg.set(areaName, agg);
  }

  // Simple, clearly-labeled estimate: percentage → 0-1000 scale.
  const total = items.length;
  const estimated = Math.round((correctCount / total) * 1000);

  await admin
    .from("mock_exams")
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
      score_estimate: {
        correct: correctCount,
        total,
        estimated,
        note: "estimativa simples (percentual de acertos × 1000), não TRI",
        byArea: [...byAreaAgg.entries()].map(([area, v]) => ({
          area,
          correct: v.correct,
          total: v.total,
        })),
      },
    })
    .eq("id", exam.id);

  // One-time XP.
  const { error: xpError } = await admin.from("xp_events").insert({
    user_id: user.id,
    amount: 100,
    kind: "mock_exam",
    ref_id: exam.id,
  });
  if (!xpError) {
    const { data: profile } = await admin
      .from("profiles")
      .select("xp")
      .eq("id", user.id)
      .single();
    if (profile) {
      await admin
        .from("profiles")
        .update({ xp: profile.xp + 100 })
        .eq("id", user.id);
    }
  }

  revalidatePath("/simulado");

  return {
    ok: true,
    totalQuestions: total,
    correct: correctCount,
    estimatedScore: estimated,
    byArea: [...byAreaAgg.entries()].map(([area, v]) => ({
      area,
      correct: v.correct,
      total: v.total,
      percent: Math.round((v.correct / v.total) * 100),
    })),
  };
}
