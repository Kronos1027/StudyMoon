"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getSupabaseAdmin } from "@/lib/db/admin";
import { demoForQuestionRow } from "@/lib/demos/topic-binding";
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
    // Avoid leaving an empty, permanently in-progress exam after an insert
    // error. Its child rows (if any) cascade when the parent is deleted.
    const { error: cleanupError } = await admin.from("mock_exams")
      .delete().eq("id", exam.id).eq("user_id", user.id);
    if (cleanupError) console.error("[mock-exam] cleanup:", cleanupError.message);
    return { ok: false, error: "Não foi possível montar o simulado." };
  }

  // Load full public questions with area names.
  const examQuestions: ExamQuestion[] = [];
  const areaNames = new Map(areas.map((a) => [a.id, a.name]));
  for (let i = 0; i < selected.length; i++) {
    const { data: q } = await admin
      .from("questions")
      .select(
        "id, topic_id, subtopic, demo_params, difficulty, context_md, statement_md, alternatives, hints, status, source, license, origin, created_at, topics(slug)",
      )
      .eq("id", selected[i].questionId)
      .single();
    if (!q) continue;
    // Demo comes from the question's OWN SUBTOPIC (catalog in code),
    // never from the topic/area: no demo-bound subtopic → no demo.
    const { topics: topicEmbed, ...questionFields } = q;
    const resolution = demoForQuestionRow({
      topicEmbed,
      subtopic: q.subtopic,
      demoParams: q.demo_params,
    });
    examQuestions.push({
      ...questionFields,
      subtopic: q.subtopic ?? null,
      demo_id: resolution?.demoId ?? null,
      demo_params: resolution?.params ?? null,
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

  // One server-only PostgreSQL RPC locks the exam, grades exclusively
  // against question keys in the database, saves every item + score and
  // awards one-shot XP/level in a SINGLE transaction (migration 0020).
  // Two concurrent submissions cannot partially grade or double-award.
  const { data: reportRows, error: finishError } = await admin.rpc(
    "finalize_mock_exam",
    {
      p_user_id: user.id,
      p_exam_id: exam.id,
      p_answers: parsed.data.answers,
    },
  );
  const report = Array.isArray(reportRows) ? reportRows[0] : null;
  if (finishError || !report) {
    console.error("[mock-exam] atomic finish failed:", finishError?.message);
    return { ok: false, error: "Não foi possível finalizar seu simulado. Tente novamente." };
  }

  revalidatePath("/simulado");

  return {
    ok: true,
    totalQuestions: report.total_questions,
    correct: report.correct_count,
    estimatedScore: report.estimated_score,
    byArea: report.by_area as NonNullable<ExamReport["byArea"]>,
  };
}
